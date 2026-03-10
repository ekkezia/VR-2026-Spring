import { analyzeFullBuffer } from "/node_modules/realtime-bpm-analyzer/dist/dist/index.esm.js";
import * as cg from "../render/core/cg.js";

const SCENE_STATE_KEY = "__drumsBeatSceneState";
const AUDIO_URL = "/media/sound/drums.ogg";

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

const createAudioContext = () =>
  new (window.AudioContext || window.webkitAudioContext)();

const mixColor = (base, amount) => [
  base[0] + (1 - base[0]) * amount,
  base[1] + (1 - base[1]) * amount,
  base[2] + (1 - base[2]) * amount,
];

const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

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
      const value = channelData[i];
      sum += value * value;
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
  for (
    let time = bestOffset;
    time < audioBuffer.duration;
    time += beatInterval
  ) {
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

  const maxEnergy = beats.reduce((m, beat) => Math.max(m, beat.energy), 0.0001);
  for (const beat of beats)
    beat.strength = clamp(beat.energy / maxEnergy, 0.25, 1);

  return {
    bpm,
    beatInterval,
    offset: bestOffset,
    beats,
  };
};

const getBeatWindow = (beatMap, elapsedSeconds, loopDuration) => {
  if (!beatMap || !beatMap.beats.length || !loopDuration) return null;

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

let status = {
  left: { position: [0, 0, 0], color: [0, 1, 1] },
  right: { position: [0, 0, 0], color: [0, 1, 1] },
  objColor: [0.5, 0.5, 0.5],
  range: [0, 0],
};

export const init = async (model) => {
  if (window[SCENE_STATE_KEY]?.cleanup) window[SCENE_STATE_KEY].cleanup();

  const kit = model.add().move(0, 1.45, -0.45);
  const pads = padOffsets.map((offset, i) =>
    kit.add("cube").move(offset).scale(0.12, 0.03, 0.12).color(padBaseColors[i])
  );

  const stickL = model.add("cube").move(0, 1.45, -0.45).scale(0.04, 0.4, 0.04).color(1,1,1)
  const stickR = model.add("cube").move(-0.1, 1.45, -0.45).scale(0.04, 0.4, 0.04).color(1,1,1)

  const drumL = kit.add("cube").move(-0.3, 0, 0).scale(0.2, 0.1, 0.2).color(1,0,0)
  const drumR = kit.add("cube").move(0.3, 0, 0).scale(0.2, 0.1, 0.2).color(0,0,1)

  let invModel = () => cg.mInverse(model.getGlobalMatrix()); // the inverse of global matrix = local matrix
  
  inputEvents.onMove = hand => {
               if (isXR()) {
                let leftPos = inputEvents.pos('left'); // global
                let rightPos = inputEvents.pos('right'); // global
                let localLeft = cg.mTransform(invModel(), leftPos || [0,0,0]);
                let localRight = cg.mTransform(invModel(), rightPos || [0,0,0]);

                if (hand === 'left') {
                  status.left.position = localLeft;
                  status.left.color = [1,1,0];
                }
                if (hand === 'right') {
                  status.right.position = localRight;
                  status.right.color = [1,1,0];
                }
               }
        }
  const beatOrb = model
    .add("sphere")
    .move(0, 1.82, -0.35)
    .scale(0.08)
    .color(1, 0.2, 0.2);
  model
    .add("square")
    .move(0, 1.68, -0.22)
    .scale(0.34, 0.16, 1)
    .color(0.05, 0.06, 0.08)
    .opacity(0.92);
  const statusText = model.add().move(-0.15, 1.76, -0.21);

  const state = {
    audioContext: createAudioContext(),
    audioElement: null,
    sourceNode: null,
    gainNode: null,
    audioBuffer: null,
    beatMap: null,
    started: false,
    destroyed: false,
    loading: true,
    status: "Loading beat map from drums.ogg ...",
    lastStatusText: "",
    pointerStartHandler: null,
    clickStartHandler: null,
    cleanup: null,
  };

  window[SCENE_STATE_KEY] = state;

  const updateStatusText = (text) => {
    if (state.lastStatusText === text) return;
    state.lastStatusText = text;
    while (statusText.nChildren()) statusText.remove(0);
    statusText.add(clay.text(text)).color(1, 1, 1).scale(0.11);
  };

  const buildStatus = () => {
    const bpm = state.beatMap?.bpm;
    const bpmLine = bpm ? `BPM ${bpm.toFixed(0)}` : "BPM ...";
    const playLine = state.loading
      ? state.status
      : state.started
      ? "Playing cached beat map."
      : "Beat map ready. Click or tap to start.";
    const beatLine = state.beatMap
      ? `${state.beatMap.beats.length} beats cached`
      : "Analyzing offline";
    updateStatusText(`${bpmLine}\n${playLine}\n${beatLine}`);
  };

  try {
    const response = await fetch(AUDIO_URL);
    const arrayBuffer = await response.arrayBuffer();
    state.audioBuffer = await state.audioContext.decodeAudioData(
      arrayBuffer.slice(0)
    );

    const bpmCandidates = await analyzeFullBuffer(state.audioBuffer, {
      minTempo: 60,
      maxTempo: 180,
    });

    state.beatMap = buildBeatMap(state.audioBuffer, bpmCandidates);
    state.loading = false;
    state.status = "Beat map loaded from drums.ogg.";
  } catch (error) {
    console.error("Failed to precompute drum beat map:", error);
    state.loading = false;
    state.status = "Beat map load failed.";
  }

  const ensureStarted = async () => {
    if (state.destroyed || state.loading || !state.beatMap) return;

    if (!state.audioElement) {
      state.audioElement = new Audio(AUDIO_URL);
      state.audioElement.loop = true;
      state.audioElement.crossOrigin = "anonymous";
      state.sourceNode = state.audioContext.createMediaElementSource(
        state.audioElement
      );
      state.gainNode = state.audioContext.createGain();
      state.gainNode.gain.value = 0.9;
      state.sourceNode.connect(state.gainNode);
      state.gainNode.connect(state.audioContext.destination);
    }

    await state.audioContext.resume();

    if (state.audioElement.paused) {
      await state.audioElement.play();
      state.started = true;
    }
  };

  state.pointerStartHandler = () => {
    ensureStarted().catch((error) => {
      console.error("Unable to start drums scene audio:", error);
      state.status = "Audio start failed. Check browser autoplay permissions.";
    });
  };

  state.clickStartHandler = () => {
    state.pointerStartHandler();
  };

  window.addEventListener("pointerdown", state.pointerStartHandler);
  inputEvents.onClick = state.clickStartHandler;

  state.cleanup = () => {
    state.destroyed = true;
    window.removeEventListener("pointerdown", state.pointerStartHandler);
    if (inputEvents.onClick === state.clickStartHandler)
      inputEvents.onClick = null;
    if (state.audioElement) {
      state.audioElement.pause();
      state.audioElement.src = "";
    }
    state.sourceNode?.disconnect?.();
    state.gainNode?.disconnect?.();
    state.audioContext?.close?.();
    if (window[SCENE_STATE_KEY] === state) delete window[SCENE_STATE_KEY];
  };

  buildStatus();

  model.animate(() => {
    if (state.destroyed) return;

    stickL.identity().move(status.left.position[0], status.left.position[1], status.left.position[2]).color(status.left.color[0], status.left.color[1], status.left.color[2]);
    stickR.identity().move(status.right.position[0], status.right.position[1], status.right.position[2]).color(status.right.color[0], status.right.color[1], status.right.color[2]);

    let beatStrength = 0;
    let activePad = -1;

    if (state.started && state.audioElement && state.beatMap) {
      const beatWindow = getBeatWindow(
        state.beatMap,
        state.audioElement.currentTime,
        state.audioElement.duration || state.audioBuffer?.duration
      );

      if (beatWindow) {
        const pulseWidth = Math.min(0.18, state.beatMap.beatInterval * 0.35);
        const normalizedDistance = clamp(
          1 - beatWindow.distance / pulseWidth,
          0,
          1
        );
        beatStrength = normalizedDistance * beatWindow.beat.strength;
        activePad = beatWindow.beatIndex % pads.length;
      }
    }

    for (let i = 0; i < pads.length; i++) {
      const highlight = i === activePad ? 0.6 : 0.15;
      const flash = Math.min(
        1,
        highlight + beatStrength * (i === activePad ? 0.6 : 0.25)
      );
      pads[i]
        .identity()
        .move(padOffsets[i])
        .scale(0.12, 0.03 + flash * 0.05, 0.12)
        .color(mixColor(padBaseColors[i], flash));
    }

    const orbScale = 0.08 + beatStrength * 0.08;
    beatOrb
      .identity()
      .move(0, 1.82, -0.35)
      .scale(orbScale)
      .color(1, 0.2 + beatStrength * 0.6, 0.2 + beatStrength * 0.4);

    buildStatus();
  });
};
