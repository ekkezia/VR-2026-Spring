import * as cg from '../render/core/cg.js';
import { ControllerBeam } from '../render/core/controllerInput.js';

// Sphere sculpting — beam/hand intersection drives UV, velocity drives push/pull
// onDrag (trigger held) = sculpt, onMove (trigger released) = look only

const NU = 48, NV = 24;
const R = 0.3;             // base sphere radius
const BRUSH_RADIUS = 0.1;  // UV-space brush width
const BRUSH_SCALE  = 8.0;  // multiplier on velocity → displacement

window.shared = { id: null };

export const init = async model => {
    try { clay.defineMesh('sculptSphere', clay.createGrid(NU, NV)); } catch(e) {}

    const sphere = model.add('sculptSphere')
        .move(0, 1.5, -0.5)
        .color(0.7, 0.85, 1.0);

    // ── displacement map ────────────────────────────────────────────────────
    const displace = new Float32Array(NU * NV).fill(0);

    const sampleDisp = (u, v) => {
        const ui = ((Math.floor(u * NU) % NU) + NU) % NU;
        const vi = Math.max(0, Math.min(NV - 1, Math.floor(v * NV)));
        return displace[vi * NU + ui];
    };

    const applyBrush = (cu, cv, delta) => {
        const sigma = BRUSH_RADIUS * 0.4;
        for (let vi = 0; vi < NV; vi++) {
            for (let ui = 0; ui < NU; ui++) {
                const su = ui / NU, sv = vi / NV;
                let du = Math.abs(su - cu);
                if (du > 0.5) du = 1 - du;
                const dv = sv - cv;
                const dist2 = du * du + dv * dv;
                if (dist2 < BRUSH_RADIUS * BRUSH_RADIUS) {
                    const falloff = Math.exp(-dist2 / (2 * sigma * sigma));
                    const idx = vi * NU + ui;
                    displace[idx] = Math.max(-0.8, Math.min(0.8, displace[idx] + delta * falloff));
                }
            }
        }
    };

    // ── helpers ─────────────────────────────────────────────────────────────

    // Ray-sphere intersection — returns nearest positive t, or null
    const raySphere = (ro, rd, center, radius) => {
        const ox = ro[0]-center[0], oy = ro[1]-center[1], oz = ro[2]-center[2];
        const b = 2*(ox*rd[0] + oy*rd[1] + oz*rd[2]);
        const c = ox*ox + oy*oy + oz*oz - radius*radius;
        const disc = b*b - 4*c;           // a=1 since rd is normalised
        if (disc < 0) return null;
        const sq = Math.sqrt(disc);
        const t1 = (-b - sq) * 0.5;
        const t2 = (-b + sq) * 0.5;
        if (t1 > 0.001) return t1;
        if (t2 > 0.001) return t2;
        return null;
    };

    // World hit point → sphere UV
    const hitToUV = (hit, center) => {
        const lx = hit[0]-center[0], ly = hit[1]-center[1], lz = hit[2]-center[2];
        const len = Math.sqrt(lx*lx + ly*ly + lz*lz);
        if (len < 0.001) return null;
        const u = (Math.atan2(ly/len, lx/len) / (2*Math.PI) + 1) % 1;
        const v = Math.asin(Math.max(-1, Math.min(1, lz/len))) / Math.PI + 0.5;
        return [u, v];
    };

    // ── beams + cursors ──────────────────────────────────────────────────────
    const beamL = new ControllerBeam(model, 'left');
    const beamR = new ControllerBeam(model, 'right');
    const bend  = Math.PI / 4;

    const cursorL = model.add('sphere').scale(0.015).color(0, 0.5, 1).dull();
    const cursorR = model.add('sphere').scale(0.015).color(1, 0.5, 0).dull();

    // ── sculpt state ─────────────────────────────────────────────────────────
    // prevDist: distance from beam origin to sphere center last frame (for velocity)
    const prevT = { left: null, right: null };

    const getBeamRay = (beam) => {
        if (!beam.m) return null;
        const bm = cg.mMultiply(beam.m, cg.mRotateX(-bend));
        // Normalise direction
        const dx = -bm[8], dy = -bm[9], dz = -bm[10];
        const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
        return {
            ro: [bm[12], bm[13], bm[14]],
            rd: [dx/len, dy/len, dz/len],
        };
    };

    const sculptHand = (hand) => {
        const beam   = hand === 'left' ? beamL : beamR;
        const cursor = hand === 'left' ? cursorL : cursorR;

        const ray = getBeamRay(beam);
        if (!ray) return;

        const center = sphere.getGlobalMatrix().slice(12, 15);
        const t = raySphere(ray.ro, ray.rd, center, R);

        if (t === null) { prevT[hand] = null; return; }

        // Hit point in world space
        const hit = [
            ray.ro[0] + t * ray.rd[0],
            ray.ro[1] + t * ray.rd[1],
            ray.ro[2] + t * ray.rd[2],
        ];

        // Show cursor at hit point (in model-local coords)
        const inv      = cg.mInverse(model.getGlobalMatrix());
        const localHit = cg.mTransform(inv, hit);
        cursor.identity().move(localHit[0], localHit[1], localHit[2]).scale(0.015);

        // Push/pull: velocity along beam (dt < 0 = moving closer = push in)
        if (prevT[hand] !== null) {
            const dt    = t - prevT[hand];          // positive = moving away
            const delta = dt * BRUSH_SCALE;         // away (+) → pull out, closer (-) → push in
            if (Math.abs(delta) > 0.00005) {
                const uv = hitToUV(hit, center);
                if (uv) applyBrush(uv[0], uv[1], delta);
            }
        }
        prevT[hand] = t;
    };

    // ── input ────────────────────────────────────────────────────────────────
    inputEvents.onDrag = (hand) => {
        sculptHand(hand);
    };

    inputEvents.onMove = (hand) => {
        // Not dragging — still update cursor, but reset velocity tracking
        prevT[hand] = null;
        const beam   = hand === 'left' ? beamL : beamR;
        const cursor = hand === 'left' ? cursorL : cursorR;
        const ray    = getBeamRay(beam);
        if (!ray) return;
        const center = sphere.getGlobalMatrix().slice(12, 15);
        const t      = raySphere(ray.ro, ray.rd, center, R);
        if (t === null) return;
        const hit      = [ray.ro[0]+t*ray.rd[0], ray.ro[1]+t*ray.rd[1], ray.ro[2]+t*ray.rd[2]];
        const inv      = cg.mInverse(model.getGlobalMatrix());
        const localHit = cg.mTransform(inv, hit);
        cursor.identity().move(localHit[0], localHit[1], localHit[2]).scale(0.015);
    };

    // ── animate ──────────────────────────────────────────────────────────────
    model.animate(() => {
        shared = server.synchronize('shared');

        beamL.update();
        beamR.update();

        // Rebuild sphere with current displacements
        sphere.setVertices((u, v) => {
            const theta = 2 * Math.PI * u;
            const phi   = Math.PI * (v - 0.5);
            const x = Math.cos(theta) * Math.cos(phi);
            const y = Math.sin(theta) * Math.cos(phi);
            const z = Math.sin(phi);
            const r = R * (1 + sampleDisp(u, v));
            return [r * x, r * y, r * z];
        });
    });
};
