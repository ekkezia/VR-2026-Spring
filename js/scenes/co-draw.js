/*
   This scene is an example of how to use procedural texture
   to animate the shape of an object. In this case the object
   is a waving flag. The noise function is used to animate
   the position of each vertex of the flag geometry.
*/

import * as cg from "../render/core/cg.js";

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
    let paper = model.add('cube').move(0, 0, -1).color(1,1,1).scale(1,1,0.02);
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

   // remember last spawned pixel position (x,y) to avoid duplicates
   let lastPixel = null;

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
                  if (lastPixel && lastPixel[0] === p[0] && lastPixel[1] === p[1] && lastPixel[2] === p[2]) return;
                  
                  // place pixel slightly above the paper surface so it's visible
                  let pixel = new Pixel(p[0], p[1], p[2], currPencilColor, paper);
                  lastPixel = p;
                  pixel.draw();
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

   model.move(-0.5, 2, 0).animate(() => {   
        paper.identity().move(0, 0, -.5).scale(1,1,.05);   
      
        pencil.identity().move(status.right.position[0], status.right.position[1], status.right.position[2]).scale(1);      
        pencilLead.identity().move(0,0,0).color(status.right.color[0], status.right.color[1], status.right.color[2]).scale(.05, .05,pencilLength);
        pencilTip.identity().move(0, 0, -.58 ).turnY(Math.PI).scale(.05, .05, .08);

        shared = server.synchronize('shared'); // BEGIN ANIMATE BY SYNCHRONIZING STATE.
        if (shared.pixels <= 0) return; // no pixels to draw yet
        for (let pix of shared.pixels) {
            console.log(shared.pixels.length, shared.pixels[0])
            pix.draw(); // redraw all pixels every frame (for now we dont store the drawn pixels in state, just the data needed to draw them, so we need to redraw every frame)
        }
    });
}