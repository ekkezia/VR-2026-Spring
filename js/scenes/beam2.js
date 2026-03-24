import * as cg from '../render/core/cg.js';
import { ControllerBeam } from '../render/core/controllerInput.js';

// INTERSECT CONTROLLER BEAMS WITH A RECTANGLE.
const SFX_URL = '/media/sound/bounce/2.wav';
let sfxBuffer = null;

let currentScore = 0;
const y = 1.5;

const createAudioContext = () =>
	new (window.AudioContext || window.webkitAudioContext)();
const state = {
	audioContext: createAudioContext(),
	audioElement: [],
	audioBuffer: [],
	started: false,
	pressed: false,
	released: false,
	lyrics: [],
	loading: false,
	activeSongIdx: null,
	currentBeatIdx: 0,
	currentScore: 0,
	commentTimer: -999,
	beamDisplayPos: {
		left: [0, 0, 0],
		right: [0, 0, 0],
	},
	beamDisplayRot: {
		left: [0, 0, 0],
		right: [0, 0, 0],
	},
};
const mixColor = (base, amount) => [
	base[0] + (1 - base[0]) * amount,
	base[1] + (1 - base[1]) * amount,
	base[2] + (1 - base[2]) * amount,
];

export const init = async (model) => {
	const inch = 0.0254,
		y = 1;
	let round = (t) => ((t + '').charAt(0) == '-' ? '' : ' ') + cg.round(t);
	let beamL = new ControllerBeam(model, 'left');
	let beamR = new ControllerBeam(model, 'right');

	// Preload SFX buffer
	try {
		const sfxResponse = await fetch(SFX_URL);
		const sfxArrayBuffer = await sfxResponse.arrayBuffer();
		sfxBuffer = await state.audioContext.decodeAudioData(
			sfxArrayBuffer.slice(0),
		);
	} catch (err) {
		console.error('Failed to load SFX:', err);
	}

	const lyricNodes = [];

	const LYRIC_Z = -1.0;

	const buildLyrics = async (path) => {
		try {
			const lyricsResponse = await fetch(path);
			const lyrics = await lyricsResponse.json();
			return lyrics;
		} catch (err) {
			console.error('Failed to load lyrics:', err);
		}
	};

	// menu
	// Load songs.json
	const response = await fetch('/media/sound/json/songs.json');
	const songs = await response.json();

	const ANTICIPATION_TIME = 1;
	// Preload all audio files and store in a map
	for (let i = 0; i < songs.length; i++) {
		const song = songs[i];
		console.log('Preloading audio for song:', song.title);
		try {
			state.audioElement.push(new Audio(song.url));
			state.audioElement[state.audioElement.length - 1].crossOrigin =
				'anonymous';

			console.log('Loaded Audio Element', state.audioElement);
			state.loading = false;

			const lyrics = await buildLyrics(song.beatUrl);
			state.lyrics.push([...lyrics]);

			// pre create the lyrics, but just show them as opacity 0 first, then we can just update the opacity on each frame to show/hide them with a fade
			// Random x/y within bounds for each lyric
			const songNodes = [];
			for (let j = 0; j < lyrics.length; j++) {
				const beatTime = lyrics[j].time;
				const spawnTime = beatTime - ANTICIPATION_TIME;
				songNodes.push({
					idx: j,
					position: [lyrics[j].x, lyrics[j].y, LYRIC_Z], // todo: need to centerize text
					opacity: 0.3,
					beatTime: beatTime,
					spawnTime: spawnTime,
					color: lyrics[j].rgb,
					hit: false,
					node: model
						.add('square')
						.move(lyrics[j].x, lyrics[j].y, lyrics[j].z)
						.color(lyrics[j].rgb[0], lyrics[j].rgb[1], lyrics[j].rgb[2]) // start invisible
						.scale(0), // start scaled down
				});
			}

			lyricNodes.push(songNodes);
			console.log(
				'Loaded lyrics for song:',
				song.title,
				lyrics.length,
				state.lyrics,
				lyricNodes.length,
			);
		} catch (err) {
			console.error(err);
		}
	}

	console.log('Initialized scene with lyrics:', model.nChildren(), lyricNodes);

	// Create a menu group to hold all song menus
	const menuGroup = model.add();

	// Layout parameters
	const startY = 2.0;
	const gapY = 0.4;

	for (let i = 0; i < songs.length; i++) {
		const song = songs[i];
		// Each menu is a square with the song title
		const menu = menuGroup
			.add('square')
			.move(0, startY - i * gapY, -0.5)
			.scale(0.2, 0.2, 0.01)
			.color(0.25, 0.35, 0.5);
		menu
			.add(clay.text(song.title))
			.move(-0.3, -0.05, 0.01)
			.color(0, 0, 0)
			.scale(6);
		// Optionally, add interaction logic here
	}

	const scoreboard = model
		.add('square')
		.move(-0.8, 2.2, -0.5)
		.scale(0.1, 0.1, 0.01)
		.color(0.25, 0.35, 0.5);
	scoreboard.add(clay.text('Score')).move(-0.5, 0.5, 0.01).scale(10);

	const quitBtn = model
		.add('diskZ')
		.move(-0.8, 2, -0.5)
		.scale(0.1)
		.color(1, 0, 0);
	quitBtn
		.add(clay.text('QUIT'))
		.move(-0.3, -0.05, 0.01)
		.color(1, 1, 1)
		.scale(6);

	let COMMENT = {
		PERFECT: 'PERFECT!',
		GREAT: 'GREAT',
		MISSED: 'MISSED',
		NONE: '',
	};

	const commentText = model.add();

	const beamRPointer = model.add();
	beamRPointer.add('diskZ').scale(0.01).color(0, 1, 0).dull();

	const beamLDisplay = model.add();
	beamLDisplay
		.add('tubeZ')
		.scale(0.1, 0.1, 1)
		.move(0, 0, 0)
		.color(1, 1, 0)
		.opacity(0.5)
		.dull();
	const beamRDisplay = model.add();
	beamRDisplay
		.add('tubeZ')
		.scale(0.1, 0.1, 1)
		.move(0, 0, 0)
		.color(1, 0, 1)
		.opacity(0.5)
		.dull();

	inputEvents.onPress = (hand) => {
		state.pressed = true;
	};

	inputEvents.onRelease = (hand) => {
		state.pressed = false;
		// console.log('Menu button released, starting game');
		state.released = true;
		setTimeout(() => {
			state.released = false;
		}, 100); // small delay to differentiate between quick tap and hold
	};

	const BEAT_SCALE = 0.1;

	const CUBE_START_Z = -10; // Far start

	model.animate(() => {
		beamL.update();
		beamR.update();

		const bend = Math.PI / 4;
		const lBeamMat = cg.mMultiply(beamL.m, cg.mRotateX(-bend));
		const rBeamMat = cg.mMultiply(beamR.m, cg.mRotateX(-bend));
		beamLDisplay.setMatrix(lBeamMat);
		beamRDisplay.setMatrix(rBeamMat);

		// Beam tip: local z=-1 transformed to world space via beam matrix
		const lTip = [lBeamMat[12] - lBeamMat[8], lBeamMat[13] - lBeamMat[9], lBeamMat[14] - lBeamMat[10]];
		const rTip = [rBeamMat[12] - rBeamMat[8], rBeamMat[13] - rBeamMat[9], rBeamMat[14] - rBeamMat[10]];

		// Reset beam opacity each frame
		beamLDisplay.child(0).opacity(0.5);
		beamRDisplay.child(0).opacity(0.5);

		// Animate cubes along z axis to match audio time if game started
		const audioTime = state.audioElement[state.activeSongIdx]
			? state.audioElement[state.activeSongIdx].currentTime
			: 0;

		if (state.started && state.activeSongIdx !== null) {
			menuGroup.remove(0); // remove menu group from view

			// console.log('Animating lyrics for active song idx:', lyricNodes[state.activeSongIdx], 'audioTime:', audioTime.toFixed(2));
			for (let i = 0; i < lyricNodes[state.activeSongIdx].length; i++) {
				const nodeData = lyricNodes[state.activeSongIdx][i];
				const {
					spawnTime,
					beatTime,
					position,
					color: rgb,
					hit,
					node,
				} = nodeData;
				// console.log('node', nodeData)
				let z = CUBE_START_Z;
				let opacity = 0;
				let scale = BEAT_SCALE;
				let color = [1, 1, 1];

				if (audioTime >= spawnTime && audioTime < beatTime + 1) {
					state.currentBeatIdx = i;
					// console.log(
					// 	'Current beat idx:',
					// 	state.currentBeatIdx,
					// 	'audioTime:',
					// 	audioTime.toFixed(2),
					// );
				}
				// const node = model.child(i);
				if (hit) {
					// If hit, keep the beat visible at LYRIC_Z with full opacity and color
					z = LYRIC_Z;
					opacity = 1;
					scale = BEAT_SCALE;
					color = rgb;
				} else if (audioTime < spawnTime) {
					z = CUBE_START_Z;
					opacity = 0;
				} else if (audioTime >= spawnTime && audioTime < beatTime) {
					// Interpolate z from CUBE_START_Z to LYRIC_Z
					const t = (audioTime - spawnTime) / (beatTime - spawnTime);
					z = CUBE_START_Z + t * (LYRIC_Z - CUBE_START_Z);
					opacity = 1;
					color = mixColor([1, 0.5, 0], t);
				} else if (audioTime >= beatTime && audioTime < beatTime + 1) {
					// Stay at LYRIC_Z for 1s after beat
					z = LYRIC_Z;
					opacity = 1;
					scale = BEAT_SCALE;
					color = rgb;
				} else if (audioTime >= beatTime + 1 && audioTime < beatTime + 1.5) {
					// Fade/scale out over 0.5s
					z = LYRIC_Z;
					const t = (audioTime - (beatTime + 1)) / 0.5;
					opacity = 1 - t;
					scale = BEAT_SCALE - t * BEAT_SCALE;
					color = rgb;
				} else {
					z = LYRIC_Z;
					opacity = 0;
					scale = BEAT_SCALE;
					color = rgb;
				}
				node
					.identity()
					.move(position[0], position[1], z)
					.scale(scale)
					.opacity(opacity)
					.color(color[0], color[1], color[2], opacity);
			}
		}

		for (let i = 0; i < menuGroup.nChildren(); i++) {
			const menu = menuGroup.child(i);

			// Default menu color at start of frame
			menu.color(0.1, 0.1, 0.1, 0.5);

			// Detect if beamRDisplay hits the menu using isPointInBox
			// Get the tip position of the beamRDisplay (z+ direction)
			const isHit = cg.isPointInBox(beamRDisplay.position[0], beamRDisplay.position[1], beamRDisplay.position[2], menu.getGlobalMatrix());

			let hitMenu =
				beamR.hitRect(menu.getGlobalMatrix()) ||
				beamL.hitRect(menu.getGlobalMatrix());
			if (isHit) {
				menu.color(1, 1, 1);
				if (state.released) {
					state.started = true;
					console.log('Menu button released, starting game');
				}
				if (state.pressed) {
					menu.color(1, 0.8, 0, 0.5);
					// console.log('loading sound for song idx:', i, songs[i].url);
					state.activeSongIdx = i; // set the active song based on their index
					// console.log('Active song index set to:', state.activeSongIdx);
					// Immediately pause and reset all other audio elements
					for (let j = 0; j < state.audioElement.length; j++) {
						if (j !== i) {
							state.audioElement[j].pause();
							state.audioElement[j].currentTime = 0;
						}
					}
				}
			}
		}

		// beam hitting on the beats
		const relevantNodes = lyricNodes[state.activeSongIdx] // get the current n last 5 beats for collision checking
			? lyricNodes[state.activeSongIdx].slice(
					Math.max(0, state.currentBeatIdx - 5),
					state.currentBeatIdx + 1,
			  )
			: [];
		if (lyricNodes[state.activeSongIdx]) {
			const PERFECT_WINDOW = 0.2; // seconds from beatTime for PERFECT
			let freshHitType = null; // 'perfect' or 'great'
			let freshHitPosition = null;
			let newlyMissed = false;

			for (let i = 0; i < relevantNodes.length; i++) {
				const nodeData = relevantNodes[i];
				const matrix = nodeData.node.getGlobalMatrix();
				let hit = beamL.hitRect(matrix) || beamR.hitRect(matrix);

				if (hit && !nodeData.hit) {
					nodeData.hit = true;
					const timingDiff = Math.abs(audioTime - nodeData.beatTime);
					freshHitType = timingDiff <= PERFECT_WINDOW ? 'perfect' : 'great';
					freshHitPosition = nodeData.position;
					currentScore += freshHitType === 'perfect' ? 100 : 50;
					console.log('Hit lyric idx:', i, currentScore);
					// Play SFX from preloaded buffer
					if (sfxBuffer && state.audioContext) {
						const sfxSource = state.audioContext.createBufferSource();
						sfxSource.buffer = sfxBuffer;
						sfxSource.connect(state.audioContext.destination);
						sfxSource.start(0);
					}
					// Remove previous score text (if any)
					if (scoreboard.nChildren() > 1) {
						scoreboard.remove(1);
					}
					// Add updated score text
					scoreboard
						.add(clay.text(currentScore.toString()))
						.move(-0.5, 0.2, 0.01)
						.scale(8);

					if (model.time % 0.04 < 0.02) vibrate('right', 1, 20);
				}

				// isPointInBox beam tip check — highlight beam on overlap
				const nodeMatrix = nodeData.node.getGlobalMatrix();
				if (cg.isPointInBox(lTip[0], lTip[1], lTip[2], nodeMatrix)) {
					beamLDisplay.child(0).opacity(0.7);
				}
				if (cg.isPointInBox(rTip[0], rTip[1], rTip[2], nodeMatrix)) {
					beamRDisplay.child(0).opacity(0.7);
				}

				// Mark as missed only when the beat window expires without being hit
				if (!nodeData.hit && audioTime > nodeData.beatTime + 1 && !nodeData.missed) {
					nodeData.missed = true;
					newlyMissed = nodeData.position;
				}
			}

			// Update comment text once per frame based on what happened
			if (freshHitType === 'perfect') {
				if (commentText.nChildren() > 0) commentText.remove(0);
				commentText
					.add(clay.text(COMMENT.PERFECT))
					.move(freshHitPosition[0], freshHitPosition[1] + 0.1, LYRIC_Z)
					.scale(10)
					.color(0, 1, 0);
				state.commentTimer = model.time;
			} else if (freshHitType === 'great') {
				if (commentText.nChildren() > 0) commentText.remove(0);
				commentText
					.add(clay.text(COMMENT.GREAT))
					.move(freshHitPosition[0], freshHitPosition[1] + 0.1, LYRIC_Z)
					.scale(10)
					.color(1, 1, 0);
				state.commentTimer = model.time;
			} else if (newlyMissed) {
				if (commentText.nChildren() > 0) commentText.remove(0);
				commentText
					.add(clay.text(COMMENT.MISSED))
					.move(newlyMissed[0], newlyMissed[1] + 0.1, LYRIC_Z)
					.scale(10)
					.color(1, 0, 0);
				state.commentTimer = model.time;
			} else if (model.time - state.commentTimer > 1.0) {
				// Clear comment after 1 second
				if (commentText.nChildren() > 0) commentText.remove(0);
			}
		}

		// DEBUG
		// rect.color(0.25, 0.35, 0.5);
		// while (model.nChildren() > 1) {
		// 	model.remove(1);
		// }
		// LEFT CONTROLLER BEAM SHOWS TEXT OF U,V,D AND MAKES A STEADY VIBRATION

		// let uvdL = beamL.hitRect(rect.getGlobalMatrix());
		// if (uvdL) {
		// 	rect.color(1, 1, 1);
		// 	let u = uvdL[0],
		// 		v = uvdL[1],
		// 		d = uvdL[2];
		// 	let text = 'u:' + round(u) + '\nv:' + round(v) + '\nd:' + round(d);
		// 	model
		// 		.add(clay.text(text))
		// 		.move(-0.036, y + 0.03, 0.001)
		// 		.scale(0.02 / inch)
		// 		.color(0, 0, 0);
		// 	// vibrate('left', u * u < 0.033 && v * v < 0.09 ? 1 : 0.4);
		// }

		// // RIGHT CONTROLLER BEAM MOVES A TARGET OBJECT AND MAKES A PULSED VIBRATION

		// let uvdR = beamR.hitRect(rect.getGlobalMatrix());
		// if (uvdR) {
		// 	rect.color(1, 0.5, 0.5);
		// 	let u = uvdR[0],
		// 		v = uvdR[1];
		// 	model
		// 		.add('diskZ')
		// 		.move(0.2 * u, y + 0.1 * v, 0.001)
		// 		.scale(0.01)
		// 		.color(0, 0, 0)
		// 		.dull();
		// 	// if (model.time % 0.04 < 0.02) vibrate('right', 1, 20);
		// }

		let hitQuit =
			beamR.hitRect(quitBtn.getGlobalMatrix()) ||
			beamL.hitRect(quitBtn.getGlobalMatrix());
		if (hitQuit) {
			quitBtn.color(1, 0.5, 0.5);
			if (state.pressed) {
				state.started = false;
				state.activeSongIdx = null;
				currentScore = 0;
				state.currentBeatIdx = 0;

				// Reset all beat nodes across all songs
				for (let s = 0; s < lyricNodes.length; s++) {
					for (let j = 0; j < lyricNodes[s].length; j++) {
						lyricNodes[s][j].hit = false;
						lyricNodes[s][j].missed = false;
						lyricNodes[s][j].node
							.identity()
							.move(lyricNodes[s][j].position[0], lyricNodes[s][j].position[1], CUBE_START_Z)
							.scale(0)
							.opacity(0);
					}
				}

				// Reset scoreboard text
				if (scoreboard.nChildren() > 1) scoreboard.remove(1);

				// Clear comment text
				if (commentText.nChildren() > 0) commentText.remove(0);

				// Re-add menu items
				for (let i = 0; i < songs.length; i++) {
					const menu = menuGroup
						.add('square')
						.move(0, startY - i * gapY, -0.5)
						.scale(0.2, 0.2, 0.01)
						.color(0.25, 0.35, 0.5);
					menu.add(clay.text(songs[i].title))
						.move(-0.3, -0.05, 0.01)
						.color(0, 0, 0)
						.scale(6);
				}
			}
		} else {
			quitBtn.color(1, 0, 0);
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
