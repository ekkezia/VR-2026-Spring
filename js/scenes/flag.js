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

   model.animate(() => {

      // SIMULATE THE APPEARANCE OF A BILLOWING FLAG.

      terrain.setVertices((u,v) => {
                  // Convert uv -> xyz, then deform in xyz space
                  const theta = 2 * Math.PI * u;
                  const phi = Math.PI * (v - 0.5);
                  const base = [
                     Math.cos(phi) * Math.cos(theta),
                     Math.sin(phi),
                     Math.cos(phi) * Math.sin(theta)
                  ];
                  const t = model.time
                  const ripple = 0.02 * Math.sin(6 * (base[0] + base[1] + base[2]) + t * 3);
                  const noise = 0.05 * cg.noise(3 * base[0] + t, 3 * base[1], 3 * base[2]);
         
                  return [base[0], base[1], base[2]];
         
         // return [ 3*u,
         //          2*v-1,
         //          .4 * u * cg.noise(3*u-model.time,3*v,model.time)
         //        ];
      });
   });
}

