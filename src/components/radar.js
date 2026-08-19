// Spider Radar Charts Component using HTML5 Canvas / Chart.js

export function renderRadarChartHTML(chartId, title) {
  return `
    <div class="radar-card-item" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; text-align: center; margin-bottom: 8px;">
      <div style="font-size: 11.5px; font-weight: 800; color: #002B49; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">${title}</div>
      <div class="radar-canvas-container" style="position: relative; width: 100%; height: 210px; min-height: 210px; display: flex; align-items: center; justify-content: center;">
        <canvas id="${chartId}"></canvas>
      </div>
    </div>
  `;
}

export function initRadarChart(canvasId, label, labels, dataValues, colorHex = "#00A859") {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Render canvas drawing instantly to guarantee radar is 100% visible under all conditions
  drawFallbackSpiderWeb(ctx, labels, dataValues, colorHex);

  if (window.Chart) {
    if (window.Chart.getChart) {
      try {
        const existing = window.Chart.getChart(ctx);
        if (existing) existing.destroy();
      } catch (e) {}
    }
    try {
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
    } catch (err) {
      console.warn("Chart.js init failed, keeping fallback canvas drawing:", err);
    }
  }
}

function drawFallbackSpiderWeb(canvasEl, labels, values, colorHex) {
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;

  const parent = canvasEl.parentElement;
  const rect = parent ? parent.getBoundingClientRect() : { width: 300, height: 210 };
  const width = canvasEl.width = Math.max(220, Math.floor(rect.width) || 300);
  const height = canvasEl.height = Math.max(180, Math.floor(rect.height) || 210);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.max(20, Math.min(width, height) / 2 - 32);
  const total = labels.length;

  ctx.clearRect(0, 0, width, height);

  // Draw Web Grid Circles
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

  // Draw Axis Lines from Center to Web Corners
  for (let i = 0; i < total; i++) {
    const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    ctx.beginPath();
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1;
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // Draw Data Polygon
  ctx.beginPath();
  ctx.fillStyle = colorHex + "33";
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 2.5;

  values.forEach((v, i) => {
    const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
    const dist = (radius * (Math.max(0, Math.min(5, v)) / 5));
    const x = centerX + dist * Math.cos(angle);
    const y = centerY + dist * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw Data Points
  values.forEach((v, i) => {
    const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
    const dist = (radius * (Math.max(0, Math.min(5, v)) / 5));
    const x = centerX + dist * Math.cos(angle);
    const y = centerY + dist * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = colorHex;
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Draw Axis Labels
  ctx.fillStyle = "#475569";
  ctx.font = "bold 10px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  labels.forEach((lbl, i) => {
    const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
    const x = centerX + (radius + 22) * Math.cos(angle);
    const y = centerY + (radius + 16) * Math.sin(angle);
    ctx.fillText(lbl, x, y);
  });
}
