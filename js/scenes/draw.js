import * as cg from '../render/core/cg.js';
import { ControllerBeam } from '../render/core/controllerInput.js';

// INTERSECT CONTROLLER BEAMS WITH A RECTANGLE.

let currentScore = 0;
const y = 1.5;

export const init = async (model) => {
	const inch = 0.0254,
		y = 1;
	let round = (t) => ((t + '').charAt(0) == '-' ? '' : ' ') + cg.round(t);
	let rect = model.add('square').move(0, y, 0).scale(1, 1, 1);
	let beamL = new ControllerBeam(model, 'left');
	let beamR = new ControllerBeam(model, 'right');

	inputEvents.onPress = (hand) => {
		state.menuBtnPressed = true;
	};

	inputEvents.onRelease = (hand) => {
		state.menuBtnPressed = false;
	};

	model.animate(() => {
		beamL.update();
		beamR.update();
		rect.color(0.25, 0.35, 0.5);

		// while (model.nChildren() > 1) {
		// 	model.remove(1);
		// }
		// LEFT CONTROLLER BEAM SHOWS TEXT OF U,V,D AND MAKES A STEADY VIBRATION

		let uvdL = beamL.hitRect(rect.getGlobalMatrix());
		if (uvdL) {
			rect.color(1, 1, 1);
			let u = uvdL[0],
				v = uvdL[1],
				d = uvdL[2];
			let text = 'u:' + round(u) + '\nv:' + round(v) + '\nd:' + round(d);
			model
				.add(clay.text(text))
				.move(-0.036, y + 0.03, 0.001)
				.scale(0.02 / inch)
				.color(0, 0, 0);
			vibrate('left', u * u < 0.033 && v * v < 0.09 ? 1 : 0.4);
		}

		// RIGHT CONTROLLER BEAM MOVES A TARGET OBJECT AND MAKES A PULSED VIBRATION

		let uvdR = beamR.hitRect(rect.getGlobalMatrix());
		if (uvdR) {
			rect.color(1, 0.5, 0.5);
			let u = uvdR[0],
				v = uvdR[1];
			if (state.menuBtnPressed) {
				model
					.add('diskZ')
					.move(0.2 * u, y + 0.1 * v, 0.001)
					.scale(0.01)
					.color(0, 0, 0)
					.dull();
				if (model.time % 0.04 < 0.02) vibrate('right', 1, 20);
			}
		}

		// Play/pause music and run game logic based on state.started
		// Always ensure only the active song is playing
		for (let i = 0; i < state.audioElement.length; i++) {
			if (i === state.activeSongIdx) {
				if (state.started && state.audioElement[i].paused) {
					state.audioElement[i].play();
				}
				if (!state.started && !state.audioElement[i].paused) {
					state.audioElement[i].pause();
					state.audioElement[i].currentTime = 0;
				}
			} else {
				if (!state.audioElement[i].paused) {
					state.audioElement[i].pause();
					state.audioElement[i].currentTime = 0;
				}
			}
		}
		if (!state.started) {
			return;
		}
	});
};
