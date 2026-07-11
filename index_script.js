//Make it so that the maximum value of batchSize has to be always be the input of trainSize
const trainSizeInput = document.getElementById('trainSize');
const batchSizeInput = document.getElementById('batchSize');

function syncBatchSizeMax() {
  batchSizeInput.max = trainSizeInput.value;
  if (parseInt(batchSizeInput.value) > parseInt(trainSizeInput.value)) {
    batchSizeInput.value = trainSizeInput.value;
  }
}
syncBatchSizeMax();
trainSizeInput.addEventListener('input', syncBatchSizeMax);


/// Render the visualization of neural network based on users' custom config///


const INPUT_SIZE = 784;
const OUTPUT_SIZE = 10;

let hiddenLayers = [
  { size: 512, width: 1 },
];

/* ── Onboarding state */
let onboardingActive = true;
let _obOverlay = null;
let _obTip = null;

const archList = document.getElementById('archList');
const vizWrap = document.getElementById('vizWrap');

function circleCount(size) {
  if (size == 10) return 3;
  else if (size < 10) return 2;
  else return 4 + Math.floor(size / 100);
}

function renderArchitecture() {
  archList.innerHTML = '';
  archList.appendChild(lockedRow('Input', INPUT_SIZE, 1));
  hiddenLayers.forEach((layer, i) => archList.appendChild(hiddenRow(layer, i)));
  archList.appendChild(lockedRow('Output', OUTPUT_SIZE, 1));
}

function lockedRow(name, size, width) {
  const row = document.createElement('div');
  row.className = 'arch-row locked';
  row.innerHTML =
    '<span class="arch-name">' + name + '</span>' +
    '<span class="arch-dims"><span class="static">' + size + '</span>' +
    '<span class="x">size &times;</span><span class="static">' + width + '</span>' +
    '<span class="x">width</span></span>' +
    '<button class="icon-btn ghost">&times;</button>';
  return row;
}

function hiddenRow(layer, index) {
  const row = document.createElement('div');
  row.className = 'arch-row';

  const name = document.createElement('span');
  name.className = 'arch-name';
  name.textContent = 'Layer ' + (index + 1);

  const dims = document.createElement('span');
  dims.className = 'arch-dims';

  const sizeInput = document.createElement('input');
  sizeInput.type = 'number';
  sizeInput.min = '1';
  sizeInput.value = layer.size;
  sizeInput.addEventListener('input', () => {
    layer.size = clampInt(sizeInput.value, 1, 4096);
    renderNetwork();
  });

  const widthInput = document.createElement('input');
  widthInput.type = 'number';
  widthInput.min = '1';
  widthInput.value = layer.width;
  widthInput.addEventListener('input', () => {
    layer.width = clampInt(widthInput.value, 1, 8);
    renderNetwork();
  });

  const xa = document.createElement('span');
  xa.className = 'x';
  xa.textContent = 'size ×';
  const xb = document.createElement('span');
  xb.className = 'x';
  xb.textContent = 'width';

  dims.append(sizeInput, xa, widthInput, xb);

  const remove = document.createElement('button');
  remove.className = 'icon-btn';
  remove.innerHTML = '&times;';
  remove.title = 'Remove layer';
  remove.addEventListener('click', () => {
    hiddenLayers.splice(index, 1);
    renderArchitecture();
    renderNetwork();
  });

  row.append(name, dims, remove);
  return row;
}

function clampInt(value, min_val, max_val) {
  let n = parseInt(value, 10);
  if (isNaN(n)) n = min_val;
  else return Math.max(min_val, Math.min(max_val, n));
}
function renderNetwork() {
  const layers = [{ label: 'Input', size: INPUT_SIZE, width: 1 }];
  hiddenLayers.forEach((l, i) => layers.push({ label: 'Layer ' + (i + 1), size: l.size, width: l.width }));
  layers.push({ label: 'Output', size: OUTPUT_SIZE, width: 1 });

  const R = 9;
  const CIRCLE_GAP = 24;
  const COL_GAP = 60;
  const PAD_X = 44;
  const TOP = 28;
  const LABEL_AREA = 58;
  const HEIGHT = 384;
  const fieldH = HEIGHT - TOP - LABEL_AREA;
  const centerY = TOP + fieldH / 2;

  const columns = [];
  const groups = [];
  let colIndex = 0;

  layers.forEach(layer => {
    const n = circleCount(layer.size);
    const start = colIndex;
    for (let w = 0; w < layer.width; w++) {
      const x = PAD_X + colIndex * COL_GAP;

      const GAP_FOR_ELLIPSIS = 38;
      const block = (n - 2) * CIRCLE_GAP + GAP_FOR_ELLIPSIS;
      const top = centerY - block / 2;
      const circles = [];

      for (let i = 0; i < n - 1; i++) {
        circles.push({ x: x, y: top + i * CIRCLE_GAP });
      }

      circles.push({ x: x, y: top + (n - 2) * CIRCLE_GAP + GAP_FOR_ELLIPSIS });

      const ellipsisY = top + (n - 2) * CIRCLE_GAP + (GAP_FOR_ELLIPSIS / 2) - 5;

      columns.push({ x: x, circles: circles, ellipsisY: ellipsisY });
      colIndex++;
    }
    groups.push({ label: layer.label, dims: layer.size + '×' + layer.width, from: start, to: colIndex - 1 });
  });

  const totalWidth = PAD_X * 2 + (colIndex - 1) * COL_GAP;
  const parts = [];

  for (let c = 0; c < columns.length - 1; c++) {
    const a = columns[c].circles;
    const b = columns[c + 1].circles;
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        parts.push('<line x1="' + a[i].x + '" y1="' + a[i].y + '" x2="' + b[j].x + '" y2="' + b[j].y +
          '" stroke="var(--edge)" stroke-width="0.7"/>');
      }
    }
  }

  columns.forEach(col => {
    col.circles.forEach(p => {
      parts.push('<circle cx="' + p.x + '" cy="' + p.y + '" r="' + R +
        '" fill="#ffffff" stroke="var(--node)" stroke-width="1.4"/>');
    });
    for (let d = 0; d < 3; d++) {
      parts.push('<circle cx="' + col.x + '" cy="' + (col.ellipsisY + d * 5) + '" r="1.4" fill="var(--node)"/>');
    }
  });

  groups.forEach(g => {
    const cx = (columns[g.from].x + columns[g.to].x) / 2;
    const ly = HEIGHT - LABEL_AREA + 22;
    parts.push('<text x="' + cx + '" y="' + ly + '" text-anchor="middle" font-family="var(--sans)" ' +
      'font-size="12" font-weight="600" fill="var(--ink)">' + g.label + '</text>');
    parts.push('<text x="' + cx + '" y="' + (ly + 18) + '" text-anchor="middle" font-family="var(--mono)" ' +
      'font-size="11" fill="var(--ink-mute)">' + g.dims + '</text>');
  });

  vizWrap.innerHTML =
    '<svg viewBox="0 0 ' + totalWidth + ' ' + HEIGHT + '" preserveAspectRatio="xMidYMid meet" ' +
    'style="min-width:' + Math.max(480, totalWidth) + 'px">' + parts.join('') + '</svg>';
}
let accuracyHistory = [];

function renderAccuracyChart(history) {
  accuracyHistory = history;
  const W = 360, H = 150, L = 34, B = 26, T = 12, Rp = 10;
  const plotW = W - L - Rp, plotH = H - T - B;

  const maxEpoch = accuracyHistory.length ? Math.max(...accuracyHistory.map(p => p.epoch)) : 1;
  const minEpoch = accuracyHistory.length ? Math.min(...accuracyHistory.map(p => p.epoch)) : 0;
  const epochRange = Math.max(1, maxEpoch - minEpoch);

  const parts = [];
  parts.push('<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + plotH) + '" stroke="var(--line-strong)" stroke-width="1"/>');
  parts.push('<line x1="' + L + '" y1="' + (T + plotH) + '" x2="' + (W - Rp) + '" y2="' + (T + plotH) + '" stroke="var(--line-strong)" stroke-width="1"/>');

  [0, 50, 100].forEach(v => {
    const y = T + plotH - (v / 100) * plotH;
    parts.push('<line x1="' + L + '" y1="' + y + '" x2="' + (W - Rp) + '" y2="' + y + '" stroke="var(--line)" stroke-width="0.7"/>');
    parts.push('<text x="' + (L - 6) + '" y="' + (y + 3) + '" text-anchor="end" font-family="var(--mono)" font-size="9" fill="var(--ink-mute)">' + v + '</text>');
  });

  parts.push('<text x="' + (L - 22) + '" y="' + (T + plotH / 2) + '" text-anchor="middle" font-family="var(--sans)" font-size="10" fill="var(--ink-soft)" transform="rotate(-90 ' + (L - 22) + ' ' + (T + plotH / 2) + ')">Accuracy</text>');
  parts.push('<text x="' + (L + plotW / 2) + '" y="' + (H - 4) + '" text-anchor="middle" font-family="var(--sans)" font-size="10" fill="var(--ink-soft)">Epochs</text>');

  const toX = epoch => L + ((epoch - minEpoch) / epochRange) * plotW;
  const toY = acc => T + plotH - (Math.max(0, Math.min(100, acc)) / 100) * plotH;

  if (accuracyHistory.length === 1) {
    const p = accuracyHistory[0];
    parts.push('<circle cx="' + toX(p.epoch) + '" cy="' + toY(p.acc) + '" r="3" fill="var(--accent)"/>');
  } else if (accuracyHistory.length > 1) {
    const pts = accuracyHistory.map(p => toX(p.epoch) + ',' + toY(p.acc)).join(' ');
    parts.push('<polyline points="' + pts + '" fill="none" stroke="var(--accent)" stroke-width="1.6"/>');
  }

  document.getElementById('chartWrap').innerHTML =
    '<svg viewBox="0 0 ' + W + ' ' + H + '">' + parts.join('') + '</svg>';
}

function setTestAccuracy(pct) {
  if (pct == null || pct === undefined) {
    document.getElementById('testAcc').textContent = '—';
  } else {
    document.getElementById('testAcc').textContent = Number(pct).toFixed(2) + '%';
  }
}
renderAccuracyChart(accuracyHistory);


let lossHistory = [];

function renderLossChart(history) {
  lossHistory = history;

  const W = 360, H = 150, L = 34, B = 26, T = 12, Rp = 10;
  const plotW = W - L - Rp, plotH = H - T - B;

  const maxEpoch = lossHistory.length ? Math.max(...lossHistory.map(p => p.epoch)) : 1;
  const minEpoch = lossHistory.length ? Math.min(...lossHistory.map(p => p.epoch)) : 0;
  const epochRange = Math.max(1, maxEpoch - minEpoch);

  const peakLoss = lossHistory.length ? Math.max(...lossHistory.map(p => p.loss)) : 1;
  const maxLoss = peakLoss === 0 ? 1 : peakLoss;

  const parts = [];
  parts.push('<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + plotH) + '" stroke="var(--line-strong)" stroke-width="1"/>');
  parts.push('<line x1="' + L + '" y1="' + (T + plotH) + '" x2="' + (W - Rp) + '" y2="' + (T + plotH) + '" stroke="var(--line-strong)" stroke-width="1"/>');

  [0, maxLoss / 2, maxLoss].forEach(v => {
    const y = T + plotH - (v / maxLoss) * plotH;
    const label = v % 1 === 0 ? v : v.toFixed(2);
    parts.push('<line x1="' + L + '" y1="' + y + '" x2="' + (W - Rp) + '" y2="' + y + '" stroke="var(--line)" stroke-width="0.7"/>');
    parts.push('<text x="' + (L - 6) + '" y="' + (y + 3) + '" text-anchor="end" font-family="var(--mono)" font-size="9" fill="var(--ink-mute)">' + label + '</text>');
  });

  parts.push('<text x="' + (L - 22) + '" y="' + (T + plotH / 2) + '" text-anchor="middle" font-family="var(--sans)" font-size="10" fill="var(--ink-soft)" transform="rotate(-90 ' + (L - 22) + ' ' + (T + plotH / 2) + ')">Loss</text>');
  parts.push('<text x="' + (L + plotW / 2) + '" y="' + (H - 4) + '" text-anchor="middle" font-family="var(--sans)" font-size="10" fill="var(--ink-soft)">Epochs</text>');

  const toX = epoch => L + ((epoch - minEpoch) / epochRange) * plotW;
  const toY = loss => T + plotH - (Math.max(0, loss) / maxLoss) * plotH;

  if (lossHistory.length === 1) {
    const p = lossHistory[0];
    parts.push('<circle cx="' + toX(p.epoch) + '" cy="' + toY(p.loss) + '" r="3" fill="var(--accent)"/>');
  } else if (lossHistory.length > 1) {
    const pts = lossHistory.map(p => toX(p.epoch) + ',' + toY(p.loss)).join(' ');
    parts.push('<polyline points="' + pts + '" fill="none" stroke="var(--accent)" stroke-width="1.6"/>');
  }

  document.getElementById('lossChartWrap').innerHTML =
    '<svg viewBox="0 0 ' + W + ' ' + H + '">' + parts.join('') + '</svg>';
}

function setLoss(val) {
  if (val == null || val === undefined) {
    document.getElementById('trainLoss').textContent = '—';
  } else {
    document.getElementById('trainLoss').textContent = Number(val).toFixed(4);
  }
}
renderLossChart(lossHistory);
/// Pad for user to draw functions///
const pad = document.getElementById('pad');
const ctx = pad.getContext('2d');
let drawing = false;

function resetPad() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, pad.width, pad.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffffff';
  ctx.lineWidth = 18;
}
resetPad();

function padPos(e) {
  const r = pad.getBoundingClientRect();
  const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
  return { x: cx * (pad.width / r.width), y: cy * (pad.height / r.height) };
}

function startDraw(e) {
  drawing = true;
  const p = padPos(e);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  e.preventDefault();
}
function moveDraw(e) {
  if (!drawing) return;
  const p = padPos(e);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  e.preventDefault();
}
let has_drawed = false
function endDraw() { drawing = false; has_drawed = true }

pad.addEventListener('mousedown', startDraw);
pad.addEventListener('mousemove', moveDraw);
window.addEventListener('mouseup', endDraw);
pad.addEventListener('touchstart', startDraw, { passive: false });
pad.addEventListener('touchmove', moveDraw, { passive: false });
pad.addEventListener('touchend', endDraw);

function getPixels() {
  const small = document.createElement('canvas');
  small.width = 28;
  small.height = 28;
  const sctx = small.getContext('2d');
  sctx.drawImage(pad, 0, 0, 28, 28);
  const data = sctx.getImageData(0, 0, 28, 28).data;

  // Step 1: extract raw grayscale
  const raw = new Float32Array(784);
  for (let i = 0; i < 784; i++) raw[i] = data[i * 4] / 255;

  // Step 2: find center of mass of drawn pixels
  let sumX = 0, sumY = 0, total = 0;
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const v = raw[y * 28 + x];
      sumX += v * x; sumY += v * y; total += v;
    }
  }
  if (total < 1) return raw; // nothing drawn
  const cx = sumX / total;
  const cy = sumY / total;

  // Step 3: re-draw pad centered in a fresh 28x28, shifted by center-of-mass offset
  const centered = document.createElement('canvas');
  centered.width = 28; centered.height = 28;
  const cctx = centered.getContext('2d');
  cctx.fillStyle = '#000000';
  cctx.fillRect(0, 0, 28, 28);
  const dx = 14 - cx;
  const dy = 14 - cy;
  cctx.drawImage(small, dx, dy, 28, 28);

  const cdata = cctx.getImageData(0, 0, 28, 28).data;
  const out = new Float32Array(784);
  for (let i = 0; i < 784; i++) out[i] = cdata[i * 4] / 255;
  return out;
}
/// Model prediction ///
const predictionBox = document.getElementById('prediction');
const predictBtn = document.getElementById('predictBtn');

let isCycling = false;
let isPredicting = false;

function startPredictionCycle() {
  predictionBox.classList.remove('idle');
  predictionBox.classList.add('cycling');
  isCycling = true;
  isPredicting = true;
  predictBtn.disabled = true;
  runCycleLoop();
}
function runCycleLoop() {
  if (!isCycling) return;
  predictionBox.textContent = Math.floor(Math.random() * 10);
  setTimeout(runCycleLoop, 50);
}

function stop_cycle_and_replace(predicted_digit) {
  isCycling = false;
  isPredicting = false;
  predictBtn.disabled = false;
  predictionBox.classList.remove('cycling');
  predictionBox.classList.add('idle');
  predictionBox.textContent = predicted_digit;
}
document.getElementById('predictBtn').addEventListener('click', () => {

  if (!FINISHED_TRAINING) {
    showToast('Train your model first before predicting.', 'warn');
    return;
  }
  if (!has_drawed) {
    showToast('Draw a digit on the canvas first.', 'warn');
    return;
  }
  predictTriggered();

});

document.getElementById('clearBtn').addEventListener('click', () => {
  resetPad();
  predictionBox.textContent = '—';
  has_drawed = false;
});
//get configuration of the user's network
function getNetworkConfig() {
  return {
    learningRate: parseFloat(document.getElementById('learningRate').value),
    epochs: clampInt(document.getElementById('epochs').value, 1, 100000),
    trainSize: parseInt(document.getElementById('trainSize').value),
    batchSize: clampInt(document.getElementById('batchSize').value, 1, 100000),
    dropout_enabled: document.getElementById('dropoutEnabled').checked,
    dropout_rate: parseFloat(document.getElementById('dropoutRate').value),
    regularization_enabled: document.getElementById('regEnabled').checked,
    regularization_parameter: parseFloat(document.getElementById('lambda').value),
    layers: [
      { type: 'input', size: INPUT_SIZE, width: 1 },
      ...hiddenLayers.map(l => ({ type: 'hidden', size: l.size, width: l.width })),
      { type: 'output', size: OUTPUT_SIZE, width: 1 }
    ]
  };
}



document.getElementById('addLayer').addEventListener('click', () => {
  hiddenLayers.push({ size: 32, width: 1 });
  renderArchitecture();
  renderNetwork();
  if (onboardingActive) dismissOnboarding();

});

document.getElementById('dropoutEnabled').addEventListener('change', e => {
  document.getElementById('dropoutRate').disabled = !e.target.checked;
});
document.getElementById('regEnabled').addEventListener('change', e => {
  document.getElementById('lambda').disabled = !e.target.checked;
});

document.getElementById('trainBtn').addEventListener('click', () => {
  trainingTriggered()
});



window.setTestAccuracy = setTestAccuracy;
window.renderAccuracyChart = renderAccuracyChart;
window.getNetworkConfig = getNetworkConfig;


renderArchitecture();
renderNetwork();



FINISHED_TRAINING = false;



/// Connect to host computer part ///
//ngrok//
const backend_url = "wss://groom-dreamt-chess.ngrok-free.dev";
const socket = new WebSocket(backend_url);
message_queue = [];

socket.onopen = () => {
  while (message_queue.length > 0) {
    socket.send(message_queue.shift());
  }
}
function send_message(msg) {
  if (socket.readyState == WebSocket.OPEN) {
    socket.send(msg);

  }
  else if (socket.readyState == WebSocket.CONNECTING) {
    message_queue.push(msg);
  }
}

current_config = null;
function trainingTriggered() {
  const model_config = getNetworkConfig();

  const has_changed = JSON.stringify(model_config) !== JSON.stringify(current_config);

  if (has_changed) {
    console.log("training triggered")
    FINISHED_TRAINING = false;
    current_config = model_config;

    const training_message = { message_type: "TRAINING_CONFIG", message_content: model_config };
    send_message(JSON.stringify(training_message));
    startNetworkAnimation();
  }
  else {
    current_config = model_config
    showToast("You haven't update your network structure.", 'warn');
    return;
  }
}
function predictTriggered() {
  if (isPredicting) { return; }
  startPredictionCycle();
  const digit_data = Array.from(getPixels());
  const predict_message = { message_type: "DIGIT_DATA", message_content: digit_data };
  send_message(JSON.stringify(predict_message));
  startNetworkAnimation();
}
let isTraining = false;
cancelBtn = document.getElementById("cancelBtn");
cancelBtn.addEventListener('click', () => {
  if (!isTraining) return;
  send_message(JSON.stringify({ message_type: "CANCEL_TRAINING" }));
});


let buttonInterval = null;

socket.onmessage = (event) => {
  const received_data = JSON.parse(event.data);
  const trainBtn = document.getElementById("trainBtn");
  if (received_data.type == "TRAINING_CANCELLED") {
    isTraining = false;
    stopNetworkAnimation();
    if (buttonInterval) {
      clearInterval(buttonInterval);
      buttonInterval = null;
    }
    trainBtn.disabled = false;
    trainBtn.innerText = "Train";

  }
  if (received_data.type == "TRAINING_FINISHED") {
    isTraining = false;
    FINISHED_TRAINING = true;
    stopNetworkAnimation();

    if (buttonInterval) {
      clearInterval(buttonInterval);
      buttonInterval = null;
    }
    trainBtn.disabled = false;
    trainBtn.innerText = "Train";


  }

  if (received_data.type == "TRAINING_STARTED") {
    isTraining = true;
    lossHistory = [];
    accuracyHistory = [];
    document.getElementById('lossChartWrap').innerHTML = '';
    document.getElementById('chartWrap').innerHTML = '';

    if (buttonInterval) { clearInterval(buttonInterval); }

    let dotCount = 1;
    buttonInterval = setInterval(() => {
      trainBtn.innerText = `Training in progress ${".".repeat(dotCount)}`;
      dotCount = (dotCount % 3) + 1;
    }, 500);
  }

  if (received_data.type == "TRAINING_QUEUED") {
    trainBtn.disabled = true;

    if (buttonInterval) { clearInterval(buttonInterval); }

    let dotCount = 1;
    buttonInterval = setInterval(() => {
      trainBtn.innerText = `Your training order is in queue ${".".repeat(dotCount)}`;
      dotCount = (dotCount % 3) + 1;
    }, 500);
  }

  if (received_data.type == "PREDICT_FINISHED") {
    stop_cycle_and_replace(received_data.content);
    stopNetworkAnimation();
  }
  if (received_data.type == "LOSS_UPDATE") {
    lossHistory.push(received_data.content);
    renderLossChart(lossHistory);
    setLoss(received_data.content.loss);
  }
  if (received_data.type == "ACCURACY_UPDATE") {
    accuracyHistory.push(received_data.content);
    renderAccuracyChart(accuracyHistory);
    setTestAccuracy(received_data.content.acc);
  }
};


/* Network Firing Animation Controller */
(function () {

  // ── State ─────────────────────────────────────────────────────────────
  let _canvas = null;
  let _ctx = null;
  let _raf = null;
  let _running = false;
  let _waves = [];   // { p, dir }  dir=1 forward, dir=-1 backward
  let _glows = [];   // { col, v }
  let _lastTs = null;
  let _fwdClk = 0;
  let _bkwClk = 0;

  // ── Tuning ─────────────────────────────────────────────────────────────
  const TRANSIT_MS = 1100;  // ms for one wave to cross the full network
  const SPAWN_EVERY = 520;   // ms between spawns per direction
  const MAX_EACH = 2;     // max waves per direction in flight at once
  const LINE_LEN = 0.18;  // segment length as fraction of each edge
  const GLOW_DECAY = 0.0025;

  // ── Geometry — exact mirror of renderNetwork() constants ───────────────
  function buildColumns() {
    const layers = [{ size: INPUT_SIZE, width: 1 }];
    hiddenLayers.forEach(l => layers.push({ size: l.size, width: l.width }));
    layers.push({ size: OUTPUT_SIZE, width: 1 });

    const CIRCLE_GAP = 24, COL_GAP = 60, PAD_X = 44, TOP = 28;
    const HEIGHT = 384, LABEL_AREA = 58, GAP_ELL = 38;
    const cy = TOP + (HEIGHT - TOP - LABEL_AREA) / 2;

    const cols = [];
    let ci = 0;
    for (const layer of layers) {
      const n = circleCount(layer.size);
      for (let w = 0; w < layer.width; w++) {
        const x = PAD_X + ci * COL_GAP;
        const block = (n - 2) * CIRCLE_GAP + GAP_ELL;
        const top = cy - block / 2;
        const circles = [];
        for (let i = 0; i < n - 1; i++) circles.push({ x, y: top + i * CIRCLE_GAP });
        circles.push({ x, y: top + (n - 2) * CIRCLE_GAP + GAP_ELL });
        cols.push({ x, circles });
        ci++;
      }
    }
    return cols;
  }

  // ── Canvas: auto-recreated if renderNetwork() wipes innerHTML ──────────
  function getCtx() {
    const svg = vizWrap.querySelector('svg');
    if (!svg) return null;
    if (!vizWrap.contains(_canvas)) {
      _canvas = document.createElement('canvas');
      _canvas.className = 'net-anim-canvas';
      vizWrap.appendChild(_canvas);
      _ctx = _canvas.getContext('2d');
    }
    const vb = svg.viewBox.baseVal;
    if (_canvas.width !== vb.width || _canvas.height !== vb.height) {
      _canvas.width = vb.width;
      _canvas.height = vb.height;
    }
    return _ctx;
  }

  function bumpGlow(colIdx) {
    const g = _glows.find(g => g.col === colIdx);
    if (g) g.v = 1;
    else _glows.push({ col: colIdx, v: 1 });
  }

  // ── RAF tick ───────────────────────────────────────────────────────────
  function tick(ts) {
    if (!_running) return;
    const dt = _lastTs === null ? 16 : Math.min(ts - _lastTs, 50);
    _lastTs = ts;

    const cols = buildColumns();
    const N = cols.length;
    const ctx = getCtx();
    if (!ctx || N < 2) { _raf = requestAnimationFrame(tick); return; }

    const step = (N - 1) / TRANSIT_MS * dt;

    // ── Spawn forward (left → right) ───────────────────────────────
    _fwdClk += dt;
    if (_fwdClk >= SPAWN_EVERY && _waves.filter(w => w.dir === 1).length < MAX_EACH) {
      _waves.push({ p: 0, dir: 1 });
      bumpGlow(0);
      _fwdClk = 0;
    }

    // ── Spawn backward (right → left), offset by half interval ─────
    _bkwClk += dt;
    if (_bkwClk >= SPAWN_EVERY && _waves.filter(w => w.dir === -1).length < MAX_EACH) {
      _waves.push({ p: 0, dir: -1 });
      bumpGlow(N - 1);
      _bkwClk = 0;
    }

    // ── Advance waves + trigger column glows ────────────────────────
    //
    //  Both directions use the same scalar p (0 → N-1).
    //  For forward: p tracks position left-to-right, boundary = floor(p).
    //  For backward: p tracks distance-traveled from the right, and we
    //  mirror it to find the actual boundary (N-2-floor(p)).
    //  When floor(p) increments, the wave has just cleared a column:
    //    forward  → glow the dest column  (= curr)
    //    backward → glow the mirrored col (= N-1-curr)
    for (const w of _waves) {
      const prev = w.p | 0;
      w.p += step;
      const curr = Math.min(w.p | 0, N - 1);
      if (curr > prev) {
        if (w.dir === 1) bumpGlow(curr);
        else bumpGlow(Math.max(0, N - 1 - curr));
      }
    }
    _waves = _waves.filter(w => w.p < N - 1 + LINE_LEN);

    ctx.clearRect(0, 0, _canvas.width, _canvas.height);

    // ── Node glows ─────────────────────────────────────────────────
    for (const g of _glows) {
      if (g.col >= N) continue;
      for (const c of cols[g.col].circles) {
        const gr = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 26);
        gr.addColorStop(0, `rgba(255,255,255,${(g.v * 0.6).toFixed(3)})`);
        gr.addColorStop(0.35, `rgba(170,160,255,${(g.v * 0.25).toFixed(3)})`);
        gr.addColorStop(1, 'rgba(79,70,229,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 26, 0, 6.283185);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(c.x, c.y, 9, 0, 6.283185);
        ctx.fillStyle = `rgba(255,255,255,${(g.v * 0.35).toFixed(3)})`;
        ctx.fill();
      }
      g.v -= GLOW_DECAY * dt;
    }
    _glows = _glows.filter(g => g.v > 0.005);

    // ── Traveling lines ────────────────────────────────────────────
    //
    //  For BOTH directions, we keep the same edge coordinate space
    //  (src = left column, dst = right column, t ∈ [0,1] left→right).
    //
    //  Forward  (dir=1):  head moves 0→1, tail follows at head−LINE_LEN
    //    cf    = min(floor(p), N-2)
    //    t     = p − cf
    //    headT = min(1, t)          tail = max(0, t − LINE_LEN)
    //
    //  Backward (dir=-1): head moves 1→0, tail follows at head+LINE_LEN
    //    cf_fwd = min(floor(p), N-2)   ← same "virtual" counter as fwd
    //    t      = p − cf_fwd           ← same 0→1 within each step
    //    cf_act = N-2 − cf_fwd         ← actual boundary (mirrored)
    //    headT  = max(0, 1-t)          tail = min(1, 1-t+LINE_LEN)
    //
    //  Drawing always goes from smaller t to larger t (moveTo→lineTo),
    //  so the same 3-pass stroke call works for both directions.

    ctx.lineCap = 'round';

    for (const w of _waves) {
      const cfv = Math.min(w.p | 0, N - 2);  // virtual boundary counter
      const t = w.p - cfv;                  // fraction, 0→1+ per step

      let cf, headT, tailT;

      if (w.dir === 1) {
        cf = cfv;
        headT = Math.min(1, t);
        tailT = Math.max(0, t - LINE_LEN);
      } else {
        cf = N - 2 - cfv;                  // mirror to actual boundary
        headT = Math.max(0, 1 - t);           // head: 1→0 (right-to-left)
        tailT = Math.min(1, 1 - t + LINE_LEN);// tail: stays right of head
      }

      // loT/hiT are the two endpoints in edge-space, lo < hi always
      const loT = Math.min(headT, tailT);
      const hiT = Math.max(headT, tailT);
      if (hiT - loT < 0.001) continue;

      const midT = (loT + hiT) / 2;
      const alpha = Math.sin(midT * Math.PI);   // bell: bright mid-edge, dim at nodes
      if (alpha < 0.01) continue;

      const cA = cols[cf];
      const cB = cols[cf + 1];

      // Build one Path2D for all edges at this boundary; reuse for 3 passes
      const edgePath = new Path2D();
      for (const a of cA.circles) {
        for (const b of cB.circles) {
          edgePath.moveTo(a.x + (b.x - a.x) * loT, a.y + (b.y - a.y) * loT);
          edgePath.lineTo(a.x + (b.x - a.x) * hiT, a.y + (b.y - a.y) * hiT);
        }
      }

      // Pass 1 — soft glow halo
      ctx.globalAlpha = alpha * 0.22;
      ctx.strokeStyle = 'rgba(210,205,255,1)';
      ctx.lineWidth = 3.0;
      ctx.stroke(edgePath);

      // Pass 2 — dark outline (wider than core, peeks out both sides)
      ctx.globalAlpha = alpha * 0.82;
      ctx.strokeStyle = 'rgba(12,10,26,1)';
      ctx.lineWidth = 1.6;
      ctx.stroke(edgePath);

      // Pass 3 — bright white core (thin, sits inside the outline)
      ctx.globalAlpha = alpha * 0.96;
      ctx.strokeStyle = 'rgba(255,255,255,1)';
      ctx.lineWidth = 0.5;
      ctx.stroke(edgePath);
    }

    ctx.globalAlpha = 1;
    _raf = requestAnimationFrame(tick);
  }

  // ── Public API ─────────────────────────────────────────────────────────
  window.startNetworkAnimation = function () {
    if (_running) return;
    _running = true;
    _waves = [];
    _glows = [];
    _lastTs = null;
    _fwdClk = SPAWN_EVERY;        // forward fires immediately
    _bkwClk = SPAWN_EVERY / 2;   // backward offset by half interval
    const card = vizWrap.closest('.card');
    if (card) card.classList.add('net-animating');
    _raf = requestAnimationFrame(tick);
  };

  window.stopNetworkAnimation = function () {
    _running = false;
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    if (_ctx && _canvas) {
      _ctx.globalAlpha = 1;
      _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    }
    _waves = [];
    _glows = [];
    _lastTs = null;
    const card = vizWrap.closest('.card');
    if (card) card.classList.remove('net-animating');
  };

})();






/* Onboarding 
   showOnboarding()   – called once on page load
   _positionTip()     – keeps the tooltip anchored above the button
   dismissOnboarding()– called from the addLayer handler on first click
*/
function showOnboarding() {
  // Full-screen click blocker – sits below the spotlight button (z 999 < 1001)
  _obOverlay = document.createElement('div');
  _obOverlay.className = 'onboarding-overlay';
  document.body.appendChild(_obOverlay);

  // Elevate the button above the overlay so it remains clickable
  document.getElementById('addLayer').classList.add('onboarding-spotlight');

  // Tooltip bubble with bouncing caret
  _obTip = document.createElement('div');
  _obTip.className = 'onboarding-tip';
  _obTip.innerHTML =
    '<span class="onboarding-caret">👇</span>' +
    ' Click here to start building your first neural network' +
    '<span class="onboarding-tip-arrow"></span>';
  document.body.appendChild(_obTip);

  // Position after the browser has painted the tip so we get real dimensions
  requestAnimationFrame(_positionTip);
  window.addEventListener('resize', _positionTip);
}

function _positionTip() {
  if (!_obTip) return;
  const btn = document.getElementById('addLayer');
  const br = btn.getBoundingClientRect();
  const tr = _obTip.getBoundingClientRect();
  // Centre the tip over the button; clamp so it never bleeds off-screen
  const left = Math.max(8, Math.min(window.innerWidth - tr.width - 8, br.left + br.width / 2 - tr.width / 2));
  _obTip.style.left = left + 'px';
  _obTip.style.top = Math.max(8, br.top - tr.height - 14) + 'px';
}

function dismissOnboarding() {
  if (!onboardingActive) return;
  onboardingActive = false;
  window.removeEventListener('resize', _positionTip);
  document.getElementById('addLayer').classList.remove('onboarding-spotlight');
  _obOverlay?.remove(); _obOverlay = null;
  _obTip?.remove(); _obTip = null;
  // Snapshot the freshly-rendered default config so trainingTriggered
  // can detect the *next* change instead of treating this state as new.

}

showOnboarding();


// Show error //
function showToast(message, type = 'info') {
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.textContent = message;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast-visible'));
  setTimeout(() => {
    t.classList.remove('toast-visible');
    setTimeout(() => t.remove(), 300);
  }, 3500);
}
