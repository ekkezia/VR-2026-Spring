import { analyzeFullBuffer } from '/node_modules/realtime-bpm-analyzer/dist/dist/index.esm.js';
import * as cg from '../render/core/cg.js';

const SCENE_STATE_KEY = '__drumsBeatSceneState';
const AUDIO_URL = '/media/sound/drums.ogg';

let activeOrbs = [];

const padOffsets = [
	[-0.45, 0.0, 0.0],
	[-0.15, 0.08, 0.12],
	[0.15, 0.08, 0.12],
	[0.45, 0.0, 0.0],
];

const padBaseColors = [
	[0.85, 0.22, 0.18],
	[0.95, 0.55, 0.12],
	[0.22, 0.65, 0.95],
	[0.55, 0.3, 0.9],
];

const ANTICIPATION_BEATS = 1.0;

const ORB_START_Z = 0.15;
const ORB_END_Z = 1.6;
const ORB_BASE_SCALE = 0.06;

const ORB_LINGER = 0.08;

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
	for (let i = 0; i < buffer.length; i++)
		mono[i] = (left[i] + right[i]) * 0.5;
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
				energyFrames.length - 1
			);

			score += energyFrames[frameIndex]?.energy || 0;
		}

		if (score > bestScore) {
			bestScore = score;
			bestOffset = offset;
		}
	}

	const beats = [];

	for (let time = bestOffset; time < audioBuffer.duration; time += beatInterval) {

		const frameIndex = clamp(
			Math.round((time * audioBuffer.sampleRate) / 1024),
			0,
			energyFrames.length - 1
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

const getBeatWindow = (beatMap, elapsedSeconds, loopDuration) => {

	if (!beatMap || !beatMap.beats.length) return null;

	const loopTime =
		((elapsedSeconds % loopDuration) + loopDuration) % loopDuration;

	let bestBeat = null;
	let bestBeatIndex = 0;
	let bestDistance = Infinity;

	for (let i = 0; i < beatMap.beats.length; i++) {

		const beat = beatMap.beats[i];

		const direct = Math.abs(loopTime - beat.time);
		const wrapped = loopDuration - direct;

		const distance = Math.min(direct, wrapped);

		if (distance < bestDistance) {
			bestDistance = distance;
			bestBeat = beat;
			bestBeatIndex = i;
		}
	}

	return { beat: bestBeat, beatIndex: bestBeatIndex, distance: bestDistance };
};

const localDebugOrbPos = [0, 0.5, 0];
export const init = async (model) => {

	const kit = model.add().move(0, 1.45, -0.45);

  const debugOrb = kit.add('sphere').move(...localDebugOrbPos).scale(0.1).color(1, 0, 0);
  
	const pads = padOffsets.map((offset, i) =>
		kit.add('cube')
			.move(offset)
			.scale(0.12, 0.03, 0.12)
			.color(padBaseColors[i])
	);

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
		loading: true
	};

	window[SCENE_STATE_KEY] = state;

	try {

		const response = await fetch(AUDIO_URL);
		const arrayBuffer = await response.arrayBuffer();

		state.audioBuffer =
			await state.audioContext.decodeAudioData(arrayBuffer.slice(0));

		const bpmCandidates =
			await analyzeFullBuffer(state.audioBuffer, { minTempo:60,maxTempo:180 });

		state.beatMap = buildBeatMap(state.audioBuffer, bpmCandidates);

		const beatInterval = state.beatMap.beatInterval;
		const anticipation = ANTICIPATION_BEATS * beatInterval;

		state.noteEvents = state.beatMap.beats.map((beat,i)=>({
			beatIndex:i,
			beatTime:beat.time,
			spawnTime:beat.time - anticipation
		}));

		state.loading = false;

	} catch(err) { console.error(err); }

	const ensureStarted = async () => {

		if(state.started || state.loading) return;

		state.audioElement = new Audio(AUDIO_URL);
		state.audioElement.loop = true;

		state.sourceNode =
			state.audioContext.createMediaElementSource(state.audioElement);

		state.gainNode = state.audioContext.createGain();

		state.sourceNode.connect(state.gainNode);
		state.gainNode.connect(state.audioContext.destination);

		await state.audioContext.resume();
		await state.audioElement.play();

		state.started = true;
	};

	window.addEventListener('pointerdown', ensureStarted);

	inputEvents.onMove = () => {

		if(!activeOrbs.length) return;

		const leftPos = inputEvents.pos('left');
		const rightPos = inputEvents.pos('right');

		const localLeft = cg.mTransform(invModel(), leftPos || [0,0,0]);
		const localRight = cg.mTransform(invModel(), rightPos || [0,0,0]);

		for(const orb of activeOrbs){

			if(orb.hit) continue;

			const orbPos = [
				orb.position[0],
				orb.position[1],
				orb.currentZ
			];

      const orbGlobalMat = orb.node.getGlobalMatrix();
      const orbGlobalPos = [orbGlobalMat[12], orbGlobalMat[13], orbGlobalMat[14]];

			const distL = cg.distance(leftPos, orbGlobalPos);
			const distR = cg.distance(rightPos, orbGlobalPos);

      const distDebugR = cg.distance(localRight, localDebugOrbPos);
      const debugOrbMat = debugOrb.getGlobalMatrix();
      const debugOrbGlobalPos = [debugOrbMat[12], debugOrbMat[13], debugOrbMat[14]];
      const dist = cg.distance(rightPos, debugOrbGlobalPos);

      console.log('distance', dist, rightPos, debugOrbGlobalPos);
			if(distL < 0.12 || distR < 0.12){

				orb.hit = true;

				orb.node.color(1,1,0);
			}

      if (dist < 0.1) {
        debugOrb.color(0, 1, 0);
      } else {
        debugOrb.color(1, 0, 0);
      }
		}
	};

	model.animate(()=>{

		if(!state.started) return;

		const audioTime = state.audioElement.currentTime;

		if(audioTime < 0.05) state.nextEventIndex = 0;

		const events = state.noteEvents;

		while(
			state.nextEventIndex < events.length &&
			events[state.nextEventIndex].spawnTime <= audioTime
		){

			const event = events[state.nextEventIndex];

			const minX=-0.55,maxX=0.55;
			const minY=0.6,maxY=1.0;

			const x=Math.random()*(maxX-minX)+minX;
			const y=Math.random()*(maxY-minY)+minY;

			const orb={
				beatTime:event.beatTime,
				spawnTime:event.spawnTime,
				position:[x,y],
				currentZ:ORB_START_Z,
				node:kit.add('sphere')
					.move(x,y,ORB_START_Z)
					.scale(ORB_BASE_SCALE)
					.color(1,0.5,0),
				hit:false
			};

			activeOrbs.push(orb);

			if(activeOrbs.length>2){
				const old=activeOrbs.shift();
				old.node.identity().scale(0);
			}

			state.nextEventIndex++;
		}

		for(let i=activeOrbs.length-1;i>=0;i--){

			const orb=activeOrbs[i];

			const progress=
				(audioTime-orb.spawnTime)/
				(orb.beatTime-orb.spawnTime);

			const t=clamp(progress,0,1);

			const eased=Math.sqrt(t);

			const z =
				ORB_START_Z +
				(ORB_END_Z - ORB_START_Z) * eased;

			orb.currentZ = z;

			const scale =
				ORB_BASE_SCALE * (0.7 + eased * 0.6);

			const r=orb.hit?1:1;
			const g=orb.hit?1:clamp(0.3+eased*0.5,0,1);
			const b=orb.hit?0:clamp(eased*0.4,0,1);

			orb.node
				.identity()
				.move(orb.position[0],orb.position[1],z)
				.scale(scale)
				.color(r,g,b);

			if(audioTime > orb.beatTime + ORB_LINGER){

				orb.node.identity().scale(0);

				activeOrbs.splice(i,1);
			}
		}

		const beatWindow = getBeatWindow(
			state.beatMap,
			audioTime,
			state.audioElement.duration
		);

		if(beatWindow){

			const beatInterval = state.beatMap.beatInterval;

			const pulseWidth = Math.min(0.18, beatInterval * 0.35);

			const normalizedDistance =
				clamp(1 - beatWindow.distance / pulseWidth,0,1);

			const beatStrength =
				normalizedDistance * beatWindow.beat.strength;

			const activePad =
				beatWindow.beatIndex % pads.length;

			for(let i=0;i<pads.length;i++){

				const highlight = i===activePad ? 0.6 : 0.15;

				const flash =
					Math.min(1, highlight + beatStrength * (i===activePad ? 0.6 : 0.25));

				pads[i]
					.identity()
					.move(padOffsets[i])
					.scale(0.12,0.03+flash*0.05,0.12)
					.color(mixColor(padBaseColors[i],flash));
			}
		}
	});
};