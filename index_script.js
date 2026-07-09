


/// Render the visualization of neural network based on users' custom config///


const INPUT_SIZE = 784;
const OUTPUT_SIZE = 10;

let hiddenLayers = [
  { size: 512, width: 1 },
];



/* Onboarding state */
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
/// Accuracy Chart ///
let accuracyHistory = [];

function renderAccuracyChart(history) {
  accuracyHistory = history || accuracyHistory;
  const W = 360, H = 150, L = 34, B = 26, T = 12, Rp = 10;
  const plotW = W - L - Rp, plotH = H - T - B;
  const maxEpoch = Math.max(1, accuracyHistory.length ? accuracyHistory[accuracyHistory.length - 1].epoch : 1);

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

  if (accuracyHistory.length > 1) {
    const pts = accuracyHistory.map(p => {
      const x = L + (p.epoch / maxEpoch) * plotW;
      const y = T + plotH - (Math.max(0, Math.min(100, p.acc)) / 100) * plotH;
      return x + ',' + y;
    }).join(' ');
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
renderAccuracyChart(accuracyHistory)
/// Loss chart///
let lossHistory = [];

function renderLossChart(history) {
  lossHistory = history || lossHistory;

  const W = 360, H = 150, L = 34, B = 26, T = 12, Rp = 10;
  const plotW = W - L - Rp, plotH = H - T - B;

  const maxEpoch = Math.max(1, lossHistory.length ? lossHistory[lossHistory.length - 1].epoch : 1);

  const peakLoss = lossHistory.length ? Math.max(...lossHistory.map(p => p.loss)) : 1;
  const maxLoss = peakLoss === 0 ? 1 : peakLoss;

  const parts = [];

  parts.push('<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + plotH) + '" stroke="var(--line-strong)" stroke-width="1"/>');
  parts.push('<line x1="' + L + '" y1="' + (T + plotH) + '" x2="' + (W - Rp) + '" y2="' + (T + plotH) + '" stroke="var(--line-strong)" stroke-width="1"/>');

  const gridValues = [0, maxLoss / 2, maxLoss];

  gridValues.forEach(v => {

    const y = T + plotH - (v / maxLoss) * plotH;

    const label = v % 1 === 0 ? v : v.toFixed(2);

    parts.push('<line x1="' + L + '" y1="' + y + '" x2="' + (W - Rp) + '" y2="' + y + '" stroke="var(--line)" stroke-width="0.7"/>');
    parts.push('<text x="' + (L - 6) + '" y="' + (y + 3) + '" text-anchor="end" font-family="var(--mono)" font-size="9" fill="var(--ink-mute)">' + label + '</text>');
  });


  parts.push('<text x="' + (L - 22) + '" y="' + (T + plotH / 2) + '" text-anchor="middle" font-family="var(--sans)" font-size="10" fill="var(--ink-soft)" transform="rotate(-90 ' + (L - 22) + ' ' + (T + plotH / 2) + ')">Loss</text>');
  parts.push('<text x="' + (L + plotW / 2) + '" y="' + (H - 4) + '" text-anchor="middle" font-family="var(--sans)" font-size="10" fill="var(--ink-soft)">Epochs</text>');


  if (lossHistory.length > 1) {
    const pts = lossHistory.map(p => {
      const x = L + (p.epoch / maxEpoch) * plotW;
      const y = T + plotH - (Math.max(0, p.loss) / maxLoss) * plotH;
      return x + ',' + y;
    }).join(' ');
    parts.push('<polyline points="' + pts + '" fill="none" stroke="var(--accent)" stroke-width="1.6"/>');
  }

  document.getElementById('lossChartWrap').innerHTML =
    '<svg viewBox="0 0 ' + W + ' ' + H + '">' + parts.join('') + '</svg>';
}

function setLoss(val) {
  if (val == null || val === undefined) {
    document.getElementById('trainLoss').textContent = '—';
  }
  else {
    document.getElementById('trainLoss').textContent = Number(val).toFixed(4);
  }
}
renderLossChart(lossHistory)
/// Pad for user to draw functions///
const pad = document.getElementById('pad');
const ctx = pad.getContext('2d');
let drawing = false;

function resetPad() {
  ctx.fillStyle = '#111114';
  ctx.fillRect(0, 0, pad.width, pad.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
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
has_drawed = false
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
  const out = new Float32Array(784);
  for (let i = 0; i < 784; i++) out[i] = data[i * 4] / 255;
  return out;
}
/// Model prediction ///
const predictionBox = document.getElementById('prediction');
let isCycling = false;

function startPredictionCycle() {
  predictionBox.classList.remove('idle');
  predictionBox.classList.add('cycling');
  isCycling = true;
  runCycleLoop();
}
function runCycleLoop() {
  if (!isCycling) return;
  predictionBox.textContent = Math.floor(Math.random() * 10);
  setTimeout(runCycleLoop, 50);
}

function stop_cycle_and_replace(predicted_digit) {
  isCycling = false;
  predictionBox.classList.remove('cycling');
  predictionBox.classList.add('idle');
  predictionBox.textContent = predicted_digit;
}
document.getElementById('predictBtn').addEventListener('click', async () => {
  predictTriggered()
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
renderAccuracyChart([]);


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
  model_config = getNetworkConfig()

  has_changed = JSON.stringify(model_config) !== JSON.stringify(current_config)

  if (has_changed) {
    FINISHED_TRAINING = false;
    current_config = model_config;
    training_message = { message_type: "TRAINING_CONFIG", message_content: model_config };
    send_message(JSON.stringify(training_message));

    startNetworkAnimation('train');
  }

}
function predictTriggered() {
  if (FINISHED_TRAINING && has_drawed) {
    startPredictionCycle();
    digit_data = Array.from(getPixels());
    predict_message = { message_type: "DIGIT_DATA", message_content: digit_data };
    send_message(JSON.stringify(predict_message));

    startNetworkAnimation('predict');
  }
}

socket.onmessage = (event) => {
  const received_data = JSON.parse(event.data);
  if (received_data.type == "TRAINING_FINISHED") {
    FINISHED_TRAINING = true;
    stopNetworkAnimation();
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
}


/*Network Firing Animation Controller*/
let networkAnimTimer = null;
let isNetworkAnimating = false;

function startNetworkAnimation(mode = 'train') {
  // Stop any existing animation first
  stopNetworkAnimation();

  // Find all SVG lines/paths used for edges in the visualization
  const edges = document.querySelectorAll('#vizWrap svg line, #vizWrap svg path');
  if (edges.length === 0) return;

  isNetworkAnimating = true;
  let phase = 'forward';

  function tick() {
    if (!isNetworkAnimating) return; // Break loop if stopped

    if (phase === 'forward') {
      edges.forEach(e => {
        e.classList.add('edge-flow-forward');
        e.classList.remove('edge-flow-backward');
      });

      if (mode === 'train') {
        phase = 'backward';
        networkAnimTimer = setTimeout(tick, 800); // Feedforward for 800ms, then swap
      } else {
        // If just predicting, keep flowing forward continuously
        networkAnimTimer = setTimeout(tick, 800);
      }
    } else {
      // Backpropagation phase (Only happens during 'train' mode)
      edges.forEach(e => {
        e.classList.add('edge-flow-backward');
        e.classList.remove('edge-flow-forward');
      });

      phase = 'forward';
      networkAnimTimer = setTimeout(tick, 800); // Backprop for 800ms, then swap
    }
  }

  tick(); // Start loop
}

function stopNetworkAnimation() {
  isNetworkAnimating = false;
  if (networkAnimTimer) clearTimeout(networkAnimTimer);

  // Strip animation classes to return to static state
  const edges = document.querySelectorAll('#vizWrap svg line, #vizWrap svg path');
  edges.forEach(e => e.classList.remove('edge-flow-forward', 'edge-flow-backward'));
}





/* ── Onboarding ─────────────────────────────────────────────────
   showOnboarding()   – called once on page load
   _positionTip()     – keeps the tooltip anchored above the button
   dismissOnboarding()– called from the addLayer handler on first click
──────────────────────────────────────────────────────────────── */
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
  current_config = getNetworkConfig();
}

showOnboarding();