import * as cg from "../render/core/cg.js";
import {
  ControllerBeam,
  buttonState,
} from "../render/core/controllerInput.js";

const preferredHand = "right";
const MARKER_SCALE = 0.018;
const CURSOR_SCALE = 0.012;
const EDGE_THICKNESS = 0.005;
const CAPTURE_EDGE_THICKNESS = 0.008;
const SURFACE_OPACITY = 0.85;
const SURFACE_HOVER_OPACITY = 0.4;
const TEXTURED_SURFACE_OPACITY = 1;
const CAPTURE_BURST_MS = 4500;
const SQUEEZE_BUTTONS = [1, 2, 3, 4, 5, 6];
const LASSO2_SHARED_KEY = "lasso2SharedState";
const SAVE_BUTTON = 4;
const ACTION_BUTTON_THRESHOLD = 0.65;
const HINT_PANEL_SCALE = 0.0003;
const HINT_PANEL_WIDTH = 231; // px from figma
const HINT_PANEL_HEIGHT = 100;
const MAX_HOVER_DEPTH = 3.0;
const MAX_SHARED_TEXTURE_EDGE = 512;
const MIN_SHARED_TEXTURE_EDGE = 256;
const MAX_SHARED_TEXTURE_DATA_URL_LEN = 80000;
const AUTO_DOWNLOAD_CAPTURE = true;
const CAPTURED_HANDLE_REVEAL_RADIUS = 0.12;
const CAPTURED_HANDLE_REVEAL_DEPTH_PAD = 0.35;
const COMPUTER_CANVAS_SCALE = 0.00008;
const COMPUTER_CANVAS_WIDTH = 3024; // px from figma
const COMPUTER_CANVAS_HEIGHT = 1964; // px from figma
const COMPUTER_CANVAS_POS = [0, 1.28, -0.30];
const COMPUTER_CANVAS_HALF_DEPTH = 0.1;
const PARTNER_CANVAS_WIDTH = 1024;
const PARTNER_CANVAS_HEIGHT = 682;
const PARTNER_POSITION_SYNC_MIN_MS = 33;
const PARTNER_POSITION_SYNC_MIN_DELTA_PX = 0.9;
const PARTNER_AREA_SYNC_MIN_MS = 33;
const PARTNER_AREA_SYNC_MIN_DELTA_PX = 0.9;
const HIDE_MAIN_WINDOW_SCREEN_CANVAS = true;
const SHOW_SCREEN_CAPTURE_DEBUG_POPUP = true;
const SCREEN_CAPTURE_DEBUG_POPUP_NAME = "Lasso2ScreenCaptureDebug";
const SCREEN_CAPTURE_DEBUG_POPUP_WIDTH = 480;
const SCREEN_CAPTURE_DEBUG_POPUP_HEIGHT = 270;

let screenCanvas = null;
let screenCaptureActive = false;
let screenCaptureTimer = null;
let screenCaptureStream = null;
let screenCaptureVideo = null;
let screenCaptureDebugPopup = null;
let screenCaptureDebugPopupCanvas = null;
let screenCaptureDebugPopupCtx = null;
let pendingCaptureArea = null;
let queuedDownload = null;
let captureBurstDeadline = 0;
let activeCaptureRequest = null;
let lastStartedCaptureRequestId = null;
let lastAppliedCaptureResponseId = null;
let lastProcessedSaveRequestId = null;
let uiAudioContext = null;
let hadCornerDetectionInBurst = false;
let requestedCaptureAreaByRequestId = new Map();
let lastPartnerBoardPosSyncByArea = new Map();
let lastPartnerAreaSyncByArea = new Map();

const captureDebug = {
  status: "idle",
  lastError: null,
  lastCorners: null,
  lastCaptureSize: null,
  lastDownload: null,
  lastScreenSize: null,
  noCornerFrames: 0,
};

if (typeof window !== "undefined") window.lasso2CaptureDebug = captureDebug;

function setCaptureDebug(patch) {
  Object.assign(captureDebug, patch);
}

function defaultSharedCaptureState() {
  return {
    request: null,
    response: null,
    saveRequest: null,
    partnerBoard: { items: [], updatedAt: 0 },
  };
}

function describeError(err) {
  if (!err) return "unknown error";
  if (typeof err === "string") return err;
  return err.message || String(err);
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function createRequestId() {
  return `${clientID}-${Math.floor(nowMs())}-${Math.floor(
    Math.random() * 1e6
  )}`;
}

function shouldOwnDisplayCapture() {
  const canCapture = !!(
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === "function"
  );
  return canCapture;
}

function shouldProcessCaptureOnThisClient() {
  return shouldOwnDisplayCapture() && !!screenCanvas && screenCaptureActive;
}

function hideMainScreenCanvasCaptureSource(canvas) {
  if (!canvas || !canvas.style || !HIDE_MAIN_WINDOW_SCREEN_CANVAS) return;
  canvas.style.opacity = "0";
  canvas.style.visibility = "hidden";
  canvas.style.pointerEvents = "none";
}

function ensureScreenCaptureDebugPopup() {
  if (
    !SHOW_SCREEN_CAPTURE_DEBUG_POPUP ||
    typeof window === "undefined" ||
    typeof document === "undefined"
  )
    return null;

  let popup = screenCaptureDebugPopup;
  if (!popup || popup.closed || !popup.document || !popup.document.body) {
    popup = window.open(
      "",
      SCREEN_CAPTURE_DEBUG_POPUP_NAME,
      `width=${SCREEN_CAPTURE_DEBUG_POPUP_WIDTH},height=${SCREEN_CAPTURE_DEBUG_POPUP_HEIGHT}`
    );
    if (!popup) return null;
    screenCaptureDebugPopup = popup;
  }

  popup.document.title = "lasso2 screen capture debug";
  popup.document.body.style.margin = "0";
  popup.document.body.style.background = "#000";
  popup.document.body.style.overflow = "hidden";

  let canvas = popup.document.getElementById("lasso2ScreenCaptureDebugCanvas");
  if (!canvas) {
    canvas = popup.document.createElement("canvas");
    canvas.id = "lasso2ScreenCaptureDebugCanvas";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.display = "block";
    popup.document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  screenCaptureDebugPopupCanvas = canvas;
  screenCaptureDebugPopupCtx = ctx;
  return { popup, canvas, ctx };
}

function mirrorScreenCaptureToDebugPopup() {
  if (!SHOW_SCREEN_CAPTURE_DEBUG_POPUP || !screenCanvas) return;
  const srcW = screenCanvas.width || 0;
  const srcH = screenCanvas.height || 0;
  if (srcW <= 0 || srcH <= 0) return;

  const ui = ensureScreenCaptureDebugPopup();
  if (!ui) return;

  if (ui.canvas.width !== srcW) ui.canvas.width = srcW;
  if (ui.canvas.height !== srcH) ui.canvas.height = srcH;
  ui.ctx.drawImage(screenCanvas, 0, 0);
}

function canvasToDataUrl(canvas, mimeType = "image/png", quality = undefined) {
  try {
    return canvas.toDataURL(mimeType, quality);
  } catch (err) {
    console.error("[lasso2] failed to serialize canvas:", err, mimeType);
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
  const out = document.createElement("canvas");
  out.width = dstW;
  out.height = dstH;
  const ctx = out.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(canvas, 0, 0, dstW, dstH);
  return out;
}

function updateDesktopCapturePreview(dataUrl) {
  if (typeof document === "undefined" || !dataUrl) return;
  const img = ensureDesktopCapturePreviewUI();
  img.src = dataUrl;
  window.lasso2LastCaptureDataUrl = dataUrl;
}

function ensureDesktopCapturePreviewUI() {
  if (typeof document === "undefined") return null;
  let container = document.getElementById("lasso2CapturePreviewContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "lasso2CapturePreviewContainer";
    container.style.position = "fixed";
    container.style.right = "12px";
    container.style.bottom = "12px";
    container.style.width = "230px";
    container.style.padding = "8px";
    container.style.border = "2px solid #ff00ff";
    container.style.background = "rgba(0,0,0,0.72)";
    container.style.color = "#fff";
    container.style.font = "12px/1.2 monospace";
    container.style.zIndex = "999999";
    container.style.display = "grid";
    container.style.gap = "6px";

    const title = document.createElement("div");
    title.textContent = "lasso2 capture preview";
    title.style.opacity = "0.9";
    container.appendChild(title);

    const img = document.createElement("img");
    img.id = "lasso2CapturePreview";
    img.style.width = "100%";
    img.style.maxHeight = "160px";
    img.style.objectFit = "contain";
    img.style.background = "rgba(0,0,0,0.35)";
    container.appendChild(img);

    const button = document.createElement("button");
    button.id = "lasso2CaptureDownloadButton";
    button.textContent = "Download Last Capture";
    button.style.cursor = "pointer";
    button.style.padding = "6px 8px";
    button.style.border = "1px solid #ff00ff";
    button.style.background = "#111";
    button.style.color = "#fff";
    button.onclick = () => {
      if (typeof window !== "undefined" && window.lasso2DownloadLastCapture)
        window.lasso2DownloadLastCapture();
    };
    container.appendChild(button);

    document.body.appendChild(container);
  }
  return document.getElementById("lasso2CapturePreview");
}

function ensurePartnerCanvasWindow() {
  if (typeof window === "undefined" || typeof document === "undefined")
    return null;
  const title = "Lasso2PartnerCanvas";
  let popup = window.lasso2PartnerPopup;
  if (!popup || popup.closed) {
    popup = window.open(
      "",
      title,
      `width=${PARTNER_CANVAS_WIDTH},height=${PARTNER_CANVAS_HEIGHT}`
    );
    if (!popup) return null;
    window.lasso2PartnerPopup = popup;
  }
  if (!popup.document || !popup.document.body) return null;

  popup.document.title = "lasso2 partner canvas";
  popup.document.body.style.margin = "0";
  popup.document.body.style.background = "#111";

  let root = popup.document.getElementById("lasso2PartnerRoot");
  if (!root) {
    root = popup.document.createElement("div");
    root.id = "lasso2PartnerRoot";
    root.style.position = "fixed";
    root.style.inset = "0";
    popup.document.body.appendChild(root);
  }

  let canvas = popup.document.getElementById("lasso2PartnerCanvas");
  if (!canvas) {
    canvas = popup.document.createElement("canvas");
    canvas.id = "lasso2PartnerCanvas";
    canvas.width = PARTNER_CANVAS_WIDTH;
    canvas.height = PARTNER_CANVAS_HEIGHT;
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.display = "block";
    canvas.style.touchAction = "none";
    root.appendChild(canvas);
  }

  let saveButton = popup.document.getElementById("lasso2PartnerSaveButton");
  if (!saveButton) {
    saveButton = popup.document.createElement("button");
    saveButton.id = "lasso2PartnerSaveButton";
    saveButton.textContent = "Save Collage";
    saveButton.style.position = "fixed";
    saveButton.style.top = "14px";
    saveButton.style.right = "14px";
    saveButton.style.padding = "8px 10px";
    saveButton.style.border = "1px solid #66ddff";
    saveButton.style.background = "#102030cc";
    saveButton.style.color = "#d7f6ff";
    saveButton.style.font = "12px monospace";
    saveButton.style.cursor = "pointer";
    saveButton.style.zIndex = "10";
    saveButton.onclick = () => {
      const triggerSave = (url) => {
        const a = popup.document.createElement("a");
        a.href = url;
        a.download = "lasso2-collage.png";
        popup.document.body.appendChild(a);
        a.click();
        popup.document.body.removeChild(a);
      };
      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          triggerSave(url);
          setTimeout(() => URL.revokeObjectURL(url), 800);
        }, "image/png");
      } else {
        triggerSave(canvas.toDataURL("image/png"));
      }
    };
    root.appendChild(saveButton);
  }

  if (canvas.__lasso2HoverItemId === undefined) canvas.__lasso2HoverItemId = null;
  if (canvas.__lasso2DragItemId === undefined) canvas.__lasso2DragItemId = null;
  if (!canvas.__lasso2InteractionsInstalled) {
    canvas.__lasso2InteractionsInstalled = true;
    canvas.style.cursor = "default";
    const toCanvasPoint = (event) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) * canvas.width) / Math.max(1, rect.width),
        y:
          ((event.clientY - rect.top) * canvas.height) / Math.max(1, rect.height),
      };
    };
    const hitTopItem = (p, board) => {
      if (!board || !Array.isArray(board.items) || board.items.length === 0)
        return null;
      const items = board.items
        .slice()
        .sort((a, b) => (Number(b.layer) || 0) - (Number(a.layer) || 0));
      for (const item of items) {
        const w = Math.max(20, Number(item && item.w) || 120);
        const h = Math.max(20, Number(item && item.h) || 120);
        const x = Number(item && item.x) || canvas.width / 2;
        const y = Number(item && item.y) || canvas.height / 2;
        if (
          p.x >= x - w / 2 &&
          p.x <= x + w / 2 &&
          p.y >= y - h / 2 &&
          p.y <= y + h / 2
        )
          return { item, x, y };
      }
      return null;
    };

    const setCursor = (nextCursor) => {
      if (canvas.style.cursor !== nextCursor) canvas.style.cursor = nextCursor;
    };
    const setHoverItem = (id) => {
      canvas.__lasso2HoverItemId = id || null;
    };

    let drag = null;
    const refreshHover = (event) => {
      const board = window.lasso2PartnerBoardLatest;
      if (!board || !Array.isArray(board.items) || board.items.length === 0) {
        setHoverItem(null);
        if (!drag) setCursor("default");
        return null;
      }
      const p = toCanvasPoint(event);
      const picked = hitTopItem(p, board);
      setHoverItem(picked ? picked.item.id : null);
      if (!drag) setCursor(picked ? "grab" : "default");
      return picked;
    };

    const beginDrag = (event) => {
      if (event && event.preventDefault) event.preventDefault();
      const picked = refreshHover(event);
      if (!picked) return;

      drag = {
        id: picked.item.id,
        dx: toCanvasPoint(event).x - picked.x,
        dy: toCanvasPoint(event).y - picked.y,
      };
      canvas.__lasso2DragItemId = drag.id;
      setHoverItem(drag.id);
      setCursor("grabbing");
      if (typeof window.lasso2PartnerBoardMutate === "function") {
        window.lasso2PartnerBoardMutate((nextBoard) => {
          const itemsNext = nextBoard.items || [];
          const target = itemsNext.find((it) => it.id === drag.id);
          if (!target) return;
          const maxLayer = itemsNext.reduce(
            (m, it) => Math.max(m, Number(it.layer) || 0),
            0
          );
          target.layer = maxLayer + 1;
        });
      }
      if (event && event.pointerId != null && canvas.setPointerCapture) {
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch (_) {}
      }
    };

    const moveDrag = (event) => {
      if (!drag) {
        refreshHover(event);
        return;
      }
      if (typeof window.lasso2PartnerBoardMutate !== "function") return;
      if (event && event.preventDefault) event.preventDefault();
      const p = toCanvasPoint(event);
      const nextX = p.x - drag.dx;
      const nextY = p.y - drag.dy;
      setHoverItem(drag.id);
      window.lasso2PartnerBoardMutate((nextBoard) => {
        const target = (nextBoard.items || []).find((it) => it.id === drag.id);
        if (!target) return;
        target.x = nextX;
        target.y = nextY;
      });
    };

    const clearHover = () => {
      if (drag) return;
      setHoverItem(null);
      setCursor("default");
    };

    const endDrag = (event = null) => {
      drag = null;
      canvas.__lasso2DragItemId = null;
      if (event) refreshHover(event);
      else if (canvas.__lasso2HoverItemId) setCursor("grab");
      else setCursor("default");
    };

    const supportsPointer =
      typeof popup.PointerEvent !== "undefined" ||
      typeof window.PointerEvent !== "undefined";
    if (supportsPointer) {
      canvas.addEventListener("pointerdown", beginDrag);
      canvas.addEventListener("pointermove", moveDrag);
      canvas.addEventListener("pointerup", endDrag);
      canvas.addEventListener("pointercancel", endDrag);
      canvas.addEventListener("lostpointercapture", endDrag);
      canvas.addEventListener("pointerleave", clearHover);
    } else {
      canvas.addEventListener("mousedown", beginDrag);
      popup.document.addEventListener("mousemove", moveDrag);
      popup.document.addEventListener("mouseup", endDrag);
      canvas.addEventListener("mouseleave", clearHover);
    }
    popup.addEventListener("blur", () => {
      endDrag();
      clearHover();
    });
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return { popup, canvas, ctx, saveButton };
}

function drawPartnerCanvas(board) {
  const ui = ensurePartnerCanvasWindow();
  if (!ui) return;
  const { ctx, canvas } = ui;
  const collage =
    board && Array.isArray(board.items) ? board : { items: [], updatedAt: 0 };
  window.lasso2PartnerBoardLatest = collage;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (collage.items.length === 0) {
    ctx.strokeStyle = "#44d9ff88";
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);
    ctx.fillStyle = "#9ad9ff";
    ctx.font = "28px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DROP SURFACE INTO MARKER", canvas.width / 2, canvas.height / 2);
    ctx.restore();
    return;
  }

  if (!window.lasso2PartnerImageCache) window.lasso2PartnerImageCache = {};
  const cache = window.lasso2PartnerImageCache;

  const items = collage.items
    .slice()
    .sort((a, b) => (Number(a.layer) || 0) - (Number(b.layer) || 0));
  const highlightedId = canvas.__lasso2DragItemId || canvas.__lasso2HoverItemId;
  for (const item of items) {
    if (!item || !item.imageDataUrl) continue;
    const drawW = Math.max(24, Number(item.w) || 140);
    const drawH = Math.max(24, Number(item.h) || 100);
    const x = Number(item.x) || canvas.width / 2;
    const y = Number(item.y) || canvas.height / 2;
    let img = cache[item.imageDataUrl];
    if (!img) {
      img = new Image();
      cache[item.imageDataUrl] = img;
      img.onload = () => drawPartnerCanvas(window.lasso2PartnerBoardLatest);
      img.src = item.imageDataUrl;
    }
    if (img.complete && img.naturalWidth && img.naturalHeight)
      ctx.drawImage(img, x - drawW / 2, y - drawH / 2, drawW, drawH);
    else {
      ctx.fillStyle = "#204050";
      ctx.fillRect(x - drawW / 2, y - drawH / 2, drawW, drawH);
    }
    if (highlightedId && item.id === highlightedId) {
      ctx.strokeStyle = "#d8f4ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - drawW / 2, y - drawH / 2, drawW, drawH);
    }
  }
  ctx.restore();
}

function installQueuedDownloadGestureFlush() {
  if (typeof window === "undefined" || window.__lasso2QueuedDownloadClickHandler)
    return;
  window.__lasso2QueuedDownloadClickHandler = () => {
    if (!queuedDownload) return;
    if (window.lasso2DownloadLastCapture) window.lasso2DownloadLastCapture();
  };
  window.addEventListener("pointerdown", window.__lasso2QueuedDownloadClickHandler);
}

function serializeCaptureCanvas(
  canvas,
  maxEdge = MAX_SHARED_TEXTURE_EDGE,
  maxDataUrlLength = MAX_SHARED_TEXTURE_DATA_URL_LEN
) {
  if (!canvas) return null;
  const encoders = [
    { mimeType: "image/webp", quality: 0.82 },
    { mimeType: "image/jpeg", quality: 0.82 },
    { mimeType: "image/png", quality: undefined },
  ];
  const source = canvas;
  let edge = maxEdge;
  let best = null;

  for (let attempt = 0; attempt < 7; attempt++) {
    const working = makeSerializableTextureCanvas(source, edge);
    for (const encoder of encoders) {
      const dataUrl = canvasToDataUrl(
        working,
        encoder.mimeType,
        encoder.quality
      );
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

function commitSharedCaptureState(sharedCaptureState) {
  if (typeof window === "undefined") return sharedCaptureState;
  window[LASSO2_SHARED_KEY] = sharedCaptureState;
  window.lasso2SharedCaptureState = sharedCaptureState;
  return sharedCaptureState;
}

function getUIAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!uiAudioContext) {
    try {
      uiAudioContext = window.audioContext || new AudioCtor();
      if (!window.audioContext) window.audioContext = uiAudioContext;
    } catch (err) {
      console.warn("[lasso2] failed to create AudioContext:", err);
      return null;
    }
  }
  return uiAudioContext;
}

function playUISound(kind) {
  const ctx = getUIAudioContext();
  if (!ctx) return;

  const startSound = () => {
    const now = ctx.currentTime + 0.005;
    const master = ctx.createGain();
    master.connect(ctx.destination);

    if (kind === "capture") {
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      oscA.type = "triangle";
      oscB.type = "sine";
      oscA.frequency.setValueAtTime(660, now);
      oscA.frequency.exponentialRampToValueAtTime(990, now + 0.12);
      oscB.frequency.setValueAtTime(880, now + 0.06);
      oscB.frequency.exponentialRampToValueAtTime(1320, now + 0.18);

      const gainA = ctx.createGain();
      const gainB = ctx.createGain();
      gainA.gain.setValueAtTime(0.0001, now);
      gainA.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
      gainA.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      gainB.gain.setValueAtTime(0.0001, now + 0.055);
      gainB.gain.exponentialRampToValueAtTime(0.05, now + 0.075);
      gainB.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      oscA.connect(gainA).connect(master);
      oscB.connect(gainB).connect(master);
      oscA.start(now);
      oscB.start(now + 0.055);
      oscA.stop(now + 0.18);
      oscB.stop(now + 0.22);
    } else {
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.12, now + 0.006);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      const osc = ctx.createOscillator();
      const click = ctx.createOscillator();
      osc.type = "triangle";
      click.type = "square";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(92, now + 0.08);
      click.frequency.setValueAtTime(520, now);
      click.frequency.exponentialRampToValueAtTime(180, now + 0.025);

      const oscGain = ctx.createGain();
      const clickGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.exponentialRampToValueAtTime(0.16, now + 0.008);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
      clickGain.gain.setValueAtTime(0.0001, now);
      clickGain.gain.exponentialRampToValueAtTime(0.05, now + 0.004);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

      osc.connect(oscGain).connect(master);
      click.connect(clickGain).connect(master);
      osc.start(now);
      click.start(now);
      osc.stop(now + 0.1);
      click.stop(now + 0.03);
    }
  };

  if (ctx.state === "suspended") {
    ctx
      .resume()
      .then(startSound)
      .catch(() => {});
  } else {
    startSound();
  }
}

// ─── Border detection + perspective warp ──────────────────────────────────────

function detectColorCorners(canvas, isBorderPixel) {
  const { width: w, height: h } = canvas;
  let data = null;
  try {
    const ctx =
      canvas.getContext("2d", { willReadFrequently: true }) ||
      canvas.getContext("2d");
    if (!ctx) {
      setCaptureDebug({
        status: "capture-context-missing",
        lastError: "Could not get 2D context for capture canvas.",
      });
      return null;
    }
    data = ctx.getImageData(0, 0, w, h).data;
  } catch (err) {
    setCaptureDebug({
      status: "capture-read-failed",
      lastError: describeError(err),
    });
    console.error(
      "[lasso2] detectColorCorners failed to read screen canvas:",
      err
    );
    return null;
  }
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      if (isBorderPixel(r, g, b)) mask[y * w + x] = 1;
    }
  }
  const visited = new Uint8Array(w * h);
  const stackX = new Int32Array(w * h);
  const stackY = new Int32Array(w * h);
  let bestCount = 0;
  let bestComponent = null;

  const cornersFromMask = (componentMask) => {
    let tl = null,
      tr = null,
      br = null,
      bl = null;
    let tlMin = Infinity,
      trMax = -Infinity,
      brMax = -Infinity,
      blMin = Infinity;
    let count = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!componentMask[y * w + x]) continue;
        count++;
        if (x + y < tlMin) {
          tlMin = x + y;
          tl = [x, y];
        }
        if (x - y > trMax) {
          trMax = x - y;
          tr = [x, y];
        }
        if (x + y > brMax) {
          brMax = x + y;
          br = [x, y];
        }
        if (x - y < blMin) {
          blMin = x - y;
          bl = [x, y];
        }
      }
    }
    if (!(tl && tr && br && bl) || count < 40) return null;
    const centroid = (corners) => [
      (corners[0][0] + corners[1][0] + corners[2][0] + corners[3][0]) / 4,
      (corners[0][1] + corners[1][1] + corners[2][1] + corners[3][1]) / 4,
    ];
    const quadArea = (corners) => {
      let area = 0;
      for (let i = 0; i < corners.length; i++) {
        const [x1, y1] = corners[i];
        const [x2, y2] = corners[(i + 1) % corners.length];
        area += x1 * y2 - x2 * y1;
      }
      return Math.abs(area) / 2;
    };
    const isInMask = (x, y) => {
      const ix = Math.round(x),
        iy = Math.round(y);
      if (ix < 0 || ix >= w || iy < 0 || iy >= h) return false;
      return componentMask[iy * w + ix] === 1;
    };
    const center = centroid([tl, tr, br, bl]);
    const innerCorner = ([ox, oy]) => {
      const dx = center[0] - ox,
        dy = center[1] - oy;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dx / len,
        ny = dy / len;
      let x = ox,
        y = oy;
      while (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
        x += nx;
        y += ny;
        if (!isInMask(x, y)) return [Math.round(x), Math.round(y)];
      }
      return [Math.round(ox), Math.round(oy)];
    };
    const corners = [
      innerCorner(tl),
      innerCorner(tr),
      innerCorner(br),
      innerCorner(bl),
    ];
    const uniqueCornerCount = new Set(corners.map(([x, y]) => `${x},${y}`))
      .size;
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    if (uniqueCornerCount < 4) return null;
    if (
      Math.max(...xs) - Math.min(...xs) < 20 ||
      Math.max(...ys) - Math.min(...ys) < 20
    )
      return null;
    if (quadArea(corners) < 400) return null;
    return { corners, count, area: quadArea(corners) };
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const start = y * w + x;
      if (!mask[start] || visited[start]) continue;
      let top = 0;
      let count = 0;
      const component = [];
      stackX[top] = x;
      stackY[top] = y;
      top++;
      visited[start] = 1;
      while (top > 0) {
        top--;
        const cx = stackX[top];
        const cy = stackY[top];
        const idx = cy * w + cx;
        component.push(idx);
        count++;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue;
            const nx = cx + ox,
              ny = cy + oy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const nIdx = ny * w + nx;
            if (!mask[nIdx] || visited[nIdx]) continue;
            visited[nIdx] = 1;
            stackX[top] = nx;
            stackY[top] = ny;
            top++;
          }
        }
      }
      if (count > bestCount) {
        bestCount = count;
        bestComponent = component;
      }
    }
  }

  const candidates = [];
  if (bestComponent && bestCount >= 40) {
    const componentMask = new Uint8Array(w * h);
    for (const idx of bestComponent) componentMask[idx] = 1;
    const componentCandidate = cornersFromMask(componentMask);
    if (componentCandidate)
      candidates.push({ ...componentCandidate, source: "largest-component" });
  }
  const globalCandidate = cornersFromMask(mask);
  if (globalCandidate)
    candidates.push({ ...globalCandidate, source: "all-fuchsia-pixels" });
  if (candidates.length === 0) {
    setCaptureDebug({ lastCorners: null });
    return null;
  }
  // Prefer a single contiguous border component first.
  candidates.sort((a, b) => {
    const aPrimary = a.source === "largest-component" ? 1 : 0;
    const bPrimary = b.source === "largest-component" ? 1 : 0;
    if (aPrimary !== bPrimary) return bPrimary - aPrimary;
    return b.area - a.area || b.count - a.count;
  });
  for (const winner of candidates) {
    const sanitizedCorners = sanitizeCaptureCorners(winner.corners, w, h);
    if (!sanitizedCorners) continue;
    setCaptureDebug({
      lastCorners: sanitizedCorners,
      lastDetectionSource: winner.source,
      lastDetectionCount: winner.count,
      lastError: null,
    });
    return sanitizedCorners;
  }
  const winner = candidates[0];
  if (winner) {
    setCaptureDebug({
      lastCorners: winner.corners,
      lastDetectionSource: winner.source,
      lastDetectionCount: winner.count,
      lastError:
        "Detected a degenerate border quad; waiting for a cleaner frame.",
    });
  }
  return null;
}

function detectFuchsiaCorners(canvas, minRB = 110, maxG = 170, maxDiff = 90) {
  return detectColorCorners(
    canvas,
    (r, g, b) =>
      r >= minRB &&
      b >= minRB &&
      g <= maxG &&
      Math.abs(r - b) <= maxDiff &&
      r > g * 1.25 &&
      b > g * 1.25
  );
}

function sanitizeCaptureCorners(corners, width, height) {
  if (!corners || corners.length !== 4) return null;
  const pts = corners.map((c) => [Number(c[0]), Number(c[1])]);
  if (pts.some((p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1])))
    return null;

  const centroid = pts.reduce(
    (sum, p) => [sum[0] + p[0] / 4, sum[1] + p[1] / 4],
    [0, 0]
  );
  pts.sort(
    (a, b) =>
      Math.atan2(a[1] - centroid[1], a[0] - centroid[0]) -
      Math.atan2(b[1] - centroid[1], b[0] - centroid[0])
  );
  let area2 = 0;
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    area2 += a[0] * b[1] - b[0] * a[1];
  }
  if (Math.abs(area2) < 1e-6) return null;
  // In screen coordinates (y increases downward), a positive signed area
  // corresponds to TL->TR->BR->BL winding. Keep that orientation.
  if (area2 < 0) pts.reverse();
  let topLeft = 0;
  let best = Infinity;
  for (let i = 0; i < 4; i++) {
    const score = pts[i][0] + pts[i][1];
    if (score < best) {
      best = score;
      topLeft = i;
    }
  }
  const ordered = [];
  for (let i = 0; i < 4; i++) ordered.push(pts[(topLeft + i) % 4]);

  const cross2 = (a, b, c) =>
    (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
  const sideLen = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const z = cross2(ordered[i], ordered[(i + 1) % 4], ordered[(i + 2) % 4]);
    if (Math.abs(z) < 1e-5) return null;
    if (!sign) sign = z > 0 ? 1 : -1;
    else if ((z > 0 ? 1 : -1) !== sign) return null;
  }

  const sides = [
    sideLen(ordered[0], ordered[1]),
    sideLen(ordered[1], ordered[2]),
    sideLen(ordered[2], ordered[3]),
    sideLen(ordered[3], ordered[0]),
  ];
  const minSide = Math.min(...sides);
  const maxSide = Math.max(...sides);
  if (minSide < 12 || maxSide / Math.max(minSide, 1) > 8) return null;

  const xs = ordered.map((p) => p[0]);
  const ys = ordered.map((p) => p[1]);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  if (spanX < 24 || spanY < 24) return null;

  const bboxArea = Math.max(1, spanX * spanY);
  const area = Math.abs(area2) / 2;
  if (area < 320 || area / bboxArea < 0.2) return null;
  if (width > 0 && height > 0 && area < 0.0006 * width * height) return null;

  return ordered;
}

function gaussElim(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    if (Math.abs(M[col][col]) < 1e-10) return null;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = M[row][col] / M[col][col];
      for (let k = col; k <= n; k++) M[row][k] -= f * M[col][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

function computeHomography(srcPts, dstPts) {
  const A = [],
    b = [];
  for (let i = 0; i < 4; i++) {
    const [sx, sy] = srcPts[i],
      [dx, dy] = dstPts[i];
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dx, dy);
  }
  const h = gaussElim(A, b);
  if (!h) return null;
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1],
  ];
}

function applyH(H, x, y) {
  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  return [
    (H[0][0] * x + H[0][1] * y + H[0][2]) / w,
    (H[1][0] * x + H[1][1] * y + H[1][2]) / w,
  ];
}

function warpToCanvas(srcCanvas, corners, dst = null) {
  corners = sanitizeCaptureCorners(corners, srcCanvas.width, srcCanvas.height);
  if (!corners) return null;
  const xs = corners.map((c) => c[0]),
    ys = corners.map((c) => c[1]);
  const minX = Math.min(...xs),
    minY = Math.min(...ys);
  const outW = Math.max(1, Math.round(Math.max(...xs) - minX));
  const outH = Math.max(1, Math.round(Math.max(...ys) - minY));
  const outCorners = corners.map(([x, y]) => [x - minX, y - minY]);
  const hom = computeHomography(outCorners, corners);
  if (!hom) return null;
  const inQuad = (px, py) => {
    let hasPos = false;
    let hasNeg = false;
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = outCorners[i],
        [bx, by] = outCorners[(i + 1) % 4];
      const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
      if (cross > 1e-6) hasPos = true;
      else if (cross < -1e-6) hasNeg = true;
      if (hasPos && hasNeg) return false;
    }
    return true;
  };
  dst = dst || document.createElement("canvas");
  dst.width = outW;
  dst.height = outH;
  const dstCtx = dst.getContext("2d");
  const out = dstCtx.createImageData(outW, outH);
  const srcCtx =
    srcCanvas.getContext("2d", { willReadFrequently: true }) ||
    srcCanvas.getContext("2d");
  if (!srcCtx) return null;
  const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height)
    .data;
  for (let dy = 0; dy < outH; dy++) {
    for (let dx = 0; dx < outW; dx++) {
      if (!inQuad(dx, dy)) continue;
      const [sx, sy] = applyH(hom, dx, dy);
      const ix = Math.round(sx),
        iy = Math.round(sy);
      if (ix < 0 || ix >= srcCanvas.width || iy < 0 || iy >= srcCanvas.height)
        continue;
      const si = (iy * srcCanvas.width + ix) * 4;
      const di = (dy * outW + dx) * 4;
      out.data[di] = srcData[si];
      out.data[di + 1] = srcData[si + 1];
      out.data[di + 2] = srcData[si + 2];
      out.data[di + 3] = 255;
    }
  }
  dstCtx.putImageData(out, 0, 0);
  return dst;
}

function downloadCanvas(canvas) {
  if (!canvas) return;
  try {
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error("[lasso2] toBlob returned null");
        return;
      }
      const url = URL.createObjectURL(blob);
      const triggerDownload = () => {
        const a = document.createElement("a");
        a.href = url;
        a.download = "lasso-capture.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setCaptureDebug({ lastDownload: "triggered", queuedDownload: false });
        console.log("[lasso2] download triggered");
      };
      const canTriggerNow =
        typeof navigator === "undefined" ||
        !navigator.userActivation ||
        navigator.userActivation.isActive;
      if (typeof window !== "undefined") {
        window.lasso2LastCaptureUrl = url;
        window.lasso2DownloadLastCapture = () => {
          if (!queuedDownload) {
            triggerDownload();
            return true;
          }
          const { url: queuedUrl, filename } = queuedDownload;
          queuedDownload = null;
          const a = document.createElement("a");
          a.href = queuedUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(queuedUrl), 1000);
          setCaptureDebug({ lastDownload: "triggered", queuedDownload: false });
          console.log("[lasso2] queued download triggered");
          return true;
        };
      }
      if (canTriggerNow) {
        triggerDownload();
        return;
      }
      if (queuedDownload && queuedDownload.url)
        URL.revokeObjectURL(queuedDownload.url);
      queuedDownload = { url, filename: "lasso-capture.png" };
      installQueuedDownloadGestureFlush();
      setCaptureDebug({ lastDownload: "queued", queuedDownload: true });
      console.warn(
        "[lasso2] capture ready, but the browser needs a user gesture before downloading. The next click/squeeze will flush it."
      );
    }, "image/png");
  } catch (err) {
    setCaptureDebug({ lastDownload: "failed", lastError: describeError(err) });
    console.error(
      "[lasso2] downloadCanvas error (canvas may be tainted):",
      err
    );
  }
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export const init = async (model) => {
  const isHeadsetClient =
    typeof navigator !== "undefined" &&
    navigator.userAgent.indexOf("OculusBrowser") >= 0;
  if (!isHeadsetClient) {
    ensureDesktopCapturePreviewUI();
    ensurePartnerCanvasWindow();
  }
  server.init(LASSO2_SHARED_KEY, defaultSharedCaptureState());
  let sharedCaptureState = commitSharedCaptureState(
    server.synchronize(LASSO2_SHARED_KEY)
  );
  if (
    !sharedCaptureState.partnerBoard ||
    !Array.isArray(sharedCaptureState.partnerBoard.items)
  )
    sharedCaptureState.partnerBoard = { items: [], updatedAt: 0 };
  if (typeof window !== "undefined") {
    window.lasso2PartnerBoardMutate = (mutateFn) => {
      if (typeof mutateFn !== "function") return;
      const prev = sharedCaptureState.partnerBoard || { items: [], updatedAt: 0 };
      const next = {
        ...prev,
        items: Array.isArray(prev.items) ? prev.items.map((item) => ({ ...item })) : [],
      };
      mutateFn(next);
      next.updatedAt = nowMs();
      sharedCaptureState.partnerBoard = next;
      commitSharedCaptureState(sharedCaptureState);
      server.broadcastGlobal(LASSO2_SHARED_KEY);
    };
  }

  function setMarkerPose(marker, pos) {
    marker.node.identity().move(pos[0], pos[1], pos[2]).scale(MARKER_SCALE);
  }

  function hasAreaTexture(area) {
    return !!area && (!!area.textureCanvas || area.textureChannel != null);
  }

  function shouldExposeCapturedHandles(area) {
    if (!area) return false;
    if (!hasAreaTexture(area)) return true;
    if (area.capturePending) return true;
    return !!area.showHandles;
  }

  function isMarkerInteractable(marker) {
    if (!marker) return false;
    if (!marker.area) return true;
    return shouldExposeCapturedHandles(marker.area);
  }

  function isAreaCaptureEligible(area) {
    return !!area && !hasAreaTexture(area);
  }

  function setMarkerColor(marker, mode = "idle") {
    if (!isMarkerInteractable(marker)) {
      marker.node.opacity(0);
      return;
    }
    if (marker.captureActive) {
      marker.node.color(1, 0, 1).opacity(0.95);
      return;
    }
    if (mode === "drag") {
      marker.node.color(1, 1, 0).opacity(0.95);
      return;
    }
    if (mode === "hover") {
      if (marker.complete) marker.node.color(0, 1, 0).opacity(0.68);
      else marker.node.color(1, 1, 0).opacity(0.72);
      return;
    }
    if (marker.complete) marker.node.color(0, 1, 0).opacity(0.95);
    else marker.node.color(1, 1, 0).opacity(0.95);
  }

  function setSurfaceOpacity(surf, opacity) {
    surf.front.opacity(opacity);
    surf.back.opacity(opacity);
  }

  function refreshAreaOpacity(area) {
    if (!area || !area.surf) return;
    if (area.projectedToComputerCanvas) {
      setSurfaceOpacity(area.surf, 0);
      return;
    }
    const isHoveredSurface =
      hoveredArea === area ||
      (dragging && dragging.type === "area" && dragging.area === area);
    const hasTexture = hasAreaTexture(area);
    setSurfaceOpacity(
      area.surf,
      area.capturePending && !hasTexture
        ? 0
        : hasTexture
        ? TEXTURED_SURFACE_OPACITY
        : isHoveredSurface
        ? SURFACE_HOVER_OPACITY
        : SURFACE_OPACITY
    );
  }

  function applyAreaTexture(area, textureCanvas) {
    if (!textureCanvas) return;
    area.textureCanvas = textureCanvas;
    area.showHandles = false;
    for (const marker of area.pts) setMarkerColor(marker);
    if (area.textureChannel == null) {
      area.surf.front.setTxtr(textureCanvas);
      area.textureChannel = area.surf.front._txtr;
      area.surf.back.txtr(area.textureChannel);
    } else {
      model.txtrSrc(area.textureChannel, textureCanvas);
      area.surf.front.txtr(area.textureChannel);
      area.surf.back.txtr(area.textureChannel);
    }
    if (area.partnerPlaced) {
      area.projectedToComputerCanvas = true;
      const projected = getAreaCenterInComputerCanvas(area);
      upsertPartnerBoardItem(
        area,
        projected && projected.inside
          ? { preferredPosition: { x: projected.x, y: projected.y } }
          : null
      );
    }
  }

  function setAreaCaptureState(area, captureActive) {
    area.capturePending = captureActive;
    refreshAreaOpacity(area);
    for (const marker of area.pts) {
      marker.captureActive = captureActive;
      if (marker !== hoveredMarker) setMarkerColor(marker);
    }
    if (hoveredMarker && hoveredMarker.area === area)
      setMarkerColor(hoveredMarker, captureActive ? "idle" : "hover");
  }

  function clearAreaCaptureState(area) {
    if (!area) return;
    setAreaCaptureState(area, false);
    if (pendingCaptureArea === area) pendingCaptureArea = null;
  }

  function broadcastCaptureRequest(area) {
    const request = {
      id: createRequestId(),
      requesterClientID: clientID,
      areaId: area.id,
      requestedAt: nowMs(),
    };
    sharedCaptureState.request = request;
    sharedCaptureState.response = null;
    if (area) requestedCaptureAreaByRequestId.set(request.id, area);
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO2_SHARED_KEY);
    console.log("[lasso2] broadcast capture request", request);
    if (shouldProcessCaptureOnThisClient()) startCaptureRequest(request);
  }

  function clearSharedSaveRequest(requestId = null) {
    if (
      !sharedCaptureState.saveRequest ||
      (requestId && sharedCaptureState.saveRequest.id !== requestId)
    )
      return;
    sharedCaptureState.saveRequest = null;
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO2_SHARED_KEY);
  }

  function clearSharedCaptureResponse(responseId = null) {
    if (
      !sharedCaptureState.response ||
      (responseId && sharedCaptureState.response.id !== responseId)
    )
      return;
    if (responseId) {
      const targetArea = requestedCaptureAreaByRequestId.get(responseId);
      if (targetArea) clearAreaCaptureState(targetArea);
    }
    sharedCaptureState.response = null;
    sharedCaptureState.request = null;
    if (responseId) requestedCaptureAreaByRequestId.delete(responseId);
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO2_SHARED_KEY);
  }

  function removePartnerBoardItemIfOwned(areaId = null) {
    if (!areaId) return;
    const board = sharedCaptureState.partnerBoard || { items: [], updatedAt: 0 };
    const items = Array.isArray(board.items) ? board.items : [];
    const nextItems = items.filter(
      (item) => !(item && item.areaId === areaId && item.sourceClientID === clientID)
    );
    if (nextItems.length === items.length) return;
    sharedCaptureState.partnerBoard = {
      ...board,
      items: nextItems,
      updatedAt: nowMs(),
    };
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO2_SHARED_KEY);
    lastPartnerBoardPosSyncByArea.delete(areaId);
    lastPartnerAreaSyncByArea.delete(areaId);
  }

  function clampPartnerBoardXY(x, y, w, h) {
    const halfW = Math.max(12, (Number(w) || 120) * 0.5);
    const halfH = Math.max(12, (Number(h) || 120) * 0.5);
    return {
      x: cg.clamp(Number(x) || PARTNER_CANVAS_WIDTH * 0.5, halfW, PARTNER_CANVAS_WIDTH - halfW),
      y: cg.clamp(Number(y) || PARTNER_CANVAS_HEIGHT * 0.5, halfH, PARTNER_CANVAS_HEIGHT - halfH),
    };
  }

  function upsertPartnerBoardItem(area, options = null) {
    if (!area || !area.textureCanvas) return;
    const serialized = serializeCaptureCanvas(
      area.textureCanvas,
      Math.max(MIN_SHARED_TEXTURE_EDGE, 768),
      MAX_SHARED_TEXTURE_DATA_URL_LEN
    );
    if (!serialized || !serialized.dataUrl) return;
    const board = sharedCaptureState.partnerBoard || { items: [], updatedAt: 0 };
    const items = Array.isArray(board.items)
      ? board.items.map((item) => ({ ...item }))
      : [];
    const index = items.findIndex(
      (item) => item && item.areaId === area.id && item.sourceClientID === clientID
    );

    const sourceW = Math.max(1, serialized.canvas.width || 1);
    const sourceH = Math.max(1, serialized.canvas.height || 1);
    const aspect = sourceW / sourceH;
    let drawW = PARTNER_CANVAS_WIDTH * 0.42;
    let drawH = drawW / aspect;
    if (drawH > PARTNER_CANVAS_HEIGHT * 0.42) {
      drawH = PARTNER_CANVAS_HEIGHT * 0.42;
      drawW = drawH * aspect;
    }

    const preferredPos =
      options &&
      options.preferredPosition &&
      Number.isFinite(options.preferredPosition.x) &&
      Number.isFinite(options.preferredPosition.y)
        ? options.preferredPosition
        : null;
    const forcePosition = !!(options && options.forcePosition);

    const maxLayer = items.reduce(
      (m, item) => Math.max(m, Number(item && item.layer) || 0),
      0
    );
    if (index >= 0) {
      const prev = items[index];
      const prevW = prev.w || drawW;
      const prevH = prev.h || drawH;
      const nextPos = forcePosition && preferredPos
        ? clampPartnerBoardXY(preferredPos.x, preferredPos.y, prevW, prevH)
        : clampPartnerBoardXY(prev.x, prev.y, prevW, prevH);
      items[index] = {
        ...prev,
        imageDataUrl: serialized.dataUrl,
        width: sourceW,
        height: sourceH,
        w: prevW,
        h: prevH,
        x: nextPos.x,
        y: nextPos.y,
        updatedAt: nowMs(),
      };
    } else {
      const offset = items.length;
      const seededX =
        preferredPos && Number.isFinite(preferredPos.x)
          ? preferredPos.x
          : 90 + ((offset * 36) % Math.max(120, PARTNER_CANVAS_WIDTH - 180));
      const seededY =
        preferredPos && Number.isFinite(preferredPos.y)
          ? preferredPos.y
          : 110 + ((offset * 28) % Math.max(120, PARTNER_CANVAS_HEIGHT - 180));
      const seededPos = clampPartnerBoardXY(seededX, seededY, drawW, drawH);
      items.push({
        id: `${area.id}:${Math.floor(nowMs())}`,
        areaId: area.id,
        sourceClientID: clientID,
        imageDataUrl: serialized.dataUrl,
        width: sourceW,
        height: sourceH,
        w: drawW,
        h: drawH,
        x: seededPos.x,
        y: seededPos.y,
        layer: maxLayer + 1,
        createdAt: nowMs(),
        updatedAt: nowMs(),
      });
    }
    sharedCaptureState.partnerBoard = {
      ...board,
      items,
      updatedAt: nowMs(),
    };
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO2_SHARED_KEY);
  }

  function processSaveRequest(request) {
    if (!request || request.id === lastProcessedSaveRequestId) return;
    if (!shouldProcessCaptureOnThisClient() || !screenCanvas) return;
    if (screenCanvas.width === 0 || screenCanvas.height === 0) {
      setCaptureDebug({
        status: "save-screen-unavailable",
        lastError: "No shared screen frame was available to save yet.",
      });
      return;
    }
    lastProcessedSaveRequestId = request.id;
    setCaptureDebug({
      status: "saving-full-screen",
      lastError: null,
      lastScreenSize: [screenCanvas.width, screenCanvas.height],
    });
    downloadCanvas(screenCanvas);
    console.log("[lasso2] saved shared screen canvas", request);
    clearSharedSaveRequest(request.id);
  }

  function broadcastSaveRequest() {
    const request = {
      id: createRequestId(),
      requesterClientID: clientID,
      requestedAt: nowMs(),
    };
    sharedCaptureState.saveRequest = request;
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO2_SHARED_KEY);
    console.log("[lasso2] broadcast save request", request);
    processSaveRequest(request);
  }

  function beginAreaCapture(area) {
    if (!area) return;
    if (pendingCaptureArea && pendingCaptureArea !== area)
      setAreaCaptureState(pendingCaptureArea, false);
    pendingCaptureArea = area;
    setAreaCaptureState(area, true);
    playUISound("capture");
    setCaptureDebug({
      status: shouldProcessCaptureOnThisClient()
        ? "capture-burst-started"
        : "capture-requested",
      lastError: null,
      noCornerFrames: 0,
      lastCorners: null,
    });
    broadcastCaptureRequest(area);
  }

  function cancelPendingCapture() {
    if (!pendingCaptureArea) return;
    setAreaCaptureState(pendingCaptureArea, false);
    pendingCaptureArea = null;
    captureBurstDeadline = 0;
    activeCaptureRequest = null;
    setCaptureDebug({ status: "capture-cancelled" });
  }

  function timeoutPendingCapture() {
    if (!activeCaptureRequest) return;
    const timedOutReason =
      hadCornerDetectionInBurst && captureDebug.status === "warp-failed"
        ? "Timed out after detecting border corners, but warp kept failing."
        : hadCornerDetectionInBurst
        ? "Timed out after detecting border corners, but capture did not complete."
        : "Timed out waiting for the fuchsia border to appear in the shared screen.";
    console.warn("[lasso2]", timedOutReason);
    sharedCaptureState.request = null;
    sharedCaptureState.response = {
      id: activeCaptureRequest.id,
      requesterClientID: activeCaptureRequest.requesterClientID,
      areaId: activeCaptureRequest.areaId,
      status: "timeout",
      error: timedOutReason,
      sourceClientID: clientID,
    };
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO2_SHARED_KEY);
    captureBurstDeadline = 0;
    activeCaptureRequest = null;
    hadCornerDetectionInBurst = false;
    setCaptureDebug({
      status: "capture-timeout",
      lastError: timedOutReason,
    });
  }

  function startCaptureRequest(request) {
    if (!request) return;
    activeCaptureRequest = request;
    lastStartedCaptureRequestId = request.id;
    captureBurstDeadline = nowMs() + CAPTURE_BURST_MS;
    _captureFrameCount = 0;
    hadCornerDetectionInBurst = false;
    setCaptureDebug({
      status: "capture-burst-started",
      lastError: null,
      noCornerFrames: 0,
      lastCorners: null,
    });
    console.log("[lasso2] desktop client started capture request", request);
  }

  function resolveCaptureTargetArea(response) {
    if (!response) return null;
    let area =
      (response.id && requestedCaptureAreaByRequestId.get(response.id)) || null;
    if (!area) area = areaById.get(response.areaId) || null;
    if (!area && pendingCaptureArea) area = pendingCaptureArea;
    if (!area) {
      for (const candidate of completedAreas) {
        if (!candidate.capturePending) continue;
        if (hasAreaTexture(candidate)) continue;
        area = candidate;
        break;
      }
    }
    return area;
  }

  function applyTextureResponse(response, area) {
    if (!response) return false;
    if (!area) {
      setCaptureDebug({
        status: "capture-area-missing",
        lastError:
          "Capture response arrived but no local target area matched the response.",
      });
      console.warn(
        "[lasso2] response received but target area was not found",
        response
      );
      clearSharedCaptureResponse(response.id);
      return false;
    }
    if (!response.imageDataUrl) {
      setCaptureDebug({
        status: "capture-image-missing",
        lastError: "Capture response did not include texture image data.",
      });
      console.warn("[lasso2] response missing imageDataUrl", response);
      clearSharedCaptureResponse(response.id);
      return false;
    }
    const img = new Image();
    img.onload = () => {
      const textureCanvas =
        area.textureCanvas || document.createElement("canvas");
      textureCanvas.width = img.width;
      textureCanvas.height = img.height;
      const ctx = textureCanvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
      ctx.drawImage(img, 0, 0);
      applyAreaTexture(area, textureCanvas);
      clearAreaCaptureState(area);
      console.log("[lasso2] applied texture response to area", {
        responseId: response.id,
        areaId: area.id,
        size: [textureCanvas.width, textureCanvas.height],
      });
      setCaptureDebug({
        status: "capture-complete",
        lastCaptureSize: [textureCanvas.width, textureCanvas.height],
        lastError: null,
      });
      clearSharedCaptureResponse(response.id);
    };
    img.onerror = () => {
      setCaptureDebug({
        status: "capture-image-error",
        lastError: "Failed to load the captured texture image.",
      });
      console.error("[lasso2] failed to decode capture imageDataUrl", {
        responseId: response.id,
        areaId: area && area.id,
        hasImageDataUrl: !!response.imageDataUrl,
        imageDataUrlLength: response.imageDataUrl
          ? response.imageDataUrl.length
          : 0,
      });
      clearSharedCaptureResponse(response.id);
    };
    img.src = response.imageDataUrl;
    return true;
  }

  let _captureFrameCount = 0;
  function tryCapturePendingArea() {
    if (
      !activeCaptureRequest ||
      !screenCanvas ||
      screenCanvas.width === 0 ||
      screenCanvas.height === 0
    )
      return;
    _captureFrameCount++;
    setCaptureDebug({
      status: "detecting-border",
      lastScreenSize: [screenCanvas.width, screenCanvas.height],
      noCornerFrames: _captureFrameCount,
    });
    const corners = detectFuchsiaCorners(screenCanvas);
    if (!corners) {
      setCaptureDebug({ noCornerFrames: _captureFrameCount });
      if (_captureFrameCount % 30 === 1)
        console.log(
          `[lasso2] tryCapture frame ${_captureFrameCount}: no fuchsia corners found (canvas ${screenCanvas.width}x${screenCanvas.height})`
        );
      return;
    }
    console.log(
      "[lasso2] fuchsia border detected, capturing area texture",
      corners
    );
    hadCornerDetectionInBurst = true;
    const localTargetArea =
      activeCaptureRequest.requesterClientID === clientID
        ? resolveCaptureTargetArea({
            areaId: activeCaptureRequest.areaId,
          })
        : null;
    if (
      activeCaptureRequest.requesterClientID === clientID &&
      !localTargetArea
    ) {
      console.warn(
        "[lasso2] local capture target was not found for requester area",
        activeCaptureRequest
      );
    }
    const warped = warpToCanvas(
      screenCanvas,
      corners,
      localTargetArea && localTargetArea.textureCanvas
    );
    if (!warped) {
      setCaptureDebug({ status: "warp-failed", lastCorners: corners });
      return;
    }
    if (AUTO_DOWNLOAD_CAPTURE) downloadCanvas(warped);
    if (localTargetArea) {
      applyAreaTexture(localTargetArea, warped);
    }
    const serialized = serializeCaptureCanvas(warped);
    const serializableCanvas = serialized && serialized.canvas;
    const imageDataUrl = serialized && serialized.dataUrl;
    if (imageDataUrl) updateDesktopCapturePreview(imageDataUrl);
    if (!serializableCanvas || !imageDataUrl) {
      sharedCaptureState.request = null;
      sharedCaptureState.response = {
        id: activeCaptureRequest.id,
        requesterClientID: activeCaptureRequest.requesterClientID,
        areaId: activeCaptureRequest.areaId,
        status: "error",
        error:
          "Capture succeeded locally but failed to serialize texture image data.",
        sourceClientID: clientID,
      };
      console.warn(
        "[lasso2] capture serialization failed; broadcasting error response",
        sharedCaptureState.response
      );
      commitSharedCaptureState(sharedCaptureState);
      server.broadcastGlobal(LASSO2_SHARED_KEY);
      captureBurstDeadline = 0;
      activeCaptureRequest = null;
      hadCornerDetectionInBurst = false;
      setCaptureDebug({
        status: "capture-serialize-failed",
        lastCorners: corners,
        lastCaptureSize: [warped.width, warped.height],
      });
      return;
    }
    sharedCaptureState.request = null;
    sharedCaptureState.response = {
      id: activeCaptureRequest.id,
      requesterClientID: activeCaptureRequest.requesterClientID,
      areaId: activeCaptureRequest.areaId,
      status: "success",
      imageDataUrl,
      width: serializableCanvas.width,
      height: serializableCanvas.height,
      mimeType: serialized.mimeType,
      encodingQuality:
        serialized.quality == null ? null : Number(serialized.quality),
      sourceClientID: clientID,
    };
    console.log("[lasso2] broadcasting capture success response", {
      id: sharedCaptureState.response.id,
      requesterClientID: sharedCaptureState.response.requesterClientID,
      areaId: sharedCaptureState.response.areaId,
      sourceClientID: sharedCaptureState.response.sourceClientID,
      size: [sharedCaptureState.response.width, sharedCaptureState.response.height],
      warpedSize: [warped.width, warped.height],
      imageDataUrlLength: imageDataUrl.length,
      mimeType: serialized.mimeType,
      quality: serialized.quality,
    });
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO2_SHARED_KEY);
    captureBurstDeadline = 0;
    activeCaptureRequest = null;
    hadCornerDetectionInBurst = false;
    setCaptureDebug({
      status: "capture-complete",
      lastCorners: corners,
      lastCaptureSize: [warped.width, warped.height],
      noCornerFrames: 0,
    });
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
    if (clearCanvas && screenCanvas) {
      const ctx = screenCanvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, screenCanvas.width, screenCanvas.height);
      screenCanvas.width = 0;
      screenCanvas.height = 0;
    }
    if (clearCanvas && screenCaptureDebugPopupCanvas && screenCaptureDebugPopupCtx) {
      screenCaptureDebugPopupCtx.clearRect(
        0,
        0,
        screenCaptureDebugPopupCanvas.width,
        screenCaptureDebugPopupCanvas.height
      );
    }
  }

  async function startDesktopScreenCapture() {
    stopDesktopScreenCapture();
    screenCaptureActive = true;
    screenCanvas =
      document.getElementById("textureCanvas") ||
      window.textureCanvas ||
      document.createElement("canvas");
    try {
      setCaptureDebug({
        status: "requesting-screen-capture",
        lastError: null,
      });
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      screenCaptureStream = stream;
      setCaptureDebug({ status: "screen-capture-granted" });
      const video = document.createElement("video");
      screenCaptureVideo = video;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = stream;
      const [track] = stream.getVideoTracks();
      if (track)
        track.addEventListener("ended", () => {
          setCaptureDebug({ status: "screen-capture-ended" });
          stopDesktopScreenCapture({ clearCanvas: true });
        });
      video.onloadedmetadata = () => {
        video.play().catch((err) => {
          setCaptureDebug({
            status: "video-play-failed",
            lastError: describeError(err),
          });
          console.error("[lasso2] screen capture video failed to play:", err);
        });
        setTimeout(() => {
          if (!screenCanvas || !screenCaptureVideo) return;
          screenCanvas.width = video.videoWidth;
          screenCanvas.height = video.videoHeight;
          hideMainScreenCanvasCaptureSource(screenCanvas);
          if (SHOW_SCREEN_CAPTURE_DEBUG_POPUP) ensureScreenCaptureDebugPopup();
          setCaptureDebug({
            status: "capturing-screen",
            lastScreenSize: [screenCanvas.width, screenCanvas.height],
          });
          if (screenCaptureTimer) clearInterval(screenCaptureTimer);
          screenCaptureTimer = setInterval(() => {
            if (!screenCaptureVideo || screenCaptureVideo.readyState < 2)
              return;
            const ctx = screenCanvas.getContext("2d");
            if (!ctx) {
              setCaptureDebug({
                status: "capture-context-missing",
                lastError: "Could not get 2D context for drawImage.",
              });
              return;
            }
            ctx.drawImage(screenCaptureVideo, 0, 0);
            mirrorScreenCaptureToDebugPopup();

            if (activeCaptureRequest) {
              if (captureBurstDeadline && nowMs() <= captureBurstDeadline)
                tryCapturePendingArea();
              else if (captureBurstDeadline && nowMs() > captureBurstDeadline)
                timeoutPendingCapture();
            }
          }, 30);
        }, 1000);
      };
      video.onerror = (err) => {
        setCaptureDebug({
          status: "video-error",
          lastError: describeError(err),
        });
        console.error("[lasso2] screen capture video error:", err);
      };
      return true;
    } catch (err) {
      setCaptureDebug({
        status: "screen-capture-failed",
        lastError: describeError(err),
      });
      console.error("captureScreen:", err);
      stopDesktopScreenCapture();
      return false;
    }
  }

  async function repickDesktopScreenCapture() {
    console.log("[lasso2] repicking desktop screen share");
    setCaptureDebug({
      status: "repicking-screen-capture",
      lastError: null,
    });
    return startDesktopScreenCapture();
  }

  if (typeof window !== "undefined" && shouldOwnDisplayCapture()) {
    window.lasso2RepickScreenShare = repickDesktopScreenCapture;
    window.lasso2StopScreenShare = () =>
      stopDesktopScreenCapture({ clearCanvas: true });
    window.lasso2OpenScreenCaptureDebugPopup = () => !!ensureScreenCaptureDebugPopup();
    window.lasso2CloseScreenCaptureDebugPopup = () => {
      if (screenCaptureDebugPopup && !screenCaptureDebugPopup.closed)
        screenCaptureDebugPopup.close();
      screenCaptureDebugPopup = null;
      screenCaptureDebugPopupCanvas = null;
      screenCaptureDebugPopupCtx = null;
    };
    if (!window.__lasso2RepickKeyHandler) {
      window.__lasso2RepickKeyHandler = (event) => {
        const target = event.target;
        const tagName = target && target.tagName;
        const isTypingTarget =
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          (target && target.isContentEditable);
        if (isTypingTarget) return;
        if (event.shiftKey && event.key.toLowerCase() === "r") {
          event.preventDefault();
          repickDesktopScreenCapture();
        }
      };
      window.addEventListener("keydown", window.__lasso2RepickKeyHandler);
    }
  }

  if (!screenCaptureActive && shouldOwnDisplayCapture()) {
    startDesktopScreenCapture();
  } else if (
    shouldOwnDisplayCapture() &&
    screenCaptureActive &&
    (!screenCaptureStream || !screenCaptureVideo)
  ) {
    setCaptureDebug({
      status: "stale-screen-capture-session",
      lastError:
        "Desktop capture was marked active, but no live stream was attached. Use Shift+R to pick the cast tab again.",
    });
  } else if (screenCanvas) {
    setCaptureDebug({
      status: "reusing-existing-screen-canvas",
      lastScreenSize: [screenCanvas.width, screenCanvas.height],
    });
  } else if (!shouldOwnDisplayCapture()) {
    setCaptureDebug({
      status: "waiting-for-desktop-capture-client",
      lastError: null,
    });
  }

  // ─── State ────────────────────────────────────────────────────────────────

  const BEAM_DEPTH = 0.7;
  const HOVER_RADIUS = 0.03;

  // { pos:[x,y,z], node }
  const allMarkers = [];
  // { pts:[4 marker refs], surf }  — surface updated live on drag
  const completedAreas = [];
  const areaById = new Map();
  // markers for the quad being placed right now (< 4)
  const currentMarkers = [];
  let nextAreaIndex = 0;

  const beam = new ControllerBeam(model, preferredHand);
  const cursor = model
    .add("sphere")
    .color(0.75, 0.75, 0.75)
    .opacity(0.85)
    .scale(CURSOR_SCALE)
    .dull();
  // All edges redrawn from scratch every frame — no incremental clear needed
  const edgesRoot = model.add();
  const hintRoot = model.add();

  let hoveredMarker = null;
  let hoveredArea = null;
  let dragging = null;

  let HINT_CONFIG = {
    SELECT: {
      OFFSET: [-0.09, -0.012, 0.055],
      POINT: {
        id: 1,
        texture: "../media/icons/select-point.png",
      },
      CAPTURE: {
        id: 2,
        texture: "../media/icons/select-capture.png",
      },
    },
    GRAB: {
      OFFSET: [-0.08, -0.08, 0.055],
      POINT: {
        id: 3,
        texture: "../media/icons/grab-point.png",
      },
      SURFACE: {
        id: 4,
        texture: "../media/icons/grab-surface.png",
      },
    },
    SAVE: {
      OFFSET: [0.11, -0.01, 0.05],
      POINT: {
        id: 5,
        texture: "../media/icons/grab-point.png",
      },
    },
  };

  function initHintTextures() {
    for (const action in HINT_CONFIG) {
      for (const mode in HINT_CONFIG[action]) {
        const hintInfo = HINT_CONFIG[action][mode];
        if (!hintInfo || typeof hintInfo !== "object" || !hintInfo.texture)
          continue;
        model.txtrSrc(hintInfo.id, hintInfo.texture);
      }
    }
  }
  initHintTextures();

  function resolveHintAnchorPosition(anchor, offset) {
    if (!anchor || !Array.isArray(anchor)) return null;
    const ox = offset && offset.length > 0 ? offset[0] : 0;
    const oy = offset && offset.length > 1 ? offset[1] : 0;
    const oz = offset && offset.length > 2 ? offset[2] : 0;

    // If a 4x4 hand matrix is provided, apply offset in the hand's local basis.
    if (anchor.length >= 16) {
      return [
        anchor[12] + anchor[0] * ox + anchor[4] * oy + anchor[8] * oz,
        anchor[13] + anchor[1] * ox + anchor[5] * oy + anchor[9] * oz,
        anchor[14] + anchor[2] * ox + anchor[6] * oy + anchor[10] * oz,
      ];
    }

    if (anchor.length >= 3) {
      return [anchor[0] + ox, anchor[1] + oy, anchor[2] + oz];
    }

    return null;
  }

  function placeHint(hint, anchorPos, offset) {
    const p = resolveHintAnchorPosition(anchorPos, offset);
    if (!p) {
      setHintVisible(hint, false);
      return;
    }
    hint
      .identity()
      .move(p[0], p[1], p[2])
      .scale(HINT_PANEL_WIDTH * HINT_PANEL_SCALE, HINT_PANEL_HEIGHT * HINT_PANEL_SCALE, 1)
      .color(1,1,1)
      .dull();
    }

  function createControllerHint(title) {
    const hint = hintRoot
      .add("square")
      .move(0, 0, -0.0005)
      .scale(HINT_PANEL_WIDTH * HINT_PANEL_SCALE, HINT_PANEL_HEIGHT * HINT_PANEL_SCALE, 1)
      .color(0, 0, 0)
      .opacity(0)
      .txtr(HINT_CONFIG[title].POINT.id)
    
    return hint;
  }

  function updateHint(hint, action) {
    if (!action || action == null) {
      setHintVisible(hint, false);
      return;
    }
    setHintVisible(hint, true);
    hint.txtr(HINT_CONFIG[action[0]][action[1]].id)
  }

  function setHintVisible(hint, visible) {
    hint.opacity(visible ? 0.95 : 0);
  }

  const selectHint = createControllerHint("SELECT");
  const grabHint = createControllerHint("GRAB");
  const saveHint = createControllerHint("SAVE");

  function updateControllerHints(anchorPos = null) {
    if (!anchorPos) {
      setHintVisible(selectHint, false);
      setHintVisible(grabHint, false);
      setHintVisible(saveHint, false);
      return;
    }

    placeHint(selectHint, anchorPos, HINT_CONFIG.SELECT.OFFSET);
    placeHint(grabHint, anchorPos, HINT_CONFIG.GRAB.OFFSET);
    placeHint(saveHint, anchorPos, HINT_CONFIG.SAVE.OFFSET);

    const activeMarker =
      dragging && dragging.type === "marker" ? dragging.marker : hoveredMarker;
    const activeArea =
      dragging && dragging.type === "area"
        ? dragging.area
        : hoveredArea || (activeMarker ? activeMarker.area : null);
    const captureHoverTarget =
      (activeMarker && isAreaCaptureEligible(activeMarker.area)
        ? activeMarker.area
        : null) ||
      (activeArea && isAreaCaptureEligible(activeArea) ? activeArea : null);
    const grabTargetType =
      dragging && dragging.type === "area"
        ? "area"
        : dragging && dragging.type === "marker"
        ? "marker"
        : hoveredMarker
        ? "marker"
        : hoveredArea
        ? "area"
        : null;
    const saveTargetArea =
      activeArea || (activeMarker ? activeMarker.area : null);

    setHintVisible(selectHint, true);
    updateHint(
      selectHint,
      captureHoverTarget ? ["SELECT", "CAPTURE"] : grabTargetType ? ["SELECT", "POINT"] : ["SELECT", "POINT"]
    );

    setHintVisible(grabHint, !!grabTargetType);
    updateHint(
      grabHint,
      grabTargetType === "area"
        ? ["GRAB", "SURFACE"]
        : grabTargetType === "marker"
        ? ["GRAB", "POINT"]
        : null
    );

    setHintVisible(saveHint, hasAreaTexture(saveTargetArea));
    updateHint(
      saveHint,
      hasAreaTexture(saveTargetArea) ? ["SAVE", "POINT"] : null
    );
  }

  const safeVibrate = (hand, intensity, duration) => {
    if (typeof vibrate === "function") vibrate(hand, intensity, duration);
  };

  const isButtonActive = (button, threshold = ACTION_BUTTON_THRESHOLD) =>
    !!button && (button.pressed || button.value >= threshold);

  const isAnyButtonPressed = (
    hand,
    buttons,
    threshold = ACTION_BUTTON_THRESHOLD
  ) =>
    buttons.some((button) => {
      const state = buttonState[hand] && buttonState[hand][button];
      return isButtonActive(state, threshold);
    });

  // In-world drop marker for transfer target (no embedded 2D preview).
  let computerCanvasMarkerRoot = null;
  let computerCanvasHitVolume = null;
  let computerCanvasPreviewRoot = null;
  const computerCanvasPreviewItems = new Map();
  function createComputerCanvasMarker() {
    const root = model
      .add()
      .move(COMPUTER_CANVAS_POS[0], COMPUTER_CANVAS_POS[1], COMPUTER_CANVAS_POS[2])
      .scale(
        COMPUTER_CANVAS_WIDTH * COMPUTER_CANVAS_SCALE,
        COMPUTER_CANVAS_HEIGHT * COMPUTER_CANVAS_SCALE,
        COMPUTER_CANVAS_HALF_DEPTH
      );
    const volume = root
      .add("cube")
      .color(0.0, 0.9, 1.2)
      .opacity(0.2)
      .dull();
    const edgeT = 0.03;
    const edgeR = 5.0;
    const edgeG = 1.2;
    const edgeB = 5.0;
    const addEdge = (x, y, z, sx, sy, sz) =>
      root
        .add("cube")
        .move(x, y, z)
        .scale(sx, sy, sz)
        .color(edgeR, edgeG, edgeB)
        .opacity(0.95)
        .dull();
    for (const y of [-1, 1]) for (const z of [-1, 1]) addEdge(0, y, z, 1, edgeT, edgeT);
    for (const x of [-1, 1]) for (const z of [-1, 1]) addEdge(x, 0, z, edgeT, 1, edgeT);
    for (const x of [-1, 1]) for (const y of [-1, 1]) addEdge(x, y, 0, edgeT, edgeT, 1);
    return { root, volume };
  }
  {
    const marker = createComputerCanvasMarker();
    computerCanvasMarkerRoot = marker.root;
    computerCanvasHitVolume = marker.volume;
    computerCanvasPreviewRoot = computerCanvasMarkerRoot.add();
  }

  function getOrCreateComputerCanvasPreviewItem(itemId) {
    let preview = computerCanvasPreviewItems.get(itemId);
    if (preview) return preview;
    const root = computerCanvasPreviewRoot.add();
    const front = root
      .add("square")
      .color(1, 1, 1)
      .opacity(0)
      .dull();
    const back = root
      .add("square")
      .turnY(Math.PI)
      .color(1, 1, 1)
      .opacity(0)
      .dull();
    preview = {
      root,
      front,
      back,
      textureChannel: null,
      imageDataUrl: null,
    };
    computerCanvasPreviewItems.set(itemId, preview);
    return preview;
  }

  function hideComputerCanvasPreviewItem(preview) {
    if (!preview) return;
    preview.root.identity().move(0, 0, -3).scale(0.0001, 0.0001, 1);
    preview.front.opacity(0);
    preview.back.opacity(0);
  }

  function renderComputerCanvasBoard(board) {
    if (!computerCanvasPreviewRoot) return;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const items = Array.isArray(board && board.items)
      ? board.items
          .slice()
          .sort((a, b) => (Number(a && a.layer) || 0) - (Number(b && b.layer) || 0))
      : [];
    const activeIds = new Set();
    let drawIndex = 0;

    for (const item of items) {
      if (!item || !item.id || !item.imageDataUrl) continue;
      const preview = getOrCreateComputerCanvasPreviewItem(item.id);
      activeIds.add(item.id);

      if (
        preview.textureChannel == null ||
        preview.imageDataUrl !== item.imageDataUrl
      ) {
        if (preview.textureChannel == null) {
          preview.front.setTxtr(item.imageDataUrl);
          preview.textureChannel = preview.front._txtr;
        } else {
          model.txtrSrc(preview.textureChannel, item.imageDataUrl);
          preview.front.txtr(preview.textureChannel);
        }
        preview.back.txtr(preview.textureChannel);
        preview.imageDataUrl = item.imageDataUrl;
      }

      const xPx = Number(item.x) || PARTNER_CANVAS_WIDTH * 0.5;
      const yPx = Number(item.y) || PARTNER_CANVAS_HEIGHT * 0.5;
      const wPx = Math.max(24, Number(item.w) || 140);
      const hPx = Math.max(24, Number(item.h) || 100);

      const nx = clamp((xPx / PARTNER_CANVAS_WIDTH) * 2 - 1, -0.98, 0.98);
      const ny = clamp(1 - (yPx / PARTNER_CANVAS_HEIGHT) * 2, -0.98, 0.98);
      const sx = clamp(wPx / PARTNER_CANVAS_WIDTH, 0.02, 0.98);
      const sy = clamp(hPx / PARTNER_CANVAS_HEIGHT, 0.02, 0.98);
      const layerZ = 0.88 - Math.min(drawIndex, 40) * 0.003;
      drawIndex += 1;

      preview.root.identity().move(nx, ny, layerZ).scale(sx, sy, 1);
      preview.front.opacity(0.995).color(1, 1, 1);
      preview.back.opacity(0.995).color(1, 1, 1);
    }

    for (const [itemId, preview] of computerCanvasPreviewItems) {
      if (!activeIds.has(itemId)) hideComputerCanvasPreviewItem(preview);
    }
  }

  function getAreaCenter(area) {
    if (!area || !area.pts || area.pts.length === 0) return null;
    const sum = area.pts.reduce(
      (acc, marker) => [
        acc[0] + marker.pos[0],
        acc[1] + marker.pos[1],
        acc[2] + marker.pos[2],
      ],
      [0, 0, 0]
    );
    const inv = 1 / area.pts.length;
    return [sum[0] * inv, sum[1] * inv, sum[2] * inv];
  }

  function getAreaCenterInComputerCanvas(area) {
    if (!computerCanvasHitVolume) return null;
    const center = getAreaCenter(area);
    if (!center) return null;
    const canvasMatrix = computerCanvasHitVolume.getGlobalMatrix();
    if (!canvasMatrix) return null;
    const inv = cg.mInverse(canvasMatrix);
    const local = cg.mTransform(inv, center);
    if (
      !local ||
      local.length < 3 ||
      !Number.isFinite(local[0]) ||
      !Number.isFinite(local[1]) ||
      !Number.isFinite(local[2])
    )
      return null;

    return {
      center,
      local,
      inside:
        Math.abs(local[0]) < 1 && Math.abs(local[1]) < 1 && Math.abs(local[2]) < 1,
      x: (local[0] * 0.5 + 0.5) * PARTNER_CANVAS_WIDTH,
      y: (0.5 - local[1] * 0.5) * PARTNER_CANVAS_HEIGHT,
    };
  }

  function syncAreaPositionFromPartnerBoard(area, boardItem) {
    if (!area || !boardItem || !computerCanvasHitVolume) return false;
    if (!area.partnerPlaced || !hasAreaTexture(area)) return false;

    const isDraggedArea = !!dragging && dragging.type === "area" && dragging.area === area;
    const isDraggedMarker =
      !!dragging &&
      dragging.type === "marker" &&
      dragging.marker &&
      dragging.marker.area === area;
    if (isDraggedArea || isDraggedMarker) return false;

    const projected = getAreaCenterInComputerCanvas(area);
    if (!projected || !projected.center || !projected.local) return false;

    const itemX = Number(boardItem.x);
    const itemY = Number(boardItem.y);
    if (!Number.isFinite(itemX) || !Number.isFinite(itemY)) return false;

    const deltaPx = Math.max(
      Math.abs(itemX - projected.x),
      Math.abs(itemY - projected.y)
    );
    const now = nowMs();
    const last = lastPartnerAreaSyncByArea.get(area.id);
    const intervalOk = !last || now - last.t >= PARTNER_AREA_SYNC_MIN_MS;
    if (deltaPx < PARTNER_AREA_SYNC_MIN_DELTA_PX || !intervalOk) return false;

    const canvasMatrix = computerCanvasHitVolume.getGlobalMatrix();
    if (!canvasMatrix) return false;

    const targetLocal = [
      cg.clamp((itemX / PARTNER_CANVAS_WIDTH) * 2 - 1, -0.98, 0.98),
      cg.clamp(1 - (itemY / PARTNER_CANVAS_HEIGHT) * 2, -0.98, 0.98),
      Number.isFinite(projected.local[2]) ? projected.local[2] : 0,
    ];
    const targetCenter = cg.mTransform(canvasMatrix, targetLocal);
    if (!targetCenter || targetCenter.length < 3) return false;

    const delta = [
      targetCenter[0] - projected.center[0],
      targetCenter[1] - projected.center[1],
      targetCenter[2] - projected.center[2],
    ];
    if (
      !Number.isFinite(delta[0]) ||
      !Number.isFinite(delta[1]) ||
      !Number.isFinite(delta[2])
    )
      return false;
    const deltaLenSq = delta[0] * delta[0] + delta[1] * delta[1] + delta[2] * delta[2];
    if (deltaLenSq <= 1e-10) return false;

    moveAreaBy(area, delta);
    lastPartnerAreaSyncByArea.set(area.id, { t: now, x: itemX, y: itemY });
    return true;
  }

  function syncPartnerBoardPositionFromArea(area, projected, force = false) {
    if (!area || !projected) return false;
    const board = sharedCaptureState.partnerBoard || { items: [], updatedAt: 0 };
    const items = Array.isArray(board.items)
      ? board.items.map((item) => ({ ...item }))
      : [];
    const index = items.findIndex(
      (item) => item && item.areaId === area.id && item.sourceClientID === clientID
    );
    if (index < 0) return false;

    const now = nowMs();
    const item = items[index];
    const currentX = Number(item.x) || PARTNER_CANVAS_WIDTH * 0.5;
    const currentY = Number(item.y) || PARTNER_CANVAS_HEIGHT * 0.5;
    const next = clampPartnerBoardXY(
      projected.x,
      projected.y,
      Number(item.w) || 120,
      Number(item.h) || 120
    );
    const movedEnough =
      Math.abs(next.x - currentX) >= PARTNER_POSITION_SYNC_MIN_DELTA_PX ||
      Math.abs(next.y - currentY) >= PARTNER_POSITION_SYNC_MIN_DELTA_PX;
    const last = lastPartnerBoardPosSyncByArea.get(area.id);
    const intervalOk =
      !last || now - last.t >= PARTNER_POSITION_SYNC_MIN_MS;
    if (!force && (!movedEnough || !intervalOk)) return false;
    if (!force && currentX === next.x && currentY === next.y) return false;

    items[index] = {
      ...item,
      x: next.x,
      y: next.y,
      updatedAt: now,
    };
    sharedCaptureState.partnerBoard = {
      ...board,
      items,
      updatedAt: now,
    };
    commitSharedCaptureState(sharedCaptureState);
    server.broadcastGlobal(LASSO2_SHARED_KEY);
    lastPartnerBoardPosSyncByArea.set(area.id, { t: now, x: next.x, y: next.y });
    return true;
  }

  function setPartnerPlacementArea(area, projected = null) {
    if (!area || !hasAreaTexture(area)) return;
    const areaProjected = projected || getAreaCenterInComputerCanvas(area);
    if (!areaProjected || !areaProjected.inside) return;
    const wasPlaced = !!area.partnerPlaced;
    area.partnerPlaced = true;
    area.projectedToComputerCanvas = true;
    if (!wasPlaced)
      upsertPartnerBoardItem(area, {
        preferredPosition: { x: areaProjected.x, y: areaProjected.y },
      });
  }

  function updateAreaComputerCanvasProjection(area) {
    const isDraggedArea = !!dragging && dragging.type === "area" && dragging.area === area;
    const isDraggedMarker =
      !!dragging &&
      dragging.type === "marker" &&
      dragging.marker &&
      dragging.marker.area === area;
    const isManipulatingArea = isDraggedArea || isDraggedMarker;
    const projected = getAreaCenterInComputerCanvas(area);
    const isInsideDropZone = !!(projected && projected.inside);
    const textured = hasAreaTexture(area);

    if (isManipulatingArea) {
      if (isInsideDropZone && textured) {
        setPartnerPlacementArea(area, projected);
        syncPartnerBoardPositionFromArea(area, projected, false);
        area.projectedToComputerCanvas = true;
        return;
      }
      if (area.partnerPlaced && !isInsideDropZone) {
        area.partnerPlaced = false;
        removePartnerBoardItemIfOwned(area.id);
      }
      area.projectedToComputerCanvas = !!area.partnerPlaced;
      return;
    }

    if (isInsideDropZone && textured) {
      setPartnerPlacementArea(area, projected);
      area.projectedToComputerCanvas = true;
      return;
    }

    area.projectedToComputerCanvas = !!area.partnerPlaced;
  }

  // ─── Edge drawing (called every frame, container cleared first) ───────────

  function drawEdge(p1, p2, r, g, b, thickness = EDGE_THICKNESS) {
    const dx = p2[0] - p1[0],
      dy = p2[1] - p1[1],
      dz = p2[2] - p1[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-6) return;
    const fx = dx / len,
      fy = dy / len,
      fz = dz / len;

    let ux = 0,
      uy = 1,
      uz = 0;
    if (Math.abs(fy) > 0.9) {
      ux = 1;
      uy = 0;
      uz = 0;
    }

    let ex = fy * uz - fz * uy,
      ey = fz * ux - fx * uz,
      ez = fx * uy - fy * ux;
    const elen = Math.sqrt(ex * ex + ey * ey + ez * ez);
    ex /= elen;
    ey /= elen;
    ez /= elen;
    const tx = ey * fz - ez * fy,
      ty = ez * fx - ex * fz,
      tz = ex * fy - ey * fx;

    const mx = (p1[0] + p2[0]) / 2,
      my = (p1[1] + p2[1]) / 2,
      mz = (p1[2] + p2[2]) / 2;
    edgesRoot
      .add("cube")
      .setMatrix([
        ex * thickness,
        ey * thickness,
        ez * thickness,
        0,
        tx * thickness,
        ty * thickness,
        tz * thickness,
        0,
        (fx * len) / 2,
        (fy * len) / 2,
        (fz * len) / 2,
        0,
        mx,
        my,
        mz,
        1,
      ])
      .color(r, g, b)
      .dull();
  }

  function makeSurface() {
    const root = model.add();
    const front = root
      .add("square")
      .color(1, 1, 1)
      .opacity(SURFACE_OPACITY)
      .dull();
    const back = root
      .add("square")
      .turnY(Math.PI)
      .color(1, 1, 1)
      .opacity(SURFACE_OPACITY)
      .dull();
    return { root, front, back };
  }

  // ─── Square surface matrix ────────────────────────────────────────────────

  function setSurfaceMatrix(surf, pts) {
    const origin = pts
      .reduce((sum, p) => [sum[0] + p[0], sum[1] + p[1], sum[2] + p[2]], [
        0,
        0,
        0,
      ])
      .map((v) => v / pts.length);
    const edge1 = [
      (pts[1][0] - pts[0][0] + pts[2][0] - pts[3][0]) / 2,
      (pts[1][1] - pts[0][1] + pts[2][1] - pts[3][1]) / 2,
      (pts[1][2] - pts[0][2] + pts[2][2] - pts[3][2]) / 2,
    ];
    const edge2 = [
      (pts[3][0] - pts[0][0] + pts[2][0] - pts[1][0]) / 2,
      (pts[3][1] - pts[0][1] + pts[2][1] - pts[1][1]) / 2,
      (pts[3][2] - pts[0][2] + pts[2][2] - pts[1][2]) / 2,
    ];
    const normalize = (v) => {
      const len = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / len, v[1] / len, v[2] / len];
    };
    const cross = (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

    const axisX = normalize(edge1);
    let normal = normalize(cross(edge1, edge2));
    let axisY = normalize(cross(normal, axisX));
    normal = normalize(cross(axisX, axisY));

    let minU = Infinity,
      maxU = -Infinity,
      minV = Infinity,
      maxV = -Infinity;
    for (const p of pts) {
      const rel = [p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]];
      const u = dot(rel, axisX);
      const v = dot(rel, axisY);
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }

    const halfU = Math.max((maxU - minU) / 2, 0.001);
    const halfV = Math.max((maxV - minV) / 2, 0.001);
    const centerOffset = [
      axisX[0] * ((minU + maxU) / 2) + axisY[0] * ((minV + maxV) / 2),
      axisX[1] * ((minU + maxU) / 2) + axisY[1] * ((minV + maxV) / 2),
      axisX[2] * ((minU + maxU) / 2) + axisY[2] * ((minV + maxV) / 2),
    ];
    const center = [
      origin[0] + centerOffset[0],
      origin[1] + centerOffset[1],
      origin[2] + centerOffset[2],
    ];

    surf.root.setMatrix([
      axisX[0] * halfU,
      axisX[1] * halfU,
      axisX[2] * halfU,
      0,
      axisY[0] * halfV,
      axisY[1] * halfV,
      axisY[2] * halfV,
      0,
      normal[0],
      normal[1],
      normal[2],
      0,
      center[0],
      center[1],
      center[2],
      1,
    ]);
  }

  function orderMarkersClockwise(markers) {
    if (!markers || markers.length !== 4) return markers ? markers.slice() : [];
    const pts = markers.map((m) => m.pos);
    const centroid = pts
      .reduce((sum, p) => [sum[0] + p[0], sum[1] + p[1], sum[2] + p[2]], [
        0,
        0,
        0,
      ])
      .map((v) => v / 4);
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
    const length = (v) => Math.hypot(v[0], v[1], v[2]);
    const normalize = (v) => {
      const len = length(v);
      return len > 1e-8 ? [v[0] / len, v[1] / len, v[2] / len] : null;
    };

    let normal = null;
    for (let i = 0; i < 4 && !normal; i++) {
      for (let j = i + 1; j < 4 && !normal; j++) {
        for (let k = j + 1; k < 4 && !normal; k++) {
          normal = normalize(cross(sub(pts[j], pts[i]), sub(pts[k], pts[i])));
        }
      }
    }
    if (!normal) return markers.slice();

    let axisX = null;
    for (const p of pts) {
      axisX = normalize(sub(p, centroid));
      if (axisX) break;
    }
    if (!axisX) return markers.slice();

    let axisY = normalize(cross(normal, axisX));
    if (!axisY) {
      axisX =
        normalize(cross([0, 1, 0], normal)) ||
        normalize(cross([1, 0, 0], normal));
      if (!axisX) return markers.slice();
      axisY = normalize(cross(normal, axisX));
      if (!axisY) return markers.slice();
    }

    const projected = markers.map((marker) => {
      const rel = sub(marker.pos, centroid);
      const u = dot(rel, axisX);
      const v = dot(rel, axisY);
      return { marker, u, v, angle: Math.atan2(v, u) };
    });
    projected.sort((a, b) => a.angle - b.angle);

    let area2 = 0;
    for (let i = 0; i < projected.length; i++) {
      const cur = projected[i];
      const next = projected[(i + 1) % projected.length];
      area2 += cur.u * next.v - next.u * cur.v;
    }
    if (area2 < 0) projected.reverse();

    return projected.map((p) => p.marker);
  }

  // ─── Point placement ─────────────────────────────────────────────────────

  function finalizeArea() {
    const pts = orderMarkersClockwise(currentMarkers.splice(0, 4));
    const surf = makeSurface();
    setSurfaceMatrix(
      surf,
      pts.map((p) => p.pos)
    );

    const area = {
      id: `${clientID}:area:${nextAreaIndex++}`,
      pts,
      surf,
      textureCanvas: null,
      textureChannel: null,
      capturePending: false,
      projectedToComputerCanvas: false,
      partnerPlaced: false,
      showHandles: true,
    };
    for (const marker of pts) marker.area = area;
    completedAreas.push(area);
    areaById.set(area.id, area);
  }

  function moveAreaBy(area, delta) {
    for (const marker of area.pts) {
      marker.pos = [
        marker.pos[0] + delta[0],
        marker.pos[1] + delta[1],
        marker.pos[2] + delta[2],
      ];
      setMarkerPose(marker, marker.pos);
      setMarkerColor(marker);
    }
    setSurfaceMatrix(
      area.surf,
      area.pts.map((marker) => marker.pos)
    );
  }

  function lockPoint(pos) {
    if (currentMarkers.length >= 4) return;
    console.log(`[lasso2] lockPoint #${currentMarkers.length + 1}`, pos);

    const node = model.add("sphere").opacity(0.95).dull();

    safeVibrate(preferredHand, 1, 80);
    playUISound("point");

    const marker = {
      pos: pos.slice(),
      node,
      complete: false,
      captureActive: false,
      area: null,
    };
    setMarkerPose(marker, marker.pos);
    setMarkerColor(marker);

    allMarkers.push(marker);
    currentMarkers.push(marker);

    if (currentMarkers.length === 4) {
      for (const currentMarker of currentMarkers) {
        currentMarker.complete = true;
        setMarkerColor(currentMarker);
      }
      safeVibrate(preferredHand, 1, 200);
      finalizeArea();
    }
  }

  // ─── Animate loop ─────────────────────────────────────────────────────────

  let prevSelectPressed = false;
  let prevGrabPressed = false;
  let prevSavePressed = false;
  let inputPrimed = false;

  model.animate(() => {
    try {
      sharedCaptureState = commitSharedCaptureState(
        server.synchronize(LASSO2_SHARED_KEY)
      );
      beam.update();

      if (
        sharedCaptureState.request &&
        sharedCaptureState.request.id !== lastStartedCaptureRequestId &&
        (!sharedCaptureState.response ||
          sharedCaptureState.response.id !== sharedCaptureState.request.id) &&
        shouldProcessCaptureOnThisClient()
      ) {
        console.log(
          "[lasso2] desktop client received shared capture request",
          sharedCaptureState.request
        );
        startCaptureRequest(sharedCaptureState.request);
      }

      if (
        sharedCaptureState.saveRequest &&
        sharedCaptureState.saveRequest.id !== lastProcessedSaveRequestId &&
        shouldProcessCaptureOnThisClient()
      ) {
        processSaveRequest(sharedCaptureState.saveRequest);
      }

      if (sharedCaptureState.response) {
        const response = sharedCaptureState.response;
        const area = resolveCaptureTargetArea(response);
        if (!area && response.requesterClientID !== clientID) {
          // Not for this client and we also don't have a matching local area.
          // Leave it for the intended requester.
        } else {
          console.log("[lasso2] processing capture response", {
            id: response.id,
            status: response.status,
            requesterClientID: response.requesterClientID,
            sourceClientID: response.sourceClientID,
            responseAreaId: response.areaId,
            localClientID: clientID,
            resolvedLocalAreaId: area ? area.id : null,
          });
        if (
          response.status === "success" &&
          response.id === lastAppliedCaptureResponseId
        ) {
          // Already handled the successful response for this request id.
        } else if (response.status === "success") {
          if (applyTextureResponse(response, area))
            lastAppliedCaptureResponseId = response.id;
        } else if (
          response.status === "timeout" ||
          response.status === "error"
        ) {
          setCaptureDebug({
            status:
              response.status === "timeout"
                ? "capture-timeout"
                : "capture-error",
            lastError:
              response.error ||
              (response.status === "timeout"
                ? "Remote capture timed out."
                : "Remote capture failed."),
          });
          clearSharedCaptureResponse(response.id);
        }
        }
      }

      const bm = beam.beamMatrix();
      if (!bm || !bm.length) return;
      const V = bm.slice(12, 15);
      const W = bm.slice(8, 11);
      const pos = [
        V[0] - W[0] * BEAM_DEPTH,
        V[1] - W[1] * BEAM_DEPTH,
        V[2] - W[2] * BEAM_DEPTH,
      ];

      cursor.identity().move(pos[0], pos[1], pos[2]).scale(CURSOR_SCALE);

      // ─── Hover detection ─────────────────────────────────────────────────
      const beamMetrics = (P) => {
        const t = -(
          W[0] * (P[0] - V[0]) +
          W[1] * (P[1] - V[1]) +
          W[2] * (P[2] - V[2])
        );
        if (t < 0) return null;
        const cx = V[0] - W[0] * t,
          cy = V[1] - W[1] * t,
          cz = V[2] - W[2] * t;
        return {
          t,
          dist: Math.sqrt(
            (P[0] - cx) ** 2 + (P[1] - cy) ** 2 + (P[2] - cz) ** 2
          ),
        };
      };

      const shouldRevealCapturedHandles = (area) => {
        if (!area) return false;
        if (!hasAreaTexture(area)) return true;
        if (area.capturePending) return true;
        if (
          dragging &&
          ((dragging.type === "area" && dragging.area === area) ||
            (dragging.type === "marker" &&
              dragging.marker &&
              dragging.marker.area === area))
        )
          return true;
        if (hoveredArea === area) return true;
        if (hoveredMarker && hoveredMarker.area === area) return true;
        const hit = beam.hitRect(area.surf.root.getGlobalMatrix());
        if (hit) {
          const depth = hit[2] == null ? Infinity : hit[2];
          if (depth >= 0 && depth <= MAX_HOVER_DEPTH + CAPTURED_HANDLE_REVEAL_DEPTH_PAD)
            return true;
        }
        const center = getAreaCenter(area);
        if (center) {
          const metrics = beamMetrics(center);
          if (
            metrics &&
            metrics.t <= MAX_HOVER_DEPTH + CAPTURED_HANDLE_REVEAL_DEPTH_PAD &&
            metrics.dist <= CAPTURED_HANDLE_REVEAL_RADIUS
          )
            return true;
        }
        return false;
      };

      for (const area of completedAreas) {
        const nextVisible = shouldRevealCapturedHandles(area);
        if (area.showHandles !== nextVisible) {
          area.showHandles = nextVisible;
          for (const marker of area.pts) setMarkerColor(marker);
        }
      }

      // ─── Rebuild all edges every frame (remove by index, beam.js pattern) ─
      while (edgesRoot.nChildren() > 0) edgesRoot.remove(0);

      for (const area of completedAreas) {
        if (!shouldExposeCapturedHandles(area)) continue;
        const p = area.pts.map((m) => m.pos);
        const edgeColor = area.capturePending ? [1, 0, 1] : [0, 1, 0];
        const edgeThickness = area.capturePending
          ? CAPTURE_EDGE_THICKNESS
          : EDGE_THICKNESS;
        for (let i = 0; i < 4; i++)
          drawEdge(
            p[i],
            p[(i + 1) % 4],
            edgeColor[0],
            edgeColor[1],
            edgeColor[2],
            edgeThickness
          );
      }
      for (let i = 1; i < currentMarkers.length; i++)
        drawEdge(currentMarkers[i - 1].pos, currentMarkers[i].pos, 1, 1, 0);

      if (!dragging) {
        let newHovered = null,
          minDist = HOVER_RADIUS;
        for (const m of allMarkers) {
          if (!isMarkerInteractable(m)) continue;
          const metrics = beamMetrics(m.pos);
          if (!metrics) continue;
          if (metrics.t > MAX_HOVER_DEPTH) continue;
          if (metrics.dist < minDist) {
            minDist = metrics.dist;
            newHovered = m;
          }
        }
        if (newHovered !== hoveredMarker) {
          if (hoveredMarker) setMarkerColor(hoveredMarker);
          if (newHovered) {
            setMarkerColor(
              newHovered,
              newHovered.captureActive ? "idle" : "hover"
            );
            safeVibrate(preferredHand, 0.3, 30);
          }
          hoveredMarker = newHovered;
        }

        let newHoveredArea = null;
        if (!newHovered) {
          let minAreaDepth = Infinity;
          for (const area of completedAreas) {
            const hit = beam.hitRect(area.surf.root.getGlobalMatrix());
            if (!hit) continue;
            const depth = hit[2] == null ? Infinity : hit[2];
            if (depth < 0 || depth > MAX_HOVER_DEPTH) continue;
            if (depth < minAreaDepth) {
              minAreaDepth = depth;
              newHoveredArea = area;
            }
          }
        }
        hoveredArea = newHoveredArea;
      }

      const partnerBoardItemsByAreaId = new Map();
      const partnerBoardItems = Array.isArray(
        sharedCaptureState.partnerBoard && sharedCaptureState.partnerBoard.items
      )
        ? sharedCaptureState.partnerBoard.items
        : [];
      for (const item of partnerBoardItems) {
        if (
          !item ||
          !item.areaId ||
          item.sourceClientID !== clientID ||
          !Number.isFinite(Number(item.x)) ||
          !Number.isFinite(Number(item.y))
        )
          continue;
        partnerBoardItemsByAreaId.set(item.areaId, item);
      }

      for (const area of completedAreas) {
        syncAreaPositionFromPartnerBoard(
          area,
          partnerBoardItemsByAreaId.get(area.id) || null
        );
        updateAreaComputerCanvasProjection(area);
        refreshAreaOpacity(area);
      }
      renderComputerCanvasBoard(sharedCaptureState.partnerBoard);
      if (!isHeadsetClient) drawPartnerCanvas(sharedCaptureState.partnerBoard);
      updateControllerHints(clientState.hand(clientID, preferredHand));

      if (!dragging && hoveredMarker && model.time % 0.18 < 0.05)
        safeVibrate(preferredHand, 0.35, 25);

      // ─── Input mapping: select creates/arms capture, grip drags ──────────
      const selectPressed = isAnyButtonPressed(preferredHand, [0], 0.55);
      const savePressed = isAnyButtonPressed(
        preferredHand,
        [SAVE_BUTTON],
        0.55
      );
      const grabPressed =
        isAnyButtonPressed(preferredHand, SQUEEZE_BUTTONS, 0.55) &&
        !savePressed;
      const hasControllerSelectState = !!(
        buttonState[preferredHand] &&
        buttonState[preferredHand][0]
      );
      const pinchPressed =
        !hasControllerSelectState &&
        !!clientState.pinch(clientID, preferredHand, 1);
      const selectActive = selectPressed || pinchPressed;
      const justSelected = inputPrimed && selectActive && !prevSelectPressed;
      prevSelectPressed = selectActive;
      const justSaved = inputPrimed && savePressed && !prevSavePressed;
      prevSavePressed = savePressed;
      const justGrabbed = inputPrimed && grabPressed && !prevGrabPressed;
      prevGrabPressed = grabPressed;
      inputPrimed = true;

      if ((justSelected || justGrabbed || justSaved) && queuedDownload) {
        const { url, filename } = queuedDownload;
        queuedDownload = null;
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setCaptureDebug({ lastDownload: "triggered", queuedDownload: false });
        console.log("[lasso2] flushed queued download from user gesture");
      }

      if (justSaved) {
        playUISound("capture");
        broadcastSaveRequest();
        safeVibrate(preferredHand, 0.8, 70);
      }

      const captureTargetArea =
        (hoveredMarker && isAreaCaptureEligible(hoveredMarker.area)
          ? hoveredMarker.area
          : null) ||
        (hoveredArea && isAreaCaptureEligible(hoveredArea)
          ? hoveredArea
          : null);

      if (justSelected && captureTargetArea) {
        console.log("[lasso2] select capture target", captureTargetArea);
        beginAreaCapture(captureTargetArea);
        safeVibrate(preferredHand, 0.8, 60);
      } else if (
        justSelected &&
        pendingCaptureArea &&
        ((hoveredMarker && hoveredMarker.area === pendingCaptureArea) ||
          hoveredArea === pendingCaptureArea ||
          (!hoveredMarker && !hoveredArea))
      ) {
        cancelPendingCapture();
        safeVibrate(preferredHand, 0.5, 40);
        if (!hoveredMarker && !hoveredArea) lockPoint(pos);
      } else if (justSelected && !hoveredMarker && !hoveredArea) {
        lockPoint(pos);
      }

      if (justGrabbed) {
        if (hoveredMarker) {
          dragging = { type: "marker", marker: hoveredMarker };
          safeVibrate(preferredHand, 0.8, 50);
        } else if (hoveredArea) {
          dragging = { type: "area", area: hoveredArea, lastPos: pos.slice() };
          safeVibrate(preferredHand, 0.8, 50);
        }
      }

      if (!grabPressed && dragging) {
        if (dragging.type === "marker" && dragging.marker !== hoveredMarker)
          setMarkerColor(dragging.marker);
        dragging = null;
      }

      // ─── Drag update ─────────────────────────────────────────────────────
      if (grabPressed && dragging) {
        if (dragging.type === "marker") {
          const marker = dragging.marker;
          marker.pos = pos.slice();
          setMarkerPose(marker, pos);
          setMarkerColor(marker, marker.captureActive ? "idle" : "drag");
          for (const area of completedAreas)
            if (area.pts.includes(marker)) {
              setSurfaceMatrix(
                area.surf,
                area.pts.map((m) => m.pos)
              );
            }
        } else if (dragging.type === "area") {
          const delta = [
            pos[0] - dragging.lastPos[0],
            pos[1] - dragging.lastPos[1],
            pos[2] - dragging.lastPos[2],
          ];
          moveAreaBy(dragging.area, delta);
          dragging.lastPos = pos.slice();
          for (const marker of dragging.area.pts)
            if (marker === hoveredMarker)
              setMarkerColor(marker, marker.captureActive ? "idle" : "hover");
        }
      }

      if (!dragging && hoveredMarker && hoveredMarker.captureActive)
        setMarkerColor(hoveredMarker, "idle");
      else if (!dragging && hoveredMarker)
        setMarkerColor(hoveredMarker, "hover");

      if (dragging && dragging.type === "marker") {
        for (const area of completedAreas)
          if (area.pts.includes(dragging.marker)) {
            setSurfaceMatrix(
              area.surf,
              area.pts.map((m) => m.pos)
            );
          }
      }
    } catch (e) {
      console.error("[lasso2] animate error:", e);
    }
  });
};
