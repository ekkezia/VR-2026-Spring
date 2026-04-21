import * as cg from '../render/core/cg.js';

const preferredHand = 'right';

// ─── Green corner detection + perspective warp ────────────────────────────────

function detectGreenCorners(canvas, minG = 120, bias = 1.8) {
	const { width: w, height: h } = canvas;
	const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
	let tl = null, tr = null, br = null, bl = null;
	let tlMin = Infinity, trMax = -Infinity, brMax = -Infinity, blMin = Infinity;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			const r = data[i], g = data[i+1], b = data[i+2];
			if (g < minG || g < r * bias || g < b * bias) continue;
			if (x+y < tlMin) { tlMin = x+y; tl = [x,y]; }
			if (x-y > trMax) { trMax = x-y; tr = [x,y]; }
			if (x+y > brMax) { brMax = x+y; br = [x,y]; }
			if (x-y < blMin) { blMin = x-y; bl = [x,y]; }
		}
	}
	if (!(tl && tr && br && bl)) return null;
	const isGreen = (x, y) => {
		const i = (Math.round(y) * w + Math.round(x)) * 4;
		const r = data[i], g = data[i+1], b = data[i+2];
		return g >= minG && g > r * bias && g > b * bias;
	};
	const cx = (tl[0]+tr[0]+br[0]+bl[0]) / 4;
	const cy = (tl[1]+tr[1]+br[1]+bl[1]) / 4;
	const innerCorner = ([ox, oy]) => {
		const dx = cx - ox, dy = cy - oy;
		const len = Math.sqrt(dx*dx + dy*dy);
		const nx = dx/len, ny = dy/len;
		let x = ox, y = oy;
		while (x > 0 && x < w-1 && y > 0 && y < h-1) {
			x += nx; y += ny;
			if (!isGreen(x, y)) return [Math.round(x), Math.round(y)];
		}
		return [Math.round(ox), Math.round(oy)];
	};
	return [innerCorner(tl), innerCorner(tr), innerCorner(br), innerCorner(bl)];
}

function gaussElim(A, b) {
	const n = b.length;
	const M = A.map((row, i) => [...row, b[i]]);
	for (let col = 0; col < n; col++) {
		let pivot = col;
		for (let row = col+1; row < n; row++)
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
	const A = [], b = [];
	for (let i = 0; i < 4; i++) {
		const [sx,sy] = srcPts[i], [dx,dy] = dstPts[i];
		A.push([sx,sy,1,0,0,0,-dx*sx,-dx*sy]);
		A.push([0,0,0,sx,sy,1,-dy*sx,-dy*sy]);
		b.push(dx, dy);
	}
	const h = gaussElim(A, b);
	if (!h) return null;
	return [[h[0],h[1],h[2]],[h[3],h[4],h[5]],[h[6],h[7],1]];
}

function applyH(H, x, y) {
	const w = H[2][0]*x + H[2][1]*y + H[2][2];
	return [(H[0][0]*x + H[0][1]*y + H[0][2])/w, (H[1][0]*x + H[1][1]*y + H[1][2])/w];
}

function warpAndDownload(srcCanvas, corners) {
	const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
	const minX = Math.min(...xs), minY = Math.min(...ys);
	const outW = Math.round(Math.max(...xs) - minX);
	const outH = Math.round(Math.max(...ys) - minY);
	const outCorners = corners.map(([x, y]) => [x - minX, y - minY]);
	const hom = computeHomography(outCorners, corners);
	if (!hom) return;
	const inQuad = (px, py) => {
		for (let i = 0; i < 4; i++) {
			const [ax, ay] = outCorners[i], [bx, by] = outCorners[(i + 1) % 4];
			if ((bx - ax) * (py - ay) - (by - ay) * (px - ax) < 0) return false;
		}
		return true;
	};
	const dst = document.createElement('canvas');
	dst.width = outW; dst.height = outH;
	const dstCtx = dst.getContext('2d');
	const out = dstCtx.createImageData(outW, outH);
	const srcData = srcCanvas.getContext('2d').getImageData(0, 0, srcCanvas.width, srcCanvas.height).data;
	for (let dy = 0; dy < outH; dy++) {
		for (let dx = 0; dx < outW; dx++) {
			if (!inQuad(dx, dy)) continue;
			const [sx, sy] = applyH(hom, dx, dy);
			const ix = Math.round(sx), iy = Math.round(sy);
			if (ix < 0 || ix >= srcCanvas.width || iy < 0 || iy >= srcCanvas.height) continue;
			const si = (iy * srcCanvas.width + ix) * 4;
			const di = (dy * outW + dx) * 4;
			out.data[di]   = srcData[si];
			out.data[di+1] = srcData[si+1];
			out.data[di+2] = srcData[si+2];
			out.data[di+3] = 255;
		}
	}
	dstCtx.putImageData(out, 0, 0);
	const a = document.createElement('a');
	a.href = dst.toDataURL('image/png');
	a.download = 'lasso-capture.png';
	a.click();
}

// ─── Plane fitting helpers ────────────────────────────────────────────────────

// Get the palm-facing normal from a hand matrix (column 2: indices 8,9,10)
function handNormal(mat) {
	return [mat[8], mat[9], mat[10]];
}

// Snap an arbitrary unit normal to the nearest cardinal axis (+/-X, +/-Y, +/-Z)
function snapToCardinal(normal) {
	const cardinals = [
		[1,0,0], [-1,0,0],
		[0,1,0], [0,-1,0],
		[0,0,1], [0,0,-1],
	];
	let best = cardinals[0], bestDot = -Infinity;
	for (const c of cardinals) {
		const d = normal[0]*c[0] + normal[1]*c[1] + normal[2]*c[2];
		if (d > bestDot) { bestDot = d; best = c; }
	}
	return best;
}

// Build two orthogonal tangent vectors given a normal, return [axisX, axisY]
function tangentsFromNormal(n) {
	// pick an up vector that isn't parallel to n
	let up = [0, 1, 0];
	if (Math.abs(n[1]) > 0.9) up = [1, 0, 0];
	// axisX = up × n  (right vector in the plane)
	const ax = cg.normalize(cg.cross(up, n));
	// axisY = n × axisX  (up vector in the plane)
	const ay = cg.normalize(cg.cross(n, ax));
	return [ax, ay];
}


// ─── Screen capture state ─────────────────────────────────────────────────────

const SCREEN_TXTR_CHANNEL = 2;
let screenCanvas = null;
let screenCaptureActive = false;

// ─── Scene ────────────────────────────────────────────────────────────────────

export const init = async (model) => {
	let screenTxtrReady = false;
	const areaSurfaces = [];

	function registerScreenTexture() {
		if (screenTxtrReady || !screenCanvas || areaSurfaces.length === 0) return;
		model.txtrSrc(SCREEN_TXTR_CHANNEL, screenCanvas);
		screenTxtrReady = true;
		for (const surf of areaSurfaces) surf.txtr(SCREEN_TXTR_CHANNEL);
	}

	if (!screenCaptureActive) {
		screenCaptureActive = true;
		(async () => {
			try {
				screenCanvas = document.getElementById('textureCanvas');
				const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
				const video = document.createElement('video');
				video.muted = true;
				video.srcObject = stream;
				video.onloadedmetadata = () => {
					video.play();
					setTimeout(() => {
						screenCanvas.width = video.videoWidth;
						screenCanvas.height = video.videoHeight;
						let dbgFrame = 0;
						setInterval(() => {
							const ctx = screenCanvas.getContext('2d');
							ctx.drawImage(video, 0, 0);
							registerScreenTexture();
							if (++dbgFrame === 60) {
								const corners = detectGreenCorners(screenCanvas);
								if (corners) console.log('[lasso] dbg corners found:', corners);
								else console.warn('[lasso] dbg: detectGreenCorners returned null');
							}
						}, 30);
					}, 1000);
				};
			} catch (err) {
				console.error('captureScreen:', err);
				screenCaptureActive = false;
			}
		})();
	} else if (screenCanvas) {
		registerScreenTexture();
	}

	// ─── Scene state ──────────────────────────────────────────────────────────

	const state = {
		currentPoints: [],
		area: [],
		left: [0, 0, 0],
		right: [0, 0, 0],
		enableLasso: false,
		enableDownload: false,
		greenCorners: null,
	};

	const LOCK_DURATION  = 2;
	const LOCK_THRESHOLD = 0.03;

	const holdState = {
		left:  { anchorPos: null, startTime: null, locked: false },
		right: { anchorPos: null, startTime: null, locked: false },
	};

	const lMarker = model.add('diskZ').color(1, 0, 1).opacity(0.3).scale(0.02).dull();
	const rMarker = model.add('diskZ').color(1, 0, 1).opacity(0.3).scale(0.02).dull();
	const lockedMarkersContainer = model.add();
	let areaIndex = 0;

	// ─── Helpers ──────────────────────────────────────────────────────────────

	// Orient a disk marker so it faces the snapped cardinal of the current hand normal.
	// Position always follows raw finger pos — only the facing is snapped.
	function applySnappedMarker(node, pos, handMat, scale) {
		if (handMat && handMat.length >= 16) {
			const rawNorm  = handNormal(handMat);
			const snapped  = snapToCardinal(rawNorm);
			const [ax, ay] = tangentsFromNormal(snapped);
			const s = scale;
			node.setMatrix([
				ax[0]*s, ax[1]*s, ax[2]*s, 0,
				ay[0]*s, ay[1]*s, ay[2]*s, 0,
				snapped[0]*s, snapped[1]*s, snapped[2]*s, 0,
				pos[0], pos[1], pos[2], 1,
			]);
		} else {
			node.identity().move(pos[0], pos[1], pos[2]).scale(scale);
		}
	}

	function addEdge(p1, p2) {
		const dx = p2[0]-p1[0], dy = p2[1]-p1[1], dz = p2[2]-p1[2];
		const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
		if (len < 1e-6) return;
		const fx = dx/len, fy = dy/len, fz = dz/len;
		let ux = 0, uy = 1, uz = 0;
		if (Math.abs(fy) > 0.9) { ux = 1; uy = 0; uz = 0; }
		let rx = fy*uz - fz*uy, ry = fz*ux - fx*uz, rz = fx*uy - fy*ux;
		const rlen = Math.sqrt(rx*rx + ry*ry + rz*rz);
		rx /= rlen; ry /= rlen; rz /= rlen;
		const tux = ry*fz - rz*fy, tuy = rz*fx - rx*fz, tuz = rx*fy - ry*fx;
		const THICK = 0.002;
		const mx = (p1[0]+p2[0])/2, my = (p1[1]+p2[1])/2, mz = (p1[2]+p2[2])/2;
		lockedMarkersContainer.add('cube').setMatrix([
			rx*THICK,  ry*THICK,  rz*THICK,  0,
			tux*THICK, tuy*THICK, tuz*THICK, 0,
			fx*len/2,  fy*len/2,  fz*len/2,  0,
			mx, my, mz, 1,
		]).color(1, 1, 0).dull();
	}

	// ─── Lasso logic ──────────────────────────────────────────────────────────

	function finalizeArea(points) {
		// Use the same edge-vector approach as lasso.js — guaranteed correct orientation/scale.
		// The cardinal snapping only affects disk marker facing; surface uses raw edges.
		const e1 = [
			(points[1][0] - points[0][0] + points[2][0] - points[3][0]) / 4,
			(points[1][1] - points[0][1] + points[2][1] - points[3][1]) / 4,
			(points[1][2] - points[0][2] + points[2][2] - points[3][2]) / 4,
		];
		const e2 = [
			(points[3][0] - points[0][0] + points[2][0] - points[1][0]) / 4,
			(points[3][1] - points[0][1] + points[2][1] - points[1][1]) / 4,
			(points[3][2] - points[0][2] + points[2][2] - points[1][2]) / 4,
		];
		const nx = e1[1]*e2[2] - e1[2]*e2[1];
		const ny = e1[2]*e2[0] - e1[0]*e2[2];
		const nz = e1[0]*e2[1] - e1[1]*e2[0];
		const nlen = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
		const cx = (points[0][0] + points[1][0] + points[2][0] + points[3][0]) / 4;
		const cy = (points[0][1] + points[1][1] + points[2][1] + points[3][1]) / 4;
		const cz = (points[0][2] + points[1][2] + points[2][2] + points[3][2]) / 4;
		console.log('[lasso3] finalizeArea: e1', e1, 'e2', e2, 'center', [cx,cy,cz]);

		state.area.push(points.map(p => p.slice()));

		const surf = model.add('square').opacity(0.85).dull();
		surf.setMatrix([
			e1[0], e1[1], e1[2], 0,
			e2[0], e2[1], e2[2], 0,
			nx/nlen, ny/nlen, nz/nlen, 0,
			cx, cy, cz, 1,
		]);
		areaIndex++;
		areaSurfaces.push(surf);
		registerScreenTexture();
		if (screenTxtrReady) surf.txtr(SCREEN_TXTR_CHANNEL);

		// Always enable download once 4 points are placed.
		// Also attempt green-corner detection for the warp; store corners separately.
		state.enableDownload = true;
		if (screenCanvas) {
			const corners = detectGreenCorners(screenCanvas);
			if (corners) {
				state.greenCorners = corners;
				console.log('[lasso3] green corners found:', corners);
			} else {
				state.greenCorners = null;
				console.warn('[lasso3] no green corners found in screen capture');
			}
		}

		state.currentPoints = [];
	}

	function lockPoint(pos, handMat) {
		if (state.currentPoints.length >= 4) return;

		// Place a locked marker — each point uses its OWN snapped normal independently
		const marker = lockedMarkersContainer.add('diskZ').color(1, 1, 0).dull();
		applySnappedMarker(marker, pos, handMat, 0.02);

		state.currentPoints.push(pos.slice());

		if (state.currentPoints.length >= 2) {
			addEdge(state.currentPoints[state.currentPoints.length - 2], pos);
		}

		if (state.currentPoints.length === 4) {
			addEdge(pos, state.currentPoints[0]);
			// Turn all locked markers + edges green to signal quad is complete
			const n = lockedMarkersContainer.nChildren();
			for (let i = 0; i < n; i++) lockedMarkersContainer.child(i).color(0, 1, 0);
			finalizeArea(state.currentPoints.slice());
		}
	}

	function updateHand(hand, pos, marker, hasTracking, enableLasso) {
		const handMat = clientState.hand(clientID, hand);

		// Live marker: position is raw, facing is snapped — cosmetic only
		applySnappedMarker(marker, pos, handMat, 0.02);

		if (!handMat || !enableLasso) {
			marker.opacity(hasTracking ? 0.65 : 0.1);
			return;
		}

		const hs = holdState[hand];

		if (hs.anchorPos && cg.distance(pos, hs.anchorPos) < LOCK_THRESHOLD) {
			const progress = Math.min((model.time - hs.startTime) / LOCK_DURATION, 1);
			marker.opacity(0.25 + 0.75 * progress);

			if (progress >= 1 && !hs.locked && state.currentPoints.length < 4) {
				holdState[hand] = { anchorPos: pos.slice(), startTime: model.time, locked: true };
				lockPoint(pos, handMat);
			}
		} else {
			holdState[hand] = { anchorPos: pos.slice(), startTime: model.time, locked: false };
			marker.opacity(0.25);
		}
	}

	// ─── UI ───────────────────────────────────────────────────────────────────

	const menu    = model.add();
	const menuBg  = menu.add('square').color(1, 0, 0).opacity(0.9).dull();
	const downloadBtn = menu.add('cube').color(0.75, 0, 0).opacity(1).scale(0.5).move(0, -0.035, 0).dull();
	menu.add(clay.text('LASSO')).color(1,1,1).scale(0.01).move(-0.045, 0.02, 0.001);
	const trackingOk  = menu.add(clay.text('TRACKING ✅')).color(0,1,0).scale(0.008).move(-0.045, 0, 0.001);
	const trackingBad = menu.add(clay.text('TRACKING ❌')).color(1,0.3,0).scale(0.008).move(-0.045, 0, 0.001);

	// Fist gesture on the menu hand enables lasso mode
	const updateEnableLasso = () => {
		const menuHand = preferredHand === 'left' ? 'right' : 'left';
		const handMat  = clientState.hand(clientID, menuHand);
		const indexTip  = clientState.finger(clientID, menuHand, 1);
		const middleTip = clientState.finger(clientID, menuHand, 2);
		const ringTip   = clientState.finger(clientID, menuHand, 3);
		const pinkyTip  = clientState.finger(clientID, menuHand, 4);
		if (handMat && indexTip && middleTip && ringTip && pinkyTip) {
			const wrist = [handMat[12], handMat[13], handMat[14]];
			const FIST_THRESH = 0.12;
			state.enableLasso =
				cg.distance(wrist, indexTip)  < FIST_THRESH &&
				cg.distance(wrist, middleTip) < FIST_THRESH &&
				cg.distance(wrist, ringTip)   < FIST_THRESH &&
				cg.distance(wrist, pinkyTip)  < FIST_THRESH;
		}
	};

	// ─── Animate loop ─────────────────────────────────────────────────────────

	model.animate(() => { try {
		updateEnableLasso();

		const rPos = clientState.finger(clientID, 'right', 1);
		const hasTracking = !!clientState.hand(clientID, preferredHand);
		trackingOk .opacity(hasTracking ? 1 : 0);
		trackingBad.opacity(hasTracking ? 0 : 1);
		if (rPos) state.right = rPos;
		if (preferredHand === 'right') {
			updateHand('right', state.right, rMarker, !!rPos, state.enableLasso);
		}

		// Menu follows the non-preferred hand, lies flat on palm
		const menuHand    = preferredHand === 'left' ? 'right' : 'left';
		const menuHandMat = clientState.hand(clientID, menuHand);
		if (menuHandMat) {
			const s = 0.05;
			menu.setMatrix([
				menuHandMat[0]*s,  menuHandMat[1]*s,  menuHandMat[2]*s,  0,
				menuHandMat[8]*s,  menuHandMat[9]*s,  menuHandMat[10]*s, 0,
				menuHandMat[4]*s,  menuHandMat[5]*s,  menuHandMat[6]*s,  0,
				menuHandMat[12],   menuHandMat[13],   menuHandMat[14],   1,
			]);
			menuBg.color(state.enableLasso ? 0 : 1, state.enableLasso ? 1 : 0, 0).opacity(0.9);
			// Button always visible — green when download is ready, grey otherwise
			downloadBtn.color(
				state.enableDownload ? 0    : 0.5,
				state.enableDownload ? 0.75 : 0.5,
				0
			).scale(0.5).opacity(1);
		}

		if (rPos && state.enableDownload && cg.isPointInBox(rPos, downloadBtn.getMatrix())) {
			if (state.greenCorners) {
				warpAndDownload(screenCanvas, state.greenCorners);
			} else if (screenCanvas) {
				// Re-detect corners at download time as a fallback
				const corners = detectGreenCorners(screenCanvas);
				if (corners) warpAndDownload(screenCanvas, corners);
				else console.warn('[lasso3] download tapped but no green corners found');
			}
			state.enableDownload = false;
		}
	} catch(e) { console.error('lasso animate error:', e); } });
};