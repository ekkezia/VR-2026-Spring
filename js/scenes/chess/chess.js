import * as pieceMeshBuilder from "./piece_mesh_builder.js";
import { constructFEN, getNewFEN, getMoveDetails, getLegalDestinations } from "./board_analysis.js";
import { buttonState } from "../../render/core/controllerInput.js";
import { lcb, rcb } from "../../handle_scenes.js";
import { loadSound, playSoundAtPosition } from "../../util/positional-audio.js";

// Same board/pieces/rules as chess.js, but a different SELECTION model:
// point at a square (highlighted red) instead of a piece. Pressing the
// controller's A/X button (or pinching thumb-to-index in hand-tracking mode)
// while aiming selects the piece on that square (highlighted yellow) and
// lights up its legal destination squares (blue); pressing again on a legal
// square moves the piece there. Runs as an independent scene with its own
// network state (window.pieceInfo2) so it never collides with chess.js.


// LOAD ALL THE SOUNDS THAT WILL BE MADE WHEN BALLS BOUNCE.

let soundBuffer = [], loadSounds = [];
loadSounds.push(loadSound('../../media/sound/chessSounds/capture.mp3', buffer => soundBuffer[0] = buffer));
loadSounds.push(loadSound('../../media/sound/chessSounds/move-opponent.mp3', buffer => soundBuffer[1] = buffer));
loadSounds.push(loadSound('../../media/sound/chessSounds/move-self.mp3', buffer => soundBuffer[2] = buffer));
Promise.all(loadSounds);

// SHARED STATE IS A GLOBAL VARIABLE.
window.pieceInfo2 = {
   // White pieces
  wpawn1:   { xyz: [0,1,0], square: "a2", rgb: [1,1,1], isGrabbed: false },
  wpawn2:   { xyz: [0,1,0], square: "b2", rgb: [1,1,1], isGrabbed: false },
  wpawn3:   { xyz: [0,1,0], square: "c2", rgb: [1,1,1], isGrabbed: false },
  wpawn4:   { xyz: [0,1,0], square: "d2", rgb: [1,1,1], isGrabbed: false },
  wpawn5:   { xyz: [0,1,0], square: "e2", rgb: [1,1,1], isGrabbed: false },
  wpawn6:   { xyz: [0,1,0], square: "f2", rgb: [1,1,1], isGrabbed: false },
  wpawn7:   { xyz: [0,1,0], square: "g2", rgb: [1,1,1], isGrabbed: false },
  wpawn8:   { xyz: [0,1,0], square: "h2", rgb: [1,1,1], isGrabbed: false },
  wknight1: { xyz: [0,1,0], square: "b1", rgb: [1,1,1], isGrabbed: false },
  wknight2: { xyz: [0,1,0], square: "g1", rgb: [1,1,1], isGrabbed: false },
  wking1:   { xyz: [0,1,0], square: "e1", rgb: [1,1,1], isGrabbed: false },
  wrook1:   { xyz: [0,1,0], square: "a1", rgb: [1,1,1], isGrabbed: false },
  wrook2:   { xyz: [0,1,0], square: "h1", rgb: [1,1,1], isGrabbed: false },
  wbishop1: { xyz: [0,1,0], square: "c1", rgb: [1,1,1], isGrabbed: false },
  wbishop2: { xyz: [0,1,0], square: "f1", rgb: [1,1,1], isGrabbed: false },
  wqueen1:  { xyz: [0,1,0], square: "d1", rgb: [1,1,1], isGrabbed: false },
  wqueen2:  { xyz: [0,1,0], square: null, rgb: [1,1,1], isGrabbed: false },

  // Black pieces
  bpawn1:   { xyz: [0,1,0], square: "a7", rgb: [.02,.02,.02], isGrabbed: false },
  bpawn2:   { xyz: [0,1,0], square: "b7", rgb: [.02,.02,.02], isGrabbed: false },
  bpawn3:   { xyz: [0,1,0], square: "c7", rgb: [.02,.02,.02], isGrabbed: false },
  bpawn4:   { xyz: [0,1,0], square: "d7", rgb: [.02,.02,.02], isGrabbed: false },
  bpawn5:   { xyz: [0,1,0], square: "e7", rgb: [.02,.02,.02], isGrabbed: false },
  bpawn6:   { xyz: [0,1,0], square: "f7", rgb: [.02,.02,.02], isGrabbed: false },
  bpawn7:   { xyz: [0,1,0], square: "g7", rgb: [.02,.02,.02], isGrabbed: false },
  bpawn8:   { xyz: [0,1,0], square: "h7", rgb: [.02,.02,.02], isGrabbed: false },
  bknight1: { xyz: [0,1,0], square: "b8", rgb: [.02,.02,.02], isGrabbed: false },
  bknight2: { xyz: [0,1,0], square: "g8", rgb: [.02,.02,.02], isGrabbed: false },
  bking1:   { xyz: [0,1,0], square: "e8", rgb: [.02,.02,.02], isGrabbed: false },
  brook1:   { xyz: [0,1,0], square: "a8", rgb: [.02,.02,.02], isGrabbed: false },
  brook2:   { xyz: [0,1,0], square: "h8", rgb: [.02,.02,.02], isGrabbed: false },
  bbishop1: { xyz: [0,1,0], square: "c8", rgb: [.02,.02,.02], isGrabbed: false },
  bbishop2: { xyz: [0,1,0], square: "f8", rgb: [.02,.02,.02], isGrabbed: false },
  bqueen1:  { xyz: [0,1,0], square: "d8", rgb: [.02,.02,.02], isGrabbed: false },
  bqueen2:  { xyz: [0,1,0], square: null, rgb: [.02,.02,.02], isGrabbed: false },

  // Captured pieces
  capturedWhiteCount: 0,
  capturedBlackCount: 0,
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  moveHistory: [],
  board_history: "Moves:\n"
};

// Separate, deliberately lightweight synced global for the pointing/selection
// reticle (as opposed to pieceInfo2, the authoritative board state): broadcast
// only so an external listener like chessnutBridge2.html can mirror it onto the
// physical board's per-square LEDs. Not read back by this scene itself.
window.chess2Pointer = { pointedSquare: null, legalDestinations: [] };

  // instantMove = true (default): pieces snap straight to their destination
  // square the instant a move validates, same as before. instantMove = false:
  // pieces on the board instead render at the physical Chessnut board's live
  // tracked position (chessnutBridge2.html polls piece status and broadcasts
  // it as window.chess2PhysicalPieces), so a piece mid-slide on the real board
  // renders mid-slide in VR instead of teleporting. Toggle by hand for now.
  let instantMove = false;

  // Fixed physical-piece-slot <-> our piece name mapping. The 8-pawns-per-side
  // block boundaries and the non-pawn ordering follow the board's documented
  // piece order (2 rooks, 2 knights, 2 bishops, 2 queens, 1 king - lining up
  // 1:1 with our own wqueen1/wqueen2-style spare queen naming) and are
  // confirmed for knights only (g1-f3 fired slot 11 = wknight2, b8-c6 fired
  // slot 27 = bknight1) - rooks/bishops/queens/king are still the documented
  // a-h assumption, unverified. The PAWN order below is NOT a-h at all - it
  // turned out to be an arbitrary per-chip order - and was reconstructed by
  // pushing each pawn one square forward one at a time and matching each
  // slot's calibrated x-coordinate to the file it actually landed on.
  const PHYSICAL_SLOT_TO_PIECE_NAME = [
    'wpawn3','wpawn7','wpawn2','wpawn1','wpawn5','wpawn8','wpawn4','wpawn6',
    'wrook1','wrook2','wknight1','wknight2','wbishop1','wbishop2','wqueen1','wqueen2','wking1',
    'bpawn8','bpawn1','bpawn4','bpawn3','bpawn2','bpawn6','bpawn5','bpawn7',
    'brook1','brook2','bknight1','bknight2','bbishop1','bbishop2','bqueen1','bqueen2','bking1',
  ];

  // Converts the physical board's normalized 0-255 x/y piece-status coordinates
  // into the same world-space xyz squareToXYZ uses, so a piece mid-slide on the
  // real board renders at its true in-between position instead of snapping.
  // Calibrated from real "piece moving" log samples against known moves
  // (e2-e4 landed at x=114,y=112; e7-e5 at x=115,y=143 - same x confirms same
  // file, y increasing 32/rank confirms rank1->rank8), cross-checked against
  // squareToXYZ's own square-center formula: y increases rank1->rank8 as
  // expected, but x decreases a->h (increases h->a) - the same h->a reversal
  // fenToBoardBytes/squareToLedSlot already use elsewhere for this board.
  let physicalXYToXYZ = (x, y) => {
    return [1.25 - x / 102.5, .18, 1.0 - y / 128];
  };

  // A piece sitting still on the board still jitters by a few units of sensor
  // noise; once consecutive polls agree within this delta, render it at its
  // known logical square's exact center (pieceInfo2[name].square, via the
  // squareToXYZ fallback in the render loop below) instead of the raw
  // (jittery) physical reading, since a piece that isn't actually moving has
  // no reason to visibly tremble - and if it's at rest, that IS its square.
  const PHYSICAL_STILL_THRESHOLD = 2;
  let lastPhysicalSample = {}; // slot -> { x, y, stable }

  // convert 3d positions to chessboard squares (e.g. [0,0,0] -> "a1")
  // Board lies in XZ plane; only x and z determine the square (y is ignored).
  // Square centers: a1 = [-.875, *, .875], h8 = [.875, *, -.875]. Each square is 0.25 wide; left edge of 'a' is -1.
  // col from x: col = floor((x + 1) / 0.25); row from z: row = floor((0.875 - z) / 0.25)
  let xyzToSquare = (xyz) => {
    const x = xyz[0], z = xyz[2];
    if (x < -1.125 || x > 1.125 || z < -1.125 || z > 1.125) return null;
    const col = Math.floor((x + 1) / 0.25);
    const row = Math.floor((0.875 - z) / 0.25);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return String.fromCharCode(97 + col) + (row + 1);
  };

  let squareToXYZ = (square) => {
    return [-.875 + (square.charCodeAt(0) - 97) * 0.25, .18, .875 - (parseInt(square.slice(1)) - 1) * 0.25];
  };

  // convert square to index 0-64
  // mapping:
  // a1 = 0, b1 = 1, c1 = 2, ..., g8 = 62, h8 = 63
  let squareToIndex = (square) => {
    const col = square.charCodeAt(0) - 97;
    const row = parseInt(square.slice(1)) - 1;
    return row * 8 + col;
  };

  // convert index 0-64 to square
  let indexToSquare = (index) => {
    return String.fromCharCode(97 + index % 8) + (Math.floor(index / 8) + 1);
  };

  let isSquareFree = (square) => {
    for (const piece in pieceInfo2) {
      if (piece === 'capturedWhiteCount' || piece === 'capturedBlackCount' || piece === 'fen' || piece === 'moveHistory' || piece === 'board_history') continue;
      if (pieceInfo2[piece].square == square) {
        return false;
      }
    }
    return true;
  };

  // Predefined positions off the board: captured white pieces → left (negative x), captured black → right (positive x).
  // 16 slots per side in 2 rows of 8; y = .18 to match piece height.
  let capturedSlotXYZ = (color, index) => {
    const row = Math.floor(index / 8), col = index % 8;
    const y = 0;
    if (color === 'white') {
      const x = -1.5 - 0.25 * row;  // left of board
      const z = -.875 + 0.25 * col;
      return [x, y, z];
    } else {
      const x = 1.5 + 0.25 * row;   // right of board
      const z = .875 - 0.25 * col;
      return [x, y, z];
    }
  };

  let takePieceIfSquareNotFree = (square) => {
    if (!isSquareFree(square)) {
      for (const piece in pieceInfo2) {
        if (piece === 'capturedWhiteCount' || piece === 'capturedBlackCount') continue;
        if (pieceInfo2[piece].square == square) {
          const isWhite = piece.charAt(0) === 'w';
          const countKey = isWhite ? 'capturedWhiteCount' : 'capturedBlackCount';
          const count = (pieceInfo2[countKey] ?? 0);
          pieceInfo2[piece].square = 'captured';
          pieceInfo2[piece].captureIndex = count;
          pieceInfo2[piece].xyz = capturedSlotXYZ(isWhite ? 'white' : 'black', count);
          pieceInfo2[countKey] = count + 1;
          break;
        }
      }
    }
  }

export const init = async model => {

  model.customShader(`
    float toonBand(float x) {
       return x > .75 ? 1.0 : x > .35 ? .6 : .25;   // 3 clear posterized steps
    }
    ---------------------------------------------------------------------
    vec3 L = normalize(vec3(.577));
    float diffAmt = max(0., dot(normal, L));
    float banded = toonBand(diffAmt);

    // posterized diffuse, still modulated by the surface's own texture/diffuse color
    vec3 toonColor = (ambientColor * .3 + diffuseColor * banded) * rgba.rgb;

    // specular "sticker" highlight, scaled by the material's OWN specular color
    // so flat/dull surfaces (like text) stay untouched instead of blowing out to white
    vec3 H = normalize(L + eye);
    float spec = step(.9, pow(max(0., dot(normal, H)), max(specularPower, 1.0)));
    toonColor += spec * specularColor;

    // dark ink-style outline at grazing angles, instead of a bright rim
    float edge = pow(1.0 - max(0., dot(normal, eye)), 6.0);
    toonColor = mix(toonColor, toonColor * .2, edge);

    color = toonColor;
 `);

  // Build piece meshes from piece_mesh_builder.js
  clay.defineMesh('queen', pieceMeshBuilder.queenMesh);
  clay.defineMesh('pawn', pieceMeshBuilder.pawnMesh);
  clay.defineMesh('knight', pieceMeshBuilder.knightMesh);
  clay.defineMesh('king', pieceMeshBuilder.kingMesh);
  clay.defineMesh('rook', pieceMeshBuilder.rookMesh);
  clay.defineMesh('bishop', pieceMeshBuilder.bishopMesh);

  // Create a ground with chessboard texture
  let ground = model.add('square');
  let board = model.add('cube').color([.2,.2,.2]);

  for ( let n = 0; n < 64; n++) {
    ground.add('square');
  }
  for ( let n = 0; n < 64; n++) {
    let row = n / 8 >> 0;
    let col = n % 8;
    // start invisible
    ground.child(n).color('red').opacity(0.1);
  }

  // White piece models
  let wqueen1 = model.add('queen');
  // queen's crown
  wqueen1.add('sphere');
  // Second white queen, used only when a pawn promotes
  let wqueen2 = model.add('queen');
  wqueen2.add('sphere');
  let wpawn1 = model.add('pawn'), wpawn2 = model.add('pawn'), wpawn3 = model.add('pawn'),
      wpawn4 = model.add('pawn'), wpawn5 = model.add('pawn'), wpawn6 = model.add('pawn'),
      wpawn7 = model.add('pawn'), wpawn8 = model.add('pawn');
  let wpawnHead1 = wpawn1.add('sphere'), wpawnHead2 = wpawn2.add('sphere'), wpawnHead3 = wpawn3.add('sphere'),
      wpawnHead4 = wpawn4.add('sphere'), wpawnHead5 = wpawn5.add('sphere'), wpawnHead6 = wpawn6.add('sphere'),
      wpawnHead7 = wpawn7.add('sphere'), wpawnHead8 = wpawn8.add('sphere');

  let wknight1 = model.add('knight'), wknight2 = model.add('knight');
  let wking1 = model.add('king');
  for (let i = 0; i < 2; i++) {
    wking1.add('cube');
  }
  let wrook1 = model.add('rook'), wrook2 = model.add('rook');
  let wrookHead1 = wrook1.add('tubeY'), wrookHead2 = wrook2.add('tubeY');
  // rook crown
  for (let i = 0; i < 5; i++) {
    wrook1.add('cube');
    wrook2.add('cube');
  }
  let wbishop1 = model.add('bishop'), wbishop2 = model.add('bishop');
  let wbishopHead1 = wbishop1.add('sphere'), wbishopHead2 = wbishop2.add('sphere');
  wbishop1.add('sphere');
  wbishop2.add('sphere');

  // Black piece models
  let bqueen1 = model.add('queen');
  // queen's crown
  bqueen1.add('sphere');
  // Second black queen, used only when a pawn promotes
  let bqueen2 = model.add('queen');
  bqueen2.add('sphere');
  let bpawn1 = model.add('pawn'), bpawn2 = model.add('pawn'), bpawn3 = model.add('pawn'),
      bpawn4 = model.add('pawn'), bpawn5 = model.add('pawn'), bpawn6 = model.add('pawn'),
      bpawn7 = model.add('pawn'), bpawn8 = model.add('pawn');
  let bpawnHead1 = bpawn1.add('sphere'), bpawnHead2 = bpawn2.add('sphere'), bpawnHead3 = bpawn3.add('sphere'),
      bpawnHead4 = bpawn4.add('sphere'), bpawnHead5 = bpawn5.add('sphere'), bpawnHead6 = bpawn6.add('sphere'),
      bpawnHead7 = bpawn7.add('sphere'), bpawnHead8 = bpawn8.add('sphere');
  let bknight1 = model.add('knight'), bknight2 = model.add('knight');
  let bking1 = model.add('king');
  // king's crown
  for (let i = 0; i < 2; i++) {
    bking1.add('cube');
  }
  let brook1 = model.add('rook'), brook2 = model.add('rook');
  let brookHead1 = brook1.add('tubeY'), brookHead2 = brook2.add('tubeY');
  // rook crown
  for (let i = 0; i < 5; i++) {
    brook1.add('cube');
    brook2.add('cube');
  }
  let bbishop1 = model.add('bishop'), bbishop2 = model.add('bishop');
  let bbishopHead1 = bbishop1.add('sphere'), bbishopHead2 = bbishop2.add('sphere');
  bbishop1.add('sphere');
  bbishop2.add('sphere');

  // Map piece name (string) -> { name, node } so we can separate the name for a piece with its model
  // Maybe I shouldn't have used the same names...
  let pieceList = [
    // White pieces
    { name: 'wqueen1',  node: wqueen1 },
    { name: 'wqueen2',  node: wqueen2 },
    { name: 'wpawn1',   node: wpawn1 },
    { name: 'wpawn2',   node: wpawn2 },
    { name: 'wpawn3',   node: wpawn3 },
    { name: 'wpawn4',   node: wpawn4 },
    { name: 'wpawn5',   node: wpawn5 },
    { name: 'wpawn6',   node: wpawn6 },
    { name: 'wpawn7',   node: wpawn7 },
    { name: 'wpawn8',   node: wpawn8 },
    { name: 'wknight1', node: wknight1 },
    { name: 'wknight2', node: wknight2 },
    { name: 'wking1',   node: wking1 },
    { name: 'wrook1',   node: wrook1 },
    { name: 'wrook2',   node: wrook2 },
    { name: 'wbishop1', node: wbishop1 },
    { name: 'wbishop2', node: wbishop2 },
    // Black pieces
    { name: 'bqueen1',  node: bqueen1 },
    { name: 'bqueen2',  node: bqueen2 },
    { name: 'bpawn1',   node: bpawn1 },
    { name: 'bpawn2',   node: bpawn2 },
    { name: 'bpawn3',   node: bpawn3 },
    { name: 'bpawn4',   node: bpawn4 },
    { name: 'bpawn5',   node: bpawn5 },
    { name: 'bpawn6',   node: bpawn6 },
    { name: 'bpawn7',   node: bpawn7 },
    { name: 'bpawn8',   node: bpawn8 },
    { name: 'bknight1', node: bknight1 },
    { name: 'bknight2', node: bknight2 },
    { name: 'bking1',   node: bking1 },
    { name: 'brook1',   node: brook1 },
    { name: 'brook2',   node: brook2 },
    { name: 'bbishop1', node: bbishop1 },
    { name: 'bbishop2', node: bbishop2 },
  ];

  // selectedSquare: algebraic square of the currently selected piece, or null.
  // pointedSquareIndex: 0-63 index of the square the controller beam is currently over, or null.
  let selectedSquare = null;
  let pointedSquareIndex = null;
  let wasSelectPressed = false;
  let lastBroadcastPointerKey = null; // dedupes chess2Pointer broadcasts to real changes only

  let pieceAtSquare = (square) => pieceList.find(({ name }) => pieceInfo2[name] && pieceInfo2[name].square === square) || null;

  // Assign chessboard texture to ground
  model.txtrSrc(1, '../media/textures/chessboard.png');
  model.txtrSrc(2, '../media/textures/brown-wood-texture.png');

  ground.txtr(1);
  board.txtr(2);

  // Validates and applies a move (and all its side effects) to pieceInfo2 - same
  // logic chess.js applies on drop, just driven by two discrete square clicks
  // instead of a drag. Does nothing if the move is illegal.
  let applyMove = (piece, currentSquare, square) => {
    let currentFen = pieceInfo2.fen;
    if (!currentFen) {
        currentFen = constructFEN(pieceInfo2);
        pieceInfo2.fen = currentFen;
    }

    let moveDetails = getMoveDetails(currentFen, currentSquare, square);
    if (!moveDetails) return;

    // Update FEN
    pieceInfo2.fen = getNewFEN(currentFen, currentSquare, square);

    // Update Move History
    if (moveDetails.san) {
        if (!pieceInfo2.moveHistory) pieceInfo2.moveHistory = [];
        pieceInfo2.moveHistory.push(moveDetails.san);

        // Update formatted history string
        let historyStr = "Moves:\n";
        for (let i = 0; i < pieceInfo2.moveHistory.length; i += 2) {
            const moveNum = Math.floor(i / 2) + 1;
            const whiteMove = pieceInfo2.moveHistory[i];
            const blackMove = pieceInfo2.moveHistory[i + 1] || "";

            historyStr += `${moveNum}.${whiteMove}`;
            if (blackMove) {
                historyStr += `  ${blackMove}`;
            }
            historyStr += "\n";
        }
        pieceInfo2.board_history = historyStr;
    }

    // Handle capture
    // Check if it's a capture based on move details (includes standard capture and en passant)
    let isCapture = moveDetails.flags.includes('c') || moveDetails.flags.includes('e');

    if (isCapture) {
        if (moveDetails.flags.includes('e')) {
            // It's en passant. The captured piece is at the square:
            // 'to' column, 'from' row.
            const capturedSquareCol = square.charAt(0);
            const capturedSquareRow = currentSquare.charAt(1);
            const capturedSquare = capturedSquareCol + capturedSquareRow;
            takePieceIfSquareNotFree(capturedSquare);
        } else {
            // Standard capture
            takePieceIfSquareNotFree(square);
        }

        playSoundAtPosition(soundBuffer[0], squareToXYZ(square));
    } else {
        // Play move sound
        if (piece.charAt(0) === 'w') {
          playSoundAtPosition(soundBuffer[2], squareToXYZ(square));
        } else {
          playSoundAtPosition(soundBuffer[1], squareToXYZ(square));
        }
    }

    // Handle castling: chess.js already moved the king in the FEN,
    // but the rook also needs to be relocated to match it.
    let isCastle = moveDetails.flags.includes('k') || moveDetails.flags.includes('q');
    if (isCastle) {
        const isWhite = piece.charAt(0) === 'w';
        const homeRank = isWhite ? '1' : '8';
        const isKingside = moveDetails.flags.includes('k');
        const rookFromSquare = (isKingside ? 'h' : 'a') + homeRank;
        const rookToSquare = (isKingside ? 'f' : 'd') + homeRank;
        for (const p in pieceInfo2) {
            if (p === 'capturedWhiteCount' || p === 'capturedBlackCount' || p === 'fen' || p === 'moveHistory' || p === 'board_history') continue;
            if (pieceInfo2[p].square === rookFromSquare) {
                pieceInfo2[p].square = rookToSquare;
                pieceInfo2[p].xyz = squareToXYZ(rookToSquare);
                break;
            }
        }
    }

    // Handle promotion: a pawn reaching the last rank always promotes to a queen.
    // The pawn model is retired (moved out of play) and a spare queen of the
    // same color takes its place on the destination square.
    let isPromotion = moveDetails.flags.includes('p');
    if (isPromotion) {
        const isWhite = piece.charAt(0) === 'w';
        const queenNames = isWhite ? ['wqueen1', 'wqueen2'] : ['bqueen1', 'bqueen2'];
        const freeQueenName = queenNames.find(name => !pieceInfo2[name].square || pieceInfo2[name].square === 'captured');
        if (freeQueenName) {
            pieceInfo2[freeQueenName].square = square;
            pieceInfo2[freeQueenName].xyz = squareToXYZ(square);
            pieceInfo2[freeQueenName].rgb = isWhite ? [1,1,1] : [.02,.02,.02];
        } else {
            console.warn('No spare queen available for promotion; leaving pawn in place.');
        }
        // Retire the pawn now that a queen represents it, unless there was no
        // spare queen to promote into.
        if (freeQueenName) {
            pieceInfo2[piece].square = null;
            pieceInfo2[piece].xyz = [0, -5, 0];
        }
    }

    if (!isPromotion) {
      pieceInfo2[piece].xyz = squareToXYZ(square);
      pieceInfo2[piece].square = square;
    }

    server.broadcastGlobal('pieceInfo2');
  };

  let piecePositions = {
    // white pieces
    wpawn1:   squareToXYZ("a2"),
    wpawn2:   squareToXYZ("b2"),
    wpawn3:   squareToXYZ("c2"),
    wpawn4:   squareToXYZ("d2"),
    wpawn5:   squareToXYZ("e2"),
    wpawn6:   squareToXYZ("f2"),
    wpawn7:   squareToXYZ("g2"),
    wpawn8:   squareToXYZ("h2"),
    wknight1: squareToXYZ("b1"),
    wknight2: squareToXYZ("g1"),
    wqueen1:  squareToXYZ("d1"),
    wking1:   squareToXYZ("e1"),
    wrook1:   squareToXYZ("a1"),
    wrook2:   squareToXYZ("h1"),
    wbishop1: squareToXYZ("c1"),
    wbishop2: squareToXYZ("f1"),
    // black pieces
    bpawn1:   squareToXYZ("a7"),
    bpawn2:   squareToXYZ("b7"),
    bpawn3:   squareToXYZ("c7"),
    bpawn4:   squareToXYZ("d7"),
    bpawn5:   squareToXYZ("e7"),
    bpawn6:   squareToXYZ("f7"),
    bpawn7:   squareToXYZ("g7"),
    bpawn8:   squareToXYZ("h7"),
    bknight1: squareToXYZ("b8"),
    bknight2: squareToXYZ("g8"),
    bqueen1:  squareToXYZ("d8"),
    bking1:   squareToXYZ("e8"),
    brook1:   squareToXYZ("a8"),
    brook2:   squareToXYZ("h8"),
    bbishop1: squareToXYZ("c8"),
    bbishop2: squareToXYZ("f8"),
  };

  let wboardHelperLetters =
  `a   b   c   d   e   f   g   h`;
  let bboardHelperLetters =
  `h   g   f   e   d   c   b   a`;
  let wboardHelperNumbers =
  `
  8

  7

  6

  5

  4

  3

  2

  1
  `;
  let bboardHelperNumbers =
  `
  1

  2

  3

  4

  5

  6

  7

  8
  `;
  let wlettersMesh = clay.text(wboardHelperLetters);
  let wnumbersMesh = clay.text(wboardHelperNumbers);
  let blettersMesh = clay.text(bboardHelperLetters);
  let bnumbersMesh = clay.text(bboardHelperNumbers);
  let wletters = model.add(wlettersMesh);
  let wnumbers = model.add(wnumbersMesh);
  let bletters = model.add(blettersMesh);
  let bnumbers = model.add(bnumbersMesh);

  let boardHistory = null;
  let lastBoardHistory = "";
  let hasBroadcastInitialState = false;

  // Render board and pieces
  model.move(0,1,0).scale(.22).animate(() => {
    pieceInfo2 = server.synchronize('pieceInfo2');

    // Push the true current position out as soon as it's ready, instead of only
    // on the next move, so external listeners riding this same relay without
    // joining the scene's client list (e.g. chessnutBridge2.html driving a
    // physical board) see the position without a VR move happening first.
    if (!hasBroadcastInitialState && window.clients !== undefined && !window['waitForFirstUpdate__pieceInfo2']) {
      hasBroadcastInitialState = true;
      server.broadcastGlobal('pieceInfo2');
    }

    if (pieceInfo2.board_history !== lastBoardHistory) {
        lastBoardHistory = pieceInfo2.board_history;
        if (boardHistory) model.remove(boardHistory);
        if (lastBoardHistory) {
            let meshName = clay.text(lastBoardHistory, .5);
            boardHistory = model.add(meshName);
            boardHistory.identity().move(1.8, 0, -0.5).turnX(-Math.PI/2).scale(3);
        }
    }


    wletters/*model.add(lettersMesh)*/.identity()
      //.scale(1/1.2, 1/0.08, 1/1.2)
      .move(-.915, 0, 1.04)
      .turnX(-Math.PI/2)
      .scale(4.95);
    wnumbers/*model.add(numbersMesh)*/.identity()
      .move(-1.26, 0, -1.065)
      .turnX(-Math.PI/2)
      .scale(4.95);
      //.scale(0.08);
    bletters/*model.add(lettersMesh)*/.identity()
      .turnY(Math.PI)
      .move(-.915, 0, 1.04)
      .turnX(-Math.PI/2)
      .scale(4.95);
    bnumbers/*model.add(numbersMesh)*/.identity()
      .turnY(Math.PI)
      .move(-1.26, 0, -1.065)
      .turnX(-Math.PI/2)
      .scale(4.95)


    let sin = Math.sin;
    let cos = Math.cos;
    let t = model.time;

    ground.identity()
      .move(0,0,0)
      .turnX(-Math.PI/2);
      //.scale(2,1,1)
      //.turnZ(.5*model.time);

    for ( let n = 0; n < 64; n++) {

      let row = n / 8 >> 0;
      let col = n % 8;
      ground.child(n).identity()
        .move(.25*(col+1)-1.125,.25*(row+1)-1.125,0.001)
        .scale(.125,.125,.1)
    }

    board.identity()
      //.turnZ(t)
      .move(0, -.081, 0)
      .scale(1.2, .08, 1.2)

    // Which square (if any) the controller beam is currently over.
    pointedSquareIndex = null;
    if (lcb && rcb) {
      for (let n = 0; n < 64; n++) {
        let m = ground.child(n).getGlobalMatrix();
        if (lcb.hitRect(m) || rcb.hitRect(m)) { pointedSquareIndex = n; break; }
      }
    }
    let pointedSquareName = pointedSquareIndex != null ? indexToSquare(pointedSquareIndex) : null;

    let legalDestinations = selectedSquare ? getLegalDestinations(pieceInfo2.fen, selectedSquare) : [];

    // Edge-triggered "select" input: controller A/X button, or thumb-to-index
    // pinch in hand-tracking mode (not the trigger chess.js's grab uses).
    let aPressed = (buttonState.right[4] && buttonState.right[4].pressed) ||
                   (buttonState.left[4]  && buttonState.left[4].pressed);
    let pinchPressed = window.handtracking &&
        ((clay.handsWidget.pinch.left  ?? 0) > 0 ||
         (clay.handsWidget.pinch.right ?? 0) > 0);
    let isSelectPressed = aPressed || pinchPressed;
    let selectJustPressed = isSelectPressed && !wasSelectPressed;
    wasSelectPressed = isSelectPressed;

    if (selectJustPressed && pointedSquareName != null) {
      if (selectedSquare == null) {
        if (pieceAtSquare(pointedSquareName)) selectedSquare = pointedSquareName;
      } else if (pointedSquareName === selectedSquare) {
        selectedSquare = null; // toggle off
      } else if (legalDestinations.includes(pointedSquareName)) {
        let piece = pieceAtSquare(selectedSquare);
        applyMove(piece.name, selectedSquare, pointedSquareName);
        selectedSquare = null;
      } else if (pieceAtSquare(pointedSquareName)) {
        selectedSquare = pointedSquareName; // reselect a different piece
      } else {
        selectedSquare = null; // clicked an empty, non-legal square
      }
    }

    // A move just fired this frame clears the selection above, so re-derive which
    // destinations to actually paint blue from the up-to-date selectedSquare.
    let destinationsToHighlight = selectedSquare ? legalDestinations : [];

    // Mirror the on-screen reticle to chessnutBridge2.html so it can light up the
    // same squares on the physical board's LEDs (red = pointed-at, blue = legal
    // destinations). Only broadcast on an actual change to avoid spamming the
    // relay/BLE link every single frame while nothing moved.
    let pointerKey = pointedSquareName + '|' + destinationsToHighlight.join(',');
    if (pointerKey !== lastBroadcastPointerKey) {
      lastBroadcastPointerKey = pointerKey;
      window.chess2Pointer = { pointedSquare: pointedSquareName, legalDestinations: destinationsToHighlight };
      server.broadcastGlobal('chess2Pointer');
    }

    // When instantMove is false, look up each in-play piece's live position on
    // the physical board (broadcast by chessnutBridge2.html) by its fixed
    // physical slot, so the rendering loop below can use it instead of
    // snapping straight to the destination square.
    let physicalXYZByName = null;
    if (!instantMove && window.chess2PhysicalPieces) {
      physicalXYZByName = {};
      for (const p of window.chess2PhysicalPieces) {
        const name = PHYSICAL_SLOT_TO_PIECE_NAME[p.slot];
        if (!name) continue;

        // Only re-judge "moving vs settled" when this poll actually reported a
        // different reading than last time - the broadcast only updates at the
        // bridge's ~5Hz poll rate, so most render frames see the same values
        // repeated, and re-comparing those against themselves would always
        // read as "stable" even mid-slide.
        const last = lastPhysicalSample[p.slot];
        if (!last || last.x !== p.x || last.y !== p.y) {
          const delta = last ? Math.abs(p.x - last.x) + Math.abs(p.y - last.y) : Infinity;
          lastPhysicalSample[p.slot] = { x: p.x, y: p.y, stable: delta <= PHYSICAL_STILL_THRESHOLD };
        }

        // Stable: leave physicalXYZByName[name] unset so the render loop below
        // falls through to squareToXYZ(piece.square) - its known logical square.
        if (!lastPhysicalSample[p.slot].stable) {
          physicalXYZByName[name] = physicalXYToXYZ(p.x, p.y);
        }
      }
    }

    // Position and color each piece from pieceInfo2[name]; the selected piece
    // (and its square, below) is tinted yellow.

    for (let { name, node } of pieceList) {
      let piece = pieceInfo2[name];
      let xyz;
      if (piece && piece.square == 'captured' && piece.captureIndex !== null) {
        xyz = capturedSlotXYZ(name.charAt(0) === 'w' ? 'white' : 'black', piece.captureIndex);
      } else if (!piece || !piece.square) {
        // Not yet in play (e.g. a promotion queen before any pawn has promoted,
        // or a pawn that has been consumed by promoting into a queen)
        xyz = [0, -5, 0];
      } else if (physicalXYZByName && physicalXYZByName[name]) {
        xyz = physicalXYZByName[name];
      } else {
        xyz = squareToXYZ(piece.square);
      }
      let isSelected = selectedSquare && piece && piece.square === selectedSquare;
      node.identity()
        .color(isSelected ? 'yellow' : (piece ? piece.rgb : [.8,.8,.8]))
        .move(xyz)
        .scale(0.18);
      const pieceColor = isSelected ? 'yellow' : (piece ? piece.rgb : [.8,.8,.8]);
      for (let i = 0; i < node.nChildren(); i++) {
        if (node.child(i) !== undefined) node.child(i).identity().color(pieceColor);
      }
      if (name == 'wknight1' || name == 'wknight2') node.turnY(Math.PI/2);
      if (name == 'bknight1' || name == 'bknight2') node.turnY(-Math.PI/2);
      //}
    }

    // Square highlighting, layered so red (pointed-at) always wins if it overlaps
    // a blue (legal destination) or yellow (selected) square.
    for (let n = 0; n < 64; n++) ground.child(n).color([.59,.29,0]);//.opacity(0.3);
    for (let sq of destinationsToHighlight) ground.child(squareToIndex(sq)).color([0,.4,1]).opacity(0.6);
    if (selectedSquare) ground.child(squareToIndex(selectedSquare)).color('yellow').opacity(1);
    if (pointedSquareName != null) ground.child(squareToIndex(pointedSquareName)).color('red').opacity(1);

    // Still need to fill in missing mesh data:
    //    - pawn's head
    //    - bishop's head
    //    - rook's head
    //    - king's crown
    //    - knight's body

    const headColor = (name) => {
      const piece = pieceInfo2[name];
      const isSelected = selectedSquare && piece && piece.square === selectedSquare;
      return isSelected ? 'yellow' : (piece?.rgb ?? [.8,.8,.8]);
    };
    wpawnHead1.identity()
      .color(headColor('wpawn1'))
      .scale(0.23)
      .move(0, -0.4, 0);
    wpawnHead2.identity()
      .color(headColor('wpawn2'))
      .scale(0.23)
      .move(0, -0.4, 0);
    wpawnHead3.identity()
      .color(headColor('wpawn3'))
      .scale(0.23)
      .move(0, -0.4, 0);
    wpawnHead4.identity()
      .color(headColor('wpawn4'))
      .scale(0.23)
      .move(0, -0.4, 0);
    wpawnHead5.identity()
      .color(headColor('wpawn5'))
      .scale(0.23)
      .move(0, -0.4, 0);
    wpawnHead6.identity()
      .color(headColor('wpawn6'))
      .scale(0.23)
      .move(0, -0.4, 0);
    wpawnHead7.identity()
      .color(headColor('wpawn7'))
      .scale(0.23)
      .move(0, -0.4, 0);
    wpawnHead8.identity()
      .color(headColor('wpawn8'))
      .scale(0.23)
      .move(0, -0.4, 0);

    wbishopHead1.identity()
      .color(headColor('wbishop1'))
      .scale(.23, .35, .23)
      .move(0, 1, 0);
    wbishop1.child(1).identity()
      .color(headColor('wbishop1'))
      .scale(.1, .05, .1)
      .move(0, 14, 0);
    wbishopHead2.identity()
      .color(headColor('wbishop2'))
      .scale(.23, .35, .23)
      .move(0, 1, 0);
    wbishop2.child(1).identity()
      .color(headColor('wbishop2'))
      .scale(.1, .05, .1)
      .move(0, 14, 0);
    // king's crown
    wking1.child(0).identity()
      .color(headColor('wking1'))
      .scale(.1, .25, .05)
      .move(0, 3, 0);
    // queen's crown
    wqueen1.child(0).identity()
      .color(headColor('wqueen1'))
      .scale(.1, .05, .1)
      .move(0, 13, 0);
    wqueen2.child(0).identity()
      .color(headColor('wqueen2'))
      .scale(.1, .05, .1)
      .move(0, 13, 0);
    wking1.child(1).identity()
      .color(headColor('wking1'))
      .scale(.2, .10, .05)
      .move(0, 8, 0);
    wrookHead1.identity()
      .color(headColor('wrook1'))
      .scale(.33, .1, .33)
      .move(0, 0, 0);
    for (let i = 1; i < 6; i++) {
      wrook1.child(i).identity()
        .color(headColor('wrook1'))
        .turnX(Math.PI/2)
        .turnZ(i * (2 * Math.PI / 5))
        .move(0, -.2793, -.15)
        .scale(.08, .05, .05)
    }
    wrookHead2.identity()
      .color(headColor('wrook2'))
      .scale(.33, .1, .33)
      .move(0, 0, 0);
    for (let i = 1; i < 6; i++) {
      wrook2.child(i).identity()
        .color(headColor('wrook2'))
        .turnX(Math.PI/2)
        .turnZ(i * (2 * Math.PI / 5))
        .move(0, -.2793, -.15)
        .scale(.08, .05, .05)
    }
    bpawnHead1.identity()
      .color(headColor('bpawn1'))
      .scale(0.23)
      .move(0, -0.4, 0);
    bpawnHead2.identity()
      .color(headColor('bpawn2'))
      .scale(0.23)
      .move(0, -0.4, 0);
    bpawnHead3.identity()
      .color(headColor('bpawn3'))
      .scale(0.23)
      .move(0, -0.4, 0);
    bpawnHead4.identity()
      .color(headColor('bpawn4'))
      .scale(0.23)
      .move(0, -0.4, 0);
    bpawnHead5.identity()
      .color(headColor('bpawn5'))
      .scale(0.23)
      .move(0, -0.4, 0);
    bpawnHead6.identity()
      .color(headColor('bpawn6'))
      .scale(0.23)
      .move(0, -0.4, 0);
    bpawnHead7.identity()
      .color(headColor('bpawn7'))
      .scale(0.23)
      .move(0, -0.4, 0);
    bpawnHead8.identity()
      .color(headColor('bpawn8'))
      .scale(0.23)
      .move(0, -0.4, 0);
    bbishopHead1.identity()
      .color(headColor('bbishop1'))
      .scale(.23, .35, .23)
      .move(0, 1, 0);
    bbishopHead2.identity()
      .color(headColor('bbishop2'))
      .scale(.23, .35, .23)
      .move(0, 1, 0);
    // top of bishop's head
    bbishop1.child(1).identity()
      .color(headColor('bbishop1'))
      .scale(.1, .05, .1)
      .move(0, 14, 0);
    bbishop2.child(1).identity()
      .color(headColor('bbishop2'))
      .scale(.1, .05, .1)
      .move(0, 14, 0);
    // king's crown
    bking1.child(0).identity()
      .color(headColor('bking1'))
      .scale(.1, .25, .05)
      .move(0, 3, 0);
    // queen's crown
    bqueen1.child(0).identity()
      .color(headColor('bqueen1'))
      .scale(.1, .05, .1)
      .move(0, 13, 0);
    bqueen2.child(0).identity()
      .color(headColor('bqueen2'))
      .scale(.1, .05, .1)
      .move(0, 13, 0);
    bking1.child(1).identity()
      .color(headColor('bking1'))
      .scale(.2, .10, .05)
      .move(0, 8, 0);
    brookHead1.identity()
      .color(headColor('brook1'))
      .scale(.33, .1, .33)
      .move(0, 0, 0);
    for (let i = 1; i < 6; i++) {
      brook1.child(i).identity()
        .color(headColor('brook1'))
        .turnX(Math.PI/2)
        .turnZ(i * (2 * Math.PI / 5))
        .move(0, -.2793, -.15)
        .scale(.08, .05, .05)
    }
    brookHead2.identity()
      .color(headColor('brook2'))
      .scale(.33, .1, .33)
      .move(0, 0, 0);
    for (let i = 1; i < 6; i++) {
      brook2.child(i).identity()
        .color(headColor('brook2'))
        .turnX(Math.PI/2)
        .turnZ(i * (2 * Math.PI / 5))
        .move(0, -.2793, -.15)
        .scale(.08, .05, .05)
    }

  });
}
