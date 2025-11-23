/* Wheel of Fortuna - Vanilla JS
   Simplified version (players & scoreboard removed; value scoring removed)
   Features:
   - Dynamic segments editable in a table (labels only)
   - Animated spin with easing
   - Adjustable spin duration
   - Simplified pointer orientation (pointer at top)
*/

(function() {
  // DOM references
  const canvas = document.getElementById('wheel');
  const ctx = canvas.getContext('2d');
  const spinBtn = document.getElementById('spin-btn');
  const resultBox = document.getElementById('result-box');
  const segmentsBody = document.getElementById('segments-body');
  const addSegmentBtn = document.getElementById('add-segment-btn');
  const applySegmentsBtn = document.getElementById('apply-segments-btn');
  const spinDurationInput = document.getElementById('spin-duration');

  // Wheel state: segments contain only label + color
  let segments = [
    { label: '10', color: '#ff6b6b' },
    { label: '25', color: '#ffa94d' },
    { label: '50', color: '#ffd43b' },
    { label: '75', color: '#69db7c' },
    { label: 'Miss', color: '#748ffc' }
  ];

  let isSpinning = false;
  let spinAngle = 0; // radians

  const TWO_PI = Math.PI * 2;
  const ROTATION_OFFSET = -Math.PI / 2; // slice 0 starts at top (pointer)

  function randomColorSeed(i, total) {
    const h = Math.round((360 / total) * i);
    return `hsl(${h}deg,70%,55%)`;
  }

  function shuffleColorsIfMissing() {
    segments.forEach((seg, i) => { if (!seg.color) seg.color = randomColorSeed(i, segments.length); });
  }

  function drawWheel() {
    const size = canvas.width;
    const radius = size / 2;
    const cx = radius;
    const cy = radius;

    ctx.clearRect(0, 0, size, size);
    const count = segments.length;
    const arc = TWO_PI / count;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spinAngle + ROTATION_OFFSET);

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
    ctx.arc(cx, cy, radius * 0.12, 0, TWO_PI);
    ctx.fillStyle = '#222';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#444';
    ctx.stroke();
  }

  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    const lines = [];
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
    lines.forEach((ln, i) => context.fillText(ln, x, offsetY + i * lineHeight));
  }

  function getSegmentAtPointer() {
    const count = segments.length;
    if (count === 0) return null;
    const arc = TWO_PI / count;
    const normalized = ((TWO_PI - (spinAngle % TWO_PI)) + TWO_PI) % TWO_PI;
    const index = Math.floor(normalized / arc) % count;
    return segments[index];
  }

  function startSpin() {
    if (isSpinning || segments.length === 0) return;
    isSpinning = true;
    spinBtn.disabled = true;
    resultBox.textContent = 'Spinning...';

    const duration = Math.min(Math.max(Number(spinDurationInput.value) || 5, 1), 12);
    const start = performance.now();
    const startAngle = spinAngle;
    const totalRotations = 5 + Math.random() * 5;
    const finalOffset = Math.random() * TWO_PI;
    const targetAngle = startAngle + TWO_PI * totalRotations + finalOffset;

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

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
    const landed = getSegmentAtPointer();
    resultBox.textContent = landed ? `Result: ${landed.label}` : 'No segments.';
    spinBtn.disabled = false;
  }

  // Segments table (labels only)
  function rebuildSegmentsTable() {
    segmentsBody.innerHTML = '';
    segments.forEach((seg, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" value="${seg.label}" data-label="${i}" /></td>
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
    if (labelIdx !== undefined) segments[labelIdx].label = e.target.value;
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
    segments.push({ label: 'New', color: randomColorSeed(segments.length, segments.length + 1) });
    rebuildSegmentsTable();
    drawWheel();
  });

  applySegmentsBtn.addEventListener('click', () => {
    shuffleColorsIfMissing();
    drawWheel();
  });

  spinBtn.addEventListener('click', startSpin);

  // Init
  rebuildSegmentsTable();
  shuffleColorsIfMissing();
  drawWheel();

  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === spinBtn && !spinBtn.disabled) {
      e.preventDefault();
      startSpin();
    }
  });

  window.WheelGame = { getState: () => ({ segments, spinAngle }) };
})();
