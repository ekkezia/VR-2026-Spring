import * as cg from '../render/core/cg.js';
import { ControllerBeam } from '../render/core/controllerInput.js';

// INTERSECT CONTROLLER BEAMS WITH A RECTANGLE.

let draw = false;
let erase = false;
let pressed = false;
let hoveringUI = false;
let points = [];

export const init = async (model) => {
	const inch = 0.0254,
		y = 1;
	let round = (t) => ((t + '').charAt(0) == '-' ? '' : ' ') + cg.round(t);
	let beamL = new ControllerBeam(model, 'left');
	let beamR = new ControllerBeam(model, 'right');

	inputEvents.onPress = (hand) => {
		if (hand === 'right') {
			pressed = true;
			if (!hoveringUI) draw = true;
		}
		if (hand === 'left') {
			pressed = true;
			if (!hoveringUI) erase = true;
		}
	};
	inputEvents.onRelease = (hand) => {
		if (hand === 'right') {
         pressed = false;
			draw = false;
		}
		if (hand === 'left') {
         pressed = false;
			erase = false;
		}
	};

   const drawPoint = model.add();


   const askBtn = model
        .add('diskZ')
        .move(0, 1, -2)
        .scale(0.4)
        .color(1, 0, 0);
    askBtn
        .add(clay.text('ASK'))
        .move(inch * 3 * -10, 0.5, 0)
        .color(1, 1, 1)
        .scale(40);

   const responseLabel = model.add();

   const askDrawing = (pointsToAsk) => {
      // Project 3D points (x, y) onto a 512x512 canvas
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 512, 512);

      if (pointsToAsk.length > 0) {
         const xs = pointsToAsk.map(p => p[0]);
         const ys = pointsToAsk.map(p => p[1]);
         const minX = Math.min(...xs), maxX = Math.max(...xs);
         const minY = Math.min(...ys), maxY = Math.max(...ys);
         const rangeX = maxX - minX || 1;
         const rangeY = maxY - minY || 1;

         ctx.fillStyle = 'white';
         for (const p of pointsToAsk) {
            const px = ((p[0] - minX) / rangeX) * 480 + 16;
            const py = 512 - (((p[1] - minY) / rangeY) * 480 + 16); // flip Y axis
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fill();
         }
      }

      const base64 = canvas.toDataURL('image/png').split(',')[1];

      // Show "thinking..." while waiting
      if (responseLabel.nChildren() > 0) responseLabel.remove(0);
      responseLabel.add(clay.text('thinking...')).move(-0.5, 1.5, -2).scale(10).color(1, 1, 0);

      fetch('http://localhost:11434/api/generate', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            model: 'llava',
            prompt: 'This is a VR drawing made of dots. What object or shape does it look like? Answer in 5 words or less.',
            images: [base64],
            stream: false,
         }),
      })
      .then(r => r.json())
      .then(data => {
         const answer = data.response ?? 'no response';
         console.log('Ollama answer:', answer);
         if (responseLabel.nChildren() > 0) responseLabel.remove(0);
         responseLabel.add(clay.text(answer)).move(-0.5, 1.5, -2).scale(10).color(0, 1, 1);
      })
      .catch(err => {
         if (responseLabel.nChildren() > 0) responseLabel.remove(0);
         responseLabel.add(clay.text('error')).move(-0.5, 1.5, -2).scale(10).color(1, 0, 0);
         console.error(err);
      });
   };

	model.animate(() => {
		// while (model.nChildren() > 1) {
		//    model.remove(1);
		// }

		// LEFT CONTROLLER BEAM SHOWS TEXT OF U,V,D AND MAKES A STEADY VIBRATION

		beamL.update();
		beamR.update();
		const bend = Math.PI / 4;
		const lBeamMat = cg.mMultiply(beamL.m, cg.mRotateX(-bend));
		const rBeamMat = cg.mMultiply(beamR.m, cg.mRotateX(-bend));

		if (draw) {
			const point = drawPoint.add('diskZ').scale(0.0001).color(1, 0, 1).dull();
			points.push(point);
			// points[i].node.getGlobalMatrix().slice(12,15) to get the position of the point  ;

			point.setMatrix(cg.mMultiply(rBeamMat, cg.mTranslate(0, 0, -0.5)));
			point.scale(0.01);
			if (model.time % 0.04 < 0.02) vibrate('right', 1, 20);
		}

		if (erase) {
         // find the pos of the point 
         const erasePoint = cg.mMultiply(lBeamMat, cg.mTranslate(0, 0, -0.5));
         for (let i = 0; i < points.length; i++) {
            const pointPos = points[i].getGlobalMatrix().slice(12, 15);
            const distance = Math.sqrt(
               Math.pow(pointPos[0] - erasePoint[12], 2) +
               Math.pow(pointPos[1] - erasePoint[13], 2) +
               Math.pow(pointPos[2] - erasePoint[14], 2)
            );
            if (distance < 0.05) { // if the point is within 5cm of the erase point
               drawPoint.remove(points[i]);
               points.splice(i, 1); // remove the point from the array
               i--; // adjust index after removal
            }
         }
         if (model.time % 0.04 < 0.02) vibrate('left', 1, 20);
		}

      let hitAsk =
            beamR.hitRect(askBtn.getGlobalMatrix()) ||
            beamL.hitRect(askBtn.getGlobalMatrix());
        hoveringUI = !!hitAsk;
        if (hitAsk) {
            askBtn.color(1, 0.5, 0.5);
            if (pressed) {
                const pointsToAsk = points.map(p => p.getGlobalMatrix().slice(12, 15));
                askDrawing(pointsToAsk);
            }
        } else {
            askBtn.color(1, 0, 0);
        }
	});
};
