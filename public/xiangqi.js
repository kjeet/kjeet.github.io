<!DOCTYPE html>
<html lang="en">
  <head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/addons/p5.sound.min.js"></script>
    <link rel="stylesheet" type="text/css" href="style.css">
    <meta charset="utf-8" />

    <style>
      html, body {
        margin: 0;
        padding: 0;
      }
      canvas {
        display: block;
      }
    </style>

    <script>
//
// Encoding and Game Constants
//

let codex62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// Characters For Pieces
//   br: G,g,e,h,r,c,p
var engchars = "GGggEEHHRRCCpp";
var chinesechars = "將帥士仕象相馬傌車俥砲炮卒兵";

// By Piece Index:
//   16b 16r: Gggeehhrrccppppp
var pieceChar = [ // size 32
    0, 2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 12, 12, 12,
    1, 3, 3, 5, 5, 7, 7, 9, 9, 11, 11, 13, 13, 13, 13, 13,
];
var defaultBoardState = [ // size 32
    4, 3, 5, 2, 6, 1, 7, 0, 8, 19, 25, 27, 29, 31, 33, 35,
    85, 84, 86, 83, 87, 82, 88, 81, 89, 64, 70, 54, 56, 58, 60, 62,
];

function circuitPair(range, offset) {
  let forward = Array(range).fill().map((_, i) => (853 * i + offset) % range);
  let reverse = Array(range).fill().map((_, i) => forward.indexOf(i));
  return [forward, reverse];
}

function dot(A,B) { return A.map((_,i) => A[i] * B[i]).reduce((a,b) => a+b) };
function encodeArray(board, {base, basis} = {}) {
    if (basis === undefined) {
        basis = Array(board.length).fill().
          map((_, i) => BigInt(base) ** BigInt(i))
    }
  
    return dot(board.map(BigInt), basis);
}
function decodeArray(encoded, {base, basis} = {}) {
    if (basis === undefined) {
        let crush = encoded;
        for (targetLength = 0; crush > 0; targetLength++) crush /= BigInt(base);
        basis = Array(targetLength).fill().
          map((_, i) => BigInt(base) ** BigInt(i))
    }
  
    return Array(basis.length).fill()
        .map((_,i) => (BigInt(encoded) / BigInt(basis[i])) % BigInt(base))
        .map(n => Number(n));
}

function encodeGame(board) {
  return decodeArray(encodeArray(board, {base: 91}), {base:62}).
    map(n => codex62[n]).reduce((a,b) => a+b);
}
function decodeGame(encoded62) {
  let encoded = [...encoded62].map(n => codex62.indexOf(n))
  return decodeArray(encodeArray(encoded, {base: 62}), {base:91})
}

// Mutable Game State
var urlState = {
  board: defaultBoardState.slice(),
  turn: 1,
  move: [-1, -1]
}
var boardState = defaultBoardState.slice();
var turn = 1;
var move = [-1, -1];

// Mutable Render State
var inp = undefined;
var grabbed = -1;

function updateUrl() {
    let b = encodeGame(boardState, {base: 91n})
    let url = new URL(window.location.href);
    url.search = ""
    url.searchParams.append("b", b)
    inp.elt.value = url.toString()
}

// Scale Factors
var [S1, S2] = [60, 1.1];
function setup() {
    let cnv = createCanvas(S1 * 9, S1 * 10);
    cnv.center('horizontal')
    cnv.position(cnv.position().x, S1 * .5);

    let b = new URLSearchParams(window.location.search).get("b");
    let urlBoard = (b) ? decodeGame(b) : undefined; 
    if (urlBoard) urlState.board = urlBoard;
    boardState = urlState.board.slice();
  
    inp = createInput("");
    inp.position(cnv.position().x, S1 * 11);
    inp.size(cnv.size().width);
    inp.input(() => {boardState = decodeGame(inp.elt.value.slice(2))});
    updateUrl();
  
    let button = createButton("copy")
    button.position(cnv.position().x, S1 * 11.5)
    button.elt.onclick = () => {
      inp.elt.select();
      document.execCommand("copy");
      window.getSelection().removeAllRanges();
    };
  
    button = createButton("reset")
    button.position(cnv.position().x + S1, S1 * 11.5)
    button.elt.onclick = () => {
      boardState = urlState.board.slice();
      turn = urlState.turn;
      move = usrSlate.move.slice();
    };
}

//
// Draw Functions
//

function drawBoard() {
    document.body.style.backgroundColor = "#3a3732";

    push();

    fill(252 * 0.9, 175 * 0.9, 62 * 0.9);
    strokeWeight(S2 * 2);
    stroke(206 * 0.5, 92 * 0.5, 0);

    // Board Face
    rect(0, 0, S1 * 8, S1 * 9);

    // Vertical then Horozontal
    for (var x = 1; x < 8; x++) {
        line(S1 * x, 0, S1 * x, S1 * 4);
        line(S1 * x, S1 * 5, S1 * x, S1 * 9);
    }
    for (var y = 0; y < 10; y++) {
        line(0, S1 * y, S1 * 8, S1 * y);
    }

    // Fortress
    line(S1 * 3, S1 * 0, S1 * 5, S1 * 2);
    line(S1 * 5, S1 * 0, S1 * 3, S1 * 2);
    line(S1 * 3, S1 * 9, S1 * 5, S1 * 7);
    line(S1 * 5, S1 * 9, S1 * 3, S1 * 7);

    var ms = 17;
    fill(6, 57, 112);
    strokeWeight(S2 * 1);

    // Pawn Markers
    for (var i = 0; i < 5; i++) {
        circle(S1 * 2 * i, S1 * 3, ms);
        circle(S1 * 2 * i, S1 * 6, ms);
    }

    // Cannon Markers
    circle(S1 * 1, S1 * 2, ms);
    circle(S1 * 7, S1 * 2, ms);
    circle(S1 * 1, S1 * 7, ms);
    circle(S1 * 7, S1 * 7, ms);

    pop();
}

function drawPiece(p, x, y) {
    push();
    [x, y]= [S1 * x, S1 * y];

    fill(253, 237, 185);
    strokeWeight(S2 * 2);
    push();
    stroke(206 * 0.3, 92 * 0.3, 0);
    circle(x, y, S2 * 45);

    strokeWeight(S2 * 2 * .5);
    circle(x, y, S2 * 45 * .89);
    pop();

    if (p < 16) {
        fill(0x33);
    } else {
        fill(210, 0, 0);
    }
    textSize(S2 * 30);
    text(chinesechars[pieceChar[p]], x - S2 * 14, y + S2 * 11);

    pop();
}

//
// Primary Draw Loop
//

function draw() {
    push();
    translate(S1 / 2, S1 / 2);
    background(206 * 0.8, 92 * 0.8, 0);

    drawBoard();

    for (var p in boardState) {
        if (p == grabbed) continue;

        l = boardState[p];
        drawPiece(p, l % 9, floor(l / 9));
    }

    if (move[0] != -1) {
        drawMove(move[1], boardState[move[0]], 0x33);
    }

    if (grabbed != -1) {
        var x = (mouseX - S1 / 2) / S1;
        var y = (mouseY - S1 / 2) / S1;
        drawPiece(grabbed, x, y);
    }

    pop();
}

//
// Grab Machanics
//

function mouseLocation(r) {
    let [x, y] = [(mouseX - S1 / 2) / S1, (mouseY - S1 / 2) / S1];
    let [rx, ry] = [x, y].map(n => round(n));

    if (dist(x, y, rx, ry) > r) return;
    if (rx < 0 || ry < 0) return;
    if (rx > 8 || ry > 9) return;

    return dot([rx,ry], [1, 9]);
}

function mousePressed() {
    let l = mouseLocation(.3);
    if (l === undefined) return;

    grabbed = boardState.findIndex(b => b == l);
}

function mouseReleased() {
    if (grabbed == -1) return;
    
    // Apply Move
    let from = boardState[grabbed];
    let to = mouseLocation(.4);
    placement: if (to !== undefined) {
        let occupant = boardState.findIndex(b => b == to)

        // Reject move onto our own piece 
        if (occupant > -1 && (floor(grabbed/16) == floor(occupant/16))) {
          break placement;
        }
        // Kill enemy piece
        if (occupant > -1 && (floor(grabbed/16) != floor(occupant/16))) {
          boardState[occupant] = 90;
        }

        boardState[grabbed] = to;
        move = [grabbed, from];
        updateUrl();
    }

    grabbed = -1;
}

// Draw the Arrow
function drawMove(l1, l2) {
    var base = createVector(S1 * (l1 % 9), S1 * floor(l1 / 9));
    var vec = createVector(S1 * (l2 % 9), S1 * floor(l2 / 9)).sub(base);
    vec.setMag(vec.mag()- (S1*.3))
    
    push();
    translate(base.x, base.y);
      
    let arrowSize = S2 * 14.5;
    stroke(0x33);
    strokeWeight(S2 * 6.4);
    fill(0x33);
    line(0, 0, vec.x, vec.y);
  
    rotate(vec.heading());
    translate(vec.mag() - arrowSize, 0);
  
    triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
    pop();
}
</script>  
  </head>
  <body>
    <script src="sketch.js"></script>
  </body>
</html>
