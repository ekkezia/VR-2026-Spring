/*
   This scene shows how to animate a ball with simple physics.
   The ball is affected by gravity, and whenever it hits a
   wall it bounces off the wall.
*/
import * as cg from '../../js/render/core/cg.js';

export const init = async model => {

   // MAKE A RED BALL.
   let color = [1, 0, 1];

   let ball = model.add('sphere').color('red');
   let ball2 = model.add('sphere').color('green');
   let floor = model.add('square').color('white');
   let wallL = model.add('square').color('blue');
   let wallR = model.add('square').color('blue');
//    .turnY(0);

   // INITIALIZE POSITION, VELOCITY AND GRAVITY.

   let x = 0;
   let y = 0;

   let dx = .1;
   let dy = .1;

   let gravity = -.003;
   let counterGravity = -.002;

   model.move(0,1.7,0).animate(() => {

      // PLACE THE BALL.

      ball.identity().move(.1*x,.1*y,0).scale(.1);
      ball2.identity().move(-.1*x,.1*y,0).scale(.1);
      floor.identity().move(0,-.4 - .05,0).scale(.5, .5, .1).turnX(-Math.PI/2);
      wallL.identity().move(-.4 - .05,0,0).scale(1, 1, .1).turnY(Math.PI/2);
      wallR.identity().move(0.4 + .05,0,0).scale(1, 1, .1).turnY(-Math.PI/2);

      // MOVE THE BALL TO ITS NEXT POSITION.

      x += dx;
      y += dy;

      // APPLY GRAVITY.

      dy += gravity;
      dy -= counterGravity;

      // IF THE BALL HITS A WALL, REVERSE VELOCITY.

      let ballMat = ball.getGlobalMatrix();
      let ball2Mat = ball2.getGlobalMatrix();
      let ballsIntersect = cg.isPointInBox(ball2Mat, ballMat); 
      if (ballsIntersect) {
        color = [Math.random() + .5 % 1, Math.random() + .2 % 1, Math.random() + .1 % 1];
      }

      if (x > 4 || x < -4 || ballsIntersect) {
        dx = -dx;
      }
      if (y < -4)
        dy = -dy * .999;
   });
}

