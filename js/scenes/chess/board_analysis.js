// Lightweight chess move helper for the VR scene. It intentionally avoids an
// external engine dependency so the scene can load from index.html in this repo.

function getPieceDetails(pieceName) {
    const color = pieceName.charAt(0);
    const type = pieceName.slice(1).replace(/[0-9]/g, '');
    const typeMap = {
        pawn: 'p',
        knight: 'n',
        bishop: 'b',
        rook: 'r',
        queen: 'q',
        king: 'k'
    };
    return { color, type: typeMap[type] || 'p' };
}

export function constructFEN(pieceInfo) {
    let board = Array(8).fill(null).map(() => Array(8).fill(null));

    for (let key in pieceInfo) {
        if (key === 'capturedWhiteCount' || key === 'capturedBlackCount') continue;
        if (key === 'fen' || key === 'moveHistory' || key === 'board_history') continue;

        let piece = pieceInfo[key];
        if (piece.square && piece.square !== 'captured') {
            let col = piece.square.charCodeAt(0) - 97;
            let rank = parseInt(piece.square.slice(1));
            let row = 8 - rank;
            if (row >= 0 && row < 8 && col >= 0 && col < 8) {
                let details = getPieceDetails(key);
                board[row][col] = details.color === 'w' ? details.type.toUpperCase() : details.type;
            }
        }
    }

    return boardToPlacement(board) + " w KQkq - 0 1";
}

function parseFEN(fen) {
    const [placement, turn = "w", castling = "-", ep = "-", halfmove = "0", fullmove = "1"] = (fen || "").split(/\s+/);
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    const rows = (placement || "").split("/");

    for (let row = 0; row < 8; row++) {
        let col = 0;
        for (const ch of rows[row] || "") {
            if (/\d/.test(ch)) col += Number(ch);
            else if (col < 8) board[row][col++] = ch;
        }
    }

    return { board, turn, castling, ep, halfmove, fullmove };
}

function boardToPlacement(board) {
    return board.map(row => {
        let out = "", empty = 0;
        for (const piece of row) {
            if (!piece) {
                empty++;
            } else {
                if (empty) out += empty;
                empty = 0;
                out += piece;
            }
        }
        return out + (empty || "");
    }).join("/");
}

function squareToCoord(square) {
    if (!square || square.length < 2) return null;
    const col = square.charCodeAt(0) - 97;
    const row = 8 - parseInt(square.slice(1));
    return row >= 0 && row < 8 && col >= 0 && col < 8 ? { row, col } : null;
}

function coordToSquare(row, col) {
    return String.fromCharCode(97 + col) + (8 - row);
}

function colorOf(piece) {
    if (!piece) return null;
    return piece === piece.toUpperCase() ? "w" : "b";
}

function isEnemy(piece, other) {
    return other && colorOf(piece) !== colorOf(other);
}

function pushIfAvailable(board, piece, row, col, moves) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return false;
    const target = board[row][col];
    if (!target) {
        moves.push(coordToSquare(row, col));
        return true;
    }
    if (isEnemy(piece, target)) moves.push(coordToSquare(row, col));
    return false;
}

function slide(board, piece, row, col, directions, moves) {
    for (const [dr, dc] of directions) {
        let r = row + dr, c = col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            if (!pushIfAvailable(board, piece, r, c, moves)) break;
            r += dr;
            c += dc;
        }
    }
}

function pseudoLegalDestinations(fen, fromSquare) {
    const { board } = parseFEN(fen);
    const from = squareToCoord(fromSquare);
    if (!from) return [];

    const piece = board[from.row][from.col];
    if (!piece) return [];

    const moves = [];
    const type = piece.toLowerCase();
    const dir = colorOf(piece) === "w" ? -1 : 1;
    const startRow = colorOf(piece) === "w" ? 6 : 1;

    if (type === "p") {
        const oneRow = from.row + dir;
        if (oneRow >= 0 && oneRow < 8 && !board[oneRow][from.col]) {
            moves.push(coordToSquare(oneRow, from.col));
            const twoRow = from.row + 2 * dir;
            if (from.row === startRow && !board[twoRow][from.col]) moves.push(coordToSquare(twoRow, from.col));
        }
        for (const dc of [-1, 1]) {
            const r = from.row + dir, c = from.col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8 && isEnemy(piece, board[r][c])) moves.push(coordToSquare(r, c));
        }
    } else if (type === "n") {
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
            pushIfAvailable(board, piece, from.row + dr, from.col + dc, moves);
        }
    } else if (type === "b") {
        slide(board, piece, from.row, from.col, [[-1,-1],[-1,1],[1,-1],[1,1]], moves);
    } else if (type === "r") {
        slide(board, piece, from.row, from.col, [[-1,0],[1,0],[0,-1],[0,1]], moves);
    } else if (type === "q") {
        slide(board, piece, from.row, from.col, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]], moves);
    } else if (type === "k") {
        for (const dr of [-1, 0, 1]) for (const dc of [-1, 0, 1]) {
            if (dr || dc) pushIfAvailable(board, piece, from.row + dr, from.col + dc, moves);
        }
        if (colorOf(piece) === "w" && fromSquare === "e1") {
            if (!board[7][5] && !board[7][6]) moves.push("g1");
            if (!board[7][1] && !board[7][2] && !board[7][3]) moves.push("c1");
        } else if (colorOf(piece) === "b" && fromSquare === "e8") {
            if (!board[0][5] && !board[0][6]) moves.push("g8");
            if (!board[0][1] && !board[0][2] && !board[0][3]) moves.push("c8");
        }
    }

    return moves;
}

export function isMoveLegal(currentFen, fromSquare, toSquare) {
    return pseudoLegalDestinations(currentFen, fromSquare).includes(toSquare);
}

export function getNewFEN(currentFen, fromSquare, toSquare) {
    const details = getMoveDetails(currentFen, fromSquare, toSquare);
    if (!details) return currentFen;

    const parsed = parseFEN(currentFen);
    const from = squareToCoord(fromSquare);
    const to = squareToCoord(toSquare);
    let piece = parsed.board[from.row][from.col];

    parsed.board[from.row][from.col] = null;
    if (details.flags.includes("p")) piece = colorOf(piece) === "w" ? "Q" : "q";
    parsed.board[to.row][to.col] = piece;

    if (details.flags.includes("k")) {
        parsed.board[from.row][7] = null;
        parsed.board[from.row][5] = colorOf(piece) === "w" ? "R" : "r";
    } else if (details.flags.includes("q")) {
        parsed.board[from.row][0] = null;
        parsed.board[from.row][3] = colorOf(piece) === "w" ? "R" : "r";
    }

    const nextTurn = parsed.turn === "w" ? "b" : "w";
    const fullmove = parsed.turn === "b" ? String(Number(parsed.fullmove || 1) + 1) : parsed.fullmove;
    return `${boardToPlacement(parsed.board)} ${nextTurn} ${parsed.castling} - 0 ${fullmove || 1}`;
}

export function getMoveDetails(currentFen, fromSquare, toSquare) {
    if (!isMoveLegal(currentFen, fromSquare, toSquare)) return null;

    const { board } = parseFEN(currentFen);
    const from = squareToCoord(fromSquare);
    const to = squareToCoord(toSquare);
    const piece = board[from.row][from.col];
    const target = board[to.row][to.col];
    const type = piece.toLowerCase();
    let flags = target ? "c" : "n";

    if (type === "k" && Math.abs(to.col - from.col) === 2) flags = to.col > from.col ? "k" : "q";
    if (type === "p" && (to.row === 0 || to.row === 7)) flags += "p";

    const pieceLetter = type === "p" ? "" : type.toUpperCase();
    const san = flags.includes("k") ? "O-O" :
                flags.includes("q") ? "O-O-O" :
                `${pieceLetter}${target ? "x" : ""}${toSquare}${flags.includes("p") ? "=Q" : ""}`;

    return { from: fromSquare, to: toSquare, color: colorOf(piece), piece: type, captured: target || undefined, flags, san };
}

export function getLegalDestinations(currentFen, fromSquare) {
    return pseudoLegalDestinations(currentFen, fromSquare);
}
