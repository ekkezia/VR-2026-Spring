import * as cg from "../render/core/cg.js";

const GAZE_RADIUS = 2;

const BACKDROP_SIZE = 4;   // matches viewfinder square scale(4,4,...)
const CELL_SIZE = 1/3;     // size of each small square
const CENTER_Y = 1.5;      // matches viewfinder move(0, 1.5, ...)

const halfSteps = Math.round((BACKDROP_SIZE / CELL_SIZE) / 2); // = 6

export const init = async model => {
   let photo = model.add();
   model.txtrSrc(1, '../media/textures/brick.png');
   photo.add('square').move(0, CENTER_Y, -0.6).scale(BACKDROP_SIZE, BACKDROP_SIZE, 0.01).color(1,1,1).txtr(1);
   
   for (let u = -halfSteps ; u <= halfSteps ; u++)
   for (let v = -halfSteps ; v <= halfSteps ; v++)
      model.add()
         .move(u * CELL_SIZE * 1.5, v * CELL_SIZE * 1.5 + CENTER_Y, -0.5)
         .scale(CELL_SIZE / 2 * 1.5, CELL_SIZE / 2 * 1.5, 0.01)
         .add('square');

   model.animate(() => {
      let nMin = -1, dMin = 1000;
      let mm = cg.mMultiply(clay.root().viewMatrix(0), worldCoords);

      let distances = [];
      for (let n = 1 ; n < model.nChildren() ; n++) {
         let m = cg.mMultiply(mm, model.child(n).getMatrix());
         let d = m[12]*m[12] + m[13]*m[13];
         distances.push({ n, d, inFront: m[14] < 0 });
         
         if (m[14] < 0 && d < dMin) {
            dMin = d;
            nMin = n;
         }
      }

      for (let { n, d, inFront } of distances) {
         const normalizedD = Math.min(d / 2, 1);
         const opacity = (!inFront || d > GAZE_RADIUS) ? 1 : 0.85 * normalizedD;
         model.child(n).child(0)
            .color([0, 0, 0])
            .opacity(opacity)
            .identity().scale(1);
      }
   });
}