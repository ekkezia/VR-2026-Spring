import { split } from "../render/core/cg.js";
import { texts } from "../util/texts.js";
import { fetchWikipediaArticle } from "../fetchWikipediaArticle.js";
import * as cg from "../render/core/cg.js";

export const init = async model => {
   let viewfinder = model.add();
   let horizontalTop, horizontalBottom, verticalLeft, verticalRight;
   horizontalTop = viewfinder.add('square').move(0, 12, 0).scale(1, 10, 0.02).color(1,0,0);
   horizontalBottom = viewfinder.add('square').move(0, -0.5, 0).scale(1, 0.02, 0.02).color(0,1,0);
   verticalLeft = viewfinder.add('square').move(-0.5, 0, 0).scale(0.02, 1, 0.02).color(0,0,1);
   verticalRight = viewfinder.add('square').move(0.5, 0, 0).scale(0.02, 1, 0.02).color(1,1,0);
      
      let status = { 
         left: { isPressed: false, isMoving: false, position: [0,0,0], color: [0,1,1]},  // position is local
         right: { isPressed: false, isMoving: false, position: [0,0,0], color: [0,1,1]},
         width: 1,
         height: 1,
         range: [1,1,1], // local value! distance between the x vertices on left and right, for now we only use x
         objPosition: [0,0,0],
         objColor: [.5, .5, 0]
      };
      
      let invModel = () => cg.mInverse(model.getGlobalMatrix()); // the inverse of global matrix = local matrix
   
      inputEvents.onMove = hand => {
         if (isXR()) {         
            //begin
            let leftPos = inputEvents.pos('left'); // global
            let rightPos = inputEvents.pos('right'); // global
   
            let localLeft = cg.mTransform(invModel(), leftPos || [0,0,0]);
            let localRight = cg.mTransform(invModel(), rightPos || [0,0,0]);
            
            if (hand == 'left') {
               status.left.position = localLeft;
               status.width = localRight[0] - localLeft[0];
               status.height = localRight[1] - localLeft[1];
               status.range = [status.width, status.height, 1];
            } 
            if (hand == 'right') {
               status.right.position = localRight;
            } 
         }
      }
   
   fetchWikipediaArticle('Virtual_reality', text => {
      let myText = clay.text(split(text, 60));
      model.add(myText).move(-.36,1.8 ,0).color(1,1,1);
   });
   model.animate(() => {   
      let x0 = status.left.position[0]; // top left
      let y0 = status.left.position[1];
      let x1 = status.left.position[0] + status.width; // top right
      let y1 = status.left.position[1];
      let x2 = status.left.position[0]; // bottom left
      let y2 = status.left.position[1] + status.height;
      let x3 = status.left.position[0] + status.width; // bottom right
      let y3 = status.left.position[1] + status.height;

      // horizontalTop.identity().move(x0, y0, 0).scale(status.width, 1, 1);
      // horizontalBottom.identity().move(x1, y1, 0).scale(status.width, 1, 1);
      // verticalLeft.identity().move(x2, y2, 0).scale(1, status.height, 1);
      // verticalRight.identity().move(x3, y3, 0).scale(1, status.height, 1);
   });
}

