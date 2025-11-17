/* Wheel of Fortuna - Vanilla JS
   Features:
   - Dynamic segments editable in a table
   - Add/remove players
   - Turn management
   - Animated spin with easing
   - Assigns segment value to current player
   - Scoreboard updates
   - Adjustable spin duration
*/

(function() {
  // DOM references
  const canvas = document.getElementById('wheel');
  const ctx = canvas.getContext('2d');
  const spinBtn = document.getElementById('spin-btn');
  const nextPlayerBtn = document.getElementById('next-player-btn');
  const playersList = document.getElementById('players-list');
  const addPlayerForm = document.getElementById('add-player-form');
  const playerNameInput = document.getElementById('player-name');
  const currentPlayerNameEl = document.getElementById('current-player-name');
  const resultBox = document.getElementById('result-box');
  const scoreboardBody = document.getElementById('scoreboard-body');
  const segmentsBody = document.getElementById('segments-body');
  const addSegmentBtn = document.getElementById('add-segment-btn');
  const applySegmentsBtn = document.getElementById('apply-segments-btn');
  const spinDurationInput = document.getElementById('spin-duration');

  // Game state
  let segments = [
    { label: '10', value: 10, color: '#ff6b6b' },
    { label: '25', value: 25, color: '#ffa94d' },
    { label: '50', value: 50, color: '#ffd43b' },
    { label: '75', value: 75, color: '#69db7c' },
    { label: '100', value: 100, color: '#38d9a9' },
    { label: 'Miss', value: 0, color: '#748ffc' },
    { label: '150', value: 150, color: '#9775fa' },
    { label: '200', value: 200, color: '#ff8787' }
  ];

  let players = [];
  let currentPlayerIndex = 0;
  let isSpinning = false;
  let spinAngle = 0;

  // Utility functions
  function randomColorSeed(i, total) {
    // Generate evenly spaced hues
    const h = Math.round((360 / total) * i);
    return `hsl(${h}deg,70%,55%)`;
  }

  function shuffleColorsIfMissing() {
    segments.forEach((seg, i) => {
      if (!seg.color) seg.color = randomColorSeed(i, segments.length);
    });
  }

  function drawWheel() {
    const size = canvas.width;
    const radius = size / 2;
    const cx = radius;
    const cy = radius;

    ctx.clearRect(0, 0, size, size);
    const count = segments.length;
    const arc = (Math.PI * 2) / count;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spinAngle);

    // Draw slices
    for (let i = 0; i < count; i++) {
      const start = i * arc;
      const end = start + arc;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = segments[i].color;
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.rotate(start + arc / 2);
      ctx.translate(radius * 0.62, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      wrapText(ctx, segments[i].label, 0, 0, radius * 0.32, 22);
      ctx.restore();
    }

    ctx.restore();

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = '#222';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#444';
    ctx.stroke();
  }

  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let lines = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = context.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());
    const totalHeight = lines.length * lineHeight;
    const offsetY = y - totalHeight / 2 + lineHeight / 2;
    lines.forEach((ln, i) => {
      context.fillText(ln, x, offsetY + i * lineHeight);
    });
  }

  function getSegmentAtPointer(angle) {
    // Normalize spinAngle -> which segment sits at pointer (pointing right side)
    // Pointer is fixed at angle = 0 (positive X). Our wheel has been rotated by spinAngle.
    const normalized = (Math.PI * 2 - (angle % (Math.PI * 2)) + Math.PI / 2) % (Math.PI * 2);
    const arc = (Math.PI * 2) / segments.length;
    let index = Math.floor(normalized / arc);
    if (index < 0) index = 0;
    if (index >= segments.length) index = segments.length - 1;
    return segments[index];
  }

  function updatePlayersUI() {
    playersList.innerHTML = '';
    players.forEach((p, idx) => {
      const li = document.createElement('li');
      li.dataset.idx = idx;
      li.innerHTML = `
        <span>${p.name}</span>
        <button class="remove-player" aria-label="Remove ${p.name}" data-remove="${idx}">✕</button>
      `;
      playersList.appendChild(li);
    });
    updateScoreboard();
    updateCurrentPlayerLabel();
    spinBtn.disabled = players.length === 0;
    nextPlayerBtn.disabled = players.length === 0;
  }

  function updateScoreboard() {
    scoreboardBody.innerHTML = '';
    players.forEach((p, i) => {
      const row = document.createElement('tr');
      if (i === currentPlayerIndex) row.classList.add('highlight-turn');
      row.innerHTML = `
        <td>${p.name}</td>
        <td>${p.score}</td>
        <td>${p.turns}</td>
      `;
      scoreboardBody.appendChild(row);
    });
  }

  function updateCurrentPlayerLabel() {
    if (players.length === 0) {
      currentPlayerNameEl.textContent = '—';
    } else {
      currentPlayerNameEl.textContent = players[currentPlayerIndex].name;
    }
  }

  function nextPlayer() {
    if (players.length === 0) return;
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    updateCurrentPlayerLabel();
    updateScoreboard();
    resultBox.textContent = '';
  }

  function startSpin() {
    if (isSpinning || players.length === 0 || segments.length === 0) return;
    isSpinning = true;
    spinBtn.disabled = true;
    nextPlayerBtn.disabled = true;
    resultBox.textContent = 'Spinning...';

    const duration = Math.min(Math.max(Number(spinDurationInput.value) || 5, 1), 12);
    const start = performance.now();
    const startAngle = spinAngle;
    const totalRotations = 5 + Math.random() * 5; // random turns
    const finalOffset = Math.random() * Math.PI * 2;
    const targetAngle = startAngle + (Math.PI * 2) * totalRotations + finalOffset;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animationFrame(now) {
      const elapsed = (now - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      spinAngle = startAngle + (targetAngle - startAngle) * eased;
      drawWheel();
      if (progress < 1) {
        requestAnimationFrame(animationFrame);
      } else {
        finishSpin();
      }
    }
    requestAnimationFrame(animationFrame);
  }

  function finishSpin() {
    isSpinning = false;
    const landed = getSegmentAtPointer(spinAngle);
    resultBox.textContent = `Result: ${landed.label} (${landed.value} points)`;
    // Update player
    const player = players[currentPlayerIndex];
    player.score += landed.value;
    player.turns += 1;
    updateScoreboard();
    // Re-enable controls
    spinBtn.disabled = false;
    nextPlayerBtn.disabled = false;
  }

  // Players
  addPlayerForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = playerNameInput.value.trim();
    if (!name) return;
    players.push({ name, score: 0, turns: 0 });
    playerNameInput.value = '';
    if (players.length === 1) currentPlayerIndex = 0;
    updatePlayersUI();
  });

  playersList.addEventListener('click', e => {
    const btn = e.target.closest('button[data-remove]');
    if (!btn) return;
    const idx = Number(btn.dataset.remove);
    players.splice(idx, 1);
    if (players.length === 0) {
      currentPlayerIndex = 0;
    } else if (currentPlayerIndex >= players.length) {
      currentPlayerIndex = 0;
    }
    updatePlayersUI();
  });

  nextPlayerBtn.addEventListener('click', () => {
    if (isSpinning) return;
    nextPlayer();
  });

  // Wheel spin
  spinBtn.addEventListener('click', startSpin);

  // Segments table management
  function rebuildSegmentsTable() {
    segmentsBody.innerHTML = '';
    segments.forEach((seg, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" value="${seg.label}" data-label="${i}" /></td>
        <td><input type="number" value="${seg.value}" data-value="${i}" /></td>
        <td class="segment-actions">
          <button data-color="${i}" title="Randomize Color">Color</button>
          <button data-remove-seg="${i}" title="Remove Segment">Remove</button>
        </td>
      `;
      segmentsBody.appendChild(tr);
    });
  }

  segmentsBody.addEventListener('input', e => {
    const labelIdx = e.target.dataset.label;
    const valueIdx = e.target.dataset.value;
    if (labelIdx !== undefined) {
      segments[labelIdx].label = e.target.value;
    }
    if (valueIdx !== undefined) {
      segments[valueIdx].value = Number(e.target.value);
    }
  });

  segmentsBody.addEventListener('click', e => {
    const colorBtn = e.target.closest('button[data-color]');
    const removeBtn = e.target.closest('button[data-remove-seg]');
    if (colorBtn) {
      const i = Number(colorBtn.dataset.color);
      segments[i].color = randomColorSeed(Math.random() * 360, 360);
      drawWheel();
    }
    if (removeBtn) {
      const i = Number(removeBtn.dataset.removeSeg);
      segments.splice(i, 1);
      rebuildSegmentsTable();
      drawWheel();
    }
  });

  addSegmentBtn.addEventListener('click', () => {
    segments.push({
      label: 'New',
      value: 0,
      color: randomColorSeed(segments.length, segments.length + 1)
    });
    rebuildSegmentsTable();
    drawWheel();
  });

  applySegmentsBtn.addEventListener('click', () => {
    shuffleColorsIfMissing();
    drawWheel();
  });

  // Initialization
  rebuildSegmentsTable();
  shuffleColorsIfMissing();
  drawWheel();
  updatePlayersUI();

  // Accessibility: keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.activeElement === spinBtn && !spinBtn.disabled) {
      startSpin();
    }
    if (e.key === ' ' && document.activeElement === spinBtn && !spinBtn.disabled) {
      e.preventDefault();
      startSpin();
    }
  });

  // Expose for debugging
  window.WheelGame = {
    getState: () => ({ segments, players, currentPlayerIndex, spinAngle })
  };
})();