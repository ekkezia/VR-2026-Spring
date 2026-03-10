import whisper
import json
import sys
import os
import whisperx

def chunk_segment(segment, chunk_size):
    words = segment.get("words", [])
    if not words or chunk_size is None:
        return [{
            "text": segment["text"].strip(),
            "start": segment["start"],
            "end": segment["end"]
        }]
    
    chunks = []
    for i in range(0, len(words), chunk_size):
        group = words[i:i + chunk_size]
        chunks.append({
            "text": " ".join(w["word"].strip() for w in group),
            "start": group[0]["start"],
            "end": group[-1]["end"]
        })
    return chunks

def main():
    if len(sys.argv) < 3 or len(sys.argv) > 4:
        print("Usage: python transcribe_to_json.py <audio_file> <output_json> [chunk_size]")
        sys.exit(1)

    audio_file = sys.argv[1]
    output_json = sys.argv[2]
    chunk_size = int(sys.argv[3]) if len(sys.argv) == 4 else None

    # model = whisper.load_model("base")
    device = 'cpu'

    model = whisperx.load_model("large-v3", device=device, compute_type="float32")

    result = model.transcribe(audio_file, word_timestamps=True)

    phrases = []
    for segment in result["segments"]:
        phrases.extend(chunk_segment(segment, chunk_size))

    output_dir = os.path.dirname(output_json)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(output_json, "w") as f:
        json.dump(phrases, f, indent=2)

    print(f"Saved {len(phrases)} phrases to {output_json}")

    if chunk_size:
        print(f"\nPreview (chunk_size={chunk_size}):")
        for p in phrases[:10]:
            print(f"  [{p['start']:.2f} -> {p['end']:.2f}] {p['text']}")

if __name__ == "__main__":
    main()