// HW Week 4
// Can run with different camera source (pick from the browser)

let video;
let canvas;
let ctx;
let overlay;
const cols = 40;
const rows = 30;
const width = 400;
const height = 300;
const ascii = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,^`'.";;

let output = "";

await initCamera();

export const init = async model => {
   model.animate(() => {
      let myText = clay.text(output, true);
      while (model.nChildren())
         model.remove(0);
      for (let t = 0 ; t < 2 ; t++) {
         let z = 3 * t - 3;
         let x = -.5 * t;
         model.add('square').move(x,1.5,z-.001).scale(.38,.44,1).opacity(.8);
         model.add(myText).move(x-.305,1.89,z).color(0,0,0).scale(1);
      }
   });
}



async function initCamera() {
   // hidden video
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });

  video = document.createElement("video");
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;

  await video.play();

  // Canvas
  canvas = document.createElement("canvas");
  ctx = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
   canvas.style.position = "fixed";
   canvas.style.bottom = "20px";
   canvas.style.left = "20px";
   canvas.style.width = `${width}px`;
   canvas.style.height = `${height}px`;
   canvas.style.zIndex = "99999";
   canvas.style.display = 'none'; // hide

   document.body.appendChild(canvas); 

   overlay = document.createElement("pre");
  overlay.style.position = "fixed";
  overlay.style.bottom = "20px";
  overlay.style.left = "20px";
  overlay.style.width = `${width}px`;
   overlay.style.height = `${height}px`;
  overlay.style.zIndex = "100000";
  overlay.style.color = "lime";
  overlay.style.fontSize = "6px";
  overlay.style.lineHeight = "6px";
  overlay.style.fontFamily = "monospace";
  overlay.style.pointerEvents = "none";
  overlay.innerText = 'LOADING';

  document.body.appendChild(overlay);

  requestAnimationFrame(processFrame);

  console.log("Camera started");
}

function processFrame() {
   
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = frame.data;

  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;

  output = ""; 

  for (let y = 0; y < rows; y++) {
    for (let x = cols; x > 0; x--) {

      let color = [0,0,0];

      // sample pixels inside each cell
      const px = Math.floor((x + cellHeight / 2) * cellWidth);
      const py = Math.floor((y + cellWidth / 2) * cellHeight);

      const i = (py * canvas.width + px) * 4;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      color = [r,g,b];

      const brightness = (r+g+b) / 3;

      // draw a pixel for helper
      ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
      ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight); // Draw a 100x100 square at (25, 25)

      const charIndex = Math.floor(
        (brightness / 255) * (ascii.length - 1)
      );

      if (ascii[charIndex]) output += ascii[charIndex];
      
    }

    output += "\n";
  }

  overlay.textContent = output;

  requestAnimationFrame(processFrame);
}
