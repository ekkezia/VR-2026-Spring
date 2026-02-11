// HW Week 3
// TODO: still can't modify the u & v depending on the position where the pencil touches

import * as cg from "../render/core/cg.js";

// Local uvToXYZ helper (moved from cg.js) — map UV [0..1]^2 to cube-local XYZ for thin top face
const uvToXYZ = (uv, size = [1,1,0.08], face = 'top') => {
   let u = Array.isArray(uv) ? uv[0] : uv;
   let v = Array.isArray(uv) ? uv[1] : 0;
   u = cg.clamp(u, 0, 1);
   v = cg.clamp(v, 0, 1);
   const w = cg.def(size[0], 1), h = cg.def(size[1], 1), d = cg.def(size[2], 0.02);
   const cx = (u - 0.5) * w;
   const cy = (v - 0.5) * h;
   switch (face) {
      case 'top':    return [ cx, cy,  d / 2 ];
      case 'bottom': return [ cx, -cy, -d / 2 ];
      case 'front':  return [ cx,  d / 2,  (v - 0.5) * d ];
      case 'back':   return [ -cx, -d / 2, (v - 0.5) * d ];
      case 'right':  return [  w / 2, -cx,  (v - 0.5) * d ];
      case 'left':   return [ -w / 2,  cx,  (v - 0.5) * d ];
      default:       return [ cx, cy,  d / 2 ];
   }
}

window.shared = {                              // SHARED STATE IS A GLOBAL VARIABLE.
   id: null,                                   // IT MUST BE AN OBJECT OF THE FORM:
   pixels: []                             // { name: value, name: value ... }
};

export const init = async model => {
    let currPencilColor = [Math.random(), Math.random(), Math.random()];
    currPencilColor[0] = Math.random();
    currPencilColor[1] = Math.random();
    currPencilColor[2] = Math.random();

    let id = Date.now();
    shared.id = id;

   // Pixel is scoped into init so it can close over `paper` if needed
   class Pixel {
      constructor(x, y, z, color, parent) {
         this.x = x;
         this.y = y;
         this.z = z !== undefined ? z : 0;
         this.color = color;
         this.parent = parent;
      }
      draw() {
         // permanent pixel (added as child of `paper`)
         this.parent.add('cube').identity().move(this.x, this.y, this.z).color(this.color[0], this.color[1], this.color[2]).scale(.01, .01, .1);
      }
   }
   // define a higher-resolution grid mesh for the paper so vertex displacement is visible
   try {
      clay.defineMesh('paperGrid', clay.createGrid(60, 40));
   } catch (e) { console.warn('paperGrid define failed', e); }
   let paper = model.add('paperGrid').move(0, 0, -1).color(1,1,1).scale(1,1,0.08);
   let pencil = model.add();
   let pencilLead = pencil.add('tubeZ').move(0, 0, 0).color(1,1,0);
   let pencilTip = pencil.add('coneZ').move(0, 0, 0).color(currPencilColor[0], currPencilColor[1], currPencilColor[2]);
   let pencilLength = .5;

   // pixels array not needed; Pixel.draw() creates permanent cubes

   let status = { 
      left: { isPressed: false, isMoving: false, position: [0,0,0], color: [0,1,1]},  // position is local
      right: { isPressed: false, isMoving: false, position: [0,0,0], color: [0,1,1]},
      range: [1,1,1], // local value! distance between the x vertices on left and right, for now we only use x
      objPosition: [0,0,0],
      objColor: [.5, .5, 0]
   };

   // debug: if true, make the paper wave using noise to verify vertex mapping
   let debugWave = true;

   // remember last spawned pixel position (x,y) to avoid duplicates
   let lastPixel = null;

   // accumulated bumps created from touches; persist across frames
   let accumulatedBumps = [];

   // merge a shared pixel into accumulatedBumps (increases depth if nearby)
   const addPixelToAccum = (pix) => {
      try {
         let u = pix.x + 0.5;
         let v = pix.y + 0.5;
         const mergeRadius = 0.06;
         for (let b of accumulatedBumps) {
            let du = u - b.u, dv = v - b.v;
            let dist = Math.sqrt(du*du + dv*dv);
            if (dist < mergeRadius) {
               b.depth = Math.min(b.depth + 0.02, 0.2);
               b.count = (b.count||0) + 1;
               b.last = Date.now();
               return;
            }
         }
         // push a stronger initial bump for easier visual debugging
         accumulatedBumps.push({ u, v, radius: 0.12, depth: 0.06, count: 1, last: Date.now() });
      } catch (e) { console.warn('addPixelToAccum failed', e); }
   }

   let invModel = () => cg.mInverse(model.getGlobalMatrix()); // the inverse of global matrix = local matrix

   inputEvents.onMove = hand => {
      if (isXR()) {         
         //begin
         let leftPos = inputEvents.pos('left'); // global
         let rightPos = inputEvents.pos('right'); // global

         let localRight = cg.mTransform(invModel(), rightPos || [0,0,0]);
         
         let globalPaperMat = paper.getGlobalMatrix();
         // derive pencil global position from the stored status (status.right.position is model-local)
         let pencilGlobalFromStatus = cg.mTransform(model.getGlobalMatrix(), status.right.position);
         let [px, py, pz] = pencilGlobalFromStatus;
         let rightIsInBox = cg.isPointInBox([px, py, pz - pencilLength * 1.5], globalPaperMat);  // pencil in paper // TODO shift the right pos so that it doesnt need to

         if (hand == 'right') {
            status.right.position = localRight;
         }

        //  if (leftIsInBox) status.left.color = [1,0,1];
         if (rightIsInBox) status.right.color = [1,0,1];
         if (rightIsInBox) {
            status.right.color = [0,1,0];
            // spawn pixel at pencil position transformed into paper-local coordinates
            let now = Date.now();
            if (!status.right.lastSpawn) status.right.lastSpawn = 0;
            if (now - status.right.lastSpawn > 100) {
               try {
                  let invPaper = cg.mInverse(paper.getGlobalMatrix());
                  let paperLocal = cg.mTransform(invPaper, pencilGlobalFromStatus);
                  // invert paper-local Y to correct orientation and clamp to paper extents
                  let rawX = paperLocal[0];
                  let rawY = paperLocal[1];
                  let p = [];
                  p[0]= Math.max(-0.5, Math.min(0.5, rawX));
                  p[1] = Math.max(-0.5, Math.min(0.5, rawY));
                  p[2] = 1;

                  // avoid drawing duplicate pixels: compare by-value (x,y) against lastPixel
                //   if (lastPixel && lastPixel[0] === p[0] && lastPixel[1] === p[1] && lastPixel[2] === p[2]) return;
                  
                  // place pixel slightly above the paper surface so it's visible
                  let pixel = new Pixel(p[0], p[1], p[2], currPencilColor, paper);
                  lastPixel = p;
                //   pixel.draw();
                  shared.pixels.push(pixel); // add pixel to shared state so it gets broadcast to other clients;
                  server.broadcastGlobal('shared');
                //   console.log('spawning pixel at', paperLocal, '-> placed at', [px,py,pixelZ]);
               } catch (e) { console.warn('spawn pixel failed', e); }
               status.right.lastSpawn = now;
            }
         } else {
            status.right.color = [0.2,0.2,0.2]
         }
      }
   }

   inputEvents.onDrag = hand => { // continous while pressing and moving
      let leftPos = inputEvents.pos('left');
      let rightPos = inputEvents.pos('right');
      let localLeft  = cg.mTransform(invModel(), leftPos || [0,0,0]);
      let localRight = cg.mTransform(invModel(), rightPos || [0,0,0]);

      let globalMat = pencil.getGlobalMatrix();
      let leftIsInPencil = cg.isPointInBox(leftPos, globalMat); 
      let rightIsInPencil = cg.isPointInBox(rightPos, globalMat);

      if (isXR()) {            
         if (hand == 'right') {
            if (rightIsInPencil) {
            //    status.right.position[0] = localRight[0];
            //    status.right.position[1] = localRight[1];
            //    status.right.position[2] = localRight[2];
            // TODO: need to fix the reorientation on pinch for the hand first!
            }
         }
      }
   }

   // persistent debug marker for the center bump (one cube, updated each frame)
   // make it a child of `paper` so it's placed in paper-local coordinates
   let debugMarker = paper.add('cube').color(1,0,1).scale(.03);
   // also add a large world-space marker (model-space) so it's always visible for debugging
   let debugWorld = model.add('sphere').color(1,0,1).scale(.06);

   model.move(-0.5, 2, 0).animate(() => {   
        // synchronize shared state first so vertex mapping can use the latest pixels
        shared = server.synchronize('shared'); // BEGIN ANIMATE BY SYNCHRONIZING STATE.

      // build bump list from accumulated bumps (persist across frames)
      let bumps = [];
      // default center bump so we can see the effect without interaction
      bumps.push({ u: 0.5, v: 0.5, radius: 0.18, depth: 0.08 });

        // integrate new shared pixels into accumulatedBumps (mark processed to avoid duplicates)
        if (shared && Array.isArray(shared.pixels)) {
           for (let pix of shared.pixels) {
              if (!pix._appliedToMold) {
                 addPixelToAccum(pix);
                 try { pix._appliedToMold = true; } catch (e) { /* ignore if sync prevents mutation */ }
              }
           }
        }

        // copy accumulatedBumps into local bumps list
        for (let b of accumulatedBumps) bumps.push({ u: b.u, v: b.v, radius: b.radius, depth: b.depth });

        // debug: log bump summary and center z before/after applying bumps
        try {
           let centerPos = uvToXYZ([0.5, 0.5], [1,1,0.02], 'top');
           let zBefore = centerPos[2];
           let zAfter = zBefore;
           for (let b of bumps) {
              let du = 0.5 - b.u, dv = 0.5 - b.v;
              let dist = Math.sqrt(du*du + dv*dv);
              if (dist < b.radius) {
                 let sigma = b.radius * 0.5;
                 let fall = Math.exp(- (dist * dist) / (2 * sigma * sigma));
                 zAfter -= b.depth * fall;
              }
           }
           if (model.time % 1 < 0.05) console.log('co-mold: bumps=', bumps.length, 'accum=', accumulatedBumps.length, 'center z before=', zBefore.toFixed(4), 'after=', zAfter.toFixed(4));
        } catch(e) { console.warn('co-mold debug calc failed', e); }

        // remap paper vertices from UV to XYZ and apply bumps (top face only)
        // NOTE: size Z must match the paper scale to keep topology consistent
        const paperSize = [1, 1, 0.08];
        if (debugWave) {
           // noise-based waving surface for sanity check
           paper.setVertices((u, v) => {
              let pos = uvToXYZ([u, v], paperSize, 'top');
              // animate with noise
              let t = model.time;
              let freq = 3.0;
              let amp = 0.08;
              let n = cg.noise(freq * (u - 0.5) + t * 0.6, freq * (v - 0.5) + t * 0.4, t);
              let z = pos[2] + amp * (n - 0.5);
              return [pos[0], pos[1], z];
           });
        } else {
           paper.setVertices((u, v) => { 
               let pos = uvToXYZ([u, v], paperSize, 'top');
               let z = pos[2];
               for (let b of bumps) {
                  let du = u - b.u, dv = v - b.v;
                  let dist = Math.sqrt(du*du + dv*dv);
                  if (dist < b.radius) {
                     // radial gaussian-like falloff (finger-like molding)
                     let sigma = b.radius * 0.5;
                     let fall = Math.exp(- (dist * dist) / (2 * sigma * sigma));
                     z -= b.depth * fall;
                  }
               }
               return [ pos[0], pos[1], z ];
           });
        }
        // update debug marker to the paper-local position of the bump center so we can see it
        try {
           // compute center pos using the same paperSize used above
           let centerPos = uvToXYZ([0.5, 0.5], paperSize, 'top');
           // compute bumped z at center using bumps list
           let zCenter = centerPos[2];
           for (let b of bumps) {
              let du = 0.5 - b.u, dv = 0.5 - b.v;
              let dist = Math.sqrt(du*du + dv*dv);
              if (dist < b.radius) {
                 let sigma = b.radius * 0.5;
                 let fall = Math.exp(- (dist * dist) / (2 * sigma * sigma));
                 zCenter -= b.depth * fall;
              }
           }
           // place the debug marker slightly above the bumped surface so it's visible
           debugMarker.identity().move(centerPos[0], centerPos[1], zCenter + 0.02).color(1,0,1).scale(.03);
           // compute world position of that center and also place a model-level debug marker there
           try {
              let worldCenter = cg.mTransform(paper.getGlobalMatrix(), [centerPos[0], centerPos[1], zCenter]);
              // place debugWorld in model-local coords
              let modelLocalCenter = cg.mTransform(cg.mInverse(model.getGlobalMatrix()), worldCenter);
              debugWorld.identity().move(modelLocalCenter[0], modelLocalCenter[1], modelLocalCenter[2] + 0.04).color(1,0,1).scale(.06);
              if (model.time % 1 < 0.05) console.log('co-mold: worldCenter=', worldCenter.map(n=>n.toFixed(4)), 'modelLocal=', modelLocalCenter.map(n=>n.toFixed(4)));
           } catch(e) { console.warn('co-mold world debug failed', e); }
        } catch (e) { console.warn('debugMarker update failed', e); }

        // draw pencil and parts
        pencil.identity().move(status.right.position[0], status.right.position[1], status.right.position[2]).scale(1);      
        pencilLead.identity().move(0,0,0).color(status.right.color[0], status.right.color[1], status.right.color[2]).scale(.05, .05,pencilLength);
        pencilTip.identity().move(0, 0, -.58 ).turnY(Math.PI).scale(.05, .05, .08);
    });
}