import * as cg from '../render/core/cg.js';
import { ControllerBeam } from '../render/core/controllerInput.js';

const HAND_LEFT = 'left';
const HAND_RIGHT = 'right';

// Rectangle is always centered in view at this forward distance from head.
const RECT_DEPTH = 0.85;
const EDGE_THICKNESS = 0.003;
const MIN_WORLD_WIDTH = 0.14;
const MAX_WORLD_WIDTH = 0.9;
const MIN_WORLD_HEIGHT = 0.1;
const MAX_WORLD_HEIGHT = 0.7;

// Hand spread mapping to crop size in captured desktop frame.
const HAND_WIDTH_FOR_FULL_CROP = 0.65;
const HAND_HEIGHT_FOR_FULL_CROP = 0.45;
const MIN_CROP_NORM = 0.08;
const MAX_CROP_NORM = 0.95;

// Rectangle lock / resize behavior.
const LOCK_STABLE_SECONDS = 2;
const LOCK_STABLE_MOVE_THRESHOLD = 0.12;
const LOCK_PROGRESS_TRIGGER = 0.88;
const LOCK_REARM_DELAY_SECONDS = 0.25;
const RESIZE_UNLOCK_MOVE_THRESHOLD = 0.03;
const LOCK_UI_RADIUS = 0.02;
const LOCK_UI_OFFSET_UP = 0.05;
const LOCK_UI_LABEL_SCALE = 0.3;
const FULL_VIEW_DOWNLOAD_NAME = 'lasso-strict-full-view.png';
const SAVE_BUTTON_HALF_WIDTH = 0.045;
const SAVE_BUTTON_HALF_HEIGHT = 0.018;
const SAVE_BUTTON_HALF_DEPTH = 0.008;
const SAVE_BUTTON_OFFSET_X = 0.08;
const SAVE_BUTTON_OFFSET_Y = 0.02;
const SAVE_BUTTON_OFFSET_Z = 0.03;
const CAPTURE_HOVER_OPACITY = 0.5;
const CAPTURE_NORMAL_OPACITY = 1;
const CAPTURE_DRAG_ROT_GAIN = 3.2;
const BEAM_CURSOR_SCALE = 0.012;
const SAVE_BUTTON_HOVER_OPACITY = 0.5;
const SAVE_BUTTON_NORMAL_OPACITY = 0.95;
const HAND_POINTER_FORWARD_OFFSET = 0.1;
const HOVER_HAPTIC_INTENSITY = 0.35;
const HOVER_HAPTIC_MS = 25;
const CLICK_HAPTIC_INTENSITY = 0.8;
const CLICK_HAPTIC_MS = 45;
const DRAG_SOUND_INTERVAL = 0.06;
const SAVE_SFX_URL = '/media/sound/SFXs/demoDraw/SFX_Draw_Magic_Mono_01.wav';
const CAPTURE_REQUEST_TIMEOUT_MS = 7000;
const MAX_SHARED_TEXTURE_EDGE = 512;
const MIN_SHARED_TEXTURE_EDGE = 256;
const MAX_SHARED_TEXTURE_DATA_URL_LEN = 80000;

let screenCanvas = null;
let screenCtx = null;
let screenCaptureActive = false;
let screenCaptureVideo = null;
let screenCaptureStream = null;
let screenCaptureTimer = null;
let screenCaptureStarting = false;
const LASSO_STRICT_SHARED_KEY = '__lassoStrictSharedCapture';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function defaultSharedCaptureState() {
  return {
    request: null,
    response: null,
    saveRequest: null,
  };
}

function commitSharedCaptureState(sharedCaptureState) {
  if (typeof window !== 'undefined') {
    window[LASSO_STRICT_SHARED_KEY] = sharedCaptureState;
    window.lassoStrictSharedCaptureState = sharedCaptureState;
  }
  return sharedCaptureState;
}

function createCaptureRequestId() {
  return `${clientID}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function canvasToDataUrl(canvas, mimeType = 'image/png', quality = undefined) {
  try {
    return canvas.toDataURL(mimeType, quality);
  } catch (err) {
    console.error('[lasso-strict] failed to serialize canvas:', err, mimeType);
    return null;
  }
}

function makeSerializableTextureCanvas(canvas, maxEdge = MAX_SHARED_TEXTURE_EDGE) {
  if (!canvas) return null;
  const srcW = canvas.width || 0;
  const srcH = canvas.height || 0;
  const longest = Math.max(srcW, srcH);
  if (longest <= 0) return canvas;
  if (longest <= maxEdge) return canvas;
  const scale = maxEdge / longest;
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));
  const out = document.createElement('canvas');
  out.width = dstW;
  out.height = dstH;
  const ctx = out.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(canvas, 0, 0, dstW, dstH);
  return out;
}

function serializeCaptureCanvas(
  canvas,
  maxEdge = MAX_SHARED_TEXTURE_EDGE,
  maxDataUrlLength = MAX_SHARED_TEXTURE_DATA_URL_LEN
) {
  if (!canvas) return null;
  const encoders = [
    { mimeType: 'image/webp', quality: 0.82 },
    { mimeType: 'image/jpeg', quality: 0.82 },
    { mimeType: 'image/png', quality: undefined },
  ];
  const source = canvas;
  let edge = maxEdge;
  let best = null;

  for (let attempt = 0; attempt < 7; attempt++) {
    const working = makeSerializableTextureCanvas(source, edge);
    for (const encoder of encoders) {
      const dataUrl = canvasToDataUrl(working, encoder.mimeType, encoder.quality);
      if (!dataUrl) continue;
      const candidate = {
        canvas: working,
        dataUrl,
        mimeType: encoder.mimeType,
        quality: encoder.quality,
        length: dataUrl.length,
      };
      if (!best || candidate.length < best.length) best = candidate;
      if (candidate.length <= maxDataUrlLength) return candidate;
    }
    if (edge <= MIN_SHARED_TEXTURE_EDGE) break;
    edge = Math.max(MIN_SHARED_TEXTURE_EDGE, Math.floor(edge * 0.75));
  }
  return best;
}

function getAudioCtx(audioCtxRef) {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtxRef.ctx) audioCtxRef.ctx = new Ctx();
  const ctx = audioCtxRef.ctx;
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function playTone(
  ctx,
  startHz,
  endHz,
  attackSec,
  releaseSec,
  type = 'sine',
  peakGain = 0.09
) {
  if (!ctx) return;
  const now = ctx.currentTime;
  const dur = Math.max(0.03, attackSec + releaseSec);
  const start = Math.max(40, startHz);
  const end = Math.max(40, endHz);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(start, now);
  osc.frequency.exponentialRampToValueAtTime(end, now + dur);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + attackSec);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

function playNoiseBurst(ctx, durationSec = 0.05, peakGain = 0.08) {
  if (!ctx) return;
  const length = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(peakGain, now);
  gain.gain.linearRampToValueAtTime(0, now + durationSec);
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(now);
}

function playBuffer(ctx, buffer, gainValue = 0.25) {
  if (!ctx || !buffer) return;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, ctx.currentTime);
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(ctx.currentTime);
}

function isVec3(v) {
  return (
    !!v &&
    v.length >= 3 &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1]) &&
    Number.isFinite(v[2])
  );
}

function setEdgeFromEndpoints(node, p1, p2, thickness = EDGE_THICKNESS) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) {
    node.setMatrix(cg.mScale(0));
    return;
  }
  const fx = dx / len;
  const fy = dy / len;
  const fz = dz / len;

  let ux = 0,
    uy = 1,
    uz = 0;
  if (Math.abs(fy) > 0.9) {
    ux = 1;
    uy = 0;
    uz = 0;
  }

  let rx = fy * uz - fz * uy;
  let ry = fz * ux - fx * uz;
  let rz = fx * uy - fy * ux;
  const rLen = Math.hypot(rx, ry, rz) || 1;
  rx /= rLen;
  ry /= rLen;
  rz /= rLen;

  const tx = ry * fz - rz * fy;
  const ty = rz * fx - rx * fz;
  const tz = rx * fy - ry * fx;

  const mx = (p1[0] + p2[0]) / 2;
  const my = (p1[1] + p2[1]) / 2;
  const mz = (p1[2] + p2[2]) / 2;

  node.setMatrix([
    rx * thickness,
    ry * thickness,
    rz * thickness,
    0,
    tx * thickness,
    ty * thickness,
    tz * thickness,
    0,
    fx * (len / 2),
    fy * (len / 2),
    fz * (len / 2),
    0,
    mx,
    my,
    mz,
    1,
  ]);
}

function shouldOwnDisplayCapture() {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function'
  );
}

function stopDesktopScreenCapture({ clearCanvas = false } = {}) {
  if (screenCaptureTimer) {
    clearInterval(screenCaptureTimer);
    screenCaptureTimer = null;
  }
  if (screenCaptureVideo) {
    screenCaptureVideo.pause();
    screenCaptureVideo.srcObject = null;
    screenCaptureVideo = null;
  }
  if (screenCaptureStream) {
    for (const track of screenCaptureStream.getTracks()) track.stop();
    screenCaptureStream = null;
  }
  screenCaptureActive = false;
  screenCaptureStarting = false;
  if (clearCanvas && screenCanvas) {
    const ctx = screenCanvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, screenCanvas.width, screenCanvas.height);
    screenCanvas.width = 0;
    screenCanvas.height = 0;
  }
}

async function startDesktopScreenCapture() {
  if (screenCaptureStarting) return false;
  stopDesktopScreenCapture();
  screenCaptureStarting = true;
  screenCaptureActive = true;
  screenCanvas =
    document.getElementById('textureCanvas') ||
    window.textureCanvas ||
    screenCanvas ||
    document.createElement('canvas');
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    screenCaptureStream = stream;
    const video = document.createElement('video');
    screenCaptureVideo = video;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = stream;
    const [track] = stream.getVideoTracks();
    if (track)
      track.addEventListener('ended', () => {
        console.log('[lasso-strict] screen share ended');
        stopDesktopScreenCapture({ clearCanvas: true });
      });
    video.onloadedmetadata = () => {
      video.play().catch((err) => {
        console.error('[lasso-strict] screen video play failed:', err);
      });
      setTimeout(() => {
        if (!screenCanvas || !screenCaptureVideo) return;
        screenCanvas.width = video.videoWidth;
        screenCanvas.height = video.videoHeight;
        screenCtx = screenCanvas.getContext('2d', { willReadFrequently: true });
        if (screenCaptureTimer) clearInterval(screenCaptureTimer);
        screenCaptureTimer = setInterval(() => {
          if (!screenCaptureVideo || screenCaptureVideo.readyState < 2) return;
          if (!screenCtx) screenCtx = screenCanvas.getContext('2d');
          if (!screenCtx) return;
          screenCtx.drawImage(screenCaptureVideo, 0, 0);
        }, 30);
      }, 1000);
    };
    video.onerror = (err) => {
      console.error('[lasso-strict] screen capture video error:', err);
    };
    screenCaptureStarting = false;
    return true;
  } catch (err) {
    console.error('[lasso-strict] getDisplayMedia failed:', err);
    stopDesktopScreenCapture();
    return false;
  }
}

async function repickDesktopScreenCapture() {
  console.log('[lasso-strict] repicking desktop screen share');
  return startDesktopScreenCapture();
}

function captureCenterCropCanvas(widthNorm, heightNorm) {
  if (!screenCanvas || !screenCtx) return null;
  const sw = screenCanvas.width;
  const sh = screenCanvas.height;
  if (sw < 2 || sh < 2) return null;

  const cropW = clamp(Math.round(sw * widthNorm), 8, sw);
  const cropH = clamp(Math.round(sh * heightNorm), 8, sh);
  const sx = clamp(Math.round(sw / 2 - cropW / 2), 0, sw - cropW);
  const sy = clamp(Math.round(sh / 2 - cropH / 2), 0, sh - cropH);

  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = cropW;
  targetCanvas.height = cropH;
  const outCtx = targetCanvas.getContext('2d');
  if (!outCtx) return null;
  outCtx.clearRect(0, 0, cropW, cropH);
  outCtx.drawImage(screenCanvas, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
  return targetCanvas;
}

function captureFullViewCanvas() {
  if (!screenCanvas || !screenCtx) return null;
  const sw = screenCanvas.width;
  const sh = screenCanvas.height;
  if (sw < 2 || sh < 2) return null;
  const out = document.createElement('canvas');
  out.width = sw;
  out.height = sh;
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(screenCanvas, 0, 0, sw, sh, 0, 0, sw, sh);
  return out;
}

function downloadCanvas(canvas, filename) {
  if (!canvas) return;
  try {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  } catch (err) {
    console.error('[lasso-strict] download failed:', err);
  }
}

export const init = async (model) => {
  server.init(LASSO_STRICT_SHARED_KEY, defaultSharedCaptureState());
  let sharedCaptureState = commitSharedCaptureState(
    server.synchronize(LASSO_STRICT_SHARED_KEY)
  );
  let lastStartedCaptureRequestId = null;
  let lastProcessedCaptureResponseId = null;
  let lastProcessedSaveRequestId = null;
  let pendingLocalCaptureRequestId = null;
  let pendingLocalCaptureDeadline = 0;

  if (typeof window !== 'undefined' && shouldOwnDisplayCapture()) {
    window.lassoStrictRepickScreenShare = repickDesktopScreenCapture;
    window.lassoStrictStopScreenShare = () =>
      stopDesktopScreenCapture({ clearCanvas: true });
    if (!window.__lassoStrictRepickKeyHandler) {
      window.__lassoStrictRepickKeyHandler = (event) => {
        const target = event.target;
        const tagName = target && target.tagName;
        const isTypingTarget =
          tagName === 'INPUT' ||
          tagName === 'TEXTAREA' ||
          (target && target.isContentEditable);
        if (isTypingTarget) return;
        if (event.shiftKey && event.key.toLowerCase() === 'r') {
          event.preventDefault();
          repickDesktopScreenCapture();
        }
      };
      window.addEventListener('keydown', window.__lassoStrictRepickKeyHandler);
    }
  }
  if (!screenCaptureActive && shouldOwnDisplayCapture()) {
    startDesktopScreenCapture();
  } else if (
    shouldOwnDisplayCapture() &&
    screenCaptureActive &&
    (!screenCaptureStream || !screenCaptureVideo)
  ) {
    console.warn(
      '[lasso-strict] capture flagged active but no live stream/video is attached. Use Shift+R to repick.'
    );
  } else if (!shouldOwnDisplayCapture()) {
    console.warn(
      '[lasso-strict] getDisplayMedia is not available on this client. Screen share must be started from a browser that supports it.'
    );
  }

  const handInput = {
    left: { pos: null, isPressed: false },
    right: { pos: null, isPressed: false },
  };
  const queuedPressHands = [];
  const queuedReleaseHands = [];
  const updateHandFromInputEvent = (hand) => {
    const p = inputEvents.pos(hand);
    if (isVec3(p)) handInput[hand].pos = p.slice();
  };

  const readPressedState = (hand) => {
    if (inputEvents && typeof inputEvents.isPressed === 'function')
      return !!inputEvents.isPressed(hand);
    return !!(handInput[hand] && handInput[hand].isPressed);
  };

  inputEvents.onMove = (hand) => {
    if (hand !== HAND_LEFT && hand !== HAND_RIGHT) return;
    updateHandFromInputEvent(hand);
  };

  inputEvents.onDrag = (hand) => {
    if (hand !== HAND_LEFT && hand !== HAND_RIGHT) return;
    updateHandFromInputEvent(hand);
  };

  inputEvents.onPress = (hand) => {
    if (hand !== HAND_LEFT && hand !== HAND_RIGHT) return;
    handInput[hand].isPressed = true;
    updateHandFromInputEvent(hand);
    queuedPressHands.push(hand);
  };

  inputEvents.onRelease = (hand) => {
    if (hand !== HAND_LEFT && hand !== HAND_RIGHT) return;
    handInput[hand].isPressed = false;
    updateHandFromInputEvent(hand);
    queuedReleaseHands.push(hand);
  };

  const borderRoot = model.add();
  const edges = [0, 1, 2, 3].map(() =>
    borderRoot.add('cube').color(1, 0, 0).opacity(0.95).dull()
  );
  const capturesRoot = model.add();
  const saveButtonRoot = model.add();
  const saveButtonMesh = saveButtonRoot
    .add('cube')
    .color(0.1, 0.65, 0.25)
    .opacity(0.95)
    .dull();
  saveButtonRoot
    .add(clay.text('SAVE'))
    .move(0, 1.2, 0.001)
    .scale(0.2)
    .color(1, 1, 1);
  const beamL = new ControllerBeam(model, HAND_LEFT);
  const beamR = new ControllerBeam(model, HAND_RIGHT);
  const beamCursorL = model
    .add('diskZ')
    .scale(BEAM_CURSOR_SCALE)
    .color(1, 1, 1)
    .opacity(0.9)
    .dull();
  const beamCursorR = model
    .add('diskZ')
    .scale(BEAM_CURSOR_SCALE)
    .color(1, 1, 1)
    .opacity(0.9)
    .dull();

  const createLockProgressUI = () => {
    const root = model.add();
    const border = root.add('diskZ').color(1, 1, 0).opacity(0.95).dull();
    const bg = root
      .add('diskZ')
      .move(0, 0, 0.0002)
      .scale(0.82)
      .color(0, 0, 0)
      .opacity(0.7)
      .dull();
    const fill = root
      .add('diskZ')
      .move(0, 0, 0.0004)
      .scale(0.00001)
      .color(1, 1, 0)
      .opacity(0.9)
      .dull();
    const labelRoot = root.add();
    const ui = {
      root,
      border,
      bg,
      fill,
      labelRoot,
      labelText: null,
    };
    return ui;
  };

  const leftLockUI = createLockProgressUI();
  const rightLockUI = createLockProgressUI();

  let rectWorldWidth = 0.34;
  let rectWorldHeight = 0.22;
  let liveRectMatrix = cg.mIdentity();
  let lastHeadMat = null;
  let lastLeftPos = null;
  let lastRightPos = null;
  let rectLocked = false;
  let lockStableStartTime = -1;
  let lockAnchorLeft = null;
  let lockAnchorRight = null;
  let lockAnchorLeftLocal = null;
  let lockAnchorRightLocal = null;
  let lockRearmUntil = 0;
  let lockedLeftPos = null;
  let lockedRightPos = null;
  let prevHoldProgress = 0;
  const audioCtxRef = { ctx: null };
  let saveSfxBuffer = null;
  let saveSfxLoading = false;
  let saveButtonMatrix = null;
  const capturedSurfaces = [];
  const dragByHand = { left: null, right: null };
  const hoverByHand = { left: false, right: false };
  const lastDragSoundTimeByHand = { left: -999, right: -999 };

  const setBorderColor = (r, g, b) => {
    for (const edge of edges) edge.color(r, g, b);
  };

  const setLockUIVisible = (ui, visible) => {
    if (!visible) ui.root.setMatrix(cg.mScale(0));
  };

  const setLockUILabel = (ui, text, color) => {
    if (ui.labelText === text) {
      if (color) ui.labelRoot.child(0).color(color[0], color[1], color[2]);
      return;
    }
    while (ui.labelRoot.nChildren() > 0) ui.labelRoot.remove(0);
    ui.labelRoot
      .add(clay.text(text))
      .move(0, 1.35, 0.0006)
      .scale(LOCK_UI_LABEL_SCALE)
      .color(color[0], color[1], color[2]);
    ui.labelText = text;
  };

  const updateLockProgressUI = (ui, handPos, headMat, progress, visible) => {
    if (!visible || !isVec3(handPos) || !headMat || headMat.length < 16) {
      setLockUIVisible(ui, false);
      return;
    }
    const xAxis = cg.normalize([headMat[0], headMat[1], headMat[2]]) || [1, 0, 0];
    const yAxis = cg.normalize([headMat[4], headMat[5], headMat[6]]) || [0, 1, 0];
    const zAxis = cg.normalize([headMat[8], headMat[9], headMat[10]]) || [0, 0, 1];
    const center = cg.add(handPos, cg.scale(yAxis, LOCK_UI_OFFSET_UP));
    const r = LOCK_UI_RADIUS;
    ui.root.setMatrix([
      xAxis[0] * r,
      xAxis[1] * r,
      xAxis[2] * r,
      0,
      yAxis[0] * r,
      yAxis[1] * r,
      yAxis[2] * r,
      0,
      zAxis[0] * r,
      zAxis[1] * r,
      zAxis[2] * r,
      0,
      center[0],
      center[1],
      center[2],
      1,
    ]);
    const p = clamp(progress, 0, 1);
    // Red while moving/not holding, yellow while actively holding steady.
    if (p > 0.001) {
      ui.border.color(1, 1, 0);
      ui.fill.color(1, 1, 0);
      setLockUILabel(ui, 'HOLD TO LOCK SIZE', [1, 1, 0]);
    } else {
      ui.border.color(1, 0, 0);
      ui.fill.color(1, 0, 0);
      setLockUILabel(ui, 'MOVE TO RESIZE', [1, 0, 0]);
    }
    const fillScale = Math.max(0.00001, 0.82 * p);
    ui.fill.identity().move(0, 0, 0.0004).scale(fillScale);
  };

  const markUnlocked = () => {
    rectLocked = false;
    setBorderColor(1, 0, 0);
    lockStableStartTime = -1;
    lockAnchorLeft = null;
    lockAnchorRight = null;
    lockAnchorLeftLocal = null;
    lockAnchorRightLocal = null;
    prevHoldProgress = 0;
  };

  const markLocked = (leftPos, rightPos) => {
    rectLocked = true;
    setBorderColor(1, 1, 0);
    lockedLeftPos = leftPos ? leftPos.slice() : null;
    lockedRightPos = rightPos ? rightPos.slice() : null;
    prevHoldProgress = 0;
    const ctx = getAudioCtx(audioCtxRef);
    playTone(ctx, 900, 180, 0.14, 0.28, 'sine', 0.11);
    playNoiseBurst(ctx, 0.05, 0.08);
    console.log('[lasso-strict] lock reached; capture trigger armed');
  };

  const updateHoldSound = (holdProgress, enabled) => {
    if (!enabled) {
      prevHoldProgress = 0;
      return;
    }
    const p = clamp(holdProgress, 0, 1);
    const prev = prevHoldProgress;
    prevHoldProgress = p;

    if (prev === 0 && p > 0) {
      const ctx = getAudioCtx(audioCtxRef);
      playTone(ctx, 320, 480, 0.08, 0.12);
    }
    if (prev < 0.33 && p >= 0.33) {
      const ctx = getAudioCtx(audioCtxRef);
      playTone(ctx, 480, 600, 0.07, 0.1);
    }
    if (prev < 0.66 && p >= 0.66) {
      const ctx = getAudioCtx(audioCtxRef);
      playTone(ctx, 600, 750, 0.07, 0.1);
    }
  };

  let warnedMissingHaptic = false;
  const triggerHaptic = (hand, intensity, durationMs) => {
    if (typeof vibrate !== 'function') return;
    try {
      vibrate(hand, intensity, durationMs);
    } catch (err) {
      if (!warnedMissingHaptic) {
        warnedMissingHaptic = true;
        console.warn(
          '[lasso-strict] haptic skipped (no controller for this hand):',
          hand,
          err && err.message ? err.message : err
        );
      }
    }
  };

  const ensureSaveSfxLoaded = async () => {
    if (saveSfxBuffer || saveSfxLoading) return saveSfxBuffer;
    const ctx = getAudioCtx(audioCtxRef);
    if (!ctx) return null;
    saveSfxLoading = true;
    try {
      const res = await fetch(SAVE_SFX_URL);
      const arrayBuf = await res.arrayBuffer();
      saveSfxBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
    } catch (err) {
      console.warn('[lasso-strict] save sfx load failed:', err);
    } finally {
      saveSfxLoading = false;
    }
    return saveSfxBuffer;
  };

  const playSaveClickSound = () => {
    const ctx = getAudioCtx(audioCtxRef);
    if (!ctx) return;
    if (saveSfxBuffer) {
      playBuffer(ctx, saveSfxBuffer, 0.24);
    } else {
      ensureSaveSfxLoaded();
      playTone(ctx, 640, 440, 0.02, 0.12, 'triangle', 0.07);
    }
  };

  const playHoverFeedback = (hand) => {
    const ctx = getAudioCtx(audioCtxRef);
    playTone(ctx, 520, 780, 0.01, 0.08, 'sine', 0.05);
    triggerHaptic(hand, HOVER_HAPTIC_INTENSITY, HOVER_HAPTIC_MS);
  };

  const playDragSyntheticSound = (hand, speed, nowTime) => {
    if (nowTime - lastDragSoundTimeByHand[hand] < DRAG_SOUND_INTERVAL) return;
    lastDragSoundTimeByHand[hand] = nowTime;
    const ctx = getAudioCtx(audioCtxRef);
    const s = clamp(speed * 120, 0, 1);
    playTone(
      ctx,
      240 + 420 * s,
      180 + 320 * s,
      0.01,
      0.06,
      'triangle',
      0.03 + 0.04 * s
    );
  };

  ensureSaveSfxLoaded();

  const applyRectTransform = (headMat) => {
    const xAxis = cg.normalize([headMat[0], headMat[1], headMat[2]]) || [1, 0, 0];
    const yAxis = cg.normalize([headMat[4], headMat[5], headMat[6]]) || [0, 1, 0];
    const zAxis = cg.normalize([headMat[8], headMat[9], headMat[10]]) || [0, 0, 1];
    const center = cg.mTransform(headMat, [0, 0, -RECT_DEPTH]);

    const hw = rectWorldWidth / 2;
    const hh = rectWorldHeight / 2;
    const xh = cg.scale(xAxis, hw);
    const yh = cg.scale(yAxis, hh);

    const tl = cg.add(cg.subtract(center, xh), yh);
    const tr = cg.add(cg.add(center, xh), yh);
    const br = cg.subtract(cg.add(center, xh), yh);
    const bl = cg.subtract(cg.subtract(center, xh), yh);

    setEdgeFromEndpoints(edges[0], tl, tr);
    setEdgeFromEndpoints(edges[1], tr, br);
    setEdgeFromEndpoints(edges[2], br, bl);
    setEdgeFromEndpoints(edges[3], bl, tl);

    const rectMatrix = [
      xAxis[0] * hw,
      xAxis[1] * hw,
      xAxis[2] * hw,
      0,
      yAxis[0] * hh,
      yAxis[1] * hh,
      yAxis[2] * hh,
      0,
      zAxis[0],
      zAxis[1],
      zAxis[2],
      0,
      center[0],
      center[1],
      center[2],
      1,
    ];
    liveRectMatrix = rectMatrix;
    return rectMatrix;
  };

  const stampCapturedSurface = (textureCanvas, rectMatrix) => {
    if (!textureCanvas || !rectMatrix) return;
    const surf = capturesRoot.add();
    const front = surf.add('square').opacity(1).dull();
    const back = surf.add('square').opacity(1).dull().turnY(Math.PI);
    const matrix = rectMatrix.slice();
    surf.setMatrix(matrix);
    front.setTxtr(textureCanvas);
    const txCh = front._txtr;
    if (txCh != null) back.txtr(txCh);
    capturedSurfaces.push({ node: surf, front, back, matrix, textureChannel: txCh });
  };

  const setCapturedSurfaceOpacity = (item, opacity) => {
    if (!item) return;
    if (item.front && item.back) {
      item.front.opacity(opacity);
      item.back.opacity(opacity);
    } else if (item.node) {
      item.node.opacity(opacity);
    }
  };

  const pointInUnitCube = (point, matrix) => {
    if (!isVec3(point) || !matrix || matrix.length < 16) return false;
    const inv = cg.mInverse(matrix);
    const lp = cg.mTransform(inv, point);
    return Math.abs(lp[0]) <= 1 && Math.abs(lp[1]) <= 1 && Math.abs(lp[2]) <= 1;
  };

  const pointInUnitRect = (point, matrix, zTol = 0.08) => {
    if (!isVec3(point) || !matrix || matrix.length < 16) return false;
    const inv = cg.mInverse(matrix);
    const lp = cg.mTransform(inv, point);
    return Math.abs(lp[0]) <= 1 && Math.abs(lp[1]) <= 1 && Math.abs(lp[2]) <= zTol;
  };

  const pickCapturedSurfaceByPoint = (point) => {
    for (let i = capturedSurfaces.length - 1; i >= 0; i--) {
      const item = capturedSurfaces[i];
      if (pointInUnitRect(point, item.matrix)) return { item, point };
    }
    return null;
  };

  const getHeadForward = (headMat) => {
    if (!headMat || headMat.length < 16) return null;
    return (
      cg.normalize([-headMat[8], -headMat[9], -headMat[10]]) || [0, 0, -1]
    );
  };

  const getHandMarkerPoint = (hand, headMat) => {
    const handPos = handInput[hand] ? handInput[hand].pos : null;
    if (!isVec3(handPos)) return null;
    const fwd = getHeadForward(headMat);
    return fwd
      ? cg.add(handPos, cg.scale(fwd, HAND_POINTER_FORWARD_OFFSET))
      : handPos.slice();
  };

  const getBeamForHand = (hand) => (hand === HAND_LEFT ? beamL : beamR);

  const setBeamCursorMarker = (marker, point, hovered) => {
    if (!isVec3(point)) {
      marker.setMatrix(cg.mScale(0));
      return;
    }
    marker
      .identity()
      .move(point[0], point[1], point[2])
      .scale(BEAM_CURSOR_SCALE)
      .color(hovered ? 1 : 1, hovered ? 1 : 1, hovered ? 0 : 1);
  };

  const getBeamHitOnSurface = (beam, item) => {
    if (!beam || !item || !item.node) return null;
    const m = item.node.getGlobalMatrix();
    if (!m || m.length < 16) return null;
    const uvd = beam.hitRect(m, true);
    if (!uvd) return null;
    const point = beam.hitPoint(m, true);
    if (!isVec3(point)) return null;
    return { item, point };
  };

  const getTopBeamHit = (hand) => {
    const beam = getBeamForHand(hand);
    for (let i = capturedSurfaces.length - 1; i >= 0; i--) {
      const hit = getBeamHitOnSurface(beam, capturedSurfaces[i]);
      if (hit) return hit;
    }
    return null;
  };

  const getBeamHitOnSaveButton = (hand) => {
    const beam = getBeamForHand(hand);
    if (!beam) return null;
    const m = saveButtonRoot.getGlobalMatrix();
    if (!m || m.length < 16) return null;
    const uvd = beam.hitRect(m, true);
    if (!uvd) return null;
    const point = beam.hitPoint(m, true);
    return isVec3(point) ? point : null;
  };

  const getInteractionState = (hand, headMat) => {
    const beamItemHit = getTopBeamHit(hand);
    const beamSavePoint = getBeamHitOnSaveButton(hand);
    const markerPoint = getHandMarkerPoint(hand, headMat);
    const markerItemHit = markerPoint ? pickCapturedSurfaceByPoint(markerPoint) : null;
    const markerSaveHit =
      markerPoint && saveButtonMatrix ? pointInUnitCube(markerPoint, saveButtonMatrix) : false;
    const pressed = !!(handInput[hand] && handInput[hand].isPressed);

    // Hover is beam-driven only (prevents constant "always-hovered" opacity from marker fallback).
    const hoveredItem = beamItemHit ? beamItemHit.item : null;
    const hoveredSave = !!beamSavePoint;
    // Press/drag targeting can still fallback to marker when a hand is actively pressed.
    const actionableItem = beamItemHit
      ? beamItemHit.item
      : pressed && markerItemHit
      ? markerItemHit.item
      : null;
    const actionableSave = !!beamSavePoint || (!!pressed && !!markerSaveHit);
    const pointerPoint = beamItemHit
      ? beamItemHit.point
      : beamSavePoint
      ? beamSavePoint
      : pressed && markerPoint
      ? markerPoint
      : null;

    return {
      hand,
      hoveredItem,
      hoveredSave,
      actionableItem,
      actionableSave,
      hoveredAny: !!hoveredItem || hoveredSave,
      pointerPoint: isVec3(pointerPoint) ? pointerPoint : null,
    };
  };

  const updateSaveButtonPose = (leftPos, headMat) => {
    if (!isVec3(leftPos) || !headMat || headMat.length < 16) {
      saveButtonRoot.setMatrix(cg.mScale(0));
      saveButtonMatrix = null;
      return;
    }
    const xAxis = cg.normalize([headMat[0], headMat[1], headMat[2]]) || [1, 0, 0];
    const yAxis = cg.normalize([headMat[4], headMat[5], headMat[6]]) || [0, 1, 0];
    const zAxis = cg.normalize([headMat[8], headMat[9], headMat[10]]) || [0, 0, 1];
    const center = cg.add(
      cg.add(
        cg.add(leftPos, cg.scale(xAxis, SAVE_BUTTON_OFFSET_X)),
        cg.scale(yAxis, SAVE_BUTTON_OFFSET_Y)
      ),
      cg.scale(zAxis, SAVE_BUTTON_OFFSET_Z)
    );
    saveButtonMatrix = [
      xAxis[0] * SAVE_BUTTON_HALF_WIDTH,
      xAxis[1] * SAVE_BUTTON_HALF_WIDTH,
      xAxis[2] * SAVE_BUTTON_HALF_WIDTH,
      0,
      yAxis[0] * SAVE_BUTTON_HALF_HEIGHT,
      yAxis[1] * SAVE_BUTTON_HALF_HEIGHT,
      yAxis[2] * SAVE_BUTTON_HALF_HEIGHT,
      0,
      zAxis[0] * SAVE_BUTTON_HALF_DEPTH,
      zAxis[1] * SAVE_BUTTON_HALF_DEPTH,
      zAxis[2] * SAVE_BUTTON_HALF_DEPTH,
      0,
      center[0],
      center[1],
      center[2],
      1,
    ];
    saveButtonRoot.setMatrix(saveButtonMatrix);
    saveButtonMesh.color(0.1, 0.65, 0.25);
  };

  const beginDragIfTouchingCapture = (hand, interaction) => {
    if (!interaction || !interaction.actionableItem || !isVec3(interaction.pointerPoint))
      return false;
    const item = interaction.actionableItem;
    const center = [item.matrix[12], item.matrix[13], item.matrix[14]];
    dragByHand[hand] = {
      item,
      offset: cg.subtract(interaction.pointerPoint, center),
      prevPos: interaction.pointerPoint.slice(),
    };
    return true;
  };

  const updateDraggedCapture = (hand, bothPinched, interaction, nowTime) => {
    const drag = dragByHand[hand];
    if (!drag || !handInput[hand].isPressed || bothPinched) return;
    const pos = interaction && isVec3(interaction.pointerPoint) ? interaction.pointerPoint : null;
    if (!isVec3(pos)) return;

    const prev = drag.prevPos || pos;
    const dx = clamp(pos[0] - prev[0], -0.06, 0.06);
    const dy = clamp(pos[1] - prev[1], -0.06, 0.06);
    const dz = clamp(pos[2] - prev[2], -0.06, 0.06);
    const rot = cg.mMultiply(
      cg.mMultiply(
        cg.mRotateY(dx * CAPTURE_DRAG_ROT_GAIN),
        cg.mRotateX(-dy * CAPTURE_DRAG_ROT_GAIN)
      ),
      cg.mRotateZ(dz * CAPTURE_DRAG_ROT_GAIN)
    );
    const m = cg.mMultiply(drag.item.matrix, rot);
    m[12] = pos[0] - drag.offset[0];
    m[13] = pos[1] - drag.offset[1];
    m[14] = pos[2] - drag.offset[2];
    drag.item.matrix = m;
    drag.item.node.setMatrix(m);
    playDragSyntheticSound(hand, cg.distance(pos, prev), nowTime);
    drag.prevPos = pos.slice();
  };

  const updateCaptureHoverState = (leftInteraction, rightInteraction) => {
    for (const item of capturedSurfaces) {
      const hovered =
        (leftInteraction && leftInteraction.hoveredItem === item) ||
        (rightInteraction && rightInteraction.hoveredItem === item);
      setCapturedSurfaceOpacity(
        item,
        hovered ? CAPTURE_HOVER_OPACITY : CAPTURE_NORMAL_OPACITY
      );
    }
    // SAVE button hover is right-hand only.
    const saveHovered = rightInteraction && rightInteraction.hoveredSave;
    saveButtonMesh
      .color(0.1, 0.65, 0.25)
      .opacity(saveHovered ? SAVE_BUTTON_HOVER_OPACITY : SAVE_BUTTON_NORMAL_OPACITY);

    const leftHoverEffective = !!(leftInteraction && leftInteraction.hoveredItem);
    const rightHoverEffective = !!(
      rightInteraction &&
      (rightInteraction.hoveredItem || rightInteraction.hoveredSave)
    );

    setBeamCursorMarker(
      beamCursorL,
      leftInteraction ? leftInteraction.pointerPoint : null,
      leftHoverEffective
    );
    setBeamCursorMarker(
      beamCursorR,
      rightInteraction ? rightInteraction.pointerPoint : null,
      rightHoverEffective
    );

    if (leftHoverEffective && !hoverByHand[HAND_LEFT]) playHoverFeedback(HAND_LEFT);
    if (rightHoverEffective && !hoverByHand[HAND_RIGHT]) playHoverFeedback(HAND_RIGHT);
    hoverByHand[HAND_LEFT] = leftHoverEffective;
    hoverByHand[HAND_RIGHT] = rightHoverEffective;
  };

  const updateRectSizeFromHands = (headMat, leftPos, rightPos) => {
    if (!isVec3(leftPos) || !isVec3(rightPos)) return;
    const invHead = cg.mInverse(headMat);
    const leftLocal = cg.mTransform(invHead, leftPos);
    const rightLocal = cg.mTransform(invHead, rightPos);

    rectWorldWidth = clamp(
      Math.abs(leftLocal[0] - rightLocal[0]),
      MIN_WORLD_WIDTH,
      MAX_WORLD_WIDTH
    );
    rectWorldHeight = clamp(
      Math.abs(leftLocal[1] - rightLocal[1]),
      MIN_WORLD_HEIGHT,
      MAX_WORLD_HEIGHT
    );
  };

  const captureIntoTexture = (rectMatrix) => {
    const widthNorm = clamp(
      rectWorldWidth / HAND_WIDTH_FOR_FULL_CROP,
      MIN_CROP_NORM,
      MAX_CROP_NORM
    );
    const heightNorm = clamp(
      rectWorldHeight / HAND_HEIGHT_FOR_FULL_CROP,
      MIN_CROP_NORM,
      MAX_CROP_NORM
    );
    const captureTextureCanvas = captureCenterCropCanvas(widthNorm, heightNorm);
    if (!captureTextureCanvas) {
      console.warn('[lasso-strict] capture frame not ready yet; will retry');
      return false;
    }
    stampCapturedSurface(captureTextureCanvas, rectMatrix);
    console.log('[lasso-strict] capture complete', {
      width: captureTextureCanvas.width,
      height: captureTextureCanvas.height,
    });
    return true;
  };

  const getAreaCaptureNorm = () => ({
    widthNorm: clamp(
      rectWorldWidth / HAND_WIDTH_FOR_FULL_CROP,
      MIN_CROP_NORM,
      MAX_CROP_NORM
    ),
    heightNorm: clamp(
      rectWorldHeight / HAND_HEIGHT_FOR_FULL_CROP,
      MIN_CROP_NORM,
      MAX_CROP_NORM
    ),
  });

  const hasDesktopFrameReady = () =>
    !!(
      screenCaptureActive &&
      screenCanvas &&
      screenCanvas.width > 1 &&
      screenCanvas.height > 1
    );

  const clearSharedCaptureResponse = (responseId = null) => {
    if (
      !sharedCaptureState.response ||
      (responseId && sharedCaptureState.response.id !== responseId)
    )
      return;
    sharedCaptureState.response = null;
    sharedCaptureState.request = null;
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO_STRICT_SHARED_KEY);
  };

  const clearSharedCaptureRequest = (requestId = null) => {
    if (
      !sharedCaptureState.request ||
      (requestId && sharedCaptureState.request.id !== requestId)
    )
      return;
    sharedCaptureState.request = null;
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO_STRICT_SHARED_KEY);
  };

  const clearSharedSaveRequest = (requestId = null) => {
    if (
      !sharedCaptureState.saveRequest ||
      (requestId && sharedCaptureState.saveRequest.id !== requestId)
    )
      return;
    sharedCaptureState.saveRequest = null;
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO_STRICT_SHARED_KEY);
  };

  const broadcastSharedCaptureError = (request, error, kind = 'error') => {
    if (!request) return;
    sharedCaptureState.request = null;
    sharedCaptureState.response = {
      id: request.id,
      requesterClientID: request.requesterClientID,
      sourceClientID: clientID,
      status: kind === 'timeout' ? 'timeout' : 'error',
      error,
      kind,
    };
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO_STRICT_SHARED_KEY);
  };

  const processSharedCaptureRequest = (request) => {
    if (!request || !hasDesktopFrameReady()) return false;
    const widthNorm = clamp(request.widthNorm || MIN_CROP_NORM, MIN_CROP_NORM, MAX_CROP_NORM);
    const heightNorm = clamp(
      request.heightNorm || MIN_CROP_NORM,
      MIN_CROP_NORM,
      MAX_CROP_NORM
    );
    const captureTextureCanvas = captureCenterCropCanvas(widthNorm, heightNorm);
    if (!captureTextureCanvas) return false;
    const serialized = serializeCaptureCanvas(captureTextureCanvas);
    if (!serialized || !serialized.dataUrl) {
      console.warn('[lasso-strict] failed to serialize shared capture');
      broadcastSharedCaptureError(
        request,
        'Failed to serialize capture image data.',
        'serialize-failed'
      );
      return true;
    }
    sharedCaptureState.request = null;
    sharedCaptureState.response = {
      id: request.id,
      requesterClientID: request.requesterClientID,
      sourceClientID: clientID,
      status: 'success',
      rectMatrix: request.rectMatrix,
      imageDataUrl: serialized.dataUrl,
      width: serialized.canvas.width,
      height: serialized.canvas.height,
      mimeType: serialized.mimeType,
      encodingQuality:
        serialized.quality == null ? null : Number(serialized.quality),
    };
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO_STRICT_SHARED_KEY);
    return true;
  };

  const processSharedSaveRequest = (request) => {
    if (!request || request.id === lastProcessedSaveRequestId) return false;
    if (!hasDesktopFrameReady()) return false;
    const fullView = captureFullViewCanvas();
    if (!fullView) return false;
    downloadCanvas(fullView, FULL_VIEW_DOWNLOAD_NAME);
    lastProcessedSaveRequestId = request.id;
    clearSharedSaveRequest(request.id);
    return true;
  };

  const broadcastSharedSaveRequest = () => {
    const request = {
      id: createCaptureRequestId(),
      requesterClientID: clientID,
      requestedAt: Date.now(),
    };
    sharedCaptureState.saveRequest = request;
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO_STRICT_SHARED_KEY);
    processSharedSaveRequest(request);
  };

  const requestSharedAreaCapture = (rectMatrix) => {
    const { widthNorm, heightNorm } = getAreaCaptureNorm();
    const request = {
      id: createCaptureRequestId(),
      requesterClientID: clientID,
      rectMatrix: rectMatrix ? rectMatrix.slice() : null,
      widthNorm,
      heightNorm,
      requestedAt: Date.now(),
    };
    sharedCaptureState.request = request;
    sharedCaptureState.response = null;
    pendingLocalCaptureRequestId = request.id;
    pendingLocalCaptureDeadline = Date.now() + CAPTURE_REQUEST_TIMEOUT_MS;
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO_STRICT_SHARED_KEY);
    if (processSharedCaptureRequest(request)) {
      lastStartedCaptureRequestId = request.id;
    }
  };

  const processSharedCaptureResponse = (response) => {
    if (!response || response.requesterClientID !== clientID) return;
    if (lastProcessedCaptureResponseId === response.id) return;
    pendingLocalCaptureRequestId = null;
    pendingLocalCaptureDeadline = 0;

    if (response.status === 'timeout' || response.status === 'error' || response.error) {
      lastProcessedCaptureResponseId = response.id;
      console.warn('[lasso-strict] shared capture error:', {
        kind: response.kind || response.status || 'error',
        error: response.error,
      });
      clearSharedCaptureResponse(response.id);
      return;
    }
    if (!response.imageDataUrl) {
      lastProcessedCaptureResponseId = response.id;
      console.warn('[lasso-strict] shared capture missing image data');
      clearSharedCaptureResponse(response.id);
      return;
    }

    const img = new Image();
    img.onload = () => {
      lastProcessedCaptureResponseId = response.id;
      const textureCanvas = document.createElement('canvas');
      textureCanvas.width = img.width;
      textureCanvas.height = img.height;
      const ctx = textureCanvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
      ctx.drawImage(img, 0, 0);
      const rectMatrix =
        Array.isArray(response.rectMatrix) && response.rectMatrix.length === 16
          ? response.rectMatrix
          : liveRectMatrix;
      stampCapturedSurface(textureCanvas, rectMatrix);
      console.log('[lasso-strict] applied shared capture texture', {
        sourceClientID: response.sourceClientID,
        size: [textureCanvas.width, textureCanvas.height],
      });
      clearSharedCaptureResponse(response.id);
    };
    img.onerror = () => {
      lastProcessedCaptureResponseId = response.id;
      console.warn('[lasso-strict] failed to decode shared capture image');
      clearSharedCaptureResponse(response.id);
    };
    img.src = response.imageDataUrl;
  };

  model.animate(() => {
    try {
      sharedCaptureState = commitSharedCaptureState(
        server.synchronize(LASSO_STRICT_SHARED_KEY)
      );
      const pendingRequest = sharedCaptureState.request;
      const pendingResponse = sharedCaptureState.response;
      const pendingSaveRequest = sharedCaptureState.saveRequest;

      if (
        pendingRequest &&
        shouldOwnDisplayCapture() &&
        !screenCaptureActive &&
        !screenCaptureStarting
      ) {
        startDesktopScreenCapture();
      }

      if (
        pendingSaveRequest &&
        shouldOwnDisplayCapture() &&
        !screenCaptureActive &&
        !screenCaptureStarting
      ) {
        startDesktopScreenCapture();
      }

      if (
        pendingRequest &&
        (!pendingResponse || pendingResponse.id !== pendingRequest.id) &&
        hasDesktopFrameReady() &&
        pendingRequest.id !== lastStartedCaptureRequestId
      ) {
        const reqId = pendingRequest.id;
        const processed = processSharedCaptureRequest(pendingRequest);
        if (processed) lastStartedCaptureRequestId = reqId;
      }

      if (
        pendingLocalCaptureRequestId &&
        pendingLocalCaptureDeadline > 0 &&
        Date.now() > pendingLocalCaptureDeadline
      ) {
        const req = sharedCaptureState.request;
        const hasMatchingResponse =
          sharedCaptureState.response &&
          sharedCaptureState.response.id === pendingLocalCaptureRequestId;
        if (!hasMatchingResponse) {
          console.warn('[lasso-strict] shared capture request timed out', {
            requestId: pendingLocalCaptureRequestId,
          });
          if (req && req.id === pendingLocalCaptureRequestId) {
            broadcastSharedCaptureError(
              req,
              'Timed out waiting for desktop capture response.',
              'timeout'
            );
          } else {
            clearSharedCaptureRequest(pendingLocalCaptureRequestId);
          }
        }
        pendingLocalCaptureRequestId = null;
        pendingLocalCaptureDeadline = 0;
      }

      if (sharedCaptureState.response) {
        processSharedCaptureResponse(sharedCaptureState.response);
      }

      if (
        pendingSaveRequest &&
        pendingSaveRequest.id !== lastProcessedSaveRequestId &&
        hasDesktopFrameReady()
      ) {
        processSharedSaveRequest(pendingSaveRequest);
      }

      const clientHeadMat = clientState.head(clientID);
      if (clientHeadMat && clientHeadMat.length >= 16)
        lastHeadMat = clientHeadMat.slice();
      const headMat = clientHeadMat && clientHeadMat.length ? clientHeadMat : lastHeadMat;
      if (!headMat || !headMat.length) {
        borderRoot.setMatrix(cg.mScale(0));
        saveButtonRoot.setMatrix(cg.mScale(0));
        beamCursorL.setMatrix(cg.mScale(0));
        beamCursorR.setMatrix(cg.mScale(0));
        hoverByHand.left = false;
        hoverByHand.right = false;
        setLockUIVisible(leftLockUI, false);
        setLockUIVisible(rightLockUI, false);
        prevHoldProgress = 0;
        return;
      }
      borderRoot.setMatrix(cg.mIdentity());
      beamL.update();
      beamR.update();

      // Keep hand pose / press state live each frame (event-only updates can miss headset frames).
      const leftLivePos = inputEvents.pos(HAND_LEFT);
      const rightLivePos = inputEvents.pos(HAND_RIGHT);
      if (isVec3(leftLivePos)) handInput.left.pos = leftLivePos.slice();
      if (isVec3(rightLivePos)) handInput.right.pos = rightLivePos.slice();
      handInput.left.isPressed = readPressedState(HAND_LEFT);
      handInput.right.isPressed = readPressedState(HAND_RIGHT);

      const leftPosRaw = handInput.left.pos;
      const rightPosRaw = handInput.right.pos;

      if (isVec3(leftPosRaw)) lastLeftPos = leftPosRaw.slice();
      if (isVec3(rightPosRaw)) lastRightPos = rightPosRaw.slice();

      const leftPos = isVec3(leftPosRaw)
        ? leftPosRaw
        : isVec3(lastLeftPos)
        ? lastLeftPos
        : null;
      const rightPos = isVec3(rightPosRaw)
        ? rightPosRaw
        : isVec3(lastRightPos)
        ? lastRightPos
        : null;
      const handsReady = isVec3(leftPos) && isVec3(rightPos);
      const pinchLeft = !!handInput.left.isPressed;
      const pinchRight = !!handInput.right.isPressed;
      const lockingNow = pinchLeft && pinchRight;
      let stableProgress = 0;
      let justLocked = false;

      if (handsReady) {
        if (!rectLocked) {
          // Resize continuously from hand motion (no pinch needed).
          updateRectSizeFromHands(headMat, leftPos, rightPos);
          if (lockingNow) {
            if (model.time < lockRearmUntil) {
              stableProgress = 0;
              lockStableStartTime = -1;
              lockAnchorLeft = null;
              lockAnchorRight = null;
              lockAnchorLeftLocal = null;
              lockAnchorRightLocal = null;
            } else if (!lockAnchorLeft || !lockAnchorRight || lockStableStartTime < 0) {
              const invHead = cg.mInverse(headMat);
              lockAnchorLeft = leftPos.slice();
              lockAnchorRight = rightPos.slice();
              lockAnchorLeftLocal = cg.mTransform(invHead, leftPos);
              lockAnchorRightLocal = cg.mTransform(invHead, rightPos);
              lockStableStartTime = model.time;
              stableProgress = 0;
            } else {
              const invHead = cg.mInverse(headMat);
              const leftLocal = cg.mTransform(invHead, leftPos);
              const rightLocal = cg.mTransform(invHead, rightPos);
              const anchorLeft = lockAnchorLeftLocal || lockAnchorLeft;
              const anchorRight = lockAnchorRightLocal || lockAnchorRight;
              const driftLeft = cg.distance(leftLocal, anchorLeft);
              const driftRight = cg.distance(rightLocal, anchorRight);
              if (
                driftLeft > LOCK_STABLE_MOVE_THRESHOLD ||
                driftRight > LOCK_STABLE_MOVE_THRESHOLD
              ) {
                lockAnchorLeft = leftPos.slice();
                lockAnchorRight = rightPos.slice();
                lockAnchorLeftLocal = leftLocal.slice();
                lockAnchorRightLocal = rightLocal.slice();
                lockStableStartTime = model.time;
                stableProgress = 0;
              } else {
                const holdElapsed = model.time - lockStableStartTime;
                const holdProgress = clamp(holdElapsed / LOCK_STABLE_SECONDS, 0, 1);
                if (holdElapsed >= LOCK_STABLE_SECONDS || holdProgress >= LOCK_PROGRESS_TRIGGER) {
                  markLocked(leftPos, rightPos);
                  justLocked = true;
                  stableProgress = 1;
                } else {
                  stableProgress = holdProgress;
                }
              }
            }
          } else {
            stableProgress = 0;
            lockStableStartTime = -1;
            lockAnchorLeft = null;
            lockAnchorRight = null;
          }
        } else {
          if (pinchLeft && pinchRight) {
            // Start a new resize/lock cycle when both hands pinch again.
            markUnlocked();
            updateRectSizeFromHands(headMat, leftPos, rightPos);
          } else {
            const openHands = !pinchLeft && !pinchRight;
            if (openHands && lockedLeftPos && lockedRightPos) {
              const movedSinceLock =
                cg.distance(leftPos, lockedLeftPos) > RESIZE_UNLOCK_MOVE_THRESHOLD ||
                cg.distance(rightPos, lockedRightPos) > RESIZE_UNLOCK_MOVE_THRESHOLD;
              if (movedSinceLock) {
                markUnlocked();
                updateRectSizeFromHands(headMat, leftPos, rightPos);
              }
            }
          }
        }
      }

      const currentRectMatrix = applyRectTransform(headMat);
      const showLockUI = handsReady && !rectLocked;
      updateHoldSound(stableProgress, showLockUI);
      updateLockProgressUI(leftLockUI, leftPos, headMat, stableProgress, showLockUI);
      updateLockProgressUI(
        rightLockUI,
        rightPos,
        headMat,
        stableProgress,
        showLockUI
      );
      updateSaveButtonPose(leftPosRaw, headMat);
      const leftInteraction = getInteractionState(HAND_LEFT, headMat);
      const rightInteraction = getInteractionState(HAND_RIGHT, headMat);
      updateCaptureHoverState(leftInteraction, rightInteraction);

      let requestAreaCapture = justLocked;
      let requestFullCapture = false;

      while (queuedPressHands.length > 0) {
        const hand = queuedPressHands.shift();
        const interaction = getInteractionState(hand, headMat);
        if (hand === HAND_RIGHT && interaction && interaction.actionableSave) {
          requestFullCapture = true;
          saveButtonMesh.color(0.22, 0.85, 0.35);
          playSaveClickSound();
          triggerHaptic(hand, CLICK_HAPTIC_INTENSITY, CLICK_HAPTIC_MS);
          continue;
        }
        if (pinchLeft && pinchRight) continue;
        if (beginDragIfTouchingCapture(hand, interaction)) {
          playSaveClickSound();
          triggerHaptic(hand, CLICK_HAPTIC_INTENSITY, CLICK_HAPTIC_MS);
        }
      }

      if (pinchLeft && pinchRight) {
        dragByHand.left = null;
        dragByHand.right = null;
      }
      updateDraggedCapture(
        HAND_LEFT,
        pinchLeft && pinchRight,
        leftInteraction,
        model.time
      );
      updateDraggedCapture(
        HAND_RIGHT,
        pinchLeft && pinchRight,
        rightInteraction,
        model.time
      );

      while (queuedReleaseHands.length > 0) {
        const hand = queuedReleaseHands.shift();
        dragByHand[hand] = null;
      }

      if (requestFullCapture) {
        broadcastSharedSaveRequest();
      }

      if (requestAreaCapture) {
        try {
          console.log('[lasso-strict] requesting area capture', {
            rectWorldWidth,
            rectWorldHeight,
          });
          requestSharedAreaCapture(currentRectMatrix);
        } finally {
          // Capture happens on lock; immediately re-arm for the next cycle.
          lockRearmUntil = model.time + LOCK_REARM_DELAY_SECONDS;
          markUnlocked();
          lockedLeftPos = null;
          lockedRightPos = null;
        }
      }

    } catch (err) {
      console.error('[lasso-strict] animate error:', err);
    }
  });
};
