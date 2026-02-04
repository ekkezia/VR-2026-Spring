import * as cg from '../../js/render/core/cg.js';

export const init = async model => {
   let obj1 = model.add('cube');
   let handL = model.add('sphere').scale(0.01).color(0,1,0);
   let handR = model.add('sphere').scale(0.01).color(0,1,0);

   let status = { 
      left: { isPressed: false, isMoving: false, position: [0,0,0], color: [0,1,1]},  // position is local
      right: { isPressed: false, isMoving: false, position: [0,0,0], color: [0,1,1]},
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

         let localLeft  = cg.mTransform(invModel(), leftPos || [0,0,0]);
         let localRight = cg.mTransform(invModel(), rightPos || [0,0,0]);
         
         let globalMat = obj1.getGlobalMatrix();
         let leftIsInBox = cg.isPointInBox(leftPos, globalMat); 
         let rightIsInBox = cg.isPointInBox(rightPos, globalMat); 
         
         if (hand == 'left') {
            status.left.position = localLeft;
            status.left.color = [1,1,0]; // if hand is moving change color to CYAN
         }  else {
            status.left.color = [0, 1, 1] // reset
         }
            
         if (hand == 'right') {
            status.right.position = localRight;
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
      let localLeft  = cg.mTransform(invModel(), leftPos || [0,0,0]);
      let localRight = cg.mTransform(invModel(), rightPos || [0,0,0]);

      let globalMat = obj1.getGlobalMatrix();
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

   model.move(0,1,0).scale(.1).animate(() => {
      obj1.identity().color(status.objColor).scale(status.range[0], status.range[1], status.range[2]).move(status.objPosition[0], status.objPosition[1], status.objPosition[2]);
      
      // hand sphere debug
      handL.identity().move(status.left.position[0],  status.left.position[1],  status.left.position[2]).color(status.left.color[0], status.left.color[1], status.left.color[2]);
      handR.identity().move(status.right.position[0], status.right.position[1], status.right.position[2]).color(status.right.color[0], status.right.color[1], status.right.color[2]);
   });
}