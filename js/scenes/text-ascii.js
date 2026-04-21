// HW Week 4
// Can run with different camera source (pick from the browser)

let video;
let canvas;
let ctx;
let overlay;
let stream;
let cameraDevices = [];
let activeDeviceId = null;
let cameraSelect;
let switchButton;
let cameraStarted = false;
let startListenerAttached = false;
let startupMessage = "CLICK ANYWHERE TO START CAMERA";
const cols = 40;
const rows = 30;
const width = 400;
const height = 300;
const ascii = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,^`'.";;

let output = "";
const previewCanvasId = "text-ascii-preview";
const previewOverlayId = "text-ascii-overlay";
const previewSelectId = "text-ascii-camera-select";
const previewSwitchId = "text-ascii-camera-switch";

export const init = async model => {
   if (!cameraStarted && !startListenerAttached) {
      startListenerAttached = true;
      window.addEventListener("pointerdown", onUserStart, { once: true });
   }

   model.animate(() => {
      let myText = clay.text(cameraStarted ? output : startupMessage, true);
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

async function onUserStart() {
  startListenerAttached = false;
  if (cameraStarted) {
    return;
  }
  try {
    await initCamera();
    cameraStarted = true;
  } catch (error) {
    console.error("Failed to start text-ascii camera:", error);
    startupMessage = "CAMERA START FAILED. CLICK AGAIN.";
    if (!startListenerAttached) {
      startListenerAttached = true;
      window.addEventListener("pointerdown", onUserStart, { once: true });
    }
  }
}


async function initCamera() {
  const oldCanvas = document.getElementById(previewCanvasId);
  if (oldCanvas) oldCanvas.remove();
  const oldOverlay = document.getElementById(previewOverlayId);
  if (oldOverlay) oldOverlay.remove();
  const oldSelect = document.getElementById(previewSelectId);
  if (oldSelect) oldSelect.remove();
  const oldSwitch = document.getElementById(previewSwitchId);
  if (oldSwitch) oldSwitch.remove();

  const startStream = async deviceId => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
      audio: false,
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    activeDeviceId = stream.getVideoTracks()[0]?.getSettings()?.deviceId || deviceId || null;
    video.srcObject = stream;
    await video.play();
  };

  const refreshCameraList = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    cameraDevices = devices.filter(device => device.kind === "videoinput");

    if (!cameraSelect) {
      return;
    }

    cameraSelect.innerHTML = "";
    cameraDevices.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `Camera ${index + 1}`;
      cameraSelect.appendChild(option);
    });

    if (activeDeviceId) {
      cameraSelect.value = activeDeviceId;
    }

    const canSwitch = cameraDevices.length > 1;
    cameraSelect.style.display = canSwitch ? "block" : "none";
    switchButton.style.display = canSwitch ? "block" : "none";
  };

  video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;

  await startStream();

  canvas = document.createElement("canvas");
  ctx = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  canvas.id = previewCanvasId;
  canvas.style.position = "fixed";
  canvas.style.bottom = "20px";
  canvas.style.left = "20px";
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.zIndex = "99999";
  canvas.style.display = "none";

  document.body.appendChild(canvas);

  overlay = document.createElement("pre");
  overlay.id = previewOverlayId;
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
  overlay.innerText = "LOADING";

  document.body.appendChild(overlay);

  cameraSelect = document.createElement("select");
  cameraSelect.id = previewSelectId;
  cameraSelect.style.position = "fixed";
  cameraSelect.style.bottom = `${height + 30}px`;
  cameraSelect.style.left = "20px";
  cameraSelect.style.zIndex = "100001";
  cameraSelect.style.maxWidth = "260px";
  cameraSelect.addEventListener("change", async event => {
    const nextDeviceId = event.target.value;
    if (!nextDeviceId || nextDeviceId === activeDeviceId) {
      return;
    }
    await startStream(nextDeviceId);
    await refreshCameraList();
  });
  document.body.appendChild(cameraSelect);

  switchButton = document.createElement("button");
  switchButton.id = previewSwitchId;
  switchButton.textContent = "Switch Camera";
  switchButton.style.position = "fixed";
  switchButton.style.bottom = `${height + 30}px`;
  switchButton.style.left = "290px";
  switchButton.style.zIndex = "100001";
  switchButton.addEventListener("click", async () => {
    if (cameraDevices.length < 2) {
      return;
    }

    const currentIndex = cameraDevices.findIndex(device => device.deviceId === activeDeviceId);
    const nextIndex = (currentIndex + 1) % cameraDevices.length;
    const nextDeviceId = cameraDevices[nextIndex].deviceId;
    await startStream(nextDeviceId);
    await refreshCameraList();
  });
  document.body.appendChild(switchButton);

  await refreshCameraList();
  requestAnimationFrame(processFrame);

  console.log("Camera started");
}

function processFrame() {
  if (!video || video.readyState < 2) {
    requestAnimationFrame(processFrame);
    return;
  }

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
