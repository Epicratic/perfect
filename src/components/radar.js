// Spider Radar Charts Component using HTML5 Canvas / Chart.js

function getRadarScoreColor(score) {
  if (score >= 4.0) return "#00A859";
  if (score >= 3.0) return "#28C76F";
  if (score >= 2.0) return "#FFB800";
  if (score >= 1.0) return "#FF9F43";
  return "#EA5455";
}

export function renderRadarChartHTML(chartId, title) {
  return `
    <div class="radar-card-item" id="${chartId}-card" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 14px; text-align: center; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #EEF2F6;">
        <div style="font-size: 11.5px; font-weight: 800; color: #002B49; text-transform: uppercase; letter-spacing: 0.5px;">${title}</div>
        <div id="${chartId}-avg-badge" style="font-size: 11px; font-weight: 800; color: #002B49; background: #FFFFFF; border: 1px solid #CBD5E1; padding: 2px 8px; border-radius: 12px; display: none;"></div>
      </div>
      <div class="radar-canvas-container" style="position: relative; width: 100%; height: 200px; min-height: 200px; display: flex; align-items: center; justify-content: center;">
        <canvas id="${chartId}"></canvas>
      </div>
      <div id="${chartId}-indicators-row" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #EEF2F6;">
      </div>
    </div>
  `;
}

export function initRadarChart(canvasId, label, labels, dataValues, colorHex = "#00A859") {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Compute average score for the pillar
  const validValues = (dataValues || []).map(v => parseFloat(v) || 0.0);
  const avgScore = validValues.length > 0
    ? (validValues.reduce((a, b) => a + b, 0) / validValues.length).toFixed(1)
    : '0.0';
  const avgColor = getRadarScoreColor(parseFloat(avgScore));

  // Update pillar average score badge next to title
  const avgBadge = document.getElementById(`${canvasId}-avg-badge`);
  if (avgBadge) {
    avgBadge.style.display = 'inline-block';
    avgBadge.style.color = avgColor;
    avgBadge.style.borderColor = avgColor + '66';
    avgBadge.style.background = avgColor + '18';
    avgBadge.innerHTML = `★ ${avgScore} <span style="font-size: 9px; color: #64748B; font-weight: 600;">/ 5.0</span>`;
  }

  // Update indicators breakdown row under the chart
  const indRow = document.getElementById(`${canvasId}-indicators-row`);
  if (indRow && labels && labels.length > 0) {
    indRow.innerHTML = labels.map((name, idx) => {
      const val = (validValues[idx] !== undefined) ? validValues[idx] : 0.0;
      const color = getRadarScoreColor(val);
      return `
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 6px 4px; text-align: center;">
          <div style="font-size: 9.5px; font-weight: 700; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;" title="${name}">${name}</div>
          <div style="font-size: 11.5px; font-weight: 800; color: ${color};">★ ${val.toFixed(1)}</div>
        </div>
      `;
    }).join('');
  }

  // Render canvas drawing instantly to guarantee radar is 100% visible under all conditions
  drawFallbackSpiderWeb(ctx, labels, validValues, colorHex);

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
            data: validValues,
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
// ─── Multi-actor radar drawing helper ────────────────────────────────────────
// dashStyle: 'solid' | 'dashed' | 'dotted'
function getDashPattern(dashStyle) {
  if (dashStyle === 'dashed') return [7, 5];
  if (dashStyle === 'dotted') return [2, 4];
  return []; // solid
}

function drawFallbackSpiderWebMulti(canvasEl, labels, datasets, colorHex) {
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;

  const parent = canvasEl.parentElement;
  const rect = parent ? parent.getBoundingClientRect() : { width: 300, height: 210 };
  const width  = canvasEl.width  = Math.max(220, Math.floor(rect.width)  || 300);
  const height = canvasEl.height = Math.max(180, Math.floor(rect.height) || 210);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius  = Math.max(20, Math.min(width, height) / 2 - 32);
  const total   = labels.length;

  ctx.clearRect(0, 0, width, height);

  // Web Grid
  for (let r = 1; r <= 5; r++) {
    ctx.beginPath();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    for (let i = 0; i < total; i++) {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const x = centerX + (radius * (r / 5)) * Math.cos(angle);
      const y = centerY + (radius * (r / 5)) * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Axis Lines
  for (let i = 0; i < total; i++) {
    const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
    ctx.beginPath();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
    ctx.stroke();
  }

  // Draw each dataset polygon
  datasets.forEach((ds, dsIdx) => {
    const values = (ds.values || []).map(v => parseFloat(v) || 0);
    const dash   = getDashPattern(ds.dashStyle || 'solid');
    const alpha  = dsIdx === 0 ? '33' : '18'; // first actor has more fill

    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.fillStyle   = colorHex + alpha;
    ctx.strokeStyle = colorHex;
    ctx.lineWidth   = dsIdx === 0 ? 2.5 : 2.0;

    values.forEach((v, i) => {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const dist  = radius * (Math.max(0, Math.min(5, v)) / 5);
      const x = centerX + dist * Math.cos(angle);
      const y = centerY + dist * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // Data Points
    values.forEach((v, i) => {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const dist  = radius * (Math.max(0, Math.min(5, v)) / 5);
      const x = centerX + dist * Math.cos(angle);
      const y = centerY + dist * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle   = colorHex;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    });
  });

  // Axis Labels
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  labels.forEach((lbl, i) => {
    const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
    const x = centerX + (radius + 22) * Math.cos(angle);
    const y = centerY + (radius + 16) * Math.sin(angle);
    ctx.fillText(lbl, x, y);
  });
}

/**
 * initRadarChartMulti — draws up to 3 actor datasets on a single radar chart.
 * @param {string} canvasId - canvas element id
 * @param {string} pillarLabel - display label of the pillar
 * @param {string[]} axisLabels - axis names (3 items)
 * @param {Array<{label:string, values:number[], dashStyle:string}>} datasets
 * @param {string} colorHex - pillar color (blue/red/green)
 */
export function initRadarChartMulti(canvasId, pillarLabel, axisLabels, datasets, colorHex = '#00A859') {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const dashStyles = ['solid', 'dashed', 'dotted'];

  // Avg badge — based on first actor (or overall if single ALL dataset)
  const firstValues = datasets.length > 0 ? (datasets[0].values || []).map(v => parseFloat(v) || 0) : [];
  const avgScore = firstValues.length > 0
    ? (firstValues.reduce((a, b) => a + b, 0) / firstValues.length).toFixed(1)
    : '0.0';
  const avgColor = getRadarScoreColor(parseFloat(avgScore));

  const avgBadge = document.getElementById(`${canvasId}-avg-badge`);
  if (avgBadge) {
    avgBadge.style.display = 'inline-block';
    avgBadge.style.color = avgColor;
    avgBadge.style.borderColor = avgColor + '66';
    avgBadge.style.background = avgColor + '18';
    avgBadge.innerHTML = `★ ${avgScore} <span style="font-size:9px;color:#64748B;font-weight:600;">/ 5.0</span>`;
  }

  // Indicators row — always shows first actor's breakdown
  const indRow = document.getElementById(`${canvasId}-indicators-row`);
  if (indRow && axisLabels && axisLabels.length > 0) {
    indRow.innerHTML = axisLabels.map((name, idx) => {
      const val = firstValues[idx] !== undefined ? firstValues[idx] : 0.0;
      const color = getRadarScoreColor(val);
      return `
        <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;padding:6px 4px;text-align:center;">
          <div style="font-size:9.5px;font-weight:700;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;" title="${name}">${name}</div>
          <div style="font-size:11.5px;font-weight:800;color:${color};">★ ${val.toFixed(1)}</div>
        </div>
      `;
    }).join('');
  }

  // Annotate datasets with dashStyle
  const annotated = datasets.map((ds, i) => ({ ...ds, dashStyle: dashStyles[i] || 'solid' }));

  // Fallback canvas drawing
  drawFallbackSpiderWebMulti(ctx, axisLabels, annotated, colorHex);

  if (window.Chart) {
    if (window.Chart.getChart) {
      try { const e = window.Chart.getChart(ctx); if (e) e.destroy(); } catch (_) {}
    }
    try {
      const chartDatasets = annotated.map(ds => ({
        label: ds.label,
        data: (ds.values || []).map(v => parseFloat(v) || 0),
        backgroundColor: colorHex + (ds.dashStyle === 'solid' ? '33' : '18'),
        borderColor: colorHex,
        borderWidth: ds.dashStyle === 'solid' ? 2.5 : 2.0,
        borderDash: getDashPattern(ds.dashStyle),
        pointBackgroundColor: colorHex,
        pointRadius: 3
      }));
      new window.Chart(ctx, {
        type: 'radar',
        data: { labels: axisLabels, datasets: chartDatasets },
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
          plugins: { legend: { display: false } }
        }
      });
    } catch (err) {
      console.warn('Chart.js multi init failed, keeping fallback:', err);
    }
  }
}
