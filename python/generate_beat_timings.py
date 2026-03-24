import librosa
import json
import sys
from PIL import Image

# Usage: python generate_beat_timings.py <audio_file> <output_json> [bpm]
def main():
    if len(sys.argv) < 3:
        print("Usage: python generate_beat_timings.py <audio_file> <output_json> [speed_div] [image_path]")
        print("  speed_div: 2 = every other beat, 3 = every 3rd beat, etc. Default is 1 (all beats)")
        print("  image_path: optional, if provided, will extract color at each (x, y) and store as rgb in JSON")
        sys.exit(1)

    audio_file = sys.argv[1]
    output_json = sys.argv[2]
    speed_div = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    image_path = sys.argv[4] if len(sys.argv) > 4 else None
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('audio_file')
    parser.add_argument('output_json')
    parser.add_argument('speed_div', nargs='?', default=1.0, type=float)
    parser.add_argument('image_path', nargs='?')
    parser.add_argument('--shuffle-grid', action='store_true', help='Randomize grid positions for x/y')
    parser.add_argument('--perlin', action='store_true', help='Use Perlin noise for smooth organic beat positions')
    parser.add_argument('--perlin-scale', type=float, default=0.18, help='How quickly positions drift between beats (default 0.18, higher = faster drift)')
    args, unknown = parser.parse_known_args()

    audio_file = args.audio_file
    output_json = args.output_json
    speed_div = float(args.speed_div)
    image_path = args.image_path
    shuffle_grid = args.shuffle_grid
    use_perlin = args.perlin
    perlin_scale = args.perlin_scale

    img = None
    img_w, img_h = None, None
    if image_path:
        img = Image.open(image_path).convert('RGB')
        # Crop to center square
        min_dim = min(img.size)
        left = (img.width - min_dim) // 2
        top = (img.height - min_dim) // 2
        right = left + min_dim
        bottom = top + min_dim
        img = img.crop((left, top, right, bottom))
        # Resize to 1x1 for normalization (not for color sampling, just for coordinate normalization)
        img = img.resize((min_dim, min_dim), Image.LANCZOS)
        img_w, img_h = img.size

    y, sr = librosa.load(audio_file)
    duration = librosa.get_duration(y=y, sr=sr)
    # Always auto-detect BPM
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    print(f"Auto-detected BPM: {tempo}")
    interval = 60.0 / (tempo / speed_div)
    import random
    LYRIC_MIN_X = -1.5
    LYRIC_MAX_X = 1.5
    LYRIC_MIN_Y = 1.4
    LYRIC_MAX_Y = 2.8
    LYRIC_Z = -1.0
    # Margins to reduce x spacing and prevent y overlap
    x_margin = 0.15  # shrink horizontal range on both sides
    y_margin = 0.05  # add vertical gap between rows

    # Determine grid size (rows x cols) as close to square as possible
    import math
    num_beats = int(duration // interval)
    grid_cols = math.ceil(math.sqrt(num_beats))
    grid_rows = math.ceil(num_beats / grid_cols)
    x_range = (LYRIC_MAX_X - LYRIC_MIN_X) - 2 * x_margin
    y_range = (LYRIC_MAX_Y - LYRIC_MIN_Y) - y_margin * (grid_rows + 1)

    beat_data = []
    num_beats = int(duration // interval)
    # Determine grid size (rows x cols) as close to square as possible
    import math
    grid_cols = math.ceil(math.sqrt(num_beats))
    grid_rows = math.ceil(num_beats / grid_cols)
    # Generate all grid positions
    grid_positions = [(row, col) for row in range(grid_rows) for col in range(grid_cols)]
    # Only use as many as needed
    grid_positions = grid_positions[:num_beats]
    if shuffle_grid:
        import random
        random.shuffle(grid_positions)
    if use_perlin:
        try:
            from noise import pnoise1
        except ImportError:
            print("noise package not found. Install with: pip install noise")
            sys.exit(1)
        import random
        offset_x = random.uniform(0, 1000)
        offset_y = random.uniform(0, 1000)

    x_range = (LYRIC_MAX_X - LYRIC_MIN_X) - 2 * x_margin
    y_range = (LYRIC_MAX_Y - LYRIC_MIN_Y) - 2 * y_margin

    for i in range(num_beats):
        t = i * interval
        if use_perlin:
            # pnoise1 returns [-1, 1]; remap to [0, 1] then to scene coords
            u = (pnoise1(i * perlin_scale + offset_x) + 1) / 2
            v = (pnoise1(i * perlin_scale + offset_y) + 1) / 2
            x = LYRIC_MIN_X + x_margin + u * x_range
            y = LYRIC_MIN_Y + y_margin + v * y_range
        else:
            row, col = grid_positions[i]
            # Map grid position to normalized [0,1] coordinates
            u = (col + 0.5) / grid_cols
            v = (row + 0.5) / grid_rows
            # Map normalized coordinates to VR scene coordinates
            x = LYRIC_MIN_X + x_margin + u * x_range
            y = LYRIC_MIN_Y + y_margin + v * y_range + row * y_margin
        color = None
        if img:
            # Map normalized coordinates to image pixel coordinates
            px = int(u * (img_w - 1))
            py = int(v * (img_h - 1))
            r, g, b = img.getpixel((px, py))
            color = [r / 255.0, g / 255.0, b / 255.0]
        beat = {
            "time": float(t),
            "x": x,
            "y": y,
            "z": LYRIC_Z
        }
        if color:
            beat["rgb"] = color
        beat_data.append(beat)
    # Optionally add last beat at end
    if beat_data and (duration - beat_data[-1]["time"]) > interval * 0.5:
        last_i = num_beats
        if last_i < len(grid_positions):
            row, col = grid_positions[last_i]
        else:
            row = last_i // grid_cols
            col = last_i % grid_cols
        u = (col + 0.5) / grid_cols
        v = (row + 0.5) / grid_rows
        x = LYRIC_MIN_X + x_margin + u * x_range
        y = LYRIC_MIN_Y + y_margin + v * y_range + row * y_margin
        color = None
        if img:
            px = int(u * (img_w - 1))
            py = int(v * (img_h - 1))
            r, g, b = img.getpixel((px, py))
            color = [r / 255.0, g / 255.0, b / 255.0]
        beat = {
            "time": float(duration),
            "x": x,
            "y": y,
            "z": LYRIC_Z
        }
        if color:
            beat["rgb"] = color
        beat_data.append(beat)

    with open(output_json, 'w') as f:
        json.dump(beat_data, f, indent=2)

    print(f"Used BPM: {tempo} (speed_div: {speed_div})")
    print(f"Saved {len(beat_data)} beats to {output_json}")

if __name__ == "__main__":
    main()
