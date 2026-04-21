// HW Week 4
// Can run with different camera source (pick from the browser)

window.shared = window.shared || { id: null };

let video;
let canvas;
let ctx;
let sourceCanvas;
let sourceCtx;
let equirectCanvas;
let equirectCtx;
let sampleCanvas;
let sampleCtx;
let sphereTextureCanvas;
let sphereTextureCtx;
let stream;
let cameraDevices = [];
let activeDeviceId = null;
let cameraSelect;
let switchButton;
let asciiToggleButton;
let controlsWrap;

let isAsciiMode = true;
let useInstaTopHalf = false;
let cropInstaTopHalf = false;
let useObsFeed = false;
let forceTwoToOneCanvas = false;
let activeTrackLabel = "";
let gridRows = 800;

let cameraStarted = false;
let remoteFrameReady = false;
let startListenerAttached = false;
let rafStarted = false;

let sceneModel = null;
let sceneSphere = null;
const sphereTextureChannel = 7;
const useSampleDebugTexture = false;
const sampleDebugTexturePath = "../media/textures/360photo.jpg";
const sphereYawFix = Math.PI - Math.PI / 2; // keep seam at back, then rotate 90deg right
const sphereRollFix = 0;
const textureQuarterTurns = 3; // keep poles at top/bottom (avoid side pinch artifacts)
const sphereOpacity = 1.0;

const gridCols = 800;
const charAspect = 0.58; // average monospace glyph width / height
const maxSourceWidth = 1280;
const maxTextureWidth = 1024;
const equirectAspect = 2; // 2:1 equirectangular panorama
const maxPreviewWidth = 560;
const previewBottom = 20;
const broadcastIntervalMs = 120;
let lastBroadcastMs = 0;

const ascii =
  "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,^`'.";

const isVrClient = () => {
  if (window.isHeadset) {
    return true;
  }
  const ua = (navigator.userAgent || "").toLowerCase();
  return (
    ua.includes("oculusbrowser") ||
    ua.includes("quest") ||
    ua.includes("pico") ||
    ua.includes("vive") ||
    ua.includes("wolvic") ||
    ua.includes("vision")
  );
};

const ensureSphereTexture = () => {
  if (!sceneModel || !sceneSphere || !canvas) {
    return;
  }
  const textureSource = getSphereTextureSource();
  sceneModel.txtrSrc(sphereTextureChannel, textureSource);
  sceneSphere.color(1, 1, 1).opacity(sphereOpacity).txtr(sphereTextureChannel);
};

const getSphereTextureSource = () => {
  if (!canvas) {
    return canvas;
  }

  const turns = ((textureQuarterTurns % 4) + 4) % 4;
  if (turns === 0) {
    return canvas;
  }

  if (!sphereTextureCanvas) {
    sphereTextureCanvas = document.createElement("canvas");
    sphereTextureCtx = sphereTextureCanvas.getContext("2d");
  }

  const swapWH = turns % 2 === 1;
  const outW = swapWH ? canvas.height : canvas.width;
  const outH = swapWH ? canvas.width : canvas.height;

  if (sphereTextureCanvas.width !== outW || sphereTextureCanvas.height !== outH) {
    sphereTextureCanvas.width = outW;
    sphereTextureCanvas.height = outH;
  }

  sphereTextureCtx.save();
  sphereTextureCtx.clearRect(0, 0, outW, outH);
  sphereTextureCtx.translate(outW * 0.5, outH * 0.5);
  sphereTextureCtx.rotate(turns * (Math.PI / 2));
  sphereTextureCtx.drawImage(
    canvas,
    -canvas.width * 0.5,
    -canvas.height * 0.5,
    canvas.width,
    canvas.height,
  );
  sphereTextureCtx.restore();

  return sphereTextureCanvas;
};

const applyPreviewPosition = bottom => {
  if (!canvas) {
    return;
  }
  canvas.style.setProperty("position", "fixed", "important");
  canvas.style.setProperty("left", "auto", "important");
  canvas.style.setProperty("top", "auto", "important");
  canvas.style.setProperty("right", "20px", "important");
  canvas.style.setProperty("bottom", `${bottom}px`, "important");
};

const ensureRenderTargets = attachPreview => {
  if (!canvas) {
    sourceCanvas = document.createElement("canvas");
    sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });

    equirectCanvas = document.createElement("canvas");
    equirectCtx = equirectCanvas.getContext("2d");

    sampleCanvas = document.createElement("canvas");
    sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

    canvas = document.createElement("canvas");
    canvas.id = "text-ascii-sphere-preview";
    canvas._animate = true;
    ctx = canvas.getContext("2d");
  }

  if (attachPreview && !document.getElementById("text-ascii-sphere-preview")) {
    applyPreviewPosition(previewBottom);
    canvas.style.zIndex = "99999";
    canvas.style.background = "black";
    canvas.style.pointerEvents = "none";
    document.body.appendChild(canvas);
  }
};

const inferInstaTopHalf = () => {
  const selectedLabel = (
    cameraDevices.find(device => device.deviceId === activeDeviceId)?.label || ""
  ).toLowerCase();
  const label = `${selectedLabel} ${activeTrackLabel}`.toLowerCase();
  return (
    label.includes("insta360") ||
    label.includes("insta 360") ||
    label.includes("x3")
  );
};

const inferObsFeed = () => {
  const selectedLabel = (
    cameraDevices.find(device => device.deviceId === activeDeviceId)?.label || ""
  ).toLowerCase();
  const label = `${selectedLabel} ${activeTrackLabel}`.toLowerCase();
  return (
    label.includes("obs") ||
    label.includes("virtual camera") ||
    label.includes("virtualcam")
  );
};

const getInstaEquirectDimensions = preferredWidth => {
  let width = Math.max(2, Math.round(preferredWidth));
  if (width % 2 !== 0) {
    width -= 1;
  }
  return {
    width,
    height: Math.max(2, Math.round(width / equirectAspect)),
  };
};

const configureCanvasForVideo = () => {
  if (!video || !canvas) {
    return;
  }

  const sourceWidth = video.videoWidth || 1280;
  const sourceHeight = video.videoHeight || 720;
  const sourceScale = Math.min(1, maxSourceWidth / sourceWidth);
  const workSourceWidth = Math.max(2, Math.round(sourceWidth * sourceScale));
  const workSourceHeight = Math.max(2, Math.round(sourceHeight * sourceScale));
  const workSourceAspect = workSourceWidth / workSourceHeight;

  sourceCanvas.width = workSourceWidth;
  sourceCanvas.height = workSourceHeight;

  useInstaTopHalf = inferInstaTopHalf();
  useObsFeed = inferObsFeed();
  forceTwoToOneCanvas = useInstaTopHalf || useObsFeed;
  cropInstaTopHalf = useInstaTopHalf && workSourceAspect <= 1.2;

  let textureWidth = Math.max(
    2,
    Math.round(Math.min(maxTextureWidth, workSourceWidth)),
  );
  let textureHeight = Math.max(
    2,
    Math.round(textureWidth / (workSourceWidth / workSourceHeight)),
  );

  if (forceTwoToOneCanvas) {
    // Insta360/OBS sources are normalized to 2:1 output canvas.
    const instaDims = getInstaEquirectDimensions(textureWidth);
    textureWidth = instaDims.width;
    textureHeight = instaDims.height;
  }

  equirectCanvas.width = textureWidth;
  equirectCanvas.height = textureHeight;
  canvas.width = textureWidth;
  canvas.height = textureHeight;

  if (!isVrClient()) {
    const previewScale = Math.min(1, maxPreviewWidth / textureWidth);
    const previewWidth = Math.round(textureWidth * previewScale);
    const previewHeight = Math.round(textureHeight * previewScale);
    const controlsBottom = previewBottom + previewHeight + 10;

    canvas.style.width = `${previewWidth}px`;
    canvas.style.height = `${previewHeight}px`;
    applyPreviewPosition(previewBottom);

    if (controlsWrap) {
      controlsWrap.style.bottom = `${controlsBottom}px`;
    }
  }

  gridRows = Math.max(
    18,
    Math.round((textureHeight / textureWidth) * gridCols * charAspect),
  );
  sampleCanvas.width = gridCols;
  sampleCanvas.height = gridRows;
};

const renderPackedToCanvas = (packedPixels, cols, rows, useAscii) => {
  if (!canvas || !ctx || !packedPixels || !cols || !rows) {
    return;
  }

  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;
  const fontSize = Math.max(8, Math.floor(cellHeight));

  // Always clear to an opaque base first so headset compositing never sees
  // transparent gaps from subpixel cell edges.
  ctx.globalAlpha = 1;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (useAscii) {
    ctx.fillStyle = "#00ff66";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${fontSize}px monospace`;
  }

  let p = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++, p++) {
      const value = packedPixels[p] || 0;
      const r = (value >> 16) & 255;
      const g = (value >> 8) & 255;
      const b = value & 255;

      if (useAscii) {
        const brightness = (r + g + b) / 3;
        const charIndex = Math.floor((brightness / 255) * (ascii.length - 1));
        const glyph = ascii[charIndex] || " ";
        ctx.fillText(
          glyph,
          x * cellWidth + cellWidth * 0.5,
          y * cellHeight + cellHeight * 0.5,
        );
      } else {
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
      }
    }
  }
};

const publishSharedFrame = packedPixels => {
  const now = Date.now();
  if (now - lastBroadcastMs < broadcastIntervalMs) {
    return;
  }
  lastBroadcastMs = now;

  if (typeof server === "undefined" || !server.broadcastGlobal) {
    return;
  }

  const sharedState = window.shared;
  sharedState.id = window.clientID ?? "desktop";
  sharedState.frame = (sharedState.frame || 0) + 1;
  sharedState.cols = gridCols;
  sharedState.rows = gridRows;
  sharedState.width = canvas.width;
  sharedState.height = canvas.height;
  sharedState.isAsciiMode = isAsciiMode;
  sharedState.pixels = packedPixels.slice();

  server.broadcastGlobal("shared");
};

const consumeSharedFrame = () => {
  if (typeof server === "undefined" || !server.synchronize) {
    return;
  }

  const synced = server.synchronize("shared");
  if (synced && typeof synced === "object") {
    window.shared = synced;
  }

  const sharedState = window.shared;
  if (
    !sharedState ||
    !Array.isArray(sharedState.pixels) ||
    sharedState.pixels.length === 0
  ) {
    return;
  }

  ensureRenderTargets(false);

  if (
    canvas.width !== sharedState.width ||
    canvas.height !== sharedState.height
  ) {
    canvas.width = sharedState.width || 1024;
    canvas.height = sharedState.height || 512;
  }

  renderPackedToCanvas(
    sharedState.pixels,
    sharedState.cols || gridCols,
    sharedState.rows || gridRows,
    !!sharedState.isAsciiMode,
  );

  remoteFrameReady = true;
};

const waitForVideoMetadata = async () => {
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    return;
  }
  await new Promise(resolve => {
    video.addEventListener("loadedmetadata", resolve, { once: true });
  });
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

const startStream = async deviceId => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }

  const constraints = {
    audio: false,
    video: deviceId ? { deviceId: { exact: deviceId } } : true,
  };

  stream = await navigator.mediaDevices.getUserMedia(constraints);
  activeTrackLabel = (stream.getVideoTracks()[0]?.label || "").toLowerCase();
  activeDeviceId =
    stream.getVideoTracks()[0]?.getSettings()?.deviceId || deviceId || null;
  video.srcObject = stream;
  await video.play();
  await waitForVideoMetadata();
  configureCanvasForVideo();
};

const processFrame = () => {
  if (!cameraStarted || !video || video.readyState < 2) {
    requestAnimationFrame(processFrame);
    return;
  }

  sourceCtx.drawImage(video, 0, 0, sourceCanvas.width, sourceCanvas.height);

  if (useInstaTopHalf && cropInstaTopHalf) {
    const cropHeight = Math.max(2, Math.floor(sourceCanvas.height * 0.5));
    equirectCtx.drawImage(
      sourceCanvas,
      0,
      0,
      sourceCanvas.width,
      cropHeight,
      0,
      0,
      equirectCanvas.width,
      equirectCanvas.height,
    );
  } else if (forceTwoToOneCanvas) {
    // Keep the full source frame while fitting it into forced 2:1 output.
    const scale = Math.min(
      equirectCanvas.width / sourceCanvas.width,
      equirectCanvas.height / sourceCanvas.height,
    );
    const drawWidth = Math.max(1, Math.round(sourceCanvas.width * scale));
    const drawHeight = Math.max(1, Math.round(sourceCanvas.height * scale));
    const dx = Math.floor((equirectCanvas.width - drawWidth) * 0.5);
    const dy = Math.floor((equirectCanvas.height - drawHeight) * 0.5);
    equirectCtx.fillStyle = "black";
    equirectCtx.fillRect(0, 0, equirectCanvas.width, equirectCanvas.height);
    equirectCtx.drawImage(
      sourceCanvas,
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
      dx,
      dy,
      drawWidth,
      drawHeight,
    );
  } else {
    equirectCtx.drawImage(
      video,
      0,
      0,
      equirectCanvas.width,
      equirectCanvas.height,
    );
  }

  sampleCtx.drawImage(
    equirectCanvas,
    0,
    0,
    sampleCanvas.width,
    sampleCanvas.height,
  );

  const frame = sampleCtx.getImageData(
    0,
    0,
    sampleCanvas.width,
    sampleCanvas.height,
  );
  const data = frame.data;

  const packedPixels = new Array(gridCols * gridRows);
  for (let i = 0, p = 0; p < packedPixels.length; p++, i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    packedPixels[p] = (r << 16) | (g << 8) | b;
  }

  renderPackedToCanvas(packedPixels, gridCols, gridRows, isAsciiMode);
  publishSharedFrame(packedPixels);

  requestAnimationFrame(processFrame);
};

const buildDesktopControls = () => {
  controlsWrap = document.createElement("div");
  controlsWrap.id = "text-ascii-sphere-controls";
  controlsWrap.style.position = "fixed";
  controlsWrap.style.right = "20px";
  controlsWrap.style.bottom = "0px";
  controlsWrap.style.zIndex = "100001";
  controlsWrap.style.display = "flex";
  controlsWrap.style.gap = "10px";

  cameraSelect = document.createElement("select");
  cameraSelect.style.maxWidth = "260px";
  cameraSelect.addEventListener("change", async event => {
    const nextDeviceId = event.target.value;
    if (!nextDeviceId || nextDeviceId === activeDeviceId) {
      return;
    }
    await startStream(nextDeviceId);
    await refreshCameraList();
    configureCanvasForVideo();
  });
  controlsWrap.appendChild(cameraSelect);

  switchButton = document.createElement("button");
  switchButton.textContent = "Switch Camera";
  switchButton.addEventListener("click", async () => {
    if (cameraDevices.length < 2) {
      return;
    }
    const currentIndex = cameraDevices.findIndex(
      device => device.deviceId === activeDeviceId,
    );
    const nextIndex = (currentIndex + 1) % cameraDevices.length;
    const nextDeviceId = cameraDevices[nextIndex].deviceId;
    await startStream(nextDeviceId);
    await refreshCameraList();
    configureCanvasForVideo();
  });
  controlsWrap.appendChild(switchButton);

  asciiToggleButton = document.createElement("button");
  asciiToggleButton.textContent = "ASCII: ON";
  asciiToggleButton.addEventListener("click", () => {
    isAsciiMode = !isAsciiMode;
    asciiToggleButton.textContent = isAsciiMode ? "ASCII: ON" : "ASCII: OFF";
  });
  controlsWrap.appendChild(asciiToggleButton);

  document.body.appendChild(controlsWrap);
};

const initCamera = async () => {
  const oldCanvas = document.getElementById("text-ascii-sphere-preview");
  if (oldCanvas) oldCanvas.remove();
  const oldControls = document.getElementById("text-ascii-sphere-controls");
  if (oldControls) oldControls.remove();

  video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;

  ensureRenderTargets(true);
  buildDesktopControls();

  await startStream();
  await refreshCameraList();
  configureCanvasForVideo();

  if (!rafStarted) {
    rafStarted = true;
    requestAnimationFrame(processFrame);
  }

  console.log("Camera started");
};

const onUserStart = async () => {
  startListenerAttached = false;
  if (cameraStarted || isVrClient()) {
    return;
  }
  try {
    await initCamera();
    cameraStarted = true;
  } catch (error) {
    console.error("Failed to start text-ascii-sphere camera:", error);
    if (!startListenerAttached) {
      startListenerAttached = true;
      window.addEventListener("pointerdown", onUserStart, { once: true });
    }
  }
};

export const init = async model => {
  sceneModel = model;
  sceneSphere = model
    .add("sphere")
    .turnY(sphereYawFix)
    .turnZ(sphereRollFix)
    .scale(-80, 80, 80)
    .dull()
    .opacity(sphereOpacity)
    .color(0.05, 0.05, 0.05);

  if (useSampleDebugTexture) {
    sceneModel.txtrSrc(sphereTextureChannel, sampleDebugTexturePath);
    sceneSphere.color(1, 1, 1).opacity(sphereOpacity).txtr(sphereTextureChannel);
  }

  console.log(
    isVrClient()
      ? "Headset device detected, waiting for shared texture (no camera access)."
      : "Desktop device detected, click scene to start camera.",
  );
  if (isVrClient()) {
	
    ensureRenderTargets(false);
  } else if (!startListenerAttached && !cameraStarted) {
    startListenerAttached = true;
    window.addEventListener("pointerdown", onUserStart, { once: true });
  }

  model.animate(() => {
    if (useSampleDebugTexture) {
      return;
    }

    if (isVrClient()) {
      consumeSharedFrame();
    }

    if (cameraStarted || remoteFrameReady) {
      ensureSphereTexture();
    }
  });
};
