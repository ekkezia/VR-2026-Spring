// Helper for formatting numbers
// Configurable anticipation window (seconds)
// To toggle: set anticipationTime = 0 for no anticipation
import { ControllerBeam } from '../render/core/controllerInput.js';

const SFX_URL = '/media/sound/bounce/2.wav';
let sfxBuffer = null;

let currentScore = 0;
const y = 1.5;

const createAudioContext = () =>
	new (window.AudioContext || window.webkitAudioContext)();

const mixColor = (base, amount) => [
	base[0] + (1 - base[0]) * amount,
	base[1] + (1 - base[1]) * amount,
	base[2] + (1 - base[2]) * amount,
];

const state = {
	audioContext: createAudioContext(),
	audioElement: [],
	audioBuffer: [],
	started: false,
	menuBtnPressed: false,
	lyrics: [],
	loading: false,
	activeSongIdx: null,
};

export const init = async (model) => {
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

	let COMMENT = {
		PERFECT: 'PERFECT!',
		GREAT: 'GREAT',
		MISSED: 'MISSED',
		NONE: '',
	};

	const commentText = model.add();
	commentText
		.add(clay.text(COMMENT.NONE))
		.move(0, 2.5, 0.01)
		.scale(10)
		.color(1, 1, 1);

	const beamRPointer = model.add();
	beamRPointer
		.add('diskZ')
		.scale(0.01)
		.color(0, 1, 0)
		.dull();

	let scoreText = 0;

	inputEvents.onPress = (hand) => {
		state.menuBtnPressed = true;
	};

	inputEvents.onRelease = (hand) => {
		state.started = true;
	};

	const BEAT_SCALE = 0.2;

	const CUBE_START_Z = -10; // Far start

	model.move(0, -0.1, 0).animate(() => {
		// Animate cubes along z axis to match audio time if game started
		const audioTime = state.audioElement[state.activeSongIdx]
			? state.audioElement[state.activeSongIdx].currentTime
			: 0;

		beamL.update();
		beamR.update();

		if (state.started && state.activeSongIdx !== null) {
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

			// LEFT CONTROLLER BEAM SHOWS TEXT OF U,V,D AND MAKES A STEADY VIBRATION
			let uvdL = beamL.hitRect(menu.getGlobalMatrix());
			if (lyricNodes[state.activeSongIdx]) {
			    // console.log('Checking beamR collisions with lyrics, activeSongIdx:', state.activeSongIdx, 'lyricNodes length:', lyricNodes[state.activeSongIdx][0].node);
				for (let i = 0; i < lyricNodes[state.activeSongIdx].length; i++) {
			        // console.log('Checking lyric idx:', i, 'hit status:', lyricNodes[state.activeSongIdx][i].hit, lyricNodes[state.activeSongIdx][i].node);
					let beatL = beamL.hitRect(lyricNodes[state.activeSongIdx][i].node.getGlobalMatrix());
			        // console.log('global matrix', lyricNodes[state.activeSongIdx][i].node.getGlobalMatrix())
					if (beatL && !lyricNodes[state.activeSongIdx][i].hit) {
						lyricNodes[state.activeSongIdx][i].hit = true;
						currentScore += 100;
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

						if (commentText.nChildren() > 0) {
							commentText.remove(1);
						}
						commentText
							.add(clay.text(COMMENT.PERFECT))
							.move(0, 2.5, 0.01)
							.scale(5)
							.color(0, 1, 0);
					} else {
						if (commentText.nChildren() > 0) {
							commentText.remove(1);
						}
						commentText
							.add(clay.text(COMMENT.MISSED))
							.move(0, 2.5, 0.01)
							.scale(5)
							.color(1, 0, 0);
					}
				}
			}
			if (uvdL) {
				menu.color(1, 1, 1);
				if (state.menuBtnPressed) {
					menu.color(1, 0.8, 0, 0.5);
					console.log('loading sound for song idx:', i, songs[i].url);
					state.activeSongIdx = i; // set the active song based on their index
					state.menuBtnPressed = false; // prevent double trigger
					// Immediately pause and reset all other audio elements
					for (let j = 0; j < state.audioElement.length; j++) {
						if (j !== i) {
							state.audioElement[j].pause();
							state.audioElement[j].currentTime = 0;
						}
					}
					break; // stop after selecting one menu
				}
				if (state.started) {
					menuGroup.remove(0);
				}
			}

			// RIGHT CONTROLLER BEAM MOVES A TARGET OBJECT AND MAKES A PULSED VIBRATION
			let uvdR = beamR.hitRect(menu.getGlobalMatrix());
			if (lyricNodes[state.activeSongIdx]) {
				// console.log('Checking beamR collisions with lyrics, activeSongIdx:', state.activeSongIdx, 'lyricNodes length:', lyricNodes[state.activeSongIdx][0].node);
				for (let i = 0; i < lyricNodes[state.activeSongIdx].length; i++) {
					// console.log('Checking lyric idx:', i, 'hit status:', lyricNodes[state.activeSongIdx][i].hit, lyricNodes[state.activeSongIdx][i].node);
					let beatR = beamR.hitRect(
						lyricNodes[state.activeSongIdx][i].node.getGlobalMatrix(),
					);
					// console.log('global matrix', lyricNodes[state.activeSongIdx][i].node.getGlobalMatrix())
					if (beatR && !lyricNodes[state.activeSongIdx][i].hit) {
						lyricNodes[state.activeSongIdx][i].hit = true;
						currentScore += 100;
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

						if (commentText.nChildren() > 0) {
							commentText.remove(1);
						}
						commentText
							.add(clay.text(COMMENT.PERFECT))
							.move(0, 2.5, 0.01)
							.scale(10)
							.color(0, 1, 0);
					} else {
						if (commentText.nChildren() > 0) {
							commentText.remove(1);
						}
						commentText
							.add(clay.text(COMMENT.MISSED))
							.move(0, 2.5, 0.01)
							.scale(10)
							.color(1, 0, 0);
					}
				}
			}

			if (uvdR) {
				menu.color(1, 1, 1);
				if (state.menuBtnPressed) {
					menu.color(1, 0.8, 0, 0.5);
					// console.log('loading sound for song idx:', i, songs[i].url);
					state.activeSongIdx = i; // set the active song based on their index
					// Immediately pause and reset all other audio elements
					for (let j = 0; j < state.audioElement.length; j++) {
						if (j !== i) {
							state.audioElement[j].pause();
							state.audioElement[j].currentTime = 0;
						}
					}
				}
				if (state.started) {
					menuGroup.remove(0);
				}
				let u = uvdR[0],
					v = uvdR[1];
				beamRPointer
					.move(0.2 * u, y + 0.1 * v, 0.001)
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
