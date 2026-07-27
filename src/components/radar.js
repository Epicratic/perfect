// Spider Radar Charts Component using HTML5 Canvas / Chart.js

export function renderRadarChartHTML(chartId, title) {
  return `
    <div class="radar-card-item">
      <div style="font-size: 13px; font-weight: 700; color: #002B49; margin-bottom: 8px;">${title}</div>
      <div class="radar-canvas-container">
        <canvas id="${chartId}"></canvas>
      </div>
    </div>
  `;
}

export function initRadarChart(canvasId, label, labels, dataValues, colorHex = "#00A859") {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (window.Chart) {
    new window.Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: dataValues,
          backgroundColor: colorHex + "33",
          borderColor: colorHex,
          borderWidth: 2,
          pointBackgroundColor: colorHex,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: '#E2E8F0' },
            grid: { color: '#E2E8F0' },
            suggestedMin: 0,
            suggestedMax: 5,
            ticks: { display: false }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  } else {
    // Fallback Canvas Drawing if Chart.js is loading asynchronously
    drawFallbackSpiderWeb(ctx, labels, dataValues, colorHex);
  }
}

function drawFallbackSpiderWeb(canvasEl, labels, values, colorHex) {
  const ctx = canvasEl.getContext('2d');
  const width = canvasEl.width = canvasEl.parentElement.clientWidth || 200;
  const height = canvasEl.height = 200;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 25;
  const total = labels.length;

  ctx.clearRect(0, 0, width, height);

  // Draw Web Web Grid Circles
  for (let r = 1; r <= 5; r++) {
    ctx.beginPath();
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    for (let i = 0; i < total; i++) {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const x = centerX + (radius * (r / 5)) * Math.cos(angle);
      const y = centerY + (radius * (r / 5)) * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Draw Data Polygon
  ctx.beginPath();
  ctx.fillStyle = colorHex + "44";
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 2.5;

  values.forEach((v, i) => {
    const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
    const dist = (radius * (v / 5));
    const x = centerX + dist * Math.cos(angle);
    const y = centerY + dist * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw Labels
  ctx.fillStyle = "#64748B";
  ctx.font = "10px Inter, sans-serif";
  ctx.textAlign = "center";
  labels.forEach((lbl, i) => {
    const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
    const x = centerX + (radius + 15) * Math.cos(angle);
    const y = centerY + (radius + 12) * Math.sin(angle);
    ctx.fillText(lbl, x, y);
  });
}
