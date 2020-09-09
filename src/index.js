/* eslint-env browser */
/* global A webkitAudioContext */

let C = A.getContext('2d');
let W = 360;
let H = 480;
let canvasW;
let canvasH;
let stageScale;
let stageX;
let stageY;
let lastFrameTime;
let readmeButton = { x: 10, y: 10, w: 100, h: 60, t: 'Readme' };
let muteButton = { x: 250, y: 10, w: 100, h: 60 };
let startButton = { x: 10, y: 410, w: 340, h: 60, t: 'Start' };
let quitButton = { x: 10, y: 10, w: 100, h: 60, t: 'Quit' };
let levelLabel = { x: 0, y: 10, w: W, h: 60 };
let shuffleButton = { x: 250, y: 10, w: 100, h: 60, t: 'Shuffle' };
let retryButton = { x: 10, y: 410, w: 100, h: 60, t: 'Retry' };
let nextButton = { x: 120, y: 410, w: 120, h: 60 };
let undoButton = { x: 250, y: 410, w: 100, h: 60, t: 'Undo' };
let maxLevel = 4;
let level;
let colN;
let rowN;
let density = 0.8;
let fieldL = 320;
let field;
let cellN;
let cellL;
let startIndex;
let finishIndex;
let edgeTable;
let pointerIndex;
let selection;
let nexts;
let scene;
let mutedKey = 'pages_muted';
let muted = +localStorage[mutedKey] || 0;
let audioContext;

let playAudio = (type, attack, gain, duration, ...notes) => {
  if (!muted) {
    if (!audioContext) {
      audioContext = new (window.AudioContext || webkitAudioContext)();
    }
    let oscillatorNode = audioContext.createOscillator();
    let gainNode = audioContext.createGain();
    let gainParam = gainNode.gain;
    let t = audioContext.currentTime;
    for (let note of notes) {
      oscillatorNode.frequency.setValueAtTime(440 * 2 ** ((note - 69) / 12), t);
      gainParam.setValueAtTime(0, t);
      gainParam.linearRampToValueAtTime(gain, t + attack);
      gainParam.setValueAtTime(gain, (t += duration / notes.length) - attack);
      gainParam.linearRampToValueAtTime(0, t);
    }
    oscillatorNode.type = type;
    oscillatorNode.connect(gainNode).connect(audioContext.destination);
    oscillatorNode.start();
    oscillatorNode.stop(t);
  }
};

let drawPolygon = (...points) => {
  C.beginPath();
  C.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    C.lineTo(points[i][0], points[i][1]);
  }
  C.closePath();
};

let renderLabel = (label) => {
  C.fillText(label.t, label.x + label.w / 2, label.y + label.h / 2);
};

let renderButton = (button) => {
  C.strokeRect(button.x, button.y, button.w, button.h);
  renderLabel(button);
};

let toCy = (i) => {
  return field.y + cellL * ((i % rowN) + 0.5);
};

let toCx = (i) => {
  return field.x + cellL * (~~(i / rowN) + 0.5);
};

let request = () => {
  requestAnimationFrame((frameTime) => {
    if (frameTime !== lastFrameTime) {
      lastFrameTime = frameTime;
      C.save();
      try {
        C.clearRect(0, 0, canvasW, canvasH);
        C.setTransform(stageScale, 0, 0, stageScale, stageX, stageY);
        C.textAlign = 'center';
        C.textBaseline = 'middle';
        C.font = '16px Arial';
        if (!scene) {
          renderButton(readmeButton);
          renderButton(muteButton);
          renderButton(startButton);
          C.font = '32px Arial';
          C.fillText(document.title, W / 2, H / 2);
        } else {
          renderButton(quitButton);
          renderLabel(levelLabel);
          renderButton(shuffleButton);
          renderButton(retryButton);
          renderButton(undoButton);
          if (scene === 3) {
            renderButton(nextButton);
          } else {
            renderLabel(nextButton);
          }
          if (~pointerIndex) {
            C.fillStyle = '#ccc';
            C.fillRect(
              field.x + cellL * ~~(pointerIndex / rowN),
              field.y + cellL * (pointerIndex % rowN),
              cellL,
              cellL
            );
          }
          let nodeR = cellL * 0.3;
          let edgeR = cellL / 2 - nodeR;
          let d = edgeR / 2;
          C.lineJoin = 'bevel';
          C.font = ~~nodeR + 'px Arial';
          for (let i = cellN; i--; ) {
            let cx = toCx(i);
            let cy = toCy(i);
            let distance = selection.indexOf(i) + 1;
            let current = distance === selection.length;
            for (let j of edgeTable[i]) {
              let cx2 = toCx(j);
              let cy2 = toCy(j);
              C.save();
              try {
                C.translate((cx + cx2) / 2, (cy + cy2) / 2);
                C.rotate(Math.atan2(cy2 - cy, cx2 - cx));
                drawPolygon(
                  [-edgeR, -d],
                  [0, -d],
                  [0, -edgeR],
                  [edgeR, 0],
                  [0, edgeR],
                  [0, d],
                  [-edgeR, d]
                );
                C.fillStyle =
                  current && nexts.includes(j)
                    ? '#00f'
                    : i === selection[selection.indexOf(j) - 1]
                    ? '#808'
                    : '#999';
                C.fill();
              } finally {
                C.restore();
              }
            }
            drawPolygon(
              [cx - nodeR, cy - nodeR],
              [cx + nodeR - d, cy - nodeR],
              [cx + nodeR, cy - nodeR + d],
              [cx + nodeR - d, cy - nodeR + d],
              [cx + nodeR - d, cy - nodeR],
              [cx + nodeR, cy - nodeR + d],
              [cx + nodeR, cy + nodeR],
              [cx - nodeR, cy + nodeR]
            );
            C.fillStyle = current ? '#ccf' : distance ? '#fcf' : '#fff';
            C.fill();
            C.strokeStyle = current ? '#00f' : distance ? '#808' : '#999';
            C.stroke();
            C.fillStyle = '#000';
            C.fillText(
              i === startIndex ? '🚩' : i === finishIndex ? '🏁' : '',
              cx,
              cy
            );
            if (scene === 2 && !distance) {
              C.fillText('❌', cx, cy);
            }
          }
        }
      } finally {
        C.restore();
      }
    }
  });
};

let updateNexts = () => {
  nexts = edgeTable[selection[selection.length - 1]].filter(
    (j) => !selection.includes(j)
  );
  if (nexts.length) {
    scene = 1;
    nextButton.t = '';
  } else if (selection.length < cellN) {
    scene = 2;
    nextButton.t = '404 Not Found';
    playAudio('triangle', 0.02, 0.2, 0.3, 76, 74, 72);
  } else if (level < maxLevel) {
    scene = 3;
    nextButton.t = 'Next';
    playAudio('triangle', 0.02, 0.2, 0.4, 72, 76, 79, 84);
  } else {
    scene = 4;
    nextButton.t = 'Congratulations!';
    playAudio('triangle', 0.02, 0.2, 0.8, 72, 76, 79, 76, 72, 76, 79, 84);
  }
};

let doMove = (i) => {
  if (nexts.includes(i)) {
    selection.push(i);
    playAudio('triangle', 0.02, 0.2, 0.1, 69, 71);
  } else if (
    selection.length > 1 &&
    selection.indexOf(i) === selection.length - 2
  ) {
    selection.length--;
  } else {
    return;
  }
  updateNexts();
  if (~pointerIndex) {
    pointerIndex = i;
  }
  request();
};

let doUndo = () => {
  doMove(selection[selection.length - 2]);
};

let doRetry = () => {
  pointerIndex = -1;
  selection = [startIndex];
  updateNexts();
  request();
};

let shuffle = (arr) => {
  let i = arr.length;
  while (i) {
    let j = (i * Math.random()) | 0;
    let t = arr[--i];
    arr[i] = arr[j];
    arr[j] = t;
  }
};

let reversePath = (path, i) => {
  let j = path[i];
  if (~j) {
    reversePath(path, j);
    path[j] = i;
  }
};

let doShuffle = () => {
  let neighborTable = [[]];
  let traceablePath = [-1];
  for (let i = 1; i < cellN; i++) {
    let col = ~~(i / rowN);
    let row = i % rowN;
    let neighbors = (neighborTable[i] = []);
    if (col) {
      neighbors.push(i - rowN);
      neighborTable[i - rowN].push(i);
    }
    if (row) {
      neighbors.push(i - 1);
      neighborTable[i - 1].push(i);
    }
    if (col % 2) {
      if (row < rowN - 1) {
        traceablePath[i] = i + 1;
      } else {
        traceablePath[i] = i - rowN;
      }
    } else {
      if (row) {
        traceablePath[i] = i - 1;
      } else {
        traceablePath[i] = i - rowN;
      }
    }
  }
  startIndex = cellN - (colN % 2 ? 1 : rowN);
  finishIndex = 0;
  for (let i = cellN * 8; i--; ) {
    reversePath(traceablePath, startIndex);
    traceablePath[startIndex] = -1;
    [startIndex, finishIndex] = [finishIndex, startIndex];
    let neighbors = neighborTable[finishIndex].slice(0);
    for (let j = neighbors.length; j--; ) {
      if (traceablePath[neighbors[j]] === finishIndex) {
        neighbors.splice(j, 1);
      }
    }
    let neighborIndex = neighbors[~~(neighbors.length * Math.random())];
    let nextFinishIndex = traceablePath[neighborIndex];
    reversePath(traceablePath, nextFinishIndex);
    traceablePath[nextFinishIndex] = -1;
    traceablePath[neighborIndex] = finishIndex;
    finishIndex = nextFinishIndex;
  }
  edgeTable = [];
  for (let i = cellN; i--; ) {
    let j = traceablePath[i];
    edgeTable[i] = ~j ? [j] : [];
  }
  let adjacencies = [];
  for (let i = cellN; i--; ) {
    for (let j of neighborTable[i]) {
      if (i < j && !edgeTable[i].includes(j) && !edgeTable[j].includes(i)) {
        adjacencies.push([i, j]);
      }
    }
  }
  shuffle(adjacencies);
  for (let [i, j] of adjacencies.slice(0, ~~(adjacencies.length * density))) {
    if (
      i === startIndex ||
      j === finishIndex ||
      (i !== finishIndex && j !== startIndex && Math.random() < 0.5)
    ) {
      edgeTable[i].push(j);
    } else {
      edgeTable[j].push(i);
    }
  }
  doRetry();
};

let doNext = () => {
  if (scene === 3 && level < maxLevel) {
    level++;
    levelLabel.t = 'Level ' + level + ' / ' + maxLevel;
    colN = rowN = level + 2;
    cellN = colN * rowN;
    cellL = Math.min(fieldL / colN, fieldL / rowN);
    let w = cellL * colN;
    let h = cellL * rowN;
    field = { x: (W - w) / 2, y: (H - h) / 2, w, h };
    doShuffle();
  }
};

let doStart = () => {
  level = 0;
  scene = 3;
  playAudio('triangle', 0, 0, 0);
  doNext();
};

let doMute = (value) => {
  muted = localStorage[mutedKey] = value ? 1 : 0;
  muteButton.t = muted ? '🔇Off' : '🔊On';
  request();
};

let doReadme = () => {
  parent.location.href =
    'https://github.com/stackshub/pages/blob/master/README.md';
};

let doHome = () => {
  scene = 0;
  doMute(muted);
};

let getCellIndex = (point) => {
  let x = point.x - field.x;
  let y = point.y - field.y;
  return x > 0 && x < field.w && y > 0 && y < field.h
    ? ~~(x / cellL) * rowN + ~~(y / cellL)
    : -1;
};

let withinRect = (rect, point) => {
  return (
    point.x >= rect.x &&
    point.x < rect.x + rect.w &&
    point.y >= rect.y &&
    point.y < rect.y + rect.h
  );
};

let getPoint = (event) => {
  let touches = event.changedTouches;
  let pointer = touches ? touches[0] : event;
  return {
    x: (pointer.clientX - stageX) / stageScale,
    y: (pointer.clientY - stageY) / stageScale,
  };
};

let preventEvent = (event) => {
  if (event.cancelable) {
    event.preventDefault();
  }
  event.stopPropagation();
  event.stopImmediatePropagation();
};

A.onmouseup = A.ontouchend = (event) => {
  preventEvent(event);
  focus();
  let point = getPoint(event);
  if (scene) {
    if (~pointerIndex) {
      pointerIndex = -1;
      request();
    } else {
      if (withinRect(quitButton, point)) {
        doHome();
      } else if (withinRect(shuffleButton, point)) {
        doShuffle();
      } else if (withinRect(retryButton, point)) {
        doRetry();
      } else if (withinRect(undoButton, point)) {
        doUndo();
      } else if (withinRect(nextButton, point)) {
        doNext();
      }
    }
  } else {
    if (withinRect(startButton, point)) {
      doStart();
    } else if (withinRect(muteButton, point)) {
      doMute(!muted);
    } else if (withinRect(readmeButton, point)) {
      doReadme();
    }
  }
};

A.onmousemove = A.ontouchmove = (event) => {
  preventEvent(event);
  if (scene) {
    if (~pointerIndex) {
      let i = getCellIndex(getPoint(event));
      if (~i && i !== pointerIndex) {
        doMove(i);
      }
    }
  }
};

A.onmousedown = A.ontouchstart = (event) => {
  preventEvent(event);
  if (scene) {
    let i = getCellIndex(getPoint(event));
    let p = selection.indexOf(i) + 1;
    if (p) {
      if (p < selection.length) {
        selection.length = p;
        updateNexts();
      }
      pointerIndex = i;
      request();
    }
  }
};

onkeydown = (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }
  preventEvent(event);
  if (scene) {
    let i = selection[selection.length - 1];
    let d = 0;
    switch (event.key) {
      case 'Q':
        doHome();
        break;
      case 'S':
        doShuffle();
        break;
      case 'r':
      case 'Escape':
        doRetry();
        return;
      case 'z':
      case 'Backspace':
      case 'Delete':
        doUndo();
        return;
      case ' ':
      case 'Enter':
        doNext();
        return;
      case 'd':
      case 'ArrowRight':
        if (i < cellN - rowN) {
          d = rowN;
        }
        break;
      case 'a':
      case 'ArrowLeft':
        if (i >= rowN) {
          d = -rowN;
        }
        break;
      case 's':
      case 'ArrowDown':
        if (i % rowN < rowN - 1) {
          d = 1;
        }
        break;
      case 'w':
      case 'ArrowUp':
        if (i % rowN) {
          d = -1;
        }
        break;
    }
    if (d) {
      doMove(i + d);
    }
  } else {
    switch (event.key) {
      case 'R':
        doReadme();
        break;
      case 'M':
        doMute(!muted);
        break;
      case ' ':
      case 'Enter':
        doStart();
    }
  }
};

let resize = () => {
  canvasW = A.width = innerWidth;
  canvasH = A.height = innerHeight;
  stageScale = Math.min(canvasW / W, canvasH / H);
  stageX = (canvasW - W * stageScale) / 2;
  stageY = (canvasH - H * stageScale) / 2;
  scrollTo(0, 0);
};

onresize = () => {
  resize();
  request();
};

onload = () => {
  resize();
  focus();
  doHome();
};
