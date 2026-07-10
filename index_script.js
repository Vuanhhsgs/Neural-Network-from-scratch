/// Render the visualization of neural network based on users' custom config///


const INPUT_SIZE = 784;
const OUTPUT_SIZE = 10;

let hiddenLayers = [
  { size: 512, width: 1 },
];

/* ── Onboarding state ──────────────────────────────────────────── */
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
let accuracyHistory = [76, 80, 85, 89, 91, 93, 97];

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
  startPredictionCycle();
  const digit_data = Array.from(getPixels());
  const predict_message = { message_type: "DIGIT_DATA", message_content: digit_data };
  send_message(JSON.stringify(predict_message));
  startNetworkAnimation();
}


socket.onmessage = (event) => {
  const received_data = JSON.parse(event.data);
  if (received_data.type == "TRAINING_FINISHED") {
    FINISHED_TRAINING = true;
    stopNetworkAnimation();
  }
  if (received_data.type == "PREDICT_FINISHED") {
    setTimeout(() => {
      stop_cycle_and_replace(received_data.content);
      stopNetworkAnimation();
    }, 1000);
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


/* Network Firing Animation Controller */
let networkAnimTimer = null;
let isNetworkAnimating = false;
let _animEdges = []; // Will now store objects: { element, x }

function startNetworkAnimation() {
  stopNetworkAnimation();

  const lines = document.querySelectorAll('#vizWrap svg line');
  if (!lines.length) return;

  // PHASE 1: BATCH READS
  // Read all data first without touching styles to prevent layout thrashing
  _animEdges = Array.from(lines).map(line => {
    // .x1.baseVal.value is significantly faster than getAttribute() for SVGs
    return {
      element: line,
      x: line.x1.baseVal.value
    };
  });

  const xs = _animEdges.map(edge => edge.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const range = (maxX - minX) || 1; // Fallback to 1 to prevent division by zero

  // PHASE 2: BATCH WRITES
  // Apply all visual changes in the next available frame
  requestAnimationFrame(() => {
    _animEdges.forEach(edge => {
      // Scale delay up to 1.5s based on position
      const delay = ((edge.x - minX) / range) * 1.5;
      edge.element.style.animationDelay = `-${delay}s`;
      edge.element.classList.add('edge-pulse');
    });
  });

  isNetworkAnimating = true;
}

function stopNetworkAnimation() {
  isNetworkAnimating = false;
  clearTimeout(networkAnimTimer);

  if (!_animEdges.length) return;

  // Batch DOM cleanup to maintain high frame rate when stopping
  requestAnimationFrame(() => {
    _animEdges.forEach(edge => {
      edge.element.classList.remove('edge-pulse');
      edge.element.style.animationDelay = '';
    });
    _animEdges = [];
  });
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