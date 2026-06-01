import * as cg from '../render/core/cg.js';
import {
	ControllerBeam,
	buttonState,
	controllerMatrix,
} from '../render/core/controllerInput.js';

const preferredHand = 'right';
const MARKER_SCALE = 0.018;
const EDGE_THICKNESS = 0.001;
const CAPTURE_EDGE_THICKNESS = 0.0025;
const SURFACE_OPACITY = 0.85;
const SURFACE_HOVER_OPACITY = 0.4;
const TEXTURED_SURFACE_OPACITY = 1;
const TEXTURED_SURFACE_HOVER_OPACITY = 0.78;
const CAPTURE_BURST_MS = 4500;
const CAPTURE_POST_DETECT_HIDE_DELAY_MS = 55;
const CAPTURE_BORDER_INSET_PX = 14;
const SQUEEZE_BUTTONS = [1, 2, 3, 4, 5, 6];
const LASSO2_SHARED_KEY = 'lasso2SharedState';
const SAVE_BUTTON = 4;
const ACTION_BUTTON_THRESHOLD = 0.65;
const HINT_PANEL_SCALE = 0.0003;
const HINT_PANEL_WIDTH = 231; // px from figma
const HINT_PANEL_HEIGHT = 100;
const COMPUTER_CANVAS_INSTRUCTION_OFFSET = [0, 0.095, 0.045];
const MAX_HOVER_DEPTH = 3.0;
const MAX_SHARED_TEXTURE_EDGE = 512;
const MIN_SHARED_TEXTURE_EDGE = 256;
const MAX_SHARED_TEXTURE_DATA_URL_LEN = 80000;
const AUTO_DOWNLOAD_CAPTURE = true;
const CAPTURED_HANDLE_REVEAL_RADIUS = 0.12;
const CAPTURED_HANDLE_REVEAL_DEPTH_PAD = 0.35;
const CAPTURE_BORDER_THRESHOLD_METERS = 0.075;
const HAND_MARKER_HOVER_RADIUS_METERS = 0.065;
const HAND_AREA_HOVER_BORDER_THRESHOLD_METERS = 0.09;
const HAND_AREA_HOVER_PLANE_THRESHOLD_METERS = 0.05;
const INDEX_EXTENDED_DISTANCE_METERS = 0.095;
const NON_INDEX_CURLED_DISTANCE_METERS = 0.085;
const PALM_PROGRESS_OFFSET_Y = 0.09;
const PALM_PROGRESS_BASE_SCALE = 0.026;
const PALM_PROGRESS_SCALE_RANGE = 0.02;
const CALIBRATION_GESTURE_COOLDOWN_SECONDS = 1.0;
const INDEX_HOLD_RING_SCALE = 0.018;
const INDEX_HOLD_RING_OFFSET_METERS = 0.005; // 0.5 cm
const RING_HOLE_SCALE = 0.8;
const PINCH_DISTANCE_START_METERS = 0.045;
const PINCH_DISTANCE_END_METERS = 0.06;
const PINCH_HOLD_GRACE_SECONDS = 0.2;
const LEFT_INDEX_FLICK_WINDOW_SECONDS = 0.32;
const LEFT_INDEX_FLICK_MAX_HISTORY_SECONDS = 0.45;
const LEFT_INDEX_FLICK_MIN_SWING_METERS = 0.018;
const LEFT_INDEX_FLICK_MAX_SWING_METERS = 0.22;
const LEFT_INDEX_FLICK_MIN_AXIS_SPEED_MPS = 0.18;
const LEFT_INDEX_FLICK_MIN_DIRECTION_CHANGES = 2;
const LEFT_INDEX_FLICK_COOLDOWN_SECONDS = 1.0;
const SAVE_TOAST_SECONDS = 3.0;
const CAPTURE_SAFE_MODE_HIDE_TUTORIAL = true;
const INDEX_HOLD_CYAN = [0.2, 0.95, 1.2];
const INDEX_HOLD_GREY = [0.62, 0.62, 0.62];
const INDEX_HOLD_YELLOW = [1.0, 0.9, 0.1];
const INDEX_HOLD_FUCHSIA = [1.0, 0.2, 1.0];
const INDEX_HOLD_RED = [1.0, 0.18, 0.18];
const INDEX_HOLD_UI_HOVER = [0.86, 0.86, 0.86];
const INSTRUCTION_BUTTON_HOVER_DISTANCE_METERS = 0.035;
const INSTRUCTION_BUTTON_HOVER_PAD = 0.18;
const STATIC_UI_TEXTURE_CHANNEL_MIN = 2;
const STATIC_UI_TEXTURE_CHANNEL_MAX = 11;
const HAND_BEAM_FORWARD_OFFSET_METERS = 0.01;
const HAND_HINT_SIDE_BY_ACTION = {
	SELECT: 'left',
	GRAB: 'right',
	SAVE: 'left',
	CALIBRATE: 'right',
};
const CANVAS_BORDER_COLOR_DEFAULT = [0.62, 0.62, 0.62];
const CANVAS_BORDER_COLOR_CALIBRATION = [0.2, 0.95, 1.2];
const CANVAS_VOLUME_COLOR_DEFAULT = [0.25, 0.25, 0.25];
const CANVAS_VOLUME_COLOR_CALIBRATION = [0.0, 0.9, 1.2];
const COMPUTER_CANVAS_SCALE = 0.00008;
const COMPUTER_CANVAS_WIDTH = 3024; // px from figma
const COMPUTER_CANVAS_HEIGHT = 1964; // px from figma
const COMPUTER_CANVAS_POS = [0, 1.28, -0.3];
const COMPUTER_CANVAS_HALF_DEPTH = 0.1;
const COMPUTER_CANVAS_MIN_HALF_WIDTH = 0.06;
const COMPUTER_CANVAS_MIN_HALF_HEIGHT = 0.04;
const COMPUTER_CANVAS_MAX_HALF_WIDTH = 1.6;
const COMPUTER_CANVAS_MAX_HALF_HEIGHT = 1.2;
// From inputEvents.js sync logic: button index 5 corresponds to Y/B.
const COMPUTER_CANVAS_CONFIRM_BUTTON = 5;
const COMPUTER_CANVAS_PLACEMENT_NAME = 'computer_canvas_placement';
const PARTNER_CANVAS_WIDTH = 1024;
const PARTNER_CANVAS_HEIGHT = 682;
const PARTNER_POSITION_SYNC_MIN_MS = 33;
const PARTNER_POSITION_SYNC_MIN_DELTA_PX = 0.9;
const PARTNER_AREA_SYNC_MIN_MS = 33;
const PARTNER_AREA_SYNC_MIN_DELTA_PX = 0.9;
const HIDE_MAIN_WINDOW_SCREEN_CANVAS = true;
const SHOW_SCREEN_CAPTURE_DEBUG_POPUP = true;
const SCREEN_CAPTURE_DEBUG_POPUP_NAME = 'Lasso2ScreenCaptureDebug';
const SCREEN_CAPTURE_DEBUG_POPUP_WIDTH = 480;
const SCREEN_CAPTURE_DEBUG_POPUP_HEIGHT = 270;
const PARTNER_CANVAS_INTERACTION_VERSION = '2026-05-12-partner-drag-v3';
const PARTNER_NUDGE_STEP_PX = 12;
const PARTNER_NUDGE_STEP_FAST_PX = 28;
const HAND_SIGNAL_STICKY_SECONDS = 0.45;
const INSTRUCTION_CONFIG = {
	position: [0, 1.45, -0.65],
	scale: 0.3,
	buttonOffset: [0, -0.40, 0.001],
	buttonWidth: 0.14,
	nextButtonAspect: 2.85,
	finishButtonAspect: 540 / 84,
	progressOffset: [0, 0.055, 0.001],
	progressYOffsetFixed: -0.325,
	progressDotRadius: 0.008,
	progressDotGap: 0.006,
	texture: {
		controller: [
			'../media/instruction/instruction-1.png',
			'../media/instruction/instruction-2.png',
			'../media/instruction/instruction-3-controller.png',
			'../media/instruction/instruction-4-controller.png',
			'../media/instruction/instruction-5-controller.png',
			'../media/instruction/instruction-6-controller.png',
			'../media/instruction/instruction-7.png',
		],
		hand: [
			'../media/instruction/instruction-1.png',
			'../media/instruction/instruction-2.png',
			'../media/instruction/instruction-3-hand.png',
			'../media/instruction/instruction-4-hand.png',
			'../media/instruction/instruction-5-hand.png',
			'../media/instruction/instruction-6-hand.png',
			'../media/instruction/instruction-7.png',
		],
	},
};
const INSTRUCTION_BUTTON_TEXTURE = {
	next: '../media/instruction/next-btn.png',
	finish: '../media/instruction/finish-btn.png',
};
const INSTRUCTION_PROGRESS_COLOR_DONE = [0x50 / 255, 0x9c / 255, 0xba / 255];
const INSTRUCTION_PROGRESS_COLOR_TODO = [0x7a / 255, 0x7a / 255, 0x7a / 255];

let screenCanvas = null;
let screenCaptureActive = false;
let screenCaptureTimer = null;
let screenCaptureStream = null;
let screenCaptureVideo = null;
let screenCaptureDebugPopup = null;
let screenCaptureDebugPopupCanvas = null;
let screenCaptureDebugPopupCtx = null;
let pendingCaptureArea = null;
let captureSafeModeActive = false;
let queuedDownload = null;
let captureBurstDeadline = 0;
let activeCaptureRequest = null;
let stagedCaptureCorners = null;
let stagedCaptureReadyAtMs = 0;
let lastStartedCaptureRequestId = null;
let lastAppliedCaptureResponseId = null;
let lastProcessedSaveRequestId = null;
const UI_SOUND_FILES = {
	save: '/media/sound/SFXs/saved.mp3',
	point: '/media/sound/SFXs/point.mp3',
	calibrated: '/media/sound/SFXs/calibrated.mp3',
	capture: '/media/sound/SFXs/capture.mp3',
};
const POINT_PITCH_BY_INDEX = [1.0, 1.12, 1.24, 1.36];
const uiSoundCache = new Map();
let hadCornerDetectionInBurst = false;
let requestedCaptureAreaByRequestId = new Map();
let lastPartnerBoardPosSyncByArea = new Map();
let lastPartnerAreaSyncByArea = new Map();

const captureDebug = {
	status: 'idle',
	lastError: null,
	lastCorners: null,
	lastCaptureSize: null,
	lastDownload: null,
	lastScreenSize: null,
	noCornerFrames: 0,
};

if (typeof window !== 'undefined') window.lasso2CaptureDebug = captureDebug;

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
	if (!err) return 'unknown error';
	if (typeof err === 'string') return err;
	return err.message || String(err);
}

function nowMs() {
	return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function resetStagedCapture() {
	stagedCaptureCorners = null;
	stagedCaptureReadyAtMs = 0;
}

function createRequestId() {
	return `${clientID}-${Math.floor(nowMs())}-${Math.floor(
		Math.random() * 1e6,
	)}`;
}

function shouldOwnDisplayCapture() {
	const canCapture = !!(
		typeof navigator !== 'undefined' &&
		navigator.mediaDevices &&
		typeof navigator.mediaDevices.getDisplayMedia === 'function'
	);
	return canCapture;
}

function shouldProcessCaptureOnThisClient() {
	return shouldOwnDisplayCapture() && !!screenCanvas && screenCaptureActive;
}

function hideMainScreenCanvasCaptureSource(canvas) {
	if (!canvas || !canvas.style || !HIDE_MAIN_WINDOW_SCREEN_CANVAS) return;
	canvas.style.opacity = '0';
	canvas.style.visibility = 'hidden';
	canvas.style.pointerEvents = 'none';
}

function ensureScreenCaptureDebugPopup() {
	if (
		!SHOW_SCREEN_CAPTURE_DEBUG_POPUP ||
		typeof window === 'undefined' ||
		typeof document === 'undefined'
	)
		return null;

	let popup = screenCaptureDebugPopup;
	if (!popup || popup.closed || !popup.document || !popup.document.body) {
		popup = window.open(
			'',
			SCREEN_CAPTURE_DEBUG_POPUP_NAME,
			`width=${SCREEN_CAPTURE_DEBUG_POPUP_WIDTH},height=${SCREEN_CAPTURE_DEBUG_POPUP_HEIGHT}`,
		);
		if (!popup) return null;
		screenCaptureDebugPopup = popup;
	}

	popup.document.title = 'lasso2 screen capture debug';
	popup.document.body.style.margin = '0';
	popup.document.body.style.background = '#000';
	popup.document.body.style.overflow = 'hidden';

	let canvas = popup.document.getElementById('lasso2ScreenCaptureDebugCanvas');
	if (!canvas) {
		canvas = popup.document.createElement('canvas');
		canvas.id = 'lasso2ScreenCaptureDebugCanvas';
		canvas.style.width = '100vw';
		canvas.style.height = '100vh';
		canvas.style.display = 'block';
		popup.document.body.appendChild(canvas);
	}

	const ctx = canvas.getContext('2d');
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

function canvasToDataUrl(canvas, mimeType = 'image/png', quality = undefined) {
	try {
		return canvas.toDataURL(mimeType, quality);
	} catch (err) {
		console.error('[lasso2] failed to serialize canvas:', err, mimeType);
		return null;
	}
}

function makeSerializableTextureCanvas(
	canvas,
	maxEdge = MAX_SHARED_TEXTURE_EDGE,
) {
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

function updateDesktopCapturePreview(dataUrl) {
	if (typeof document === 'undefined' || !dataUrl) return;
	const img = ensureDesktopCapturePreviewUI();
	img.src = dataUrl;
	window.lasso2LastCaptureDataUrl = dataUrl;
}

function ensureDesktopCapturePreviewUI() {
	if (typeof document === 'undefined') return null;
	let container = document.getElementById('lasso2CapturePreviewContainer');
	if (!container) {
		container = document.createElement('div');
		container.id = 'lasso2CapturePreviewContainer';
		container.style.position = 'fixed';
		container.style.right = '12px';
		container.style.bottom = '12px';
		container.style.width = '230px';
		container.style.padding = '8px';
		container.style.border = '2px solid #ff00ff';
		container.style.background = 'rgba(0,0,0,0.72)';
		container.style.color = '#fff';
		container.style.font = '12px/1.2 monospace';
		container.style.zIndex = '999999';
		container.style.display = 'grid';
		container.style.gap = '6px';

		const title = document.createElement('div');
		title.textContent = 'lasso2 capture preview';
		title.style.opacity = '0.9';
		container.appendChild(title);

		const img = document.createElement('img');
		img.id = 'lasso2CapturePreview';
		img.style.width = '100%';
		img.style.maxHeight = '160px';
		img.style.objectFit = 'contain';
		img.style.background = 'rgba(0,0,0,0.35)';
		container.appendChild(img);

		const button = document.createElement('button');
		button.id = 'lasso2CaptureDownloadButton';
		button.textContent = 'Download Last Capture';
		button.style.cursor = 'pointer';
		button.style.padding = '6px 8px';
		button.style.border = '1px solid #ff00ff';
		button.style.background = '#111';
		button.style.color = '#fff';
		button.onclick = () => {
			if (typeof window !== 'undefined' && window.lasso2DownloadLastCapture)
				window.lasso2DownloadLastCapture();
		};
		container.appendChild(button);

		document.body.appendChild(container);
	}
	return document.getElementById('lasso2CapturePreview');
}

function ensurePartnerCanvasWindow() {
	if (typeof window === 'undefined' || typeof document === 'undefined')
		return null;
	const title = 'Lasso2PartnerCanvas';
	let popup = window.lasso2PartnerPopup;
	if (!popup || popup.closed) {
		popup = window.open(
			'',
			title,
			`width=${PARTNER_CANVAS_WIDTH},height=${PARTNER_CANVAS_HEIGHT}`,
		);
		if (!popup) return null;
		window.lasso2PartnerPopup = popup;
	}
	if (!popup.document || !popup.document.body) return null;

	popup.document.title = 'lasso2 partner canvas';
	popup.document.body.style.margin = '0';
	popup.document.body.style.background = '#111';

	let root = popup.document.getElementById('lasso2PartnerRoot');
	if (!root) {
		root = popup.document.createElement('div');
		root.id = 'lasso2PartnerRoot';
		root.style.position = 'fixed';
		root.style.inset = '0';
		popup.document.body.appendChild(root);
	}

	let canvas = popup.document.getElementById('lasso2PartnerCanvas');
	if (!canvas) {
		canvas = popup.document.createElement('canvas');
		canvas.id = 'lasso2PartnerCanvas';
		canvas.width = PARTNER_CANVAS_WIDTH;
		canvas.height = PARTNER_CANVAS_HEIGHT;
		canvas.style.width = '100vw';
		canvas.style.height = '100vh';
		canvas.style.display = 'block';
		canvas.style.touchAction = 'none';
		root.appendChild(canvas);
	}

	let saveButton = popup.document.getElementById('lasso2PartnerSaveButton');
	if (!saveButton) {
		saveButton = popup.document.createElement('button');
		saveButton.id = 'lasso2PartnerSaveButton';
		saveButton.textContent = 'Save Collage';
		saveButton.style.position = 'fixed';
		saveButton.style.top = '14px';
		saveButton.style.right = '14px';
		saveButton.style.padding = '8px 10px';
		saveButton.style.border = '1px solid #66ddff';
		saveButton.style.background = '#102030cc';
		saveButton.style.color = '#d7f6ff';
		saveButton.style.font = '12px monospace';
		saveButton.style.cursor = 'pointer';
		saveButton.style.zIndex = '10';
		root.appendChild(saveButton);
	}
	// Rebind every call so popup survives scene reloads without stale handlers.
	saveButton.onclick = () => {
		const triggerSave = (url) => {
			const a = popup.document.createElement('a');
			a.href = url;
			a.download = 'lasso2-collage.png';
			popup.document.body.appendChild(a);
			a.click();
			popup.document.body.removeChild(a);
		};
		try {
			const exportCanvas = popup.document.createElement('canvas');
			exportCanvas.width = canvas.width;
			exportCanvas.height = canvas.height;
			const exportCtx = exportCanvas.getContext('2d');
			if (!exportCtx) return;
			const board =
				window.lasso2PartnerBoardLatest &&
				Array.isArray(window.lasso2PartnerBoardLatest.items)
					? window.lasso2PartnerBoardLatest
					: { items: [], updatedAt: 0 };
			drawPartnerCanvasContent(exportCtx, exportCanvas, board, {
				showDropGuide: false,
				showHighlight: false,
				fillBackground: false,
			});

			if (canvas.toBlob) {
				exportCanvas.toBlob((blob) => {
					if (!blob) {
						try {
							triggerSave(exportCanvas.toDataURL('image/png'));
						} catch (fallbackErr) {
							console.warn('[lasso2] save collage fallback failed:', fallbackErr);
						}
						return;
					}
					const url = URL.createObjectURL(blob);
					triggerSave(url);
					setTimeout(() => URL.revokeObjectURL(url), 800);
				}, 'image/png');
			} else {
				triggerSave(exportCanvas.toDataURL('image/png'));
			}
		} catch (err) {
			console.warn('[lasso2] save collage failed:', err);
		}
	};

	const mutatePartnerBoard = (mutateFn) => {
		if (typeof mutateFn !== 'function') return false;
		const candidates = [window, popup, window.opener, popup.opener].filter(
			Boolean,
		);
		for (const candidate of candidates) {
			if (typeof candidate.lasso2PartnerBoardMutate === 'function') {
				candidate.lasso2PartnerBoardMutate(mutateFn);
				return true;
			}
		}
		return false;
	};

	const nudgeSelectedItem = (dx, dy, stepPx) => {
		const board = window.lasso2PartnerBoardLatest;
		const topItemId =
			board &&
			Array.isArray(board.items) &&
			board.items.length > 0
				? board.items
						.slice()
						.sort((a, b) => (Number(b.layer) || 0) - (Number(a.layer) || 0))[0]
						.id
				: null;
		const selectedId =
			canvas.__lasso2SelectedItemId ||
			canvas.__lasso2DragItemId ||
			canvas.__lasso2HoverItemId ||
			topItemId;
		if (!selectedId) return;
		canvas.__lasso2SelectedItemId = selectedId;
		const step = Number(stepPx) || PARTNER_NUDGE_STEP_PX;
		mutatePartnerBoard((nextBoard) => {
			const target = (nextBoard.items || []).find((it) => it.id === selectedId);
			if (!target) return;
			const nextX = (Number(target.x) || canvas.width * 0.5) + dx * step;
			const nextY = (Number(target.y) || canvas.height * 0.5) + dy * step;
			const clamped = clampPartnerBoardXY(nextX, nextY, target.w, target.h);
			target.x = clamped.x;
			target.y = clamped.y;
		});
	};

	let moveControls = popup.document.getElementById('lasso2PartnerMoveControls');
	if (!moveControls) {
		moveControls = popup.document.createElement('div');
		moveControls.id = 'lasso2PartnerMoveControls';
		moveControls.style.position = 'fixed';
		moveControls.style.top = '56px';
		moveControls.style.right = '14px';
		moveControls.style.display = 'grid';
		moveControls.style.gridTemplateColumns = '38px 38px 38px';
		moveControls.style.gridTemplateRows = '26px 26px 26px';
		moveControls.style.gap = '4px';
		moveControls.style.padding = '6px';
		moveControls.style.border = '1px solid #66ddff';
		moveControls.style.background = '#102030cc';
		moveControls.style.zIndex = '10';
		root.appendChild(moveControls);
	}
	const makeMoveButton = (id, label, col, row, dx, dy) => {
		let btn = popup.document.getElementById(id);
		if (!btn) {
			btn = popup.document.createElement('button');
			btn.id = id;
			btn.textContent = label;
			btn.style.gridColumn = String(col);
			btn.style.gridRow = String(row);
			btn.style.border = '1px solid #66ddff';
			btn.style.background = '#0d1b2acc';
			btn.style.color = '#d7f6ff';
			btn.style.font = '12px monospace';
			btn.style.cursor = 'pointer';
			moveControls.appendChild(btn);
		}
		btn.onclick = (event) => {
			const fast =
				!!(event && event.shiftKey) || !!(event && event.altKey) || false;
			nudgeSelectedItem(
				dx,
				dy,
				fast ? PARTNER_NUDGE_STEP_FAST_PX : PARTNER_NUDGE_STEP_PX,
			);
		};
	};
	makeMoveButton('lasso2PartnerMoveUp', 'Up', 2, 1, 0, -1);
	makeMoveButton('lasso2PartnerMoveLeft', 'Lt', 1, 2, -1, 0);
	makeMoveButton('lasso2PartnerMoveRight', 'Rt', 3, 2, 1, 0);
	makeMoveButton('lasso2PartnerMoveDown', 'Dn', 2, 3, 0, 1);

	if (popup.__lasso2PartnerNudgeKeyHandler)
		popup.document.removeEventListener(
			'keydown',
			popup.__lasso2PartnerNudgeKeyHandler,
		);
	popup.__lasso2PartnerNudgeKeyHandler = (event) => {
		if (!event) return;
		const fast = !!event.shiftKey || !!event.altKey;
		const step = fast ? PARTNER_NUDGE_STEP_FAST_PX : PARTNER_NUDGE_STEP_PX;
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			nudgeSelectedItem(0, -1, step);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			nudgeSelectedItem(0, 1, step);
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			nudgeSelectedItem(-1, 0, step);
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			nudgeSelectedItem(1, 0, step);
		}
	};
	popup.document.addEventListener('keydown', popup.__lasso2PartnerNudgeKeyHandler);

	if (canvas.__lasso2HoverItemId === undefined)
		canvas.__lasso2HoverItemId = null;
	if (canvas.__lasso2DragItemId === undefined) canvas.__lasso2DragItemId = null;
	if (canvas.__lasso2SelectedItemId === undefined)
		canvas.__lasso2SelectedItemId = null;
	if (
		canvas.__lasso2InteractionVersion !== PARTNER_CANVAS_INTERACTION_VERSION
	) {
		if (canvas.__lasso2InteractionHandlers) {
			const h = canvas.__lasso2InteractionHandlers;
			if (h.supportsPointer) {
				canvas.removeEventListener('pointerdown', h.beginDrag);
				canvas.removeEventListener('pointermove', h.moveDrag);
				canvas.removeEventListener('pointerup', h.endDrag);
				canvas.removeEventListener('pointercancel', h.endDrag);
				canvas.removeEventListener('lostpointercapture', h.endDrag);
				canvas.removeEventListener('pointerleave', h.clearHover);
				popup.document.removeEventListener('pointermove', h.docMoveDrag);
				popup.document.removeEventListener('pointerup', h.docEndDrag);
				popup.document.removeEventListener('pointercancel', h.docEndDrag);
			} else {
				canvas.removeEventListener('mousedown', h.beginDrag);
				popup.document.removeEventListener('mousemove', h.moveDrag);
				popup.document.removeEventListener('mouseup', h.endDrag);
				canvas.removeEventListener('mouseleave', h.clearHover);
			}
			popup.removeEventListener('blur', h.onBlur);
		}
		canvas.__lasso2InteractionVersion = PARTNER_CANVAS_INTERACTION_VERSION;
		canvas.style.cursor = 'default';
		const toCanvasPoint = (event) => {
			const rect = canvas.getBoundingClientRect();
			return {
				x:
					((event.clientX - rect.left) * canvas.width) /
					Math.max(1, rect.width),
				y:
					((event.clientY - rect.top) * canvas.height) /
					Math.max(1, rect.height),
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
				if (!drag) setCursor('default');
				return null;
			}
			const p = toCanvasPoint(event);
			const picked = hitTopItem(p, board);
			setHoverItem(picked ? picked.item.id : null);
			if (!drag) setCursor(picked ? 'grab' : 'default');
			return picked;
		};

		const beginDrag = (event) => {
			if (event && event.button != null && event.button !== 0) return;
			if (event && event.preventDefault) event.preventDefault();
			const picked = refreshHover(event);
			if (!picked) return;
			canvas.__lasso2SelectedItemId = picked.item.id;

			drag = {
				id: picked.item.id,
				dx: toCanvasPoint(event).x - picked.x,
				dy: toCanvasPoint(event).y - picked.y,
			};
			canvas.__lasso2DragItemId = drag.id;
			setHoverItem(drag.id);
			setCursor('grabbing');
			mutatePartnerBoard((nextBoard) => {
				const itemsNext = nextBoard.items || [];
				const target = itemsNext.find((it) => it.id === drag.id);
				if (!target) return;
				const maxLayer = itemsNext.reduce(
					(m, it) => Math.max(m, Number(it.layer) || 0),
					0,
				);
				target.layer = maxLayer + 1;
			});
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
			if (event && event.preventDefault) event.preventDefault();
			const p = toCanvasPoint(event);
			const nextX = p.x - drag.dx;
			const nextY = p.y - drag.dy;
			setHoverItem(drag.id);
			mutatePartnerBoard((nextBoard) => {
				const target = (nextBoard.items || []).find((it) => it.id === drag.id);
				if (!target) return;
				const clamped = clampPartnerBoardXY(nextX, nextY, target.w, target.h);
				target.x = clamped.x;
				target.y = clamped.y;
			});
		};

		const clearHover = () => {
			if (drag) return;
			setHoverItem(null);
			setCursor('default');
		};

		const endDrag = (event = null) => {
			drag = null;
			canvas.__lasso2DragItemId = null;
			if (event) refreshHover(event);
			if (canvas.__lasso2HoverItemId) {
				canvas.__lasso2SelectedItemId = canvas.__lasso2HoverItemId;
				setCursor('grab');
			} else setCursor('default');
		};

		const supportsPointer =
			typeof popup.PointerEvent !== 'undefined' ||
			typeof window.PointerEvent !== 'undefined';
		if (supportsPointer) {
			canvas.addEventListener('pointerdown', beginDrag);
			canvas.addEventListener('pointermove', moveDrag);
			canvas.addEventListener('pointerup', endDrag);
			canvas.addEventListener('pointercancel', endDrag);
			canvas.addEventListener('lostpointercapture', endDrag);
			canvas.addEventListener('pointerleave', clearHover);
			const docMoveDrag = (event) => {
				if (!drag) return;
				moveDrag(event);
			};
			const docEndDrag = (event) => {
				if (!drag) return;
				endDrag(event);
			};
			popup.document.addEventListener('pointermove', docMoveDrag);
			popup.document.addEventListener('pointerup', docEndDrag);
			popup.document.addEventListener('pointercancel', docEndDrag);
			canvas.__lasso2InteractionHandlers = {
				supportsPointer,
				beginDrag,
				moveDrag,
				endDrag,
				clearHover,
				onBlur: null,
				docMoveDrag,
				docEndDrag,
			};
		} else {
			canvas.addEventListener('mousedown', beginDrag);
			popup.document.addEventListener('mousemove', moveDrag);
			popup.document.addEventListener('mouseup', endDrag);
			canvas.addEventListener('mouseleave', clearHover);
			canvas.__lasso2InteractionHandlers = {
				supportsPointer,
				beginDrag,
				moveDrag,
				endDrag,
				clearHover,
				onBlur: null,
				docMoveDrag: null,
				docEndDrag: null,
			};
		}
		const onBlur = () => {
			endDrag();
			clearHover();
		};
		popup.addEventListener('blur', onBlur);
		canvas.__lasso2InteractionHandlers.onBlur = onBlur;
	}

	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	return { popup, canvas, ctx, saveButton };
}

function drawPartnerCanvasContent(ctx, canvas, collage, options = {}) {
	const showDropGuide = options.showDropGuide !== false;
	const showHighlight = options.showHighlight !== false;
	const fillBackground = options.fillBackground !== false;
	ctx.save();
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (fillBackground) {
		ctx.fillStyle = '#111';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	if (collage.items.length === 0) {
		if (showDropGuide) {
			ctx.strokeStyle = '#44d9ff88';
			ctx.lineWidth = 3;
			ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);
			ctx.fillStyle = '#9ad9ff';
			ctx.font = '28px monospace';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(
				'DROP SURFACE INTO MARKER',
				canvas.width / 2,
				canvas.height / 2,
			);
		}
		ctx.restore();
		return;
	}

	if (!window.lasso2PartnerImageCache) window.lasso2PartnerImageCache = {};
	const cache = window.lasso2PartnerImageCache;
	const items = collage.items
		.slice()
		.sort((a, b) => (Number(a.layer) || 0) - (Number(b.layer) || 0));
	const highlightedId = showHighlight
		? canvas.__lasso2DragItemId ||
		  canvas.__lasso2HoverItemId ||
		  canvas.__lasso2SelectedItemId
		: null;
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
			ctx.fillStyle = '#204050';
			ctx.fillRect(x - drawW / 2, y - drawH / 2, drawW, drawH);
		}
		if (highlightedId && item.id === highlightedId) {
			ctx.strokeStyle = '#d8f4ff';
			ctx.lineWidth = 2;
			ctx.strokeRect(x - drawW / 2, y - drawH / 2, drawW, drawH);
		}
	}
	ctx.restore();
}

function drawPartnerCanvas(board) {
	const ui = ensurePartnerCanvasWindow();
	if (!ui) return;
	const { ctx, canvas } = ui;
	const collage =
		board && Array.isArray(board.items) ? board : { items: [], updatedAt: 0 };
	window.lasso2PartnerBoardLatest = collage;
	drawPartnerCanvasContent(ctx, canvas, collage, {
		showDropGuide: true,
		showHighlight: true,
	});
}

function installQueuedDownloadGestureFlush() {
	if (
		typeof window === 'undefined' ||
		window.__lasso2QueuedDownloadClickHandler
	)
		return;
	window.__lasso2QueuedDownloadClickHandler = () => {
		if (!queuedDownload) return;
		if (window.lasso2DownloadLastCapture) window.lasso2DownloadLastCapture();
	};
	window.addEventListener(
		'pointerdown',
		window.__lasso2QueuedDownloadClickHandler,
	);
}

function serializeCaptureCanvas(
	canvas,
	maxEdge = MAX_SHARED_TEXTURE_EDGE,
	maxDataUrlLength = MAX_SHARED_TEXTURE_DATA_URL_LEN,
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
			const dataUrl = canvasToDataUrl(
				working,
				encoder.mimeType,
				encoder.quality,
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
	if (typeof window === 'undefined') return sharedCaptureState;
	window[LASSO2_SHARED_KEY] = sharedCaptureState;
	window.lasso2SharedCaptureState = sharedCaptureState;
	return sharedCaptureState;
}

function playUISound(kind, options = null) {
	if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
	const src = UI_SOUND_FILES[kind];
	if (!src) return;
	const playbackRate =
		options && Number.isFinite(options.playbackRate)
			? cg.clamp(options.playbackRate, 0.5, 2.0)
			: 1.0;
	let baseAudio = uiSoundCache.get(kind);
	if (!baseAudio) {
		try {
			const resolvedSrc = new URL(src, import.meta.url).href;
			baseAudio = new Audio(resolvedSrc);
			baseAudio.preload = 'auto';
			baseAudio.volume = 1.0;
			baseAudio.addEventListener('error', () => {
				const mediaErr =
					baseAudio && baseAudio.error ? baseAudio.error.code : 'unknown';
				console.warn(
					`[lasso2][audio] load error ${kind}:`,
					resolvedSrc,
					mediaErr,
				);
			});
			uiSoundCache.set(kind, baseAudio);
		} catch (err) {
			console.warn('[lasso2] failed to create audio element:', kind, err);
			return;
		}
	}
	try {
		baseAudio.volume = 1.0;
		baseAudio.playbackRate = playbackRate;
		baseAudio.pause();
		baseAudio.currentTime = 0;
		const p = baseAudio.play();
		if (p && typeof p.catch === 'function')
			p.catch((err) => {
				console.log(
					`[lasso2][audio] blocked ${kind} (base): ${describeError(err)}`,
				);
				// Fallback: some runtimes fail playback on reused elements.
				try {
					const fallbackAudio = new Audio(baseAudio.src || src);
					fallbackAudio.volume = 1.0;
					fallbackAudio.playbackRate = playbackRate;
					const fp = fallbackAudio.play();
					if (fp && typeof fp.catch === 'function')
						fp.catch((fallbackErr) =>
							console.log(
								`[lasso2][audio] blocked ${kind} (fallback): ${describeError(
									fallbackErr,
								)}`,
							),
						);
				} catch (fallbackCreateErr) {
					console.log(
						`[lasso2][audio] fallback create error ${kind}: ${describeError(
							fallbackCreateErr,
						)}`,
					);
				}
			});
	} catch (err) {
		console.log(`[lasso2][audio] play error ${kind}: ${describeError(err)}`);
	}
}

// ─── Border detection + perspective warp ──────────────────────────────────────

function detectColorCorners(canvas, isBorderPixel) {
	const { width: w, height: h } = canvas;
	let data = null;
	try {
		const ctx =
			canvas.getContext('2d', { willReadFrequently: true }) ||
			canvas.getContext('2d');
		if (!ctx) {
			setCaptureDebug({
				status: 'capture-context-missing',
				lastError: 'Could not get 2D context for capture canvas.',
			});
			return null;
		}
		data = ctx.getImageData(0, 0, w, h).data;
	} catch (err) {
		setCaptureDebug({
			status: 'capture-read-failed',
			lastError: describeError(err),
		});
		console.error(
			'[lasso2] detectColorCorners failed to read screen canvas:',
			err,
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
			candidates.push({ ...componentCandidate, source: 'largest-component' });
	}
	const globalCandidate = cornersFromMask(mask);
	if (globalCandidate)
		candidates.push({ ...globalCandidate, source: 'all-fuchsia-pixels' });
	if (candidates.length === 0) {
		setCaptureDebug({ lastCorners: null });
		return null;
	}
	// Prefer a single contiguous border component first.
	candidates.sort((a, b) => {
		const aPrimary = a.source === 'largest-component' ? 1 : 0;
		const bPrimary = b.source === 'largest-component' ? 1 : 0;
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
				'Detected a degenerate border quad; waiting for a cleaner frame.',
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
			b > g * 1.25,
	);
}

function insetCaptureCorners(corners, insetPx = CAPTURE_BORDER_INSET_PX) {
	if (!corners || corners.length !== 4) return corners;
	const pts = corners.map((c) => [Number(c[0]), Number(c[1])]);
	if (pts.some((p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1])))
		return corners;
	const center = pts.reduce(
		(acc, p) => [acc[0] + p[0] * 0.25, acc[1] + p[1] * 0.25],
		[0, 0],
	);
	const step = Math.max(0, Number(insetPx) || 0);
	if (step <= 0) return corners;
	return pts.map((p) => {
		const vx = center[0] - p[0];
		const vy = center[1] - p[1];
		const len = Math.hypot(vx, vy) || 1;
		const d = Math.min(step, len * 0.35);
		return [p[0] + (vx / len) * d, p[1] + (vy / len) * d];
	});
}

function sanitizeCaptureCorners(corners, width, height) {
	if (!corners || corners.length !== 4) return null;
	const pts = corners.map((c) => [Number(c[0]), Number(c[1])]);
	if (pts.some((p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1])))
		return null;

	const centroid = pts.reduce(
		(sum, p) => [sum[0] + p[0] / 4, sum[1] + p[1] / 4],
		[0, 0],
	);
	pts.sort(
		(a, b) =>
			Math.atan2(a[1] - centroid[1], a[0] - centroid[0]) -
			Math.atan2(b[1] - centroid[1], b[0] - centroid[0]),
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
	dst = dst || document.createElement('canvas');
	dst.width = outW;
	dst.height = outH;
	const dstCtx = dst.getContext('2d');
	const out = dstCtx.createImageData(outW, outH);
	const srcCtx =
		srcCanvas.getContext('2d', { willReadFrequently: true }) ||
		srcCanvas.getContext('2d');
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
				console.error('[lasso2] toBlob returned null');
				return;
			}
			const url = URL.createObjectURL(blob);
			const triggerDownload = () => {
				const a = document.createElement('a');
				a.href = url;
				a.download = 'lasso-capture.png';
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				setTimeout(() => URL.revokeObjectURL(url), 1000);
				setCaptureDebug({ lastDownload: 'triggered', queuedDownload: false });
				console.log('[lasso2] download triggered');
			};
			const canTriggerNow =
				typeof navigator === 'undefined' ||
				!navigator.userActivation ||
				navigator.userActivation.isActive;
			if (typeof window !== 'undefined') {
				window.lasso2LastCaptureUrl = url;
				window.lasso2DownloadLastCapture = () => {
					if (!queuedDownload) {
						triggerDownload();
						return true;
					}
					const { url: queuedUrl, filename } = queuedDownload;
					queuedDownload = null;
					const a = document.createElement('a');
					a.href = queuedUrl;
					a.download = filename;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					setTimeout(() => URL.revokeObjectURL(queuedUrl), 1000);
					setCaptureDebug({ lastDownload: 'triggered', queuedDownload: false });
					console.log('[lasso2] queued download triggered');
					return true;
				};
			}
			if (canTriggerNow) {
				triggerDownload();
				return;
			}
			if (queuedDownload && queuedDownload.url)
				URL.revokeObjectURL(queuedDownload.url);
			queuedDownload = { url, filename: 'lasso-capture.png' };
			installQueuedDownloadGestureFlush();
			setCaptureDebug({ lastDownload: 'queued', queuedDownload: true });
			console.warn(
				'[lasso2] capture ready, but the browser needs a user gesture before downloading. The next click/squeeze will flush it.',
			);
		}, 'image/png');
	} catch (err) {
		setCaptureDebug({ lastDownload: 'failed', lastError: describeError(err) });
		console.error(
			'[lasso2] downloadCanvas error (canvas may be tainted):',
			err,
		);
	}
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export const init = async (model) => {
	const isHeadsetClient =
		typeof navigator !== 'undefined' &&
		navigator.userAgent.indexOf('OculusBrowser') >= 0;
	if (!isHeadsetClient) {
		ensureDesktopCapturePreviewUI();
		ensurePartnerCanvasWindow();
	}
	server.init(LASSO2_SHARED_KEY, defaultSharedCaptureState());
	let sharedCaptureState = commitSharedCaptureState(
		server.synchronize(LASSO2_SHARED_KEY),
	);
	if (
		!sharedCaptureState.partnerBoard ||
		!Array.isArray(sharedCaptureState.partnerBoard.items)
	)
		sharedCaptureState.partnerBoard = { items: [], updatedAt: 0 };
	if (typeof window !== 'undefined') {
		window.lasso2PartnerBoardMutate = (mutateFn) => {
			if (typeof mutateFn !== 'function') return;
			const prev = sharedCaptureState.partnerBoard || {
				items: [],
				updatedAt: 0,
			};
			const next = {
				...prev,
				items: Array.isArray(prev.items)
					? prev.items.map((item) => ({ ...item }))
					: [],
			};
			mutateFn(next);
			next.updatedAt = nowMs();
			sharedCaptureState.partnerBoard = next;
			commitSharedCaptureState(sharedCaptureState);
			server.broadcastGlobal(LASSO2_SHARED_KEY);
		};
	}

	function setMarkerPose(marker, pos) {
		marker.node
			.identity()
			.move(pos[0], pos[1], pos[2])
			.scale(MARKER_SCALE, MARKER_SCALE, MARKER_SCALE);
	}

	function setMarkerVisual(marker, color, opacity) {
		if (!marker || !marker.ring) return;
		const c = color || [1, 1, 1];
		const a = Number.isFinite(opacity) ? opacity : 0.95;
		marker.ring.color(c[0], c[1], c[2]).opacity(a);
		if (marker.hole)
			marker.hole.color(0, 0, 0).opacity(a > 0 ? Math.min(0.98, a) : 0);
	}

	function createMarkerVisual() {
		const root = model.add();
		const ring = root.add('diskZ').color(1, 1, 0).opacity(0.95).dull();
		const hole = root
			.add('diskZ')
			.move(0, 0, 0.001)
			.scale(RING_HOLE_SCALE)
			.color(0, 0, 0)
			.opacity(0.95)
			.dull();
		return { root, ring, hole };
	}

	function hasAreaTexture(area) {
		return !!area && (!!area.textureCanvas || area.textureChannel != null);
	}

	function shouldExposeCapturedHandles(area) {
		if (!area) return false;
		// After we lock border corners, hide target border for one short delay
		// before capture so the border itself does not leak into the texture.
		if (
			pendingCaptureArea &&
			stagedCaptureCorners &&
			pendingCaptureArea === area
		)
			return false;
		// During an active capture, hide non-target textured handles/borders
		// so they do not leak into the captured image.
		if (
			pendingCaptureArea &&
			pendingCaptureArea !== area &&
			hasAreaTexture(area)
		)
			return false;
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

	function setMarkerColor(marker, mode = 'idle') {
		if (!isMarkerInteractable(marker)) {
			setMarkerVisual(marker, null, 0);
			return;
		}
		if (marker.captureActive) {
			setMarkerVisual(marker, [1, 0, 1], 0.95);
			return;
		}
		if (mode === 'drag') {
			setMarkerVisual(marker, [1, 1, 0], 0.95);
			return;
		}
		if (mode === 'hover') {
			if (marker.complete) setMarkerVisual(marker, [0, 1, 0], 0.68);
			else setMarkerVisual(marker, [1, 1, 0], 0.72);
			return;
		}
		if (marker.complete) setMarkerVisual(marker, [0, 1, 0], 0.95);
		else setMarkerVisual(marker, [1, 1, 0], 0.95);
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
			(dragging && dragging.type === 'area' && dragging.area === area);
		const hasTexture = hasAreaTexture(area);
		setSurfaceOpacity(
			area.surf,
			area.capturePending && !hasTexture
				? 0
				: hasTexture
				? isHoveredSurface
					? TEXTURED_SURFACE_HOVER_OPACITY
					: TEXTURED_SURFACE_OPACITY
				: isHoveredSurface
				? SURFACE_HOVER_OPACITY
				: SURFACE_OPACITY,
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
					: null,
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
			setMarkerColor(hoveredMarker, captureActive ? 'idle' : 'hover');
	}

	function refreshAllMarkerColors() {
		for (const marker of allMarkers) {
			if (!marker) continue;
			const mode = marker === hoveredMarker ? 'hover' : 'idle';
			setMarkerColor(marker, mode);
		}
	}

	function clearAreaCaptureState(area) {
		if (!area) return;
		setAreaCaptureState(area, false);
		if (pendingCaptureArea === area) pendingCaptureArea = null;
		if (!pendingCaptureArea) captureSafeModeActive = false;
		if (!pendingCaptureArea) resetStagedCapture();
		refreshAllMarkerColors();
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
		console.log('[lasso2] broadcast capture request', request);
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
		const board = sharedCaptureState.partnerBoard || {
			items: [],
			updatedAt: 0,
		};
		const items = Array.isArray(board.items) ? board.items : [];
		const nextItems = items.filter(
			(item) =>
				!(item && item.areaId === areaId && item.sourceClientID === clientID),
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
			x: cg.clamp(
				Number(x) || PARTNER_CANVAS_WIDTH * 0.5,
				halfW,
				PARTNER_CANVAS_WIDTH - halfW,
			),
			y: cg.clamp(
				Number(y) || PARTNER_CANVAS_HEIGHT * 0.5,
				halfH,
				PARTNER_CANVAS_HEIGHT - halfH,
			),
		};
	}

	function upsertPartnerBoardItem(area, options = null) {
		if (!area || !area.textureCanvas) return;
		const serialized = serializeCaptureCanvas(
			area.textureCanvas,
			Math.max(MIN_SHARED_TEXTURE_EDGE, 768),
			MAX_SHARED_TEXTURE_DATA_URL_LEN,
		);
		if (!serialized || !serialized.dataUrl) return;
		const board = sharedCaptureState.partnerBoard || {
			items: [],
			updatedAt: 0,
		};
		const items = Array.isArray(board.items)
			? board.items.map((item) => ({ ...item }))
			: [];
		const index = items.findIndex(
			(item) =>
				item && item.areaId === area.id && item.sourceClientID === clientID,
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
			0,
		);
		if (index >= 0) {
			const prev = items[index];
			const prevW = prev.w || drawW;
			const prevH = prev.h || drawH;
			const nextPos =
				forcePosition && preferredPos
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
				status: 'save-screen-unavailable',
				lastError: 'No shared screen frame was available to save yet.',
			});
			return;
		}
		lastProcessedSaveRequestId = request.id;
		setCaptureDebug({
			status: 'saving-full-screen',
			lastError: null,
			lastScreenSize: [screenCanvas.width, screenCanvas.height],
		});
		downloadCanvas(screenCanvas);
		console.log('[lasso2] saved shared screen canvas', request);
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
		console.log('[lasso2] broadcast save request', request);
		processSaveRequest(request);
	}

	function beginAreaCapture(area) {
		if (!area) return;
		instructionTaskState.capturePressed = true;
		resetStagedCapture();
		captureSafeModeActive = CAPTURE_SAFE_MODE_HIDE_TUTORIAL;
		if (typeof applyCaptureSafeUiVisibilityNow === 'function')
			applyCaptureSafeUiVisibilityNow();
		if (pendingCaptureArea && pendingCaptureArea !== area)
			setAreaCaptureState(pendingCaptureArea, false);
			pendingCaptureArea = area;
			setAreaCaptureState(area, true);
			refreshAllMarkerColors();
			setCaptureDebug({
				status: shouldProcessCaptureOnThisClient()
					? 'capture-burst-started'
				: 'capture-requested',
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
		captureSafeModeActive = false;
		resetStagedCapture();
		refreshAllMarkerColors();
		captureBurstDeadline = 0;
		activeCaptureRequest = null;
		setCaptureDebug({ status: 'capture-cancelled' });
	}

	function timeoutPendingCapture() {
		if (!activeCaptureRequest) return;
		const timedOutReason =
			hadCornerDetectionInBurst && captureDebug.status === 'warp-failed'
				? 'Timed out after detecting border corners, but warp kept failing.'
				: hadCornerDetectionInBurst
				? 'Timed out after detecting border corners, but capture did not complete.'
				: 'Timed out waiting for the fuchsia border to appear in the shared screen.';
		console.warn('[lasso2]', timedOutReason);
		sharedCaptureState.request = null;
		sharedCaptureState.response = {
			id: activeCaptureRequest.id,
			requesterClientID: activeCaptureRequest.requesterClientID,
			areaId: activeCaptureRequest.areaId,
			status: 'timeout',
			error: timedOutReason,
			sourceClientID: clientID,
		};
		commitSharedCaptureState(sharedCaptureState);
		server.broadcastGlobal(LASSO2_SHARED_KEY);
		captureBurstDeadline = 0;
		activeCaptureRequest = null;
		hadCornerDetectionInBurst = false;
		resetStagedCapture();
		setCaptureDebug({
			status: 'capture-timeout',
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
		resetStagedCapture();
		setCaptureDebug({
			status: 'capture-burst-started',
			lastError: null,
			noCornerFrames: 0,
			lastCorners: null,
		});
		console.log('[lasso2] desktop client started capture request', request);
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
				status: 'capture-area-missing',
				lastError:
					'Capture response arrived but no local target area matched the response.',
			});
			console.warn(
				'[lasso2] response received but target area was not found',
				response,
			);
			clearSharedCaptureResponse(response.id);
			return false;
		}
		if (!response.imageDataUrl) {
			setCaptureDebug({
				status: 'capture-image-missing',
				lastError: 'Capture response did not include texture image data.',
			});
			console.warn('[lasso2] response missing imageDataUrl', response);
			clearSharedCaptureResponse(response.id);
			return false;
		}
		const img = new Image();
		img.onload = () => {
			const textureCanvas =
				area.textureCanvas || document.createElement('canvas');
			textureCanvas.width = img.width;
			textureCanvas.height = img.height;
			const ctx = textureCanvas.getContext('2d');
			if (!ctx) return;
			ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
			ctx.drawImage(img, 0, 0);
			applyAreaTexture(area, textureCanvas);
			clearAreaCaptureState(area);
			console.log('[lasso2] applied texture response to area', {
				responseId: response.id,
				areaId: area.id,
				size: [textureCanvas.width, textureCanvas.height],
			});
				setCaptureDebug({
					status: 'capture-complete',
					lastCaptureSize: [textureCanvas.width, textureCanvas.height],
					lastError: null,
				});
				playUISound('capture');
				clearSharedCaptureResponse(response.id);
			};
		img.onerror = () => {
			setCaptureDebug({
				status: 'capture-image-error',
				lastError: 'Failed to load the captured texture image.',
			});
			console.error('[lasso2] failed to decode capture imageDataUrl', {
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
		const frameNowMs = nowMs();
		if (!stagedCaptureCorners) {
			setCaptureDebug({
				status: 'detecting-border',
				lastScreenSize: [screenCanvas.width, screenCanvas.height],
				noCornerFrames: _captureFrameCount,
			});
			const corners = detectFuchsiaCorners(screenCanvas);
			if (!corners) {
				setCaptureDebug({ noCornerFrames: _captureFrameCount });
				if (_captureFrameCount % 30 === 1)
					console.log(
						`[lasso2] tryCapture frame ${_captureFrameCount}: no fuchsia corners found (canvas ${screenCanvas.width}x${screenCanvas.height})`,
					);
				return;
			}
			console.log('[lasso2] fuchsia border detected; staging capture', corners);
			hadCornerDetectionInBurst = true;
			stagedCaptureCorners = corners.map((c) => [Number(c[0]), Number(c[1])]);
			stagedCaptureReadyAtMs = frameNowMs + CAPTURE_POST_DETECT_HIDE_DELAY_MS;
			refreshAllMarkerColors();
			setCaptureDebug({
				status: 'border-locked-hiding-target-border',
				lastCorners: corners,
				lastScreenSize: [screenCanvas.width, screenCanvas.height],
			});
			return;
		}
		if (frameNowMs < stagedCaptureReadyAtMs) return;
		const corners = stagedCaptureCorners;
		if (!corners) return;
		console.log('[lasso2] executing staged capture', corners);
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
				'[lasso2] local capture target was not found for requester area',
				activeCaptureRequest,
			);
		}
		const captureCorners = insetCaptureCorners(corners, CAPTURE_BORDER_INSET_PX);
		let warped = warpToCanvas(
			screenCanvas,
			captureCorners,
			localTargetArea && localTargetArea.textureCanvas,
		);
		if (!warped)
			warped = warpToCanvas(
				screenCanvas,
				corners,
				localTargetArea && localTargetArea.textureCanvas,
			);
		if (!warped) {
			resetStagedCapture();
			setCaptureDebug({ status: 'warp-failed', lastCorners: corners });
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
				status: 'error',
				error:
					'Capture succeeded locally but failed to serialize texture image data.',
				sourceClientID: clientID,
			};
			console.warn(
				'[lasso2] capture serialization failed; broadcasting error response',
				sharedCaptureState.response,
			);
			commitSharedCaptureState(sharedCaptureState);
			server.broadcastGlobal(LASSO2_SHARED_KEY);
			captureBurstDeadline = 0;
			activeCaptureRequest = null;
			hadCornerDetectionInBurst = false;
			resetStagedCapture();
			setCaptureDebug({
				status: 'capture-serialize-failed',
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
			status: 'success',
			imageDataUrl,
			width: serializableCanvas.width,
			height: serializableCanvas.height,
			mimeType: serialized.mimeType,
			encodingQuality:
				serialized.quality == null ? null : Number(serialized.quality),
			sourceClientID: clientID,
		};
		console.log('[lasso2] broadcasting capture success response', {
			id: sharedCaptureState.response.id,
			requesterClientID: sharedCaptureState.response.requesterClientID,
			areaId: sharedCaptureState.response.areaId,
			sourceClientID: sharedCaptureState.response.sourceClientID,
			size: [
				sharedCaptureState.response.width,
				sharedCaptureState.response.height,
			],
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
		resetStagedCapture();
		setCaptureDebug({
			status: 'capture-complete',
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
			const ctx = screenCanvas.getContext('2d');
			if (ctx) ctx.clearRect(0, 0, screenCanvas.width, screenCanvas.height);
			screenCanvas.width = 0;
			screenCanvas.height = 0;
		}
		if (
			clearCanvas &&
			screenCaptureDebugPopupCanvas &&
			screenCaptureDebugPopupCtx
		) {
			screenCaptureDebugPopupCtx.clearRect(
				0,
				0,
				screenCaptureDebugPopupCanvas.width,
				screenCaptureDebugPopupCanvas.height,
			);
		}
	}

	async function startDesktopScreenCapture() {
		stopDesktopScreenCapture();
		screenCaptureActive = true;
		screenCanvas =
			document.getElementById('textureCanvas') ||
			window.textureCanvas ||
			document.createElement('canvas');
		try {
			setCaptureDebug({
				status: 'requesting-screen-capture',
				lastError: null,
			});
			const stream = await navigator.mediaDevices.getDisplayMedia({
				video: true,
			});
			screenCaptureStream = stream;
			setCaptureDebug({ status: 'screen-capture-granted' });
			const video = document.createElement('video');
			screenCaptureVideo = video;
			video.muted = true;
			video.autoplay = true;
			video.playsInline = true;
			video.srcObject = stream;
			const [track] = stream.getVideoTracks();
			if (track)
				track.addEventListener('ended', () => {
					setCaptureDebug({ status: 'screen-capture-ended' });
					stopDesktopScreenCapture({ clearCanvas: true });
				});
			video.onloadedmetadata = () => {
				video.play().catch((err) => {
					setCaptureDebug({
						status: 'video-play-failed',
						lastError: describeError(err),
					});
					console.error('[lasso2] screen capture video failed to play:', err);
				});
				setTimeout(() => {
					if (!screenCanvas || !screenCaptureVideo) return;
					screenCanvas.width = video.videoWidth;
					screenCanvas.height = video.videoHeight;
					hideMainScreenCanvasCaptureSource(screenCanvas);
					if (SHOW_SCREEN_CAPTURE_DEBUG_POPUP) ensureScreenCaptureDebugPopup();
					setCaptureDebug({
						status: 'capturing-screen',
						lastScreenSize: [screenCanvas.width, screenCanvas.height],
					});
					if (screenCaptureTimer) clearInterval(screenCaptureTimer);
					screenCaptureTimer = setInterval(() => {
						if (!screenCaptureVideo || screenCaptureVideo.readyState < 2)
							return;
						const ctx = screenCanvas.getContext('2d');
						if (!ctx) {
							setCaptureDebug({
								status: 'capture-context-missing',
								lastError: 'Could not get 2D context for drawImage.',
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
					status: 'video-error',
					lastError: describeError(err),
				});
				console.error('[lasso2] screen capture video error:', err);
			};
			return true;
		} catch (err) {
			setCaptureDebug({
				status: 'screen-capture-failed',
				lastError: describeError(err),
			});
			console.error('captureScreen:', err);
			stopDesktopScreenCapture();
			return false;
		}
	}

	async function repickDesktopScreenCapture() {
		console.log('[lasso2] repicking desktop screen share');
		setCaptureDebug({
			status: 'repicking-screen-capture',
			lastError: null,
		});
		return startDesktopScreenCapture();
	}

	if (typeof window !== 'undefined' && shouldOwnDisplayCapture()) {
		window.lasso2RepickScreenShare = repickDesktopScreenCapture;
		window.lasso2StopScreenShare = () =>
			stopDesktopScreenCapture({ clearCanvas: true });
		window.lasso2OpenScreenCaptureDebugPopup = () =>
			!!ensureScreenCaptureDebugPopup();
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
					tagName === 'INPUT' ||
					tagName === 'TEXTAREA' ||
					(target && target.isContentEditable);
				if (isTypingTarget) return;
				if (event.shiftKey && event.key.toLowerCase() === 'r') {
					event.preventDefault();
					repickDesktopScreenCapture();
				}
			};
			window.addEventListener('keydown', window.__lasso2RepickKeyHandler);
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
			status: 'stale-screen-capture-session',
			lastError:
				'Desktop capture was marked active, but no live stream was attached. Use Shift+R to pick the cast tab again.',
		});
	} else if (screenCanvas) {
		setCaptureDebug({
			status: 'reusing-existing-screen-canvas',
			lastScreenSize: [screenCanvas.width, screenCanvas.height],
		});
	} else if (!shouldOwnDisplayCapture()) {
		setCaptureDebug({
			status: 'waiting-for-desktop-capture-client',
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
	let nextStaticUiTextureChannel = STATIC_UI_TEXTURE_CHANNEL_MIN;
	const claimStaticUiTextureChannel = () => {
		if (nextStaticUiTextureChannel > STATIC_UI_TEXTURE_CHANNEL_MAX) return null;
		const ch = nextStaticUiTextureChannel;
		nextStaticUiTextureChannel += 1;
		return ch;
	};
	const applyStaticUiTexture = (node, path) => {
		if (!node || !path) return false;
		if (node._staticUiTxtrChannel == null)
			node._staticUiTxtrChannel = claimStaticUiTextureChannel();
		const ch = node._staticUiTxtrChannel;
		if (ch == null) return false;
		node.txtrSrc(ch, path, true);
		node.txtr(ch);
		return true;
	};
	const createRingCursor = () => {
		const root = model.add();
		const ring = root.add('diskZ').color(0.75, 0.75, 0.75).opacity(0.95).dull();
		const hole = root
			.add('diskZ')
			.move(0, 0, 0.001)
			.scale(RING_HOLE_SCALE)
			.color(0, 0, 0)
			.opacity(0.95)
			.dull();
		return { root, ring, hole };
	};
	const cursor = createRingCursor();
	const hideCursor = () => {
		cursor.root.identity().move(0, -10, 0).scale(0.0001);
		cursor.ring.opacity(0);
		cursor.hole.opacity(0);
	};
	const showCursorAt = (p, color = INDEX_HOLD_GREY) => {
		const head = getHeadPosition();
		const faceDir =
			head && head.length >= 3
				? [head[0] - p[0], head[1] - p[1], head[2] - p[2]]
				: [0, 0, 1];
		cursor.root
			.identity()
			.move(p[0], p[1], p[2])
			.aimZ(faceDir)
			.scale(INDEX_HOLD_RING_SCALE);
		cursor.ring.identity().color(color[0], color[1], color[2]).opacity(0.95);
		cursor.hole
			.identity()
			.move(0, 0, 0.001)
			.scale(RING_HOLE_SCALE)
			.color(0, 0, 0)
			.opacity(0.95);
	};
	// All edges redrawn from scratch every frame — no incremental clear needed
	const edgesRoot = model.add();
	const hintRoot = model.add();
	const palmProgressRoot = model.add();
	const instructionRoot = model.add();
	const instructionPanel = instructionRoot
		.add('square')
		.scale(INSTRUCTION_CONFIG.scale)
		.color(1, 1, 1)
		.opacity(1)
		.dull();
	const instructionButtonPanel = instructionRoot
		.add('square')
		.scale(
			INSTRUCTION_CONFIG.buttonWidth,
			INSTRUCTION_CONFIG.buttonWidth / INSTRUCTION_CONFIG.finishButtonAspect,
			1,
		)
		.color(1, 1, 1)
		.opacity(1)
		.dull();
	const instructionProgressRoot = instructionRoot.add();
	const INSTRUCTION_STEP = {
		INTRO: 0,
		CONNECT: 1,
		CALIBRATE: 2,
		QUAD: 3,
		CAPTURE: 4,
		DROP: 5,
		FINAL: 6,
	};
	let instructionButtonHovered = false;
	let instructionButtonVisible = true;
	let instructionVisible = true;
	let instructionPageIndex = 0;
	let previousInstructionMode = null;
	let previousInstructionTexture = null;
	let previousInstructionButtonTexture = null;
	let prevLeftYPressed = false;
	let instructionTaskState = {
		calibrationStarted: false,
		calibrated: false,
		quadCreated: false,
		capturePressed: false,
		droppedToCanvas: false,
	};
	const resetInstructionTaskState = () => {
		instructionTaskState.calibrationStarted = false;
		instructionTaskState.calibrated = false;
		instructionTaskState.quadCreated = false;
		instructionTaskState.capturePressed = false;
		instructionTaskState.droppedToCanvas = false;
	};
	const instructionPageCount = Math.max(
		(INSTRUCTION_CONFIG.texture &&
			INSTRUCTION_CONFIG.texture.controller &&
			INSTRUCTION_CONFIG.texture.controller.length) ||
			0,
		(INSTRUCTION_CONFIG.texture &&
			INSTRUCTION_CONFIG.texture.hand &&
			INSTRUCTION_CONFIG.texture.hand.length) ||
			0,
	);
	const instructionProgressDots = [];
	for (let i = 0; i < instructionPageCount; i += 1) {
		instructionProgressDots.push(
			instructionProgressRoot
				.add('diskZ')
				.color(
					INSTRUCTION_PROGRESS_COLOR_TODO[0],
					INSTRUCTION_PROGRESS_COLOR_TODO[1],
					INSTRUCTION_PROGRESS_COLOR_TODO[2],
				)
				.opacity(0.98)
				.dull(),
		);
	}
	const advanceInstructionPage = () => {
		if (instructionPageIndex >= instructionPageCount - 1) {
			instructionVisible = false;
			return;
		}
		const nextIndex = Math.min(
			instructionPageIndex + 1,
			Math.max(0, instructionPageCount - 1),
		);
		instructionPageIndex = nextIndex;
		// Require the user to complete each task after they arrive on that step.
		// This prevents skipping (for example CALIBRATE -> QUAD) from stale flags.
		if (nextIndex === INSTRUCTION_STEP.CALIBRATE) {
			instructionTaskState.calibrationStarted = false;
			instructionTaskState.calibrated = false;
		} else if (nextIndex === INSTRUCTION_STEP.QUAD) {
			instructionTaskState.quadCreated = false;
		} else if (nextIndex === INSTRUCTION_STEP.CAPTURE) {
			instructionTaskState.capturePressed = false;
		} else if (nextIndex === INSTRUCTION_STEP.DROP) {
			instructionTaskState.droppedToCanvas = false;
		}
	};
	const isClientComputerConnected = () => {
		if (typeof clients !== 'undefined' && Array.isArray(clients))
			return clients.length > 1;
		const board = sharedCaptureState && sharedCaptureState.partnerBoard;
		return !!(board && Number(board.updatedAt) > 0);
	};
	const shouldShowInstructionButton = () => {
		if (!instructionVisible || instructionPageCount <= 0) return false;
		if (instructionPageIndex === INSTRUCTION_STEP.INTRO) return true;
		if (instructionPageIndex === INSTRUCTION_STEP.CONNECT)
			return isClientComputerConnected();
		if (instructionPageIndex === INSTRUCTION_STEP.FINAL) return true;
		return false;
	};
	const maybeAdvanceInstructionByTask = () => {
		if (!instructionVisible || instructionPageCount <= 0) return;
		let keepAdvancing = true;
		while (keepAdvancing && instructionVisible) {
			keepAdvancing = false;
			if (
				instructionPageIndex === INSTRUCTION_STEP.CALIBRATE &&
				instructionTaskState.calibrated
			) {
				advanceInstructionPage();
				keepAdvancing = true;
			} else if (
				instructionPageIndex === INSTRUCTION_STEP.QUAD &&
				instructionTaskState.quadCreated
			) {
				advanceInstructionPage();
				keepAdvancing = true;
			} else if (
				instructionPageIndex === INSTRUCTION_STEP.CAPTURE &&
				instructionTaskState.capturePressed
			) {
				advanceInstructionPage();
				keepAdvancing = true;
			} else if (
				instructionPageIndex === INSTRUCTION_STEP.DROP &&
				instructionTaskState.droppedToCanvas
			) {
				advanceInstructionPage();
				keepAdvancing = true;
			}
		}
	};
	const getInstructionTextureByMode = (mode, index) => {
		const textures = INSTRUCTION_CONFIG.texture || {};
		const preferred = textures[mode] || null;
		const fallback = textures.controller || null;
		const fromPreferred =
			Array.isArray(preferred) && preferred[index] != null
				? preferred[index]
				: null;
		if (fromPreferred) return fromPreferred;
		if (Array.isArray(fallback) && fallback[index] != null) return fallback[index];
		return null;
	};
	const updateInstructionOverlay = (mode, suppressTutorial = false) => {
		instructionButtonVisible = !suppressTutorial && shouldShowInstructionButton();
		if (!instructionVisible || instructionPageCount <= 0) {
			instructionButtonHovered = false;
			instructionRoot.identity().move(0, -10, 0).scale(0.0001);
			instructionPanel.opacity(0);
			instructionButtonPanel.opacity(0);
			instructionProgressRoot.opacity(0);
			return;
		}
		if (suppressTutorial) {
			instructionButtonHovered = false;
			instructionRoot.identity().move(0, -10, 0).scale(0.0001);
			instructionPanel.opacity(0);
			instructionButtonPanel.opacity(0);
			instructionProgressRoot.opacity(0);
			return;
		}
		const clampedIndex = Math.max(
			0,
			Math.min(instructionPageCount - 1, instructionPageIndex),
		);
		instructionPageIndex = clampedIndex;
		const texturePath = getInstructionTextureByMode(mode, clampedIndex);
		if (texturePath && previousInstructionTexture !== texturePath) {
			previousInstructionTexture = texturePath;
			applyStaticUiTexture(instructionPanel, texturePath);
		}
		const isFinalInstruction = clampedIndex >= instructionPageCount - 1;
		const buttonAspect = isFinalInstruction
			? INSTRUCTION_CONFIG.finishButtonAspect
			: INSTRUCTION_CONFIG.nextButtonAspect;
		const buttonTexturePath = isFinalInstruction
			? INSTRUCTION_BUTTON_TEXTURE.finish
			: INSTRUCTION_BUTTON_TEXTURE.next;
		if (
			instructionButtonVisible &&
			buttonTexturePath &&
			previousInstructionButtonTexture !== buttonTexturePath
		) {
			previousInstructionButtonTexture = buttonTexturePath;
			applyStaticUiTexture(instructionButtonPanel, buttonTexturePath);
		}
		instructionRoot
			.identity()
			.move(
				INSTRUCTION_CONFIG.position[0],
				INSTRUCTION_CONFIG.position[1],
				INSTRUCTION_CONFIG.position[2],
			);
		const instructionHead = getHeadPosition();
		if (instructionHead && instructionHead.length >= 3) {
			const dx = instructionHead[0] - INSTRUCTION_CONFIG.position[0];
			const dz = instructionHead[2] - INSTRUCTION_CONFIG.position[2];
			if (Math.abs(dx) + Math.abs(dz) > 0.0001) instructionRoot.turnY(Math.atan2(dx, dz));
		}
		instructionPanel
			.identity()
			.move(0, 0, 0)
			.scale(INSTRUCTION_CONFIG.scale)
			.color(1, 1, 1)
			.opacity(0.98)
			.dull();
		instructionButtonPanel
			.identity()
			.move(
				INSTRUCTION_CONFIG.buttonOffset[0],
				INSTRUCTION_CONFIG.buttonOffset[1],
				INSTRUCTION_CONFIG.buttonOffset[2],
			)
			.scale(
				INSTRUCTION_CONFIG.buttonWidth,
				INSTRUCTION_CONFIG.buttonWidth / buttonAspect,
				1,
			)
			.color(
				instructionButtonHovered ? 0.86 : 1,
				instructionButtonHovered ? 0.86 : 1,
				instructionButtonHovered ? 0.86 : 1,
			)
			.opacity(instructionButtonVisible ? 0.98 : 0)
			.dull();
		instructionProgressRoot
			.identity()
			.move(
				INSTRUCTION_CONFIG.buttonOffset[0] + INSTRUCTION_CONFIG.progressOffset[0],
				INSTRUCTION_CONFIG.progressYOffsetFixed,
				INSTRUCTION_CONFIG.buttonOffset[2] + INSTRUCTION_CONFIG.progressOffset[2],
			)
			.opacity(1);
		if (instructionProgressDots.length > 0) {
			const dotStep =
				INSTRUCTION_CONFIG.progressDotRadius * 2 + INSTRUCTION_CONFIG.progressDotGap;
			const startX = (-dotStep * (instructionProgressDots.length - 1)) / 2;
			for (let i = 0; i < instructionProgressDots.length; i += 1) {
				const done = i < clampedIndex;
				const c = done
					? INSTRUCTION_PROGRESS_COLOR_DONE
					: INSTRUCTION_PROGRESS_COLOR_TODO;
				instructionProgressDots[i]
					.identity()
					.move(startX + i * dotStep, 0, 0)
					.scale(INSTRUCTION_CONFIG.progressDotRadius)
					.color(c[0], c[1], c[2])
					.opacity(0.98)
					.dull();
			}
		}
		previousInstructionMode = mode;
	};
	const isInstructionButtonHovered = (inputMode = 'controller') => {
		if (
			!instructionVisible ||
			!instructionButtonVisible ||
			instructionPageCount <= 0 ||
			!instructionButtonPanel
		)
			return false;
		if (inputMode === 'hand') {
			const tip = getFingerTip('right', 1);
			const wrist = getWristPosition('right');
			if (!tip) return false;
			const offsetDir =
				tip && wrist
					? [tip[0] - wrist[0], tip[1] - wrist[1], tip[2] - wrist[2]]
					: null;
			const hoverPoint = getIndexHoldAnchor(tip, offsetDir) || tip;
			const m = instructionButtonPanel.getGlobalMatrix();
			if (!m) return false;
			const origin = [m[12], m[13], m[14]];
			const nzRaw = [m[8], m[9], m[10]];
			const nzLen = Math.hypot(nzRaw[0], nzRaw[1], nzRaw[2]);
			if (!Number.isFinite(nzLen) || nzLen < 1e-6) return false;
			const nz = [nzRaw[0] / nzLen, nzRaw[1] / nzLen, nzRaw[2] / nzLen];
			const rel = [
				hoverPoint[0] - origin[0],
				hoverPoint[1] - origin[1],
				hoverPoint[2] - origin[2],
			];
			const planeDist = Math.abs(rel[0] * nz[0] + rel[1] * nz[1] + rel[2] * nz[2]);
			if (planeDist > INSTRUCTION_BUTTON_HOVER_DISTANCE_METERS) return false;
			const pLocal = cg.mTransform(cg.mInverse(m), [
				hoverPoint[0],
				hoverPoint[1],
				hoverPoint[2],
				1,
			]);
			if (!pLocal || pLocal.length < 3) return false;
			return (
				Math.abs(Number(pLocal[0])) <= 1 + INSTRUCTION_BUTTON_HOVER_PAD &&
				Math.abs(Number(pLocal[1])) <= 1 + INSTRUCTION_BUTTON_HOVER_PAD
			);
		}
		const hit = beam.hitRect(instructionButtonPanel.getGlobalMatrix());
		if (!hit) return false;
		const z = Number(hit[2]);
		return Number.isFinite(z) && z >= 0 && z <= MAX_HOVER_DEPTH;
	};

	function createPalmProgressIndicator() {
		const root = palmProgressRoot.add();
		const ring = root.add('sphere').color(0.2, 0.95, 1.2).opacity(0).dull();
		const core = root.add('sphere').color(1.0, 0.2, 1.0).opacity(0).dull();
		return { root, ring, core };
	}

	const leftPalmProgress = createPalmProgressIndicator();
	const rightPalmProgress = createPalmProgressIndicator();

	function hidePalmProgressIndicator(indicator) {
		if (!indicator) return;
		indicator.root.identity().move(0, -10, 0).scale(0.0001);
		indicator.ring.opacity(0);
		indicator.core.opacity(0);
	}

	function setPalmProgressIndicator(indicator, wristPos, progress) {
		if (!indicator || !wristPos) return;
		const p = cg.clamp(progress, 0, 1);
		const y = (Number(wristPos[1]) || 0) + PALM_PROGRESS_OFFSET_Y;
		indicator.root
			.identity()
			.move(Number(wristPos[0]) || 0, y, Number(wristPos[2]) || 0)
			.scale(PALM_PROGRESS_BASE_SCALE + PALM_PROGRESS_SCALE_RANGE * p);
		indicator.ring
			.identity()
			.scale(1.25 + 0.35 * p)
			.color(0.2 + 0.8 * p, 0.95, 1.2)
			.opacity(0.18 + 0.52 * p);
		indicator.core
			.identity()
			.scale(0.5 + 0.45 * p)
			.color(1.0, 0.25 + 0.65 * p, 1.0)
			.opacity(0.26 + 0.64 * p);
	}

	function updatePalmProgressIndicators(
		enabled,
		leftWrist,
		rightWrist,
		progress,
	) {
		if (!enabled || !leftWrist || !rightWrist || progress <= 0) {
			hidePalmProgressIndicator(leftPalmProgress);
			hidePalmProgressIndicator(rightPalmProgress);
			return;
		}
		setPalmProgressIndicator(leftPalmProgress, leftWrist, progress);
		setPalmProgressIndicator(rightPalmProgress, rightWrist, progress);
	}

	const createIndexHoldUI = () => {
		const root = model.add();
		const ring = root
			.add('diskZ')
			.color(INDEX_HOLD_CYAN[0], INDEX_HOLD_CYAN[1], INDEX_HOLD_CYAN[2])
			.opacity(0.95)
			.dull();
		const hole = root
			.add('diskZ')
			.move(0, 0, 0.001)
			.scale(RING_HOLE_SCALE)
			.color(0, 0, 0)
			.opacity(0.95)
			.dull();
		const fill = root
			.add('diskZ')
			.move(0, 0, 0.002)
			.scale(0.00001)
			.color(INDEX_HOLD_CYAN[0], INDEX_HOLD_CYAN[1], INDEX_HOLD_CYAN[2])
			.opacity(0)
			.dull();
		return { root, ring, hole, fill };
	};

	const indexHoldUI = {
		left: createIndexHoldUI(),
		right: createIndexHoldUI(),
	};

	function hideIndexHoldUI(hand = null) {
		const hideOne = (ui) => {
			if (!ui) return;
			ui.root.identity().move(0, -10, 0).scale(0.0001);
			ui.ring.opacity(0);
			ui.hole.opacity(0);
			ui.fill.opacity(0);
		};
		if (hand === 'left' || hand === 'right') hideOne(indexHoldUI[hand]);
		else {
			hideOne(indexHoldUI.left);
			hideOne(indexHoldUI.right);
		}
	}

	function getIndexHoldAnchor(indexPos, offsetDir = null) {
		if (!indexPos || indexPos.length < 3) return null;
		const dir = offsetDir || [0, 0, 1];
		const dirLen = Math.hypot(dir[0], dir[1], dir[2]);
		const safeDir =
			dirLen > 1e-6
				? [dir[0] / dirLen, dir[1] / dirLen, dir[2] / dirLen]
				: [0, 0, 1];
		return [
			indexPos[0] + safeDir[0] * INDEX_HOLD_RING_OFFSET_METERS,
			indexPos[1] + safeDir[1] * INDEX_HOLD_RING_OFFSET_METERS,
			indexPos[2] + safeDir[2] * INDEX_HOLD_RING_OFFSET_METERS,
		];
	}

	function getIndicatorFacingDir(anchor, fallback = [0, 0, 1]) {
		if (!anchor || anchor.length < 3) return fallback;
		const head = getHeadPosition();
		if (head && head.length >= 3) {
			const dir = [
				head[0] - anchor[0],
				head[1] - anchor[1],
				head[2] - anchor[2],
			];
			const len = Math.hypot(dir[0], dir[1], dir[2]);
			if (Number.isFinite(len) && len > 1e-6) return dir;
		}
		return fallback;
	}

	function updateIndexHoldUI(
		hand,
		indexPos,
		fillProgress,
		fillColor = INDEX_HOLD_CYAN,
		offsetDir = null,
		ringColor = fillColor,
	) {
		const ui = indexHoldUI[hand];
		if (!ui) return;
		if (!indexPos || indexPos.length < 3) {
			hideIndexHoldUI(hand);
			return;
		}
		const p = cg.clamp(fillProgress, 0, 1);
		const anchor = getIndexHoldAnchor(indexPos, offsetDir);
		if (!anchor) {
			hideIndexHoldUI(hand);
			return;
		}
		const faceDir = getIndicatorFacingDir(anchor, offsetDir || [0, 0, 1]);
		ui.root
			.identity()
			.move(anchor[0], anchor[1], anchor[2])
			.aimZ(faceDir)
			.scale(INDEX_HOLD_RING_SCALE);
		ui.ring
			.identity()
			.color(ringColor[0], ringColor[1], ringColor[2])
			.opacity(0.95);
		ui.hole
			.identity()
			.move(0, 0, 0.001)
			.scale(RING_HOLE_SCALE)
			.color(0, 0, 0)
			.opacity(0.95);
		ui.fill
			.identity()
			.move(0, 0, 0.002)
			.scale(Math.max(0.00001, 0.8 * p))
			.color(fillColor[0], fillColor[1], fillColor[2])
			.opacity(p > 0 ? 0.45 + 0.55 * p : 0);
	}

	let hoveredMarker = null;
	let hoveredArea = null;
	let dragging = null;

	let COMPUTER_CANVAS_INSTRUCTION = {
		texture: {
			controller: '../media/icons/computer-canvas-instruction.png',
			hand: '../media/icons/computer-canvas-instruction.png',
		},
	};
	let BUTTON_LOC_CONFIG = {
			SELECT: {
				controller: [-0.09, -0.012, 0.055],
				hand: { left: [0.1, -0.0, -0.1], right: [-0.1, -0.0, -0.1] },
			},
		GRAB: { controller: [-0.08, -0.2, 0.055], hand: {left: [-0.1, -0.06, -0.1], right: [0.1, -0.06, -0.1]} },
		SAVE: { controller: [0.11, -0.01, 0.05], hand: {left: [0.1, -0.01, -0.1], right: [-0.1, -0.01, -0.1]} },
		CALIBRATE: { controller: [0.09, -0.015, 0.05], hand: {left: [0.1, -0.06, -0.1], right: [-0.1, -0.06, -0.1]} },
  };
	let HINT_CONFIG = {
		SELECT: {
			button: 1,
			POINT: {
				texture: {
					controller: {
						src: '../media/icons/select-point.png',
						id: 1,
					},
					hand: {
						right: { src: '../media/icons/point-hand.png', id: 2 },
						left: { src: '../media/icons/point-hand-confirm.png', id: 3 },
					},
				},
			},
			CAPTURE: {
				texture: {
					controller: { src: '../media/icons/select-capture.png', id: 4 },
					hand: {
						right: { src: '../media/icons/select-capture-hand.png', id: 5 },
						left: { src: '../media/icons/capture-hand-confirm.png', id: 6 },
					},
				},
			},
		},
		GRAB: {
			button: 2,
			POINT: {
				texture: {
					controller: { src: '../media/icons/grab-point.png', id: 7 },
					hand: {
						right: { src: '../media/icons/grab-point-hand.png', id: 8 },
						left: null,
					},
				},
			},
			SURFACE: {
				texture: {
					controller: { src: '../media/icons/grab-surface.png', id: 9 },
					hand: {
						right: { src: '../media/icons/grab-surface-hand.png', id: 10 },
						left: null,
					},
				},
			},
		},
		SAVE: {
			button: 3,
			POINT: {
				texture: {
					controller: { src: '../media/icons/a-save.png', id: 11 },
					hand: {
						right: null,
						left: { src: '../media/icons/save-hand-left.png', id: 12 },
					},
				},
			},
			SAVED: {
				texture: {
					controller: { src: '../media/icons/save-toast.png', id: 13 },
					hand: {
						right: null,
						left: { src: '../media/icons/save-toast.png', id: 14 },
					},
				},
			},
		},
		CALIBRATE: {
			button: 4,
			CALIBRATE_COMPUTER_CANVAS: {
				texture: {
					controller: { src: '../media/icons/b-calibrate.png', id: 15 },
					hand: {
						right: { src: '../media/icons/calibrate-hand-right.png', id: 16 },
						left: { src: '../media/icons/calibrate-hand-left.png', id: 17 },
					},
				},
			},
			CONFIRM_COMPUTER_CANVAS: {
				texture: {
					controller: { src: '../media/icons/b-confirm.png', id: 18 },
					hand: {
						right: {
							src: '../media/icons/confirm-calibration-hand-right.png',
							id: 19,
						},
						left: {
							src: '../media/icons/confirm-calibration-hand-left.png',
							id: 20,
						},
					},
				},
			},
		},
	};
	const INPUT_HINT_MODES = ['controller', 'hand'];
	let currentHintInputMode = 'controller';

	function toTextureSrc(textureRef) {
		if (textureRef === null) return null;
		if (textureRef === undefined) return undefined;
		if (typeof textureRef === 'string') return textureRef;
		if (
			typeof textureRef === 'object' &&
			typeof textureRef.src === 'string' &&
			textureRef.src.length > 0
		)
			return textureRef.src;
		return undefined;
	}

	function resolveModeTexture(textureConfig, mode, handSide = null) {
		if (textureConfig === null) return null;
		if (textureConfig === undefined) return undefined;
		const directTexture = toTextureSrc(textureConfig);
		if (directTexture !== undefined) return directTexture;
		if (typeof textureConfig === 'object') {
			if (
				mode === 'hand' &&
				textureConfig.hand &&
				typeof textureConfig.hand === 'object'
			) {
				if (
					handSide &&
					Object.prototype.hasOwnProperty.call(textureConfig.hand, handSide)
				) {
					const sideSrc = toTextureSrc(textureConfig.hand[handSide]);
					if (sideSrc !== undefined) return sideSrc;
					if (textureConfig.hand[handSide] === null) return null;
				}
				if (Object.prototype.hasOwnProperty.call(textureConfig.hand, 'right')) {
					const rightSrc = toTextureSrc(textureConfig.hand.right);
					if (rightSrc !== undefined) return rightSrc;
					if (textureConfig.hand.right === null) return null;
				}
				if (Object.prototype.hasOwnProperty.call(textureConfig.hand, 'left')) {
					const leftSrc = toTextureSrc(textureConfig.hand.left);
					if (leftSrc !== undefined) return leftSrc;
					if (textureConfig.hand.left === null) return null;
				}
				return undefined;
			}
			const modeSrc = toTextureSrc(textureConfig[mode]);
			if (modeSrc !== undefined) return modeSrc;
			const controllerSrc = toTextureSrc(textureConfig.controller);
			if (controllerSrc !== undefined) return controllerSrc;
			if (textureConfig.hand && typeof textureConfig.hand === 'object') {
				if (
					handSide &&
					Object.prototype.hasOwnProperty.call(textureConfig.hand, handSide)
				) {
					const sideSrc = toTextureSrc(textureConfig.hand[handSide]);
					if (sideSrc !== undefined) return sideSrc;
					if (textureConfig.hand[handSide] === null) return null;
				}
				if (Object.prototype.hasOwnProperty.call(textureConfig.hand, 'right')) {
					const rightSrc = toTextureSrc(textureConfig.hand.right);
					if (rightSrc !== undefined) return rightSrc;
					if (textureConfig.hand.right === null) return null;
				}
				if (Object.prototype.hasOwnProperty.call(textureConfig.hand, 'left')) {
					const leftSrc = toTextureSrc(textureConfig.hand.left);
					if (leftSrc !== undefined) return leftSrc;
					if (textureConfig.hand.left === null) return null;
				}
			}
			return undefined;
		}
		return undefined;
	}

	function getHintTexturePath(
		actionName,
		modeName = null,
		inputMode = 'controller',
		handSide = null,
	) {
		const actionCfg = HINT_CONFIG[actionName];
		if (!actionCfg) return null;
		const resolveFromMode = (modeKey, side = null) => {
			const modeCfg = actionCfg[modeKey];
			if (!modeCfg || typeof modeCfg !== 'object' || !modeCfg.texture) return null;
			return resolveModeTexture(modeCfg.texture, inputMode, side);
		};

		if (modeName) {
			const exact = resolveFromMode(modeName, handSide);
			if (exact !== undefined) return exact;
		}
		const pointFallback = resolveFromMode('POINT', handSide);
		if (pointFallback !== undefined) return pointFallback;
		for (const modeKey in actionCfg) {
			const candidate = resolveFromMode(modeKey, handSide);
			if (candidate !== undefined) return candidate;
		}
		if (inputMode !== 'controller') {
			if (modeName) {
				const controllerExact = resolveFromMode(modeName, null);
				if (controllerExact !== undefined) return controllerExact;
			}
			const controllerPoint = resolveFromMode('POINT', null);
			if (controllerPoint !== undefined) return controllerPoint;
			for (const modeKey in actionCfg) {
				const candidate = resolveFromMode(modeKey, null);
				if (candidate !== undefined) return candidate;
			}
		}
		return null;
	}

	function getInstructionTexturePath(inputMode = currentHintInputMode) {
		return (
			resolveModeTexture(COMPUTER_CANVAS_INSTRUCTION.texture, inputMode) ||
			resolveModeTexture(COMPUTER_CANVAS_INSTRUCTION.texture, 'controller')
		);
	}

	function getHintTexturePathForMode(
		actionName,
		modeName = null,
		inputMode = 'controller',
		handSide = null,
	) {
		const direct =
			inputMode === 'hand'
				? handSide
					? getHintTexturePath(actionName, modeName, inputMode, handSide)
					: getHintTexturePath(actionName, modeName, inputMode, 'right') ??
						getHintTexturePath(actionName, modeName, inputMode, 'left')
				: getHintTexturePath(actionName, modeName, inputMode, null);
		if (direct !== undefined) return direct;
		return getHintTexturePath(actionName, modeName, 'controller', null);
	}

	function getHintOffset(
		actionName,
		inputMode = currentHintInputMode,
		handSide = null,
	) {
		const cfg = BUTTON_LOC_CONFIG && BUTTON_LOC_CONFIG[actionName];
		if (Array.isArray(cfg)) return cfg;
		if (
			cfg &&
			inputMode === 'hand' &&
			cfg.hand &&
			typeof cfg.hand === 'object' &&
			!Array.isArray(cfg.hand)
		) {
			const sideOffset =
				handSide && Object.prototype.hasOwnProperty.call(cfg.hand, handSide)
					? cfg.hand[handSide]
					: null;
			if (sideOffset === null) return null;
			if (Array.isArray(sideOffset)) return sideOffset;
			const right = cfg.hand.right;
			if (right === null) return null;
			if (Array.isArray(right)) return right;
			const left = cfg.hand.left;
			if (left === null) return null;
			if (Array.isArray(left)) return left;
		}
		if (cfg && Array.isArray(cfg[inputMode])) return cfg[inputMode];
		if (cfg && Array.isArray(cfg.controller)) return cfg.controller;
		if (cfg && Array.isArray(cfg.hand)) return cfg.hand;
		if (cfg && Array.isArray(cfg.OFFSET)) return cfg.OFFSET;
		return [0, 0, 0];
	}

	function resolveHintAnchorPosition(anchor, offset, useWorldOffset = false) {
		if (!anchor || typeof anchor.length !== 'number') return null;
		const ox = offset && offset.length > 0 ? offset[0] : 0;
		const oy = offset && offset.length > 1 ? offset[1] : 0;
		const oz = offset && offset.length > 2 ? offset[2] : 0;

		// If a 4x4 hand matrix is provided, apply offset in the hand's local basis.
		if (anchor.length >= 16) {
			if (useWorldOffset)
				return [anchor[12] + ox, anchor[13] + oy, anchor[14] + oz];
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

	function placeHint(hint, anchorPos, offset, useWorldOffset = false) {
		if (offset === null) {
			setHintVisible(hint, false);
			return;
		}
		const p = resolveHintAnchorPosition(anchorPos, offset, useWorldOffset);
		if (!p) {
			setHintVisible(hint, false);
			return;
		}
		hint
			.identity()
			.move(p[0], p[1], p[2])
			.scale(
				HINT_PANEL_WIDTH * HINT_PANEL_SCALE,
				HINT_PANEL_HEIGHT * HINT_PANEL_SCALE,
				1,
			)
			.color(1, 1, 1)
			.dull();
	}

	function createControllerHint(title) {
		const hint = hintRoot
			.add('square')
			.move(0, 0, -0.0005)
			.scale(
				HINT_PANEL_WIDTH * HINT_PANEL_SCALE,
				HINT_PANEL_HEIGHT * HINT_PANEL_SCALE,
				1,
			)
			.color(0, 0, 0)
			.opacity(0);
		const defaultTxtrPath = getHintTexturePathForMode(
			title,
			'POINT',
			currentHintInputMode,
		);
		if (defaultTxtrPath) applyStaticUiTexture(hint, defaultTxtrPath);
		hint._hintTitle = title;
		hint._hintPath = defaultTxtrPath || null;

		return hint;
	}

	function updateHint(
		hint,
		action,
		inputMode = currentHintInputMode,
		handSide = null,
	) {
		if (!action || action == null) {
			setHintVisible(hint, false);
			return;
		}
		const txtrPath = getHintTexturePathForMode(
			action[0],
			action[1],
			inputMode,
			handSide,
		);
		if (!txtrPath) {
			setHintVisible(hint, false);
			return;
		}
		setHintVisible(hint, true);
		if (hint._hintPath !== txtrPath) {
			hint._hintPath = txtrPath;
			applyStaticUiTexture(hint, txtrPath);
		}
	}

	function setHintVisible(hint, visible) {
		hint.opacity(visible ? 0.95 : 0);
	}

		const selectHint = createControllerHint('SELECT');
		const selectHintLeft = createControllerHint('SELECT');
		const grabHint = createControllerHint('GRAB');
		const saveHint = createControllerHint('SAVE');
		const saveToastHint = createControllerHint('SAVE');
		const calibrateHint = createControllerHint('CALIBRATE');
		let saveToastUntil = -1;
		const triggerSaveToast = () => {
			saveToastUntil = model.time + SAVE_TOAST_SECONDS;
		};
	const computerCanvasInstructionHint = hintRoot
		.add('square')
		.move(0, 0, -0.0005)
		.scale(
			HINT_PANEL_WIDTH * HINT_PANEL_SCALE,
			HINT_PANEL_HEIGHT * HINT_PANEL_SCALE,
			1,
		)
		.color(1, 1, 1)
		.opacity(0)
		.dull();
	const defaultInstructionHintPath = getInstructionTexturePath('controller');
	if (defaultInstructionHintPath)
		applyStaticUiTexture(
			computerCanvasInstructionHint,
			defaultInstructionHintPath,
		);
	function applyCaptureSafeUiVisibilityNow() {
		instructionButtonHovered = false;
		instructionRoot.identity().move(0, -10, 0).scale(0.0001);
		instructionPanel.opacity(0);
		instructionButtonPanel.opacity(0);
		instructionProgressRoot.opacity(0);
		setHintVisible(selectHint, false);
		setHintVisible(selectHintLeft, false);
		setHintVisible(grabHint, false);
		setHintVisible(saveHint, false);
		setHintVisible(saveToastHint, false);
		setHintVisible(calibrateHint, false);
		setHintVisible(computerCanvasInstructionHint, false);
	}

	function updateControllerHints(
		anchorPos = null,
		leftAnchorPos = null,
		inputMode = 'controller',
		suppressTutorial = false,
	) {
		if (suppressTutorial) {
			applyCaptureSafeUiVisibilityNow();
			return;
		}
		currentHintInputMode = inputMode === 'hand' ? 'hand' : 'controller';
		const instructionTxtrPath = getInstructionTexturePath(currentHintInputMode);
		if (
			instructionTxtrPath &&
			computerCanvasInstructionHint._hintPath !== instructionTxtrPath
		) {
			computerCanvasInstructionHint._hintPath = instructionTxtrPath;
			applyStaticUiTexture(computerCanvasInstructionHint, instructionTxtrPath);
		}

		const controlAnchor = anchorPos || leftAnchorPos;
		const instructionAnchor = leftAnchorPos || controlAnchor;
		const resolveActionHandSide = (actionName) =>
			HAND_HINT_SIDE_BY_ACTION[actionName] || 'right';
		const resolveActionAnchor = (actionName) => {
			if (currentHintInputMode !== 'hand') return controlAnchor;
			const side = resolveActionHandSide(actionName);
			return side === 'left'
				? leftAnchorPos || anchorPos
				: anchorPos || leftAnchorPos;
		};
			if (!controlAnchor && !instructionAnchor) {
				setHintVisible(selectHint, false);
				setHintVisible(selectHintLeft, false);
				setHintVisible(grabHint, false);
				setHintVisible(saveHint, false);
				setHintVisible(saveToastHint, false);
				setHintVisible(calibrateHint, false);
				setHintVisible(computerCanvasInstructionHint, false);
				return;
			}

		if (currentHintInputMode === 'hand') {
			setHintVisible(selectHint, true);
			placeHint(
				selectHint,
				anchorPos || leftAnchorPos,
				getHintOffset('SELECT', currentHintInputMode, 'right'),
				true,
			);
			placeHint(
				selectHintLeft,
				leftAnchorPos || anchorPos,
				getHintOffset('SELECT', currentHintInputMode, 'left'),
				true,
			);
		} else {
			setHintVisible(selectHintLeft, false);
			placeHint(
				selectHint,
				resolveActionAnchor('SELECT'),
				getHintOffset('SELECT', currentHintInputMode, null),
			);
		}
		placeHint(
			grabHint,
			resolveActionAnchor('GRAB'),
			getHintOffset(
				'GRAB',
				currentHintInputMode,
				currentHintInputMode === 'hand' ? resolveActionHandSide('GRAB') : null,
			),
			currentHintInputMode === 'hand',
		);
			placeHint(
				saveHint,
				resolveActionAnchor('SAVE'),
				getHintOffset(
				'SAVE',
				currentHintInputMode,
				currentHintInputMode === 'hand' ? resolveActionHandSide('SAVE') : null,
				),
				currentHintInputMode === 'hand',
			);
			placeHint(
				saveToastHint,
				resolveActionAnchor('SAVE'),
				getHintOffset(
					'SAVE',
					currentHintInputMode,
					currentHintInputMode === 'hand' ? resolveActionHandSide('SAVE') : null,
				),
				currentHintInputMode === 'hand',
			);
		placeHint(
			calibrateHint,
			resolveActionAnchor('CALIBRATE'),
			getHintOffset(
				'CALIBRATE',
				currentHintInputMode,
				currentHintInputMode === 'hand'
					? resolveActionHandSide('CALIBRATE')
					: null,
			),
			currentHintInputMode === 'hand',
		);
		placeHint(
			computerCanvasInstructionHint,
			instructionAnchor,
			COMPUTER_CANVAS_INSTRUCTION_OFFSET,
		);

			if (!computerCanvasPlacementConfirmed) {
				setHintVisible(selectHint, false);
				setHintVisible(selectHintLeft, false);
				setHintVisible(grabHint, false);
				setHintVisible(saveHint, false);
				setHintVisible(saveToastHint, false);
				setHintVisible(calibrateHint, true);
				updateHint(
					calibrateHint,
					['CALIBRATE', 'CONFIRM_COMPUTER_CANVAS'],
					currentHintInputMode,
					currentHintInputMode === 'hand'
						? resolveActionHandSide('CALIBRATE')
						: null,
				);
				setHintVisible(computerCanvasInstructionHint, !!instructionAnchor);
				return;
			}

		const activeMarker =
			dragging && dragging.type === 'marker' ? dragging.marker : hoveredMarker;
		const activeArea =
			dragging && dragging.type === 'area'
				? dragging.area
				: hoveredArea || (activeMarker ? activeMarker.area : null);
		const captureHoverTarget =
			(activeMarker && isAreaCaptureEligible(activeMarker.area)
				? activeMarker.area
				: null) ||
			(activeArea && isAreaCaptureEligible(activeArea) ? activeArea : null);
		let grabTargetType =
			dragging && dragging.type === 'area'
				? 'area'
				: dragging && dragging.type === 'marker'
				? 'marker'
				: hoveredMarker
				? 'marker'
				: hoveredArea
				? 'area'
				: null;
		// In hand mode, border proximity can indicate a movable area even when
		// beam hover does not classify it as hoveredArea yet.
		if (currentHintInputMode === 'hand' && !grabTargetType && captureHoverTarget)
			grabTargetType = 'area';
			const saveTargetArea =
				activeArea || (activeMarker ? activeMarker.area : null);
			const saveToastActive = model.time < saveToastUntil;

		if (currentHintInputMode === 'hand') {
			setHintVisible(selectHint, true);
			setHintVisible(selectHintLeft, true);
			const selectAction = captureHoverTarget
				? ['SELECT', 'CAPTURE']
				: grabTargetType
				? ['SELECT', 'POINT']
				: ['SELECT', 'POINT'];
			updateHint(selectHint, selectAction, currentHintInputMode, 'right');
			updateHint(selectHintLeft, selectAction, currentHintInputMode, 'left');
		} else {
			setHintVisible(selectHintLeft, false);
			setHintVisible(selectHint, true);
			updateHint(
				selectHint,
				captureHoverTarget
					? ['SELECT', 'CAPTURE']
					: grabTargetType
					? ['SELECT', 'POINT']
					: ['SELECT', 'POINT'],
				currentHintInputMode,
				null,
			);
		}

		setHintVisible(grabHint, !!grabTargetType);
		updateHint(
			grabHint,
			grabTargetType === 'area'
				? ['GRAB', 'SURFACE']
				: grabTargetType === 'marker'
				? ['GRAB', 'POINT']
				: null,
			currentHintInputMode,
			currentHintInputMode === 'hand'
				? resolveActionHandSide('GRAB')
				: null,
		);

			setHintVisible(saveHint, hasAreaTexture(saveTargetArea) && !saveToastActive);
			updateHint(
				saveHint,
				hasAreaTexture(saveTargetArea) ? ['SAVE', 'POINT'] : null,
				currentHintInputMode,
				currentHintInputMode === 'hand'
					? resolveActionHandSide('SAVE')
					: null,
			);
				setHintVisible(saveToastHint, saveToastActive);
				updateHint(
					saveToastHint,
					saveToastActive ? ['SAVE', 'SAVED'] : null,
					currentHintInputMode,
					currentHintInputMode === 'hand'
						? resolveActionHandSide('SAVE')
						: null,
				);
			const shouldShowCalibrateHint =
				!saveToastActive && !grabTargetType && !captureHoverTarget;
			setHintVisible(calibrateHint, shouldShowCalibrateHint);
			updateHint(
				calibrateHint,
				shouldShowCalibrateHint
					? ['CALIBRATE', 'CALIBRATE_COMPUTER_CANVAS']
					: null,
				currentHintInputMode,
				currentHintInputMode === 'hand'
					? resolveActionHandSide('CALIBRATE')
					: null,
			);
			setHintVisible(computerCanvasInstructionHint, false);
		}

	let hasLoggedHapticError = false;
	const safeVibrate = (hand, intensity, duration) => {
		try {
			// No haptics for invalid hand labels.
			if (hand !== 'left' && hand !== 'right') return;
			// No haptics when API isn't present.
			if (typeof vibrate !== 'function') return;
			// No haptics in explicit hand-tracking mode (no physical controller).
			if (typeof window !== 'undefined' && window.handtracking) return;

			const controllerPose = controllerMatrix && controllerMatrix[hand];
			const hasControllerPose =
				!!controllerPose &&
				typeof controllerPose.length === 'number' &&
				controllerPose.length >= 16 &&
				Number.isFinite(controllerPose[12]) &&
				Number.isFinite(controllerPose[13]) &&
				Number.isFinite(controllerPose[14]);
			if (!hasControllerPose) return;

			// Require at least some button state evidence for this controller.
			const controllerButtons = buttonState && buttonState[hand];
			const hasControllerButtons =
				!!controllerButtons &&
				typeof controllerButtons.length === 'number' &&
				controllerButtons.length > 0 &&
				controllerButtons.some((b) => b != null);
			if (!hasControllerButtons) return;

			vibrate(hand, intensity, duration);
		} catch (err) {
			// Never let haptics break the animate loop.
			if (!hasLoggedHapticError) {
				hasLoggedHapticError = true;
				console.warn('[lasso2] haptic skipped due to runtime error:', err);
			}
		}
	};

	const isButtonActive = (button, threshold = ACTION_BUTTON_THRESHOLD) =>
		!!button && (button.pressed || button.value >= threshold);

	const isAnyButtonPressed = (
		hand,
		buttons,
		threshold = ACTION_BUTTON_THRESHOLD,
	) =>
		buttons.some((button) => {
			const state = buttonState[hand] && buttonState[hand][button];
			return isButtonActive(state, threshold);
		});

	const getWristPosition = (hand) => {
		const mat = clientState.hand(clientID, hand);
		if (!mat || typeof mat.length !== 'number' || mat.length < 16) return null;
		return [Number(mat[12]) || 0, Number(mat[13]) || 0, Number(mat[14]) || 0];
	};

	const getFingerTip = (hand, index) => {
		const p = clientState.finger(clientID, hand, index);
		if (!p || p.length < 3) return null;
		if (
			!Number.isFinite(p[0]) ||
			!Number.isFinite(p[1]) ||
			!Number.isFinite(p[2])
		)
			return null;
		return [p[0], p[1], p[2]];
	};

	const getHeadPosition = () => {
		const head = clientState.head(clientID);
		if (!head || typeof head.length !== 'number') return null;
		if (head.length >= 16)
			return [
				Number(head[12]) || 0,
				Number(head[13]) || 0,
				Number(head[14]) || 0,
			];
		if (head.length >= 3)
			return [Number(head[0]) || 0, Number(head[1]) || 0, Number(head[2]) || 0];
		return null;
	};

	const isFiniteVec3 = (v) =>
		!!v &&
		v.length >= 3 &&
		Number.isFinite(v[0]) &&
		Number.isFinite(v[1]) &&
		Number.isFinite(v[2]);

	const isHandPointing = (hand) => {
		const wrist = getWristPosition(hand);
		const indexTip = getFingerTip(hand, 1);
		if (!wrist || !indexTip) return false;
		const indexDist = cg.distance(wrist, indexTip);
		if (indexDist < INDEX_EXTENDED_DISTANCE_METERS) return false;
		const nonIndex = [2, 3, 4]
			.map((i) => getFingerTip(hand, i))
			.filter(Boolean);
		if (nonIndex.length === 0) return true;
		return nonIndex.every(
			(tip) => cg.distance(wrist, tip) <= NON_INDEX_CURLED_DISTANCE_METERS,
		);
	};

	const detectLeftIndexFlick = (samples, nowSeconds, cooldownUntilRef) => {
		if (!samples || samples.length < 4) return false;
		if (nowSeconds < cooldownUntilRef.value) return false;
		const windowStart = nowSeconds - LEFT_INDEX_FLICK_WINDOW_SECONDS;
		const recent = samples.filter((s) => s.t >= windowStart);
		if (recent.length < 4) return false;

		const mins = [Infinity, Infinity, Infinity];
		const maxs = [-Infinity, -Infinity, -Infinity];
		for (const s of recent) {
			for (let i = 0; i < 3; i++) {
				if (s.p[i] < mins[i]) mins[i] = s.p[i];
				if (s.p[i] > maxs[i]) maxs[i] = s.p[i];
			}
		}
		const ranges = [maxs[0] - mins[0], maxs[1] - mins[1], maxs[2] - mins[2]];
		let axis = 0;
		if (ranges[1] > ranges[axis]) axis = 1;
		if (ranges[2] > ranges[axis]) axis = 2;
		const swing = ranges[axis];
		if (
			!Number.isFinite(swing) ||
			swing < LEFT_INDEX_FLICK_MIN_SWING_METERS ||
			swing > LEFT_INDEX_FLICK_MAX_SWING_METERS
		)
			return false;

		let prevSign = 0;
		let directionChanges = 0;
		let peakAxisSpeed = 0;
		let movementSegments = 0;
		for (let i = 1; i < recent.length; i++) {
			const prev = recent[i - 1];
			const curr = recent[i];
			const dt = curr.t - prev.t;
			if (!Number.isFinite(dt) || dt <= 1e-4) continue;
			const delta = curr.p[axis] - prev.p[axis];
			if (Math.abs(delta) < 0.0015) continue;
			const sign = delta > 0 ? 1 : -1;
			const speed = Math.abs(delta) / dt;
			movementSegments++;
			if (speed > peakAxisSpeed) peakAxisSpeed = speed;
			if (prevSign && sign !== prevSign) directionChanges++;
			prevSign = sign;
		}
		if (movementSegments < 3) return false;
		if (peakAxisSpeed < LEFT_INDEX_FLICK_MIN_AXIS_SPEED_MPS) return false;
		if (directionChanges < LEFT_INDEX_FLICK_MIN_DIRECTION_CHANGES) return false;

		cooldownUntilRef.value = nowSeconds + LEFT_INDEX_FLICK_COOLDOWN_SECONDS;
		return true;
	};

	const pinchGestureState = { left: false, right: false };
	const isHandPinching = (hand) => {
		const pinch = clientState.pinch(clientID, hand, 1);
		const thumbTip = getFingerTip(hand, 0);
		const indexTip = getFingerTip(hand, 1);
		const hasFingerData = !!(thumbTip && indexTip);
		let apiPinch = false;
		if (pinch === true) apiPinch = true;
		else if (typeof pinch === 'number') apiPinch = pinch > 0.2;
		else if (pinch && typeof pinch.value === 'number')
			apiPinch = pinch.value > 0.2;
		if (
			hasFingerData &&
			typeof clay !== 'undefined' &&
			clay.handsWidget &&
			clay.handsWidget.pinch
		) {
			const fallback = clay.handsWidget.pinch[hand];
			if (typeof fallback === 'number') apiPinch = apiPinch || fallback > 0.2;
			else apiPinch = apiPinch || !!fallback;
		}
		let distancePinch = false;
		if (hasFingerData) {
			const d = cg.distance(thumbTip, indexTip);
			const wasPinching = !!pinchGestureState[hand];
			const threshold = wasPinching
				? PINCH_DISTANCE_END_METERS
				: PINCH_DISTANCE_START_METERS;
			distancePinch = Number.isFinite(d) && d <= threshold;
		}
		if (!hasFingerData && !apiPinch) {
			pinchGestureState[hand] = false;
			return false;
		}
		const next = apiPinch || distancePinch;
		pinchGestureState[hand] = next;
		return next;
	};

	// In-world drop marker for transfer target (no embedded 2D preview).
	let computerCanvasMarkerRoot = null;
	let computerCanvasHitVolume = null;
	let computerCanvasPreviewRoot = null;
	let computerCanvasBorderEdges = [];
	let computerCanvasPlacementSquare = null;
	// Start confirmed on both desktop + headset; calibration can still be
	// explicitly re-entered via button/gesture.
	let computerCanvasPlacementConfirmed = true;
	let computerCanvasHalfWidth = COMPUTER_CANVAS_WIDTH * COMPUTER_CANVAS_SCALE;
	let computerCanvasHalfHeight = COMPUTER_CANVAS_HEIGHT * COMPUTER_CANVAS_SCALE;
	let computerCanvasCenter = COMPUTER_CANVAS_POS.slice();
	let computerCanvasAxisX = [1, 0, 0];
	let computerCanvasAxisY = [0, 1, 0];
	let computerCanvasAxisZ = [0, 0, 1];
	const computerCanvasPreviewItems = new Map();

	const safeNormalize = (v, fallback = [0, 0, 1]) => {
		if (!v || v.length < 3) return fallback.slice();
		const len = Math.hypot(v[0], v[1], v[2]);
		if (!Number.isFinite(len) || len < 1e-6) return fallback.slice();
		return [v[0] / len, v[1] / len, v[2] / len];
	};

	const hasPoseMatrix = (mat) =>
		!!mat && typeof mat.length === 'number' && mat.length >= 16;

	const getControllerWorldPosition = (hand) => {
		const mat = clientState.hand(clientID, hand) || controllerMatrix[hand];
		if (!mat || typeof mat.length !== 'number') return null;
		if (mat.length >= 16)
			return [Number(mat[12]) || 0, Number(mat[13]) || 0, Number(mat[14]) || 0];
		if (mat.length >= 3)
			return [Number(mat[0]) || 0, Number(mat[1]) || 0, Number(mat[2]) || 0];
		return null;
	};

	const getPlacementAxesFromController = () => {
		const controllerMat =
			clientState.hand(clientID, preferredHand) ||
			clientState.hand(clientID, 'right') ||
			controllerMatrix[preferredHand] ||
			controllerMatrix.right;
		if (
			!controllerMat ||
			typeof controllerMat.length !== 'number' ||
			controllerMat.length < 16
		) {
			return {
				x: computerCanvasAxisX.slice(),
				y: computerCanvasAxisY.slice(),
				z: computerCanvasAxisZ.slice(),
			};
		}
		let axisX = safeNormalize(
			[controllerMat[0], controllerMat[1], controllerMat[2]],
			computerCanvasAxisX,
		);
		let axisZ = safeNormalize(
			[-controllerMat[8], -controllerMat[9], -controllerMat[10]],
			computerCanvasAxisZ,
		);
		let axisY = safeNormalize(cg.cross(axisZ, axisX), computerCanvasAxisY);
		axisX = safeNormalize(cg.cross(axisY, axisZ), axisX);
		return { x: axisX, y: axisY, z: axisZ };
	};

	const applyComputerCanvasMarkerTransform = (
		center,
		halfWidth,
		halfHeight,
		axes = null,
	) => {
		if (!computerCanvasMarkerRoot) return;
		computerCanvasCenter = [
			Number(center[0]) || COMPUTER_CANVAS_POS[0],
			Number(center[1]) || COMPUTER_CANVAS_POS[1],
			Number(center[2]) || COMPUTER_CANVAS_POS[2],
		];
		computerCanvasHalfWidth = cg.clamp(
			Number(halfWidth) || COMPUTER_CANVAS_WIDTH * COMPUTER_CANVAS_SCALE,
			COMPUTER_CANVAS_MIN_HALF_WIDTH,
			COMPUTER_CANVAS_MAX_HALF_WIDTH,
		);
		computerCanvasHalfHeight = cg.clamp(
			Number(halfHeight) || COMPUTER_CANVAS_HEIGHT * COMPUTER_CANVAS_SCALE,
			COMPUTER_CANVAS_MIN_HALF_HEIGHT,
			COMPUTER_CANVAS_MAX_HALF_HEIGHT,
		);
		if (axes && axes.x && axes.y && axes.z) {
			computerCanvasAxisX = safeNormalize(axes.x, computerCanvasAxisX);
			computerCanvasAxisY = safeNormalize(axes.y, computerCanvasAxisY);
			computerCanvasAxisZ = safeNormalize(axes.z, computerCanvasAxisZ);
		}
		computerCanvasMarkerRoot.setMatrix([
			computerCanvasAxisX[0] * computerCanvasHalfWidth,
			computerCanvasAxisX[1] * computerCanvasHalfWidth,
			computerCanvasAxisX[2] * computerCanvasHalfWidth,
			0,
			computerCanvasAxisY[0] * computerCanvasHalfHeight,
			computerCanvasAxisY[1] * computerCanvasHalfHeight,
			computerCanvasAxisY[2] * computerCanvasHalfHeight,
			0,
			computerCanvasAxisZ[0] * COMPUTER_CANVAS_HALF_DEPTH,
			computerCanvasAxisZ[1] * COMPUTER_CANVAS_HALF_DEPTH,
			computerCanvasAxisZ[2] * COMPUTER_CANVAS_HALF_DEPTH,
			0,
			computerCanvasCenter[0],
			computerCanvasCenter[1],
			computerCanvasCenter[2],
			1,
		]);
	};

	const updateComputerCanvasPlacementSquare = (visible = true) => {
		if (!computerCanvasPlacementSquare) return;
		const isCalibrationMode = !computerCanvasPlacementConfirmed;
		const borderColor = !computerCanvasPlacementConfirmed
			? CANVAS_BORDER_COLOR_CALIBRATION
			: CANVAS_BORDER_COLOR_DEFAULT;
		for (const edge of computerCanvasBorderEdges)
			edge.color(borderColor[0], borderColor[1], borderColor[2]);
		if (computerCanvasHitVolume) {
			const volumeColor = isCalibrationMode
				? CANVAS_VOLUME_COLOR_CALIBRATION
				: CANVAS_VOLUME_COLOR_DEFAULT;
			computerCanvasHitVolume.color(
				volumeColor[0],
				volumeColor[1],
				volumeColor[2],
			);
		}
		const instructionSizeWorld =
			Math.max(HINT_PANEL_WIDTH, HINT_PANEL_HEIGHT) * HINT_PANEL_SCALE;
		const sx = cg.clamp(
			instructionSizeWorld / Math.max(0.0001, computerCanvasHalfWidth),
			0.03,
			0.95,
		);
		const sy = cg.clamp(
			instructionSizeWorld / Math.max(0.0001, computerCanvasHalfHeight),
			0.03,
			0.95,
		);
		computerCanvasPlacementSquare
			.identity()
			.move(0, 0, 1.003)
			.scale(sx, sy, 1)
			.color(
				isCalibrationMode
					? CANVAS_BORDER_COLOR_CALIBRATION[0]
					: CANVAS_BORDER_COLOR_DEFAULT[0],
				isCalibrationMode
					? CANVAS_BORDER_COLOR_CALIBRATION[1]
					: CANVAS_BORDER_COLOR_DEFAULT[1],
				isCalibrationMode
					? CANVAS_BORDER_COLOR_CALIBRATION[2]
					: CANVAS_BORDER_COLOR_DEFAULT[2],
			)
			.opacity(visible ? 0.55 : 0)
			.dull();
	};

	const isComputerCanvasConfirmPressed = () => {
		const indices = [COMPUTER_CANVAS_CONFIRM_BUTTON, 4];
		for (const idx of indices) {
			const state = clientState.button(clientID, 'right', idx);
			const fromClientState =
				!!state &&
				(state === true ||
					state.pressed ||
					(typeof state.value === 'number' &&
						state.value >= ACTION_BUTTON_THRESHOLD));
			if (fromClientState) return true;
		}
		return isAnyButtonPressed('right', indices, 0.55);
	};

	const isSaveButtonPressed = () => {
		const indices = [SAVE_BUTTON];
		for (const hand of [preferredHand, 'right', 'left']) {
			for (const idx of indices) {
				const state = clientState.button(clientID, hand, idx);
				const fromClientState =
					!!state &&
					(state === true ||
						state.pressed ||
						(typeof state.value === 'number' &&
							state.value >= ACTION_BUTTON_THRESHOLD));
				if (fromClientState) return true;
			}
			if (isAnyButtonPressed(hand, indices, 0.55)) return true;
		}
		return false;
	};
	const isLeftYPressed = () => {
		const idx = COMPUTER_CANVAS_CONFIRM_BUTTON;
		const state = clientState.button(clientID, 'left', idx);
		const fromClientState =
			!!state &&
			(state === true ||
				state.pressed ||
				(typeof state.value === 'number' &&
					state.value >= ACTION_BUTTON_THRESHOLD));
		if (fromClientState) return true;
		return isAnyButtonPressed('left', [idx], 0.55);
	};

	const updateComputerCanvasPlacementCalibration = () => {
		if (computerCanvasPlacementConfirmed) {
			updateComputerCanvasPlacementSquare(false);
			return;
		}
		// Rescale calibration only while both hands are pinching.
		const leftPinch = isHandPinching('left');
		const rightPinch = isHandPinching('right');
		if (!leftPinch || !rightPinch) {
			updateComputerCanvasPlacementSquare(true);
			return;
		}
		const topLeft = getControllerWorldPosition('left');
		const bottomRight = getControllerWorldPosition('right');
		if (!topLeft || !bottomRight) {
			updateComputerCanvasPlacementSquare(true);
			return;
		}
		const axes = getPlacementAxesFromController();
		const topU = cg.dot(topLeft, axes.x);
		const topV = cg.dot(topLeft, axes.y);
		const topW = cg.dot(topLeft, axes.z);
		const bottomU = cg.dot(bottomRight, axes.x);
		const bottomV = cg.dot(bottomRight, axes.y);
		const bottomW = cg.dot(bottomRight, axes.z);
		const centerU = (topU + bottomU) * 0.5;
		const centerV = (topV + bottomV) * 0.5;
		const centerW = (topW + bottomW) * 0.5;
		const center = [
			axes.x[0] * centerU + axes.y[0] * centerV + axes.z[0] * centerW,
			axes.x[1] * centerU + axes.y[1] * centerV + axes.z[1] * centerW,
			axes.x[2] * centerU + axes.y[2] * centerV + axes.z[2] * centerW,
		];
		const halfWidth = Math.abs(bottomU - topU) * 0.5;
		const halfHeight = Math.abs(topV - bottomV) * 0.5;
		applyComputerCanvasMarkerTransform(center, halfWidth, halfHeight, axes);
		updateComputerCanvasPlacementSquare(true);
	};

	function createComputerCanvasMarker() {
		const root = model.add();
		const volume = root
			.add('cube')
			.color(
				CANVAS_VOLUME_COLOR_DEFAULT[0],
				CANVAS_VOLUME_COLOR_DEFAULT[1],
				CANVAS_VOLUME_COLOR_DEFAULT[2],
			)
			.opacity(0.2)
			.dull();
		const edgeT = 0.012;
		const edgeR = CANVAS_BORDER_COLOR_DEFAULT[0];
		const edgeG = CANVAS_BORDER_COLOR_DEFAULT[1];
		const edgeB = CANVAS_BORDER_COLOR_DEFAULT[2];
		const edges = [];
		const addEdge = (x, y, z, sx, sy, sz) =>
			edges.push(
				root
					.add('cube')
					.move(x, y, z)
					.scale(sx, sy, sz)
					.color(edgeR, edgeG, edgeB)
					.opacity(0.95)
					.dull(),
			);
		for (const y of [-1, 1])
			for (const z of [-1, 1]) addEdge(0, y, z, 1, edgeT, edgeT);
		for (const x of [-1, 1])
			for (const z of [-1, 1]) addEdge(x, 0, z, edgeT, 1, edgeT);
		for (const x of [-1, 1])
			for (const y of [-1, 1]) addEdge(x, y, 0, edgeT, edgeT, 1);
		const placementSquare = root
			.add('square')
			.color(0.2, 0.95, 1.6)
			.opacity(0.55)
			.dull();
		placementSquare.computerCanvasPlacementName = COMPUTER_CANVAS_PLACEMENT_NAME;
		return { root, volume, placementSquare, edges };
	}
	{
		const marker = createComputerCanvasMarker();
		computerCanvasMarkerRoot = marker.root;
		computerCanvasHitVolume = marker.volume;
		computerCanvasBorderEdges = marker.edges || [];
		computerCanvasPlacementSquare = marker.placementSquare;
		computerCanvasPreviewRoot = computerCanvasMarkerRoot.add();
		applyComputerCanvasMarkerTransform(
			COMPUTER_CANVAS_POS,
			COMPUTER_CANVAS_WIDTH * COMPUTER_CANVAS_SCALE,
			COMPUTER_CANVAS_HEIGHT * COMPUTER_CANVAS_SCALE,
		);
		updateComputerCanvasPlacementSquare(!computerCanvasPlacementConfirmed);
	}

	function getOrCreateComputerCanvasPreviewItem(itemId) {
		let preview = computerCanvasPreviewItems.get(itemId);
		if (preview) return preview;
		const root = computerCanvasPreviewRoot.add();
		const front = root.add('square').color(1, 1, 1).opacity(0).dull();
		const back = root
			.add('square')
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
					.sort(
						(a, b) => (Number(a && a.layer) || 0) - (Number(b && b.layer) || 0),
					)
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
			[0, 0, 0],
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
				Math.abs(local[0]) < 1 &&
				Math.abs(local[1]) < 1 &&
				Math.abs(local[2]) < 1,
			x: (local[0] * 0.5 + 0.5) * PARTNER_CANVAS_WIDTH,
			y: (0.5 - local[1] * 0.5) * PARTNER_CANVAS_HEIGHT,
		};
	}

	function syncAreaPositionFromPartnerBoard(area, boardItem) {
		if (!area || !boardItem || !computerCanvasHitVolume) return false;
		if (!area.partnerPlaced || !hasAreaTexture(area)) return false;

		const isDraggedArea =
			!!dragging && dragging.type === 'area' && dragging.area === area;
		const isDraggedMarker =
			!!dragging &&
			dragging.type === 'marker' &&
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
			Math.abs(itemY - projected.y),
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
		const deltaLenSq =
			delta[0] * delta[0] + delta[1] * delta[1] + delta[2] * delta[2];
		if (deltaLenSq <= 1e-10) return false;

		moveAreaBy(area, delta);
		lastPartnerAreaSyncByArea.set(area.id, { t: now, x: itemX, y: itemY });
		return true;
	}

	function syncPartnerBoardPositionFromArea(area, projected, force = false) {
		if (!area || !projected) return false;
		const board = sharedCaptureState.partnerBoard || {
			items: [],
			updatedAt: 0,
		};
		const items = Array.isArray(board.items)
			? board.items.map((item) => ({ ...item }))
			: [];
		const index = items.findIndex(
			(item) =>
				item && item.areaId === area.id && item.sourceClientID === clientID,
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
			Number(item.h) || 120,
		);
		const movedEnough =
			Math.abs(next.x - currentX) >= PARTNER_POSITION_SYNC_MIN_DELTA_PX ||
			Math.abs(next.y - currentY) >= PARTNER_POSITION_SYNC_MIN_DELTA_PX;
		const last = lastPartnerBoardPosSyncByArea.get(area.id);
		const intervalOk = !last || now - last.t >= PARTNER_POSITION_SYNC_MIN_MS;
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
		lastPartnerBoardPosSyncByArea.set(area.id, {
			t: now,
			x: next.x,
			y: next.y,
		});
		return true;
	}

	function setPartnerPlacementArea(area, projected = null) {
		if (!area || !hasAreaTexture(area)) return;
		const areaProjected = projected || getAreaCenterInComputerCanvas(area);
		if (!areaProjected || !areaProjected.inside) return;
		const wasPlaced = !!area.partnerPlaced;
		area.partnerPlaced = true;
		area.projectedToComputerCanvas = true;
		if (!wasPlaced) instructionTaskState.droppedToCanvas = true;
		if (!wasPlaced)
			upsertPartnerBoardItem(area, {
				preferredPosition: { x: areaProjected.x, y: areaProjected.y },
			});
	}

	function updateAreaComputerCanvasProjection(area) {
		const isDraggedArea =
			!!dragging && dragging.type === 'area' && dragging.area === area;
		const isDraggedMarker =
			!!dragging &&
			dragging.type === 'marker' &&
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
			.add('cube')
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
			.add('square')
			.color(1, 1, 1)
			.opacity(SURFACE_OPACITY)
			.dull();
		const back = root
			.add('square')
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
			pts.map((p) => p.pos),
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
		instructionTaskState.quadCreated = true;
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
			area.pts.map((marker) => marker.pos),
		);
	}

	function lockPoint(pos, sourceHand = preferredHand) {
		if (currentMarkers.length >= 4) return;
		if (!isFiniteVec3(pos)) return;
		const headPos = getHeadPosition();
		if (headPos && cg.distance(pos, headPos) > 6.0) {
			console.warn('[lasso2] rejecting outlier point placement', {
				pos,
				headPos,
			});
			return;
		}
		console.log(`[lasso2] lockPoint #${currentMarkers.length + 1}`, pos);

		const visual = createMarkerVisual();
		const marker = {
			pos: pos.slice(),
			node: visual.root,
			ring: visual.ring,
			hole: visual.hole,
			complete: false,
			captureActive: false,
			area: null,
		};
		setMarkerPose(marker, marker.pos);
		setMarkerColor(marker);

		allMarkers.push(marker);
		currentMarkers.push(marker);

		// Feedback should never interrupt marker initialization; if it fails,
		// keep the marker valid instead of leaving a default-sized sphere behind.
		try {
			safeVibrate(sourceHand, 1, 80);
			const pointIndexInQuad = Math.max(
				1,
				Math.min(4, currentMarkers.length),
			);
			const playbackRate =
				POINT_PITCH_BY_INDEX[pointIndexInQuad - 1] || POINT_PITCH_BY_INDEX[0];
			playUISound('point', { playbackRate });
		} catch (err) {
			console.warn('[lasso2] point feedback failed:', err);
		}

		if (currentMarkers.length === 4) {
			for (const currentMarker of currentMarkers) {
				currentMarker.complete = true;
				setMarkerColor(currentMarker);
			}
			safeVibrate(preferredHand, 1, 200);
			finalizeArea();
		}
	}

	function pointToSegmentDistance(point, a, b) {
		const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
		const ap = [point[0] - a[0], point[1] - a[1], point[2] - a[2]];
		const abLenSq = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
		if (abLenSq < 1e-8) return cg.distance(point, a);
		const t = cg.clamp(
			(ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / abLenSq,
			0,
			1,
		);
		const q = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
		return cg.distance(point, q);
	}

	function isIndexNearAreaBorder(area, indexPos, threshold = 0.045) {
		if (!area || !indexPos || !area.pts || area.pts.length !== 4) return false;
		const p = area.pts.map((m) => m.pos);
		for (let i = 0; i < 4; i++) {
			const d = pointToSegmentDistance(indexPos, p[i], p[(i + 1) % 4]);
			if (d <= threshold) return true;
		}
		return false;
	}

	function isIndexInsideAreaSurface(
		area,
		indexPos,
		planeThreshold = HAND_AREA_HOVER_PLANE_THRESHOLD_METERS,
	) {
		if (!area || !indexPos || !area.pts || area.pts.length !== 4) return false;
		const p = area.pts.map((m) => m.pos);
		const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
		const cross = (a, b) => [
			a[1] * b[2] - a[2] * b[1],
			a[2] * b[0] - a[0] * b[2],
			a[0] * b[1] - a[1] * b[0],
		];
		const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
		const len = (v) => Math.hypot(v[0], v[1], v[2]);
		const nRaw = cross(sub(p[1], p[0]), sub(p[3], p[0]));
		const nLen = len(nRaw);
		if (!Number.isFinite(nLen) || nLen < 1e-6) return false;
		const n = [nRaw[0] / nLen, nRaw[1] / nLen, nRaw[2] / nLen];
		const d = dot(sub(indexPos, p[0]), n);
		if (Math.abs(d) > planeThreshold) return false;
		const q = [
			indexPos[0] - n[0] * d,
			indexPos[1] - n[1] * d,
			indexPos[2] - n[2] * d,
		];
		const sameSide = (a, b, c, point) => {
			const edge = sub(b, a);
			const vp = sub(point, a);
			return dot(cross(edge, vp), n) >= -1e-5;
		};
		const inTri = (a, b, c, point) =>
			sameSide(a, b, c, point) &&
			sameSide(b, c, a, point) &&
			sameSide(c, a, b, point);
		return inTri(p[0], p[1], p[2], q) || inTri(p[0], p[2], p[3], q);
	}

	function findCaptureAreaNearTip(
		tip,
		threshold = CAPTURE_BORDER_THRESHOLD_METERS,
	) {
		if (!tip) return null;
		for (const area of completedAreas) {
			if (!isAreaCaptureEligible(area)) continue;
			if (isIndexNearAreaBorder(area, tip, threshold)) return area;
		}
		return null;
	}

	function getHandBeamMatrix(hand = 'right', fallbackMat = null) {
		const wrist = getWristPosition(hand);
		const indexTip = getFingerTip(hand, 1);
		const trackedHandMat = clientState.hand(clientID, hand);
		const handMat =
			trackedHandMat &&
			typeof trackedHandMat.length === 'number' &&
			trackedHandMat.length >= 16
				? trackedHandMat
				: fallbackMat &&
				  typeof fallbackMat.length === 'number' &&
				  fallbackMat.length >= 16
				? fallbackMat
				: null;
		if (!wrist || !indexTip) return handMat;

		const dir = [
			indexTip[0] - wrist[0],
			indexTip[1] - wrist[1],
			indexTip[2] - wrist[2],
		];
		const len = Math.hypot(dir[0], dir[1], dir[2]);
		if (!Number.isFinite(len) || len < 1e-5) return handMat;
		dir[0] /= len;
		dir[1] /= len;
		dir[2] /= len;

		const xHint =
			handMat &&
			Number.isFinite(handMat[0]) &&
			Number.isFinite(handMat[1]) &&
			Number.isFinite(handMat[2])
				? [handMat[0], handMat[1], handMat[2]]
				: undefined;
		// ControllerBeam hit tests shoot along local -Z, so aim local +Z opposite
		// our pointing direction to make the effective ray go forward from finger.
		const m = cg.mAimZ([-dir[0], -dir[1], -dir[2]], xHint);
		m[12] = indexTip[0] + dir[0] * HAND_BEAM_FORWARD_OFFSET_METERS;
		m[13] = indexTip[1] + dir[1] * HAND_BEAM_FORWARD_OFFSET_METERS;
		m[14] = indexTip[2] + dir[2] * HAND_BEAM_FORWARD_OFFSET_METERS;
		return m;
	}

	// ─── Animate loop ─────────────────────────────────────────────────────────

let prevSelectPressed = false;
	let prevGrabPressed = false;
	let prevInstructionSelectPressed = false;
	let prevInstructionHoverInHandMode = false;
	let instructionHoverAdvanceCooldownUntil = 0;
	let prevSavePressed = false;
	let prevCanvasConfirmPressed = false;
	let inputPrimed = false;
	let calibrationGestureCooldownUntil = 0;
	let handCalibrationGestureActive = false;
	let handPointHold = { hand: null, anchor: null, start: 0 };
	let handCaptureHold = { hand: null, areaId: null, anchor: null, start: 0 };
	let handAreaDrag = { hand: null, areaId: null, lastTip: null };
	let lastPinchActiveTime = { left: -1, right: -1 };
	let leftIndexFlickSamples = [];
	let leftIndexFlickCooldownUntil = { value: 0 };
	let calibrationGestureArmed = false;
	let lastCaptureDiagLogTime = -1;
	let lastAnyHandSignalTime = -1;
	let lastRightHintAnchor = null;
	let lastLeftHintAnchor = null;
	let lastInputMode = null;
	let lastControllerRingMode = null;
	let lastHandRingMode = { left: null, right: null };

	const logModeChange = (scope, prevMode, nextMode) => {
		if (prevMode === nextMode) return;
		console.log(
			`[lasso2][mode] ${scope}: ${prevMode || 'init'} -> ${nextMode}`,
		);
	};
	const setInputMode = (mode) => {
		logModeChange('input', lastInputMode, mode);
		if (lastInputMode !== mode) {
			if (mode === 'hand' || mode === 'controller')
				console.log(`[lasso2][input-mode] ${mode}`);
			else console.log(`[lasso2][input-mode] ${mode || 'none'}`);
		}
		lastInputMode = mode;
	};
	const setControllerRingMode = (mode) => {
		logModeChange('controller-ring', lastControllerRingMode, mode);
		lastControllerRingMode = mode;
	};
	const setHandRingMode = (hand, mode) => {
		if (hand !== 'left' && hand !== 'right') return;
		logModeChange(`${hand}-ring`, lastHandRingMode[hand], mode);
		lastHandRingMode[hand] = mode;
	};

	model.animate(() => {
		try {
			sharedCaptureState = commitSharedCaptureState(
				server.synchronize(LASSO2_SHARED_KEY),
			);
			const preferredHandMat = clientState.hand(clientID, preferredHand);
			const leftHandMat = clientState.hand(clientID, 'left');
			const rightHandMat = clientState.hand(clientID, 'right');
			const currentRightHandAnchor =
				preferredHandMat || rightHandMat || leftHandMat || null;
			const currentLeftHandAnchor = leftHandMat || null;
			if (currentRightHandAnchor) lastRightHintAnchor = currentRightHandAnchor;
			if (currentLeftHandAnchor) lastLeftHintAnchor = currentLeftHandAnchor;
			const controllerMat = controllerMatrix[preferredHand];
			const hasControllerPose =
				!!controllerMat &&
				typeof controllerMat.length === 'number' &&
				controllerMat.length >= 16;
			const hasTrackedHandPose = [
				preferredHandMat,
				rightHandMat,
				leftHandMat,
			].some(
				(mat) => !!mat && typeof mat.length === 'number' && mat.length >= 16,
			);
			const hasControllerButtonState = ['left', 'right'].some((hand) =>
				[0, 1, 2, 3, 4, 5, 6].some(
					(idx) => clientState.button(clientID, hand, idx) != null,
				),
			);
			const leftPinchState = isHandPinching('left');
			const rightPinchState = isHandPinching('right');
			if (leftPinchState) lastPinchActiveTime.left = model.time;
			if (rightPinchState) lastPinchActiveTime.right = model.time;
			const pinchStable = (hand) =>
				hand === 'left' || hand === 'right'
					? model.time - (lastPinchActiveTime[hand] || -1) <=
					  PINCH_HOLD_GRACE_SECONDS
					: false;
			const handTrackingPreferred =
				typeof window !== 'undefined' && !!window.handtracking;
			const hasControllerInput = hasControllerPose || hasControllerButtonState;
			const hasHandIntent =
				leftPinchState ||
				rightPinchState ||
				pinchStable('left') ||
				pinchStable('right');
			const hasAnyHandSignal = hasTrackedHandPose || hasHandIntent;
			if (hasAnyHandSignal) lastAnyHandSignalTime = model.time;
			const handSignalStable =
				lastAnyHandSignalTime >= 0 &&
				model.time - lastAnyHandSignalTime <= HAND_SIGNAL_STICKY_SECONDS;
			// In emulator/runtime, hand + controller data can coexist for a few frames.
			// Honor the explicit handtracking toggle first so mode doesn't look swapped.
			const handFallbackActive = handTrackingPreferred
				? handSignalStable
				: !hasControllerInput && handSignalStable;
			const fallbackHandMat = currentRightHandAnchor || lastRightHintAnchor;
			const handBeamMat = handFallbackActive
				? getHandBeamMatrix(preferredHand, fallbackHandMat)
				: undefined;
			beam.update(handBeamMat);
			if (handFallbackActive && beam && beam.beam && beam.beam.child(0))
				beam.beam.child(0).identity().scale(0, 0, 0);
			const inputMode = handFallbackActive
				? 'hand'
				: hasControllerInput
				? 'controller'
				: 'none';
			if (lastInputMode !== inputMode) {
				console.log('[lasso2][input-mode-signals]', {
					next: inputMode,
					hasControllerPose,
					hasControllerButtonState,
					hasTrackedHandPose,
					leftPinchState,
					rightPinchState,
					hasHandIntent,
					handTrackingPreferred,
					handFallbackActive,
				});
				}
				setInputMode(inputMode);
				const instructionMode =
					inputMode === 'hand'
						? 'hand'
						: inputMode === 'controller'
						? 'controller'
						: previousInstructionMode || 'controller';
				const leftYPressed = isLeftYPressed();
				const leftYJustPressed = leftYPressed && !prevLeftYPressed;
				prevLeftYPressed = leftYPressed;
				if (leftYJustPressed) {
					if (instructionVisible) {
						instructionVisible = false;
					} else {
						instructionVisible = true;
						instructionPageIndex = 0;
						resetInstructionTaskState();
					}
				}
				instructionTaskState.quadCreated =
					instructionTaskState.quadCreated || completedAreas.length > 0;
				instructionTaskState.capturePressed =
					instructionTaskState.capturePressed || !!pendingCaptureArea;
				instructionTaskState.droppedToCanvas =
					instructionTaskState.droppedToCanvas ||
					completedAreas.some((area) => !!area && !!area.partnerPlaced);
				captureSafeModeActive =
					CAPTURE_SAFE_MODE_HIDE_TUTORIAL &&
					(!!pendingCaptureArea || !!activeCaptureRequest);
				maybeAdvanceInstructionByTask();
				updateInstructionOverlay(instructionMode, captureSafeModeActive);

				if (
					sharedCaptureState.request &&
				sharedCaptureState.request.id !== lastStartedCaptureRequestId &&
				(!sharedCaptureState.response ||
					sharedCaptureState.response.id !== sharedCaptureState.request.id) &&
				shouldProcessCaptureOnThisClient()
			) {
				console.log(
					'[lasso2] desktop client received shared capture request',
					sharedCaptureState.request,
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
					console.log('[lasso2] processing capture response', {
						id: response.id,
						status: response.status,
						requesterClientID: response.requesterClientID,
						sourceClientID: response.sourceClientID,
						responseAreaId: response.areaId,
						localClientID: clientID,
						resolvedLocalAreaId: area ? area.id : null,
					});
					if (
						response.status === 'success' &&
						response.id === lastAppliedCaptureResponseId
					) {
						// Already handled the successful response for this request id.
					} else if (response.status === 'success') {
						if (applyTextureResponse(response, area))
							lastAppliedCaptureResponseId = response.id;
					} else if (
						response.status === 'timeout' ||
						response.status === 'error'
					) {
						setCaptureDebug({
							status:
								response.status === 'timeout'
									? 'capture-timeout'
									: 'capture-error',
							lastError:
								response.error ||
								(response.status === 'timeout'
									? 'Remote capture timed out.'
									: 'Remote capture failed.'),
						});
						clearSharedCaptureResponse(response.id);
					}
				}
			}

			const bm = beam.beamMatrix();
			if (!bm || !bm.length) {
				hideCursor();
				hideIndexHoldUI();
				setControllerRingMode('hidden');
				setHandRingMode('left', 'hidden');
				setHandRingMode('right', 'hidden');
				return;
			}
			const V = bm.slice(12, 15);
			const W = bm.slice(8, 11);
			const indexTip = getFingerTip(preferredHand, 1);
			const pos =
				handFallbackActive && indexTip
					? indexTip
					: [
							V[0] - W[0] * BEAM_DEPTH,
							V[1] - W[1] * BEAM_DEPTH,
							V[2] - W[2] * BEAM_DEPTH,
					  ];

			if (hasControllerPose && !handFallbackActive) showCursorAt(pos);
			else hideCursor();

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
						(P[0] - cx) ** 2 + (P[1] - cy) ** 2 + (P[2] - cz) ** 2,
					),
				};
			};

			const shouldRevealCapturedHandles = (area) => {
				if (!area) return false;
				if (!hasAreaTexture(area)) return true;
				if (area.capturePending) return true;
				if (
					dragging &&
					((dragging.type === 'area' && dragging.area === area) ||
						(dragging.type === 'marker' &&
							dragging.marker &&
							dragging.marker.area === area))
				)
					return true;
				if (hoveredArea === area) return true;
				if (hoveredMarker && hoveredMarker.area === area) return true;
				const hit = beam.hitRect(area.surf.root.getGlobalMatrix());
				if (hit) {
					const depth = hit[2] == null ? Infinity : hit[2];
					if (
						depth >= 0 &&
						depth <= MAX_HOVER_DEPTH + CAPTURED_HANDLE_REVEAL_DEPTH_PAD
					)
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
				const handNearBorder =
					handFallbackActive &&
					indexTip &&
					isIndexNearAreaBorder(
						area,
						indexTip,
						HAND_AREA_HOVER_BORDER_THRESHOLD_METERS,
					);
				const nextVisible = shouldRevealCapturedHandles(area) || handNearBorder;
				if (area.showHandles !== nextVisible) {
					area.showHandles = nextVisible;
					for (const marker of area.pts) setMarkerColor(marker);
				}
			}

			// Keep marker transforms clamped to the intended point size.
			for (const marker of allMarkers) {
				if (!marker || !marker.node) continue;
				if (!isFiniteVec3(marker.pos)) {
					setMarkerVisual(marker, null, 0);
					continue;
				}
				setMarkerPose(marker, marker.pos);
			}

			// Safety net: if we ever end up with 4 pending markers without
			// finalizing, force finalize so the border closes.
			if (currentMarkers.length === 4) {
				console.warn('[lasso2] forcing finalizeArea for 4 pending markers');
				for (const marker of currentMarkers) {
					marker.complete = true;
					setMarkerColor(marker);
				}
				try {
					finalizeArea();
				} catch (err) {
					console.error('[lasso2] finalizeArea failed:', err);
				}
			}

			// ─── Rebuild all edges every frame (remove by index, beam.js pattern) ─
			while (edgesRoot.nChildren() > 0) edgesRoot.remove(0);

			for (const area of completedAreas) {
				if (!shouldExposeCapturedHandles(area)) continue;
				const p = area.pts.map((m) => m.pos);
				const indexOnBorder =
					handFallbackActive &&
					indexTip &&
					isAreaCaptureEligible(area) &&
					isIndexNearAreaBorder(area, indexTip);
				const edgeColor =
					area.capturePending || indexOnBorder ? [1, 0, 1] : [0, 1, 0];
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
						edgeThickness,
					);
			}
			for (let i = 1; i < currentMarkers.length; i++)
				drawEdge(currentMarkers[i - 1].pos, currentMarkers[i].pos, 1, 1, 0);

			if (!dragging) {
				let newHovered = null,
					minDist = handFallbackActive
						? HAND_MARKER_HOVER_RADIUS_METERS
						: HOVER_RADIUS;
				for (const m of allMarkers) {
					if (!isMarkerInteractable(m)) continue;
					if (handFallbackActive && indexTip) {
						const d = cg.distance(m.pos, indexTip);
						if (d < minDist) {
							minDist = d;
							newHovered = m;
						}
					} else {
						const metrics = beamMetrics(m.pos);
						if (!metrics) continue;
						if (metrics.t > MAX_HOVER_DEPTH) continue;
						if (metrics.dist < minDist) {
							minDist = metrics.dist;
							newHovered = m;
						}
					}
				}
				if (newHovered !== hoveredMarker) {
					if (hoveredMarker) setMarkerColor(hoveredMarker);
					if (newHovered) {
						setMarkerColor(
							newHovered,
							newHovered.captureActive ? 'idle' : 'hover',
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
					if (handFallbackActive && indexTip) {
						for (const area of completedAreas) {
							if (
								!isIndexNearAreaBorder(
									area,
									indexTip,
									HAND_AREA_HOVER_BORDER_THRESHOLD_METERS,
								)
							)
								continue;
							newHoveredArea = area;
							break;
						}
						if (!newHoveredArea) {
							for (const area of completedAreas) {
								if (
									!isIndexInsideAreaSurface(
										area,
										indexTip,
										HAND_AREA_HOVER_PLANE_THRESHOLD_METERS,
									)
								)
									continue;
								newHoveredArea = area;
								break;
							}
						}
					}
					hoveredArea = newHoveredArea;
				}

			const partnerBoardItemsByAreaId = new Map();
			const partnerBoardItems = Array.isArray(
				sharedCaptureState.partnerBoard &&
					sharedCaptureState.partnerBoard.items,
			)
				? sharedCaptureState.partnerBoard.items
				: [];
			for (const item of partnerBoardItems) {
				if (
					!item ||
					!item.areaId ||
					!Number.isFinite(Number(item.x)) ||
					!Number.isFinite(Number(item.y))
				)
					continue;
				partnerBoardItemsByAreaId.set(item.areaId, item);
			}

			for (const area of completedAreas) {
				syncAreaPositionFromPartnerBoard(
					area,
					partnerBoardItemsByAreaId.get(area.id) || null,
				);
				updateAreaComputerCanvasProjection(area);
				refreshAreaOpacity(area);
			}
			renderComputerCanvasBoard(sharedCaptureState.partnerBoard);
			if (!isHeadsetClient) drawPartnerCanvas(sharedCaptureState.partnerBoard);
			const rightHintAnchor = handFallbackActive
				? currentRightHandAnchor || lastRightHintAnchor
				: controllerMatrix[preferredHand] || controllerMatrix.right;
			const leftHintAnchor = handFallbackActive
				? currentLeftHandAnchor || lastLeftHintAnchor
				: controllerMatrix.left;
			const hintInputMode = handFallbackActive ? 'hand' : 'controller';
			updateControllerHints(
				rightHintAnchor,
				leftHintAnchor,
				hintInputMode,
				captureSafeModeActive,
			);
			updateComputerCanvasPlacementCalibration();

			if (!dragging && hoveredMarker && model.time % 0.18 < 0.05)
				safeVibrate(preferredHand, 0.35, 25);

			// ─── Input mapping: select creates/arms capture, grip drags ──────────
			const controllerSelectPressed = isAnyButtonPressed(
				preferredHand,
				[0],
				0.55,
			);
			const savePressed = isSaveButtonPressed();
			const controllerGrabPressed =
				isAnyButtonPressed(preferredHand, SQUEEZE_BUTTONS, 0.55) &&
				!savePressed;
			const leftPinchPressed = pinchStable('left');
			const rightPinchPressed = pinchStable('right');
			const selectActive = handFallbackActive
				? leftPinchPressed
				: controllerSelectPressed;
			const grabPressed = handFallbackActive
				? rightPinchPressed
				: controllerGrabPressed;
			let justSelected = inputPrimed && selectActive && !prevSelectPressed;
			prevSelectPressed = selectActive;
			const instructionSelectActive = handFallbackActive
				? leftPinchPressed || rightPinchPressed
				: controllerSelectPressed;
			const instructionJustSelected =
				inputPrimed &&
				instructionSelectActive &&
				!prevInstructionSelectPressed;
			prevInstructionSelectPressed = instructionSelectActive;
			const justSaved = inputPrimed && savePressed && !prevSavePressed;
			prevSavePressed = savePressed;
			const justGrabbed = inputPrimed && grabPressed && !prevGrabPressed;
			prevGrabPressed = grabPressed;
			const canvasConfirmPressed = isComputerCanvasConfirmPressed();
			const justCanvasConfirm =
				inputPrimed && canvasConfirmPressed && !prevCanvasConfirmPressed;
			prevCanvasConfirmPressed = canvasConfirmPressed;
			inputPrimed = true;
			instructionButtonHovered = isInstructionButtonHovered(
				handFallbackActive ? 'hand' : 'controller',
			);
			const handHoverJustEntered =
				handFallbackActive &&
				instructionButtonHovered &&
				!prevInstructionHoverInHandMode;
			const handHoverCanAdvance =
				handHoverJustEntered &&
				model.time >= instructionHoverAdvanceCooldownUntil;
			prevInstructionHoverInHandMode = handFallbackActive
				? instructionButtonHovered
				: false;
			const instructionShouldAdvance = handFallbackActive
				? handHoverCanAdvance
				: instructionButtonHovered && instructionJustSelected;
			if (instructionShouldAdvance) {
				advanceInstructionPage();
				justSelected = false;
				instructionHoverAdvanceCooldownUntil = model.time + 0.45;
				safeVibrate(handFallbackActive ? 'left' : preferredHand, 0.6, 45);
			}

			let leftIndexFlickTriggered = false;
			if (handFallbackActive) {
				const leftIndexTip = getFingerTip('left', 1);
					const leftIndexOnly =
						isHandPointing('left') && !leftPinchState && !rightPinchState;
				const canDetectFlick =
					computerCanvasPlacementConfirmed && leftIndexOnly && isFiniteVec3(leftIndexTip);
				if (canDetectFlick) {
					leftIndexFlickSamples.push({ t: model.time, p: leftIndexTip.slice(0, 3) });
					const minKeep =
						model.time - LEFT_INDEX_FLICK_MAX_HISTORY_SECONDS;
					while (
						leftIndexFlickSamples.length &&
						leftIndexFlickSamples[0].t < minKeep
					)
						leftIndexFlickSamples.shift();
					leftIndexFlickTriggered = detectLeftIndexFlick(
						leftIndexFlickSamples,
						model.time,
						leftIndexFlickCooldownUntil,
					);
					if (leftIndexFlickTriggered) leftIndexFlickSamples = [];
				} else {
					leftIndexFlickSamples = [];
				}
			} else {
				leftIndexFlickSamples = [];
			}

			const leftWrist = getWristPosition('left');
			const rightWrist = getWristPosition('right');
			const leftPinch = leftPinchState;
			const rightPinch = rightPinchState;
			const bothPinching =
				hasTrackedHandPose && leftPinchState && rightPinchState;
			const justBothPinching = bothPinching && calibrationGestureArmed;
			const canArmCalibrationGesture =
				handFallbackActive &&
				computerCanvasPlacementConfirmed &&
				!dragging &&
				!hoveredMarker &&
				!hoveredArea &&
				!pendingCaptureArea &&
				currentMarkers.length === 0;
			if (
				canArmCalibrationGesture &&
				hasTrackedHandPose &&
				!leftPinchState &&
				!rightPinchState
			)
				calibrationGestureArmed = true;
			else if (!handFallbackActive) calibrationGestureArmed = false;
			const inCalibrationCooldown =
				model.time < calibrationGestureCooldownUntil;
			const shouldEnterCalibrationMode =
				handFallbackActive &&
				computerCanvasPlacementConfirmed &&
				calibrationGestureArmed &&
				canArmCalibrationGesture &&
				justBothPinching &&
				bothPinching &&
				!inCalibrationCooldown;
				if (shouldEnterCalibrationMode) {
					computerCanvasPlacementConfirmed = false;
					instructionTaskState.calibrationStarted = true;
					handCalibrationGestureActive = true;
					calibrationGestureArmed = false;
					updateComputerCanvasPlacementSquare(true);
					setCaptureDebug({
						status: 'computer-canvas-placement-editing',
						lastError:
							'Calibration mode active. Pinch both hands, then release to confirm.',
					});
					safeVibrate(preferredHand, 0.6, 40);
				}

				const calibrationHoldProgress =
					handFallbackActive &&
					!computerCanvasPlacementConfirmed &&
					bothPinching &&
					!inCalibrationCooldown
						? 1
						: 0;
				updatePalmProgressIndicators(
					false,
					leftWrist,
					rightWrist,
					calibrationHoldProgress,
				);

				const gestureCalibrationTriggered =
					handCalibrationGestureActive &&
					!computerCanvasPlacementConfirmed &&
					!bothPinching &&
					!inCalibrationCooldown;

				if (justCanvasConfirm || gestureCalibrationTriggered) {
					if (gestureCalibrationTriggered)
						console.log('[lasso2][calibration] release confirmed');
					if (!computerCanvasPlacementConfirmed) {
					computerCanvasPlacementConfirmed = true;
					if (instructionTaskState.calibrationStarted)
						instructionTaskState.calibrated = true;
					handCalibrationGestureActive = false;
					updateComputerCanvasPlacementSquare(false);
					calibrationGestureCooldownUntil =
						model.time + CALIBRATION_GESTURE_COOLDOWN_SECONDS;
						setCaptureDebug({
							status: 'computer-canvas-placement-confirmed',
							lastError: null,
						});
							playUISound('calibrated');
						safeVibrate(preferredHand, 1.0, 90);
					} else {
						computerCanvasPlacementConfirmed = false;
						instructionTaskState.calibrationStarted = true;
						handCalibrationGestureActive = false;
						updateComputerCanvasPlacementSquare(true);
						setCaptureDebug({
							status: 'computer-canvas-placement-editing',
							lastError: handFallbackActive
								? 'Calibration mode active. Pinch both hands, then release to confirm.'
								: 'Placement edit mode active. Move left/right controllers, then press right B to confirm.',
							});
							safeVibrate(preferredHand, 0.6, 40);
						}
					}

			if (isHeadsetClient && !computerCanvasPlacementConfirmed) {
				if (dragging) {
					if (
						dragging.type === 'marker' &&
						dragging.marker &&
						dragging.marker !== hoveredMarker
					)
						setMarkerColor(dragging.marker);
					dragging = null;
				}
				hoveredMarker = null;
				hoveredArea = null;
					setCaptureDebug({
						status: 'computer-canvas-placement-required',
						lastError: handFallbackActive
							? 'Pinch with both hands to enter calibration mode, then release both pinches to confirm.'
							: 'Use left controller for top-left and right controller for bottom-right, then press right B to confirm.',
					});
				if (handFallbackActive) {
					for (const hand of ['left', 'right']) {
						const tip = getFingerTip(hand, 1);
						const wrist = getWristPosition(hand);
						const offsetDir =
							tip && wrist
								? [tip[0] - wrist[0], tip[1] - wrist[1], tip[2] - wrist[2]]
								: null;
						if (tip)
							updateIndexHoldUI(
								hand,
								tip,
								calibrationHoldProgress,
								INDEX_HOLD_CYAN,
								offsetDir,
							);
						if (tip) setHandRingMode(hand, 'calibration');
						else {
							hideIndexHoldUI(hand);
							setHandRingMode(hand, 'hidden');
						}
					}
				} else {
					hideIndexHoldUI();
					setHandRingMode('left', 'hidden');
					setHandRingMode('right', 'hidden');
				}
				setControllerRingMode(
					hasControllerPose && !handFallbackActive ? 'calibration' : 'hidden',
				);
				return;
			}

			if (
				(justSelected || justGrabbed || justSaved || leftIndexFlickTriggered) &&
				queuedDownload
			) {
				const { url, filename } = queuedDownload;
				queuedDownload = null;
				const a = document.createElement('a');
				a.href = url;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				setTimeout(() => URL.revokeObjectURL(url), 1000);
				setCaptureDebug({ lastDownload: 'triggered', queuedDownload: false });
				console.log('[lasso2] flushed queued download from user gesture');
			}

				if (justSaved || leftIndexFlickTriggered) {
					if (justSaved) console.log('[lasso2][input] save button pressed');
					if (leftIndexFlickTriggered)
						console.log('[lasso2][gesture] left-index flick save triggered');
					playUISound('save');
					triggerSaveToast();
					broadcastSaveRequest();
					safeVibrate(
						leftIndexFlickTriggered ? 'left' : preferredHand,
						0.8,
					70,
				);
			}

			let captureTargetArea =
				(hoveredMarker && isAreaCaptureEligible(hoveredMarker.area)
					? hoveredMarker.area
					: null) ||
				(hoveredArea && isAreaCaptureEligible(hoveredArea)
					? hoveredArea
					: null);

			let pointHoldProgress = 0;
			let captureHoldProgress = 0;
			let activePointHand = 'right';
			let activePointTip = null;
			let activePointOffsetDir = null;
			let activeCaptureHand = null;
			let activeCaptureTip = null;
				if (handFallbackActive) {
					const rightTipForCursor = getFingerTip('right', 1);
					const rightWristForCursor = getWristPosition('right');
						const rightIsPointing = isHandPointing('right');
					activePointTip = rightTipForCursor;
					activePointOffsetDir =
						rightTipForCursor && rightWristForCursor
						? [
								rightTipForCursor[0] - rightWristForCursor[0],
								rightTipForCursor[1] - rightWristForCursor[1],
								rightTipForCursor[2] - rightWristForCursor[2],
						  ]
						: null;

				const rightArea = findCaptureAreaNearTip(
					rightTipForCursor,
					CAPTURE_BORDER_THRESHOLD_METERS,
				);
				captureTargetArea = rightArea || captureTargetArea;

					const captureAvailable =
						!!captureTargetArea &&
						!!rightTipForCursor &&
						rightIsPointing &&
						isIndexNearAreaBorder(
							captureTargetArea,
							rightTipForCursor,
							CAPTURE_BORDER_THRESHOLD_METERS,
						);
					const pointReady =
						!!rightTipForCursor &&
						rightIsPointing &&
						computerCanvasPlacementConfirmed &&
						currentMarkers.length < 4 &&
						!hoveredMarker &&
					!hoveredArea &&
					!pendingCaptureArea &&
					!captureAvailable;

					activeCaptureHand = captureAvailable ? 'right' : null;
					activeCaptureTip = captureAvailable ? rightTipForCursor : null;

				if (
						justSelected &&
						computerCanvasPlacementConfirmed &&
						rightTipForCursor &&
						rightIsPointing &&
						!dragging
					) {
					if (captureAvailable && captureTargetArea) {
						beginAreaCapture(captureTargetArea);
						safeVibrate('left', 0.8, 90);
					} else if (pointReady) {
						const anchoredPoint =
							getIndexHoldAnchor(rightTipForCursor, activePointOffsetDir) ||
							rightTipForCursor;
						lockPoint(anchoredPoint, 'right');
						safeVibrate('left', 1.0, 80);
					}
				}

				handPointHold = { hand: null, anchor: null, start: 0 };
				handCaptureHold = { hand: null, areaId: null, anchor: null, start: 0 };
				handAreaDrag = { hand: null, areaId: null, lastTip: null };

				if (model.time - lastCaptureDiagLogTime > 0.5) {
					lastCaptureDiagLogTime = model.time;
					console.log('[lasso2][capture-diag]', {
						handFallbackActive,
						areaId: captureTargetArea ? captureTargetArea.id : null,
						activeCaptureHand,
						captureAvailable,
						pointReady,
						leftPinch: leftPinchState,
						rightPinch: rightPinchState,
					});
				}
				} else {
					handPointHold = { hand: null, anchor: null, start: 0 };
					handCaptureHold = { hand: null, areaId: null, anchor: null, start: 0 };
					handAreaDrag = { hand: null, areaId: null, lastTip: null };
				}

				if (!handFallbackActive) {
				if (justSelected && captureTargetArea) {
					console.log('[lasso2] select capture target', captureTargetArea);
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
			}

			if (handFallbackActive) {
				if (!computerCanvasPlacementConfirmed) {
					for (const hand of ['left', 'right']) {
						const tip = getFingerTip(hand, 1);
						const wrist = getWristPosition(hand);
						const offsetDir =
							tip && wrist
								? [tip[0] - wrist[0], tip[1] - wrist[1], tip[2] - wrist[2]]
								: null;
						if (tip)
							updateIndexHoldUI(
								hand,
								tip,
								calibrationHoldProgress,
								INDEX_HOLD_CYAN,
								offsetDir,
							);
						if (tip) setHandRingMode(hand, 'calibration');
						else {
							hideIndexHoldUI(hand);
							setHandRingMode(hand, 'hidden');
						}
					}
					} else {
						const cursorHand = 'right';
						const tip = getFingerTip(cursorHand, 1);
						const wrist = getWristPosition(cursorHand);
						const rightIsPointing = isHandPointing(cursorHand);
						const leftTip = getFingerTip('left', 1);
						const leftWristForCursor = getWristPosition('left');
						const leftIsPointing = isHandPointing('left');
						const leftOffsetDir =
							leftTip && leftWristForCursor
								? [
										leftTip[0] - leftWristForCursor[0],
										leftTip[1] - leftWristForCursor[1],
										leftTip[2] - leftWristForCursor[2],
								  ]
								: null;
						const offsetDir =
							tip && wrist
								? [tip[0] - wrist[0], tip[1] - wrist[1], tip[2] - wrist[2]]
								: null;
					if (leftTip && leftIsPointing) {
						updateIndexHoldUI(
							'left',
							leftTip,
							0,
							INDEX_HOLD_RED,
							leftOffsetDir,
							INDEX_HOLD_RED,
						);
						setHandRingMode('left', 'point');
					} else {
						hideIndexHoldUI('left');
						setHandRingMode('left', 'hidden');
					}
					if (!tip) {
						hideIndexHoldUI('right');
						setHandRingMode('right', 'hidden');
						} else {
							const captureAvailable =
								!!captureTargetArea &&
								rightIsPointing &&
								isIndexNearAreaBorder(
									captureTargetArea,
									tip,
									CAPTURE_BORDER_THRESHOLD_METERS,
								);
							const pointReady =
								rightIsPointing &&
								computerCanvasPlacementConfirmed &&
								currentMarkers.length < 4 &&
								!hoveredMarker &&
							!hoveredArea &&
							!pendingCaptureArea &&
							!captureAvailable;
						let ringColor = INDEX_HOLD_GREY;
						let handMode = 'default';
						if (captureAvailable) {
							ringColor = INDEX_HOLD_FUCHSIA;
							handMode = 'capture';
						} else if (pointReady) {
							ringColor = INDEX_HOLD_YELLOW;
							handMode = 'point';
						} else if (instructionButtonHovered) {
							ringColor = INDEX_HOLD_UI_HOVER;
							handMode = 'ui-hover';
						}
						updateIndexHoldUI('right', tip, 0, ringColor, offsetDir, ringColor);
						setHandRingMode('right', handMode);
					}
				}
			} else {
				hideIndexHoldUI();
				setHandRingMode('left', 'hidden');
				setHandRingMode('right', 'hidden');
			}

			if (hasControllerPose && !handFallbackActive) {
				let controllerCursorColor = INDEX_HOLD_GREY;
				let controllerRingMode = 'default';
				const canControllerCapture =
					computerCanvasPlacementConfirmed &&
					(captureTargetArea || pendingCaptureArea);
				const canControllerPoint =
					computerCanvasPlacementConfirmed &&
					!captureTargetArea &&
					!pendingCaptureArea &&
					!hoveredMarker &&
					!hoveredArea &&
					!dragging &&
					currentMarkers.length < 4;
				if (!computerCanvasPlacementConfirmed)
					(controllerRingMode = 'calibration'),
						(controllerCursorColor = INDEX_HOLD_CYAN);
				else if (canControllerCapture)
					(controllerRingMode = 'capture'),
						(controllerCursorColor = INDEX_HOLD_FUCHSIA);
				else if (canControllerPoint)
					(controllerRingMode = 'point'),
						(controllerCursorColor = INDEX_HOLD_YELLOW);
				cursor.ring.color(
					controllerCursorColor[0],
					controllerCursorColor[1],
					controllerCursorColor[2],
				);
				setControllerRingMode(controllerRingMode);
			} else {
				setControllerRingMode('hidden');
			}

			if (justGrabbed) {
				if (hoveredMarker) {
					dragging = { type: 'marker', marker: hoveredMarker };
					safeVibrate(handFallbackActive ? 'right' : preferredHand, 0.8, 50);
				} else if (hoveredArea) {
					dragging = { type: 'area', area: hoveredArea, lastPos: pos.slice() };
					safeVibrate(handFallbackActive ? 'right' : preferredHand, 0.8, 50);
				}
			}

			if (!grabPressed && dragging) {
				if (dragging.type === 'marker' && dragging.marker !== hoveredMarker)
					setMarkerColor(dragging.marker);
				dragging = null;
			}

			// ─── Drag update ─────────────────────────────────────────────────────
			if (grabPressed && dragging) {
				const dragPos = handFallbackActive && indexTip ? indexTip : pos;
				if (dragging.type === 'marker') {
					const marker = dragging.marker;
					marker.pos = dragPos.slice();
					setMarkerPose(marker, dragPos);
					setMarkerColor(marker, marker.captureActive ? 'idle' : 'drag');
					for (const area of completedAreas)
						if (area.pts.includes(marker)) {
							setSurfaceMatrix(
								area.surf,
								area.pts.map((m) => m.pos),
							);
						}
				} else if (dragging.type === 'area') {
					const delta = [
						dragPos[0] - dragging.lastPos[0],
						dragPos[1] - dragging.lastPos[1],
						dragPos[2] - dragging.lastPos[2],
					];
					moveAreaBy(dragging.area, delta);
					dragging.lastPos = dragPos.slice();
					for (const marker of dragging.area.pts)
						if (marker === hoveredMarker)
							setMarkerColor(marker, marker.captureActive ? 'idle' : 'hover');
				}
			}

			if (!dragging && hoveredMarker && hoveredMarker.captureActive)
				setMarkerColor(hoveredMarker, 'idle');
			else if (!dragging && hoveredMarker)
				setMarkerColor(hoveredMarker, 'hover');

			if (dragging && dragging.type === 'marker') {
				for (const area of completedAreas)
					if (area.pts.includes(dragging.marker)) {
						setSurfaceMatrix(
							area.surf,
							area.pts.map((m) => m.pos),
						);
					}
			}
		} catch (e) {
			console.error('[lasso2] animate error:', e);
		}
	});
};
