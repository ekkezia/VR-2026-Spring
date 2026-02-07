/*
   This scene is an example of how to use procedural texture
   to animate the shape of an object. In this case the object
   is a waving flag. The noise function is used to animate
   the position of each vertex of the flag geometry.
*/

import * as cg from "../render/core/cg.js";

export const init = async model => {
   // DEFINE A NEW TERRAIN OBJECT TYPE AS A 30x20 GRID.

   clay.defineMesh('myTerrain', clay.createGrid(30, 20));

   // LOAD A CHECKERBOARD TEXTURE FOR IT.

   model.txtrSrc(1, '../media/textures/chessboard.png');

   // INSTANTIATE THE NEW TERRAIN OBJECT.

   let terrain = model.add('sphere').txtr(1);

   // MOVE THE OBJECT INTO PLACE.

   terrain.identity().move(-.4,1.5,0).scale(.4);
      let handL = model.add('diskX').color(0,1,0);
      let handR = model.add('diskX').color(0,1,0);

      // markers to visualize intersections (reuse each frame)
      const maxMarkers = 128;
      let markers = [];
      for (let i = 0; i < maxMarkers; i++) {
         markers.push(model.add('sphere').scale(0.005).color(1,0,0));
      }
      let avgMarker = model.add('sphere').scale(0.01).color(0,1,0);
   
      let status = { 
         left: { isPressed: false, isMoving: false, position: [0,0,0], rotation: [0,0,0], color: [0,1,1]},  // position is local
         right: { isPressed: false, isMoving: false, position: [0,0,0], rotation: [0,0,0], color: [0,1,1]},
         range: [1,1,1], // local value! distance between the x vertices on left and right, for now we only use x
         objPosition: [0,0,0],
         objColor: [.5, .5, 0]
      };
   
      let invModel = () => cg.mInverse(model.getGlobalMatrix()); // the inverse of global matrix = local matrix
   
      inputEvents.onMove = hand => {
         if (isXR()) {
            // reset
            status.left.color = [0, 1, 1];
            status.right.color = [0, 1, 1];
            
            //begin
            let leftPos = inputEvents.pos('left'); // global
            let rightPos = inputEvents.pos('right'); // global
            // let leftRot = inputEvents.rot('left'); // global
            // let rightRot = inputEvents.rot('right'); // global
   
            // transform hand globals into the terrain (sphere) local space
            const invTerrain = cg.mInverse(terrain.getGlobalMatrix());
            let localLeft  = cg.mTransform(invTerrain, leftPos || [0,0,0]);
            let localRight = cg.mTransform(invTerrain, rightPos || [0,0,0]);
            
            let globalMat = terrain.getGlobalMatrix();
            let leftIsInBox = cg.isPointInBox(leftPos, globalMat); 
            let rightIsInBox = cg.isPointInBox(rightPos, globalMat); 
            
            if (hand == 'left') {
               status.left.position = localLeft;
               // status.left.rotation = leftRot;
               status.left.color = [1,1,0]; // if hand is moving change color to CYAN
            }  else {
               status.left.color = [0, 1, 1] // reset
            }
               
            if (hand == 'right') {
               status.right.position = localRight;
               // status.right.rotation = leftRot;
               status.right.color = [1,1,0]; // if hand is moving change color to CYAN
               
            } else {
               status.right.color = [0, 1, 1]
            }
   
            if (leftIsInBox) status.left.color = [1,0,1];
            if (rightIsInBox) status.right.color = [1,0,1];
            if (leftIsInBox && rightIsInBox) {
               status.objColor = [0, 0.5, 0];
               status.left.color = [0,1,0];
               status.right.color = [0,1,0];
               status.range[0] = Math.abs(localRight[0] - localLeft[0]); // if both hands are in the box, allow scaling!
               // status.range[1] = Math.abs(localRight[1] - localLeft[1]);
               console.log('range y', status.range[1]);
               // status.range.z = Math.abs(localRight[2] - localLeft[2]);
            }
         }
      }
   
      inputEvents.onDrag = hand => { // continous while pressing and moving
         let leftPos = inputEvents.pos('left');
         let rightPos = inputEvents.pos('right');
         const invTerrain = cg.mInverse(terrain.getGlobalMatrix());
         let localLeft  = cg.mTransform(invTerrain, leftPos || [0,0,0]);
         let localRight = cg.mTransform(invTerrain, rightPos || [0,0,0]);
   
         let globalMat = terrain.getGlobalMatrix();
         let leftIsInBox = cg.isPointInBox(leftPos, globalMat); 
         let rightIsInBox = cg.isPointInBox(rightPos, globalMat);
   
         if (isXR()) {
            if (hand == 'left') {
               // check if hand is touching the cube
               if (leftIsInBox && !rightIsInBox) {
                  status.objColor = [0.5, 0, 0.5];
                  status.objPosition[0] = localLeft[0]; 
                  status.objPosition[1] = localLeft[1];
                  status.objPosition[2] = localLeft[2];
   
                  status.left.position[0] = localLeft[0];
                  status.left.position[1] = localLeft[1];
                  status.left.position[2] = localLeft[2];
               } else {
                  status.objColor = [0.5, 0.5, 0];
               }
            }
               
            if (hand == 'right') {
               status.right.isPressed = rightIsInBox;
               if (rightIsInBox && !leftIsInBox) {
                  status.objColor = [0.5, 0, 0.5];
                  status.objPosition[0] = localRight[0];
                  status.objPosition[1] = localRight[1];
                  status.objPosition[2] = localRight[2];
   
                  status.right.position[0] = localRight[0];
                  status.right.position[1] = localRight[1];
                  status.right.position[2] = localRight[2];
               } else {
                  status.objColor = [0.5, 0.5, 0];
               }
            }
         }
      }


   
      let vertices = []

   model.animate(() => {
        // reset per-frame vertex list
        vertices.length = 0;
      
      // // hand sphere debug
      handL.identity().move(status.left.position[0],  status.left.position[1],  status.left.position[2]).color(status.left.color[0], status.left.color[1], status.left.color[2]).scale(0.2);
      handR.identity().move(status.right.position[0], status.right.position[1], status.right.position[2]).color(status.right.color[0], status.right.color[1], status.right.color[2]).scale(0.2);

      // SIMULATE THE APPEARANCE OF A BILLOWING FLAG.

      terrain.setVertices((u,v) => {
                  // Convert uv -> xyz, then deform in xyz space
                  // angles
                  const theta = 2 * Math.PI * u; // horizontal
                  const phi = Math.PI * (v - 0.5); // vertical
                  // xyz coordinates of a sphere
                  const base = [
                     Math.cos(phi) * Math.cos(theta),
                     Math.sin(phi),
                     Math.cos(phi) * Math.sin(theta)
                  ];
                  const t = model.time

                  // base position (unit sphere) -> will be deformed by hands
                  let pos = [base[0], base[1], base[2]];
                  // finger-indent deformation: sum contributions from left and right hands
                  const hands = [status.left.position, status.right.position];
                  const R = 0.25;        // influence radius (tune)
                  const strength = 0.12; // max inward push (tune)
                  const k = 2;           // falloff exponent
                  for (let hi = 0; hi < hands.length; hi++) {
                     const h = hands[hi] || [0,0,0];
                     const dx = pos[0] - h[0];
                     const dy = pos[1] - h[1];
                     const dz = pos[2] - h[2];
                     const d = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1e-6;
                     if (d < R) {
                        const w = Math.pow(1 - d / R, k);
                        // direction from hand toward vertex (moves vertex away from hand -> inward)
                        const dirx = dx / d, diry = dy / d, dirz = dz / d;
                        pos[0] += dirx * strength * w;
                        pos[1] += diry * strength * w;
                        pos[2] += dirz * strength * w;
                     }
                  }
                  // collect this vertex (in terrain-local space)
                  vertices.push({ u: u, v: v, pos: pos });
                  return pos;
         
                  // flag
         // return [ 3*u,
         //          2*v-1,
         //          .4 * u * cg.noise(3*u-model.time,3*v,model.time)
         //        ];
         
      });

      // ---- disk / sphere intersection test ----
      try {
         let invTerrain = cg.mInverse(terrain.getGlobalMatrix());

         // disk (handL) center in terrain-local space
         let diskMat = handL.getGlobalMatrix();
         let diskCenterGlobal = [diskMat[12], diskMat[13], diskMat[14]];
         let diskCenterLocal = cg.mTransform(invTerrain, diskCenterGlobal);

         // compute disk normal by probing local +Z of the disk
         let probeGlobal = cg.mTransform(handL.getGlobalMatrix(), [0,0,1]);
         let probeLocal = cg.mTransform(invTerrain, probeGlobal);
         let diskNormalLocal = cg.normalize(cg.subtract(probeLocal, diskCenterLocal));

         // compute disk radius by transforming a unit-x point on the disk
         let edgeGlobal = cg.mTransform(handL.getGlobalMatrix(), [1,0,0]);
         let edgeLocal = cg.mTransform(invTerrain, edgeGlobal);
         let diskRadius = cg.norm(cg.subtract(edgeLocal, diskCenterLocal));

         const planeDistEps = 0.02;
         let intersectVerts = [];
         for (let vInfo of vertices) {
            let rel = cg.subtract(vInfo.pos, diskCenterLocal);
            let distAlongNormal = cg.dot(rel, diskNormalLocal);
            if (Math.abs(distAlongNormal) <= planeDistEps) {
               // projection onto disk plane
               let proj = cg.subtract(vInfo.pos, cg.scale(diskNormalLocal, distAlongNormal));
               let radial = cg.subtract(proj, diskCenterLocal);
               if (cg.norm(radial) <= diskRadius) {
                  intersectVerts.push(vInfo);
               }
            }
         }
         if (intersectVerts.length) console.log('intersections:', intersectVerts.length);

         // update visual markers and compute average (u,v) and position
         if (intersectVerts.length) {
            let sum = [0,0,0];
            let sumU = 0, sumV = 0;
            for (let i = 0; i < markers.length; i++) {
               if (i < intersectVerts.length) {
                  let vi = intersectVerts[i];
                  sum[0] += vi.pos[0]; sum[1] += vi.pos[1]; sum[2] += vi.pos[2];
                  sumU += vi.u; sumV += vi.v;
                  // transform to global for marker placement
                  let gpos = cg.mTransform(terrain.getGlobalMatrix(), vi.pos);
                  markers[i].identity().move(gpos[0], gpos[1], gpos[2]).scale(0.01).color(1,0,0);
               } else {
                  // hide unused markers
                  markers[i].identity().move(9999,9999,9999).scale(0.0001);
               }
            }
            let n = intersectVerts.length;
            let avgLocal = [sum[0]/n, sum[1]/n, sum[2]/n];
            let avgU = sumU / n, avgV = sumV / n;
            let avgGlobal = cg.mTransform(terrain.getGlobalMatrix(), avgLocal);
            avgMarker.identity().move(avgGlobal[0], avgGlobal[1], avgGlobal[2]).scale(0.02).color(0,1,0);
            console.log('avg uv:', avgU.toFixed(3), avgV.toFixed(3), 'avgPos:', avgGlobal);
         } else {
            // hide all markers
            for (let i = 0; i < markers.length; i++) markers[i].identity().move(9999,9999,9999).scale(0.0001);
            avgMarker.identity().move(9999,9999,9999).scale(0.0001);
         }
      } catch (e) {
         console.warn('intersection test failed:', e);
      }
   });
}

