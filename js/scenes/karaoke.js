// Configurable anticipation window (seconds)
let anticipationTime = 3.0; // Change to toggle anticipation
// To toggle: set anticipationTime = 0 for no anticipation
import { analyzeFullBuffer } from '/node_modules/realtime-bpm-analyzer/dist/dist/index.esm.js';
import * as cg from '../render/core/cg.js';

const SCENE_STATE_KEY = '__drumsBeatSceneState';
const AUDIO_URL = '/media/sound/music/cosmicgirl.mp3';

const charSize = 0.05;

const ANTICIPATION_BEATS = 1.0;

const createAudioContext = () =>
	new (window.AudioContext || window.webkitAudioContext)();

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const mixColor = (base, amount) => [
	base[0] + (1 - base[0]) * amount,
	base[1] + (1 - base[1]) * amount,
	base[2] + (1 - base[2]) * amount,
];

const getMonoChannel = (buffer) => {
	const left = buffer.getChannelData(0);
	if (buffer.numberOfChannels === 1) return left;
	const right = buffer.getChannelData(1);
	const mono = new Float32Array(buffer.length);
	for (let i = 0; i < buffer.length; i++) mono[i] = (left[i] + right[i]) * 0.5;
	return mono;
};

const buildEnergyFrames = (channelData, sampleRate, frameSize = 1024) => {
	const frames = [];
	for (let start = 0; start < channelData.length; start += frameSize) {
		const end = Math.min(channelData.length, start + frameSize);
		let sum = 0;
		for (let i = start; i < end; i++) {
			const v = channelData[i];
			sum += v * v;
		}
		frames.push({
			time: start / sampleRate,
			energy: Math.sqrt(sum / Math.max(1, end - start)),
		});
	}
	return frames;
};

const buildBeatMap = (audioBuffer, bpmCandidates) => {
	const bpm = bpmCandidates?.[0]?.tempo || 120;
	const beatInterval = 60 / bpm;

	const mono = getMonoChannel(audioBuffer);
	const energyFrames = buildEnergyFrames(mono, audioBuffer.sampleRate);

	const searchStep = Math.max(0.01, beatInterval / 32);
	const maxOffset = Math.min(beatInterval, audioBuffer.duration);

	let bestOffset = 0;
	let bestScore = -Infinity;

	for (let offset = 0; offset < maxOffset; offset += searchStep) {
		let score = 0;

		for (let time = offset; time < audioBuffer.duration; time += beatInterval) {
			const frameIndex = clamp(
				Math.round((time * audioBuffer.sampleRate) / 1024),
				0,
				energyFrames.length - 1,
			);

			score += energyFrames[frameIndex]?.energy || 0;
		}

		if (score > bestScore) {
			bestScore = score;
			bestOffset = offset;
		}
	}

	const beats = [];

	for (
		let time = bestOffset;
		time < audioBuffer.duration;
		time += beatInterval
	) {
		const frameIndex = clamp(
			Math.round((time * audioBuffer.sampleRate) / 1024),
			0,
			energyFrames.length - 1,
		);

		beats.push({
			time,
			energy: energyFrames[frameIndex]?.energy || 0,
		});
	}

	const maxEnergy = beats.reduce((m, b) => Math.max(m, b.energy), 0.0001);

	for (const beat of beats)
		beat.strength = clamp(beat.energy / maxEnergy, 0.25, 1);

	return { bpm, beatInterval, offset: bestOffset, beats };
};

const localDebugOrbPos = [0, 0.5, 0];
export const init = async (model) => {
	// const lyrics = model.add('lyrics');
	let invModel = () => cg.mInverse(model.getGlobalMatrix());

	const state = {
		audioContext: createAudioContext(),
		audioElement: null,
		sourceNode: null,
		gainNode: null,
		audioBuffer: null,
		beatMap: null,
		noteEvents: [],
		nextEventIndex: 0,
		started: false,
		loading: true,
		lyrics: [],
		nextLyricIndex: 0,
	};

	const lyricNodes = [];
	let touchPoints = []; // a copy of lyricNodes

	window[SCENE_STATE_KEY] = state;

	const buildLyrics = async (path) => {
		try {
			const lyricsResponse = await fetch(path);
			state.lyrics = await lyricsResponse.json();
			console.log('Loaded lyrics:', state.lyrics);
		} catch (err) {
			console.error('Failed to load lyrics:', err);
		}
	};

	try {
		const response = await fetch(AUDIO_URL);
		const arrayBuffer = await response.arrayBuffer();

		state.audioBuffer = await state.audioContext.decodeAudioData(
			arrayBuffer.slice(0),
		);

		const bpmCandidates = await analyzeFullBuffer(state.audioBuffer, {
			minTempo: 60,
			maxTempo: 180,
		});

		state.beatMap = buildBeatMap(state.audioBuffer, bpmCandidates);
		await buildLyrics('/media/sound/json/cosmicgirl.json');

		const beatInterval = state.beatMap.beatInterval;
		const anticipation = ANTICIPATION_BEATS * beatInterval;

		state.noteEvents = state.beatMap.beats.map((beat, i) => ({
			beatIndex: i,
			beatTime: beat.time,
			spawnTime: beat.time - anticipation,
		}));

		state.loading = false;
	} catch (err) {
		console.error(err);
	}

	const ensureStarted = async () => {
		if (state.started || state.loading) return;
		state.started = true; // set BEFORE async calls to prevent double-trigger

		state.audioElement = new Audio(AUDIO_URL);
		state.audioElement.loop = true;

		state.sourceNode = state.audioContext.createMediaElementSource(
			state.audioElement,
		);
		state.gainNode = state.audioContext.createGain();

		state.sourceNode.connect(state.gainNode);
		state.gainNode.connect(state.audioContext.destination);

		await state.audioContext.resume();
		await state.audioElement.play();
	};

	window.addEventListener('pointerdown', ensureStarted);

	const LYRIC_MIN_X = -1.5;
	const LYRIC_MAX_X = 1.5;
	const LYRIC_MIN_Y = 1.4;
	const LYRIC_MAX_Y = 2.8;
	const LYRIC_Z = -1.0;

	function createLyric(text, start, end, row, col) {
		const x = Math.random() * (LYRIC_MAX_X - LYRIC_MIN_X) + LYRIC_MIN_X;
		const y = Math.random() * (LYRIC_MAX_Y - LYRIC_MIN_Y) + LYRIC_MIN_Y;

		// const x = LYRIC_MIN_X + (col * (LYRIC_MAX_X - LYRIC_MIN_X)) / 9;
		// const y = LYRIC_MAX_Y - (row * (LYRIC_MAX_Y - LYRIC_MIN_Y)) / 5;

		// Estimate paper width and height based on text length
		const paperWidth = Math.max(0.5, text.length * charSize * 0.5);
		const paperHeight = 0.35;
		lyricNodes.push({
			text: text,
			position: [x, y, LYRIC_Z], // todo: need to centerize text
			opacity: 0.3,
			scale: [paperWidth, paperHeight, 1],
			start: start,
			end: end,
			hit: false,
		});
		// touchPoints.push({
		// 	text: text,
		// 	position: [x, y, LYRIC_Z],
		// 	start: start,
		// 	end: end,
		// 	hit: false,
		// 	node: undefined,
		// });
	}

	// pre create the lyrics, but just show them as opacity 0 first, then we can just update the opacity on each frame to show/hide them with a fade
	// Random x/y within bounds for each lyric
	for (let j = 0; j < state.lyrics.length; j++) {
		const row = Math.floor(j / 10); // 10 rows
		const col = j % 10; // 10 col

		createLyric(
			state.lyrics[j].text,
			state.lyrics[j].start,
			state.lyrics[j].end,
			row,
			col,
		);
	}

	// show everything - store refs this time
	for (let i = 0; i < lyricNodes.length; i++) {
		const lyric = lyricNodes[i];
		lyric.node = model
			.add(clay.text(lyric.text))
			.move(
				lyric.position[0] - lyric.scale[0] / 2 + charSize,
				lyric.position[1],
				lyric.position[2] - 0.01,
			)
			.color(1, 0, 0, 0) // start invisible
			.scale(5); // start scaled down

		// touchPoints[i].node = model
		// 	.add('cube')
		// 	.move(lyric.position)
		// 	.scale(0.15)
		// 	.color(0, 0, 1)
		// 	.opacity(1); // invisible touch point for easier interaction
	}

	console.log('Initialized scene with lyrics:', model.child(0), lyricNodes);

	inputEvents.onMove = () => {
		const leftPos = inputEvents.pos('left');
		const rightPos = inputEvents.pos('right');
		for (let idx = 0; idx < lyricNodes.length; idx++) {
			const lyricNode = lyricNodes[idx];
			const lyricGlobalMat = lyricNode.node.getGlobalMatrix();
			const lyricGlobalPos = [
				lyricGlobalMat[12],
				lyricGlobalMat[13],
				lyricGlobalMat[14],
			];
			const [lx, ly, lz] = lyricGlobalPos;
			const [pxL, pyL, pzL] = leftPos;
			const [pxR, pyR, pzR] = rightPos;

			// Increased threshold for easier hit
			const hitThresholdXY = 0.05;
			const hitThresholdZ = 0.5;
			const hitL =
				Math.abs(pxL - lx) < hitThresholdXY &&
				Math.abs(pyL - ly) < hitThresholdXY &&
				Math.abs(pzL - lz) < hitThresholdZ;
			const hitR =
				Math.abs(pxR - lx) < hitThresholdXY &&
				Math.abs(pyR - ly) < hitThresholdXY &&
				Math.abs(pzR - lz) < hitThresholdZ;

			// Log only for the first lyric node
			if (idx === 0) {
				console.log(
					'Controller L:',
					leftPos,
					'Lyric:',
					lyricGlobalPos,
					'HitL:',
					hitL,
				);
				console.log(
					'Controller R:',
					rightPos,
					'Lyric:',
					lyricGlobalPos,
					'HitR:',
					hitR,
				);
			}

			if (hitL || hitR) {
				lyricNode.hit = true;
			}
		}
	};

	model.animate(() => {
		if (!state.started) return;

		const audioTime = state.audioElement.currentTime;

		// Show lyrics within anticipation window
		if (lyricNodes.length > 0) {
			for (let i = 0; i < lyricNodes.length; i++) {
				const timeUntil = lyricNodes[i].start - audioTime;
				let opacity = 0;
				let scale = 0;
				let color = [1, 0.5, 0];

				const node = model.child(i);
				// console.log('Animating lyric', lyricNodes[i]);
				// console.log('model lngth', model.children.length)
				if (timeUntil <= anticipationTime && timeUntil >= -0.5) {
					if (i <= 10)
						console.log(
							'Showing lyric',
							lyricNodes[i].text,
							'timeUntil:',
							timeUntil.toFixed(2),
						);
					if (timeUntil > 0) {
						const t = 1 - timeUntil / anticipationTime;
						opacity = t;
						scale = t * 5;
						// scale = clamp(t * 2, 0.05, 0.2);// clamp for sphere
						color = mixColor([1, 0.5, 0], t);
						if (timeUntil > 0.5) {
							// console.log('hit!', lyricNodes[i].text);
							color = lyricNodes[i].hit ? [0, 1, 0] : [1, 0, 1]; // purple color when on the beat, green when hit
						}
					} else {
						const t = 1 - -timeUntil / 0.2;
						opacity = clamp(t, 0, 1);
						// scale = clamp(t * 4, 0.05, 0.2);// clamp for sphere
						color = [0, 0, 0]; // black color when off the beat
						// scale = clamp(t * 2, 0.05, 1);// clamp for sphere
					}
				}

				const pos = lyricNodes[i].position;
				// console.log('model', model.child(0), lyricNodes[i].node);
				node
					.identity()
					.move(pos[0], pos[1], pos[2])
					.scale(scale)
					.color(color[0], color[1], color[2], opacity);
			}
		}
	});
};
