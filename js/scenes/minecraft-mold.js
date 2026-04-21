import * as cg from '../render/core/cg.js';
import { ControllerBeam } from '../render/core/controllerInput.js';

window.shared = { id: null };

const SMALL_CUBE_SIZE  = 0.1;  // side length of each small cube (metres)
const GRID_N           = 3;    // cubes per side  →  GRID_N³ cubes total

export const init = async model => {
    let beamL = new ControllerBeam(model, 'left');
    let beamR = new ControllerBeam(model, 'right');

    // Centre the big cube at (0, 1.5, -0.5)
    const origin = [0, 1.5, -0.5];
    const offset = (GRID_N - 1) / 2 * SMALL_CUBE_SIZE; // centres the grid

    for (let i = 0; i < GRID_N; i++) {
        for (let j = 0; j < GRID_N; j++) {
            for (let k = 0; k < GRID_N; k++) {
                const x = origin[0] + i * SMALL_CUBE_SIZE - offset;
                const y = origin[1] + j * SMALL_CUBE_SIZE - offset;
                const z = origin[2] + k * SMALL_CUBE_SIZE - offset;
                model.add('cube')
                    .move(x, y, z)
                    .scale(SMALL_CUBE_SIZE)
                    .color(0.7, 0.85, 1.0);
            }
        }
    }

    model.animate(() => {
        beamL.update();
        beamR.update();
    });
};
