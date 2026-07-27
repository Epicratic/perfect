// SVG Gauge Meter Component with 5 Discrete Color Segments and Outward Ticks

export function renderGaugeMeter(score, maxScore = 5.0, statusText = "", title = "Indice National", ratingsCount = 1248, countLabelTemplate = "Basé sur {count} évaluations enregistrées") {
  const percentage = Math.min(Math.max(score / maxScore, 0), 1);
  const needleAngle = -90 + (percentage * 180);
  const countText = countLabelTemplate.replace("{count}", ratingsCount.toLocaleString());

  return `
    <div class="gauge-meter-card">
      <div class="card-title" style="text-align: left; margin-bottom: 14px; font-size: 15px; font-weight: 700; color: #002B49;">${title}</div>

      <div class="gauge-svg-wrapper" style="width: 240px; height: 125px;">
        <svg viewBox="-15 -10 230 125" width="100%" height="100%">
          <!-- 5 Discrete Color Arc Segments (No Gradients) -->
          <!-- 0 - 1: Red -->
          <path d="M 20 100 A 80 80 0 0 1 35.28 52.98" fill="none" stroke="#EA5455" stroke-width="16" />
          
          <!-- 1 - 2: Orange -->
          <path d="M 35.28 52.98 A 80 80 0 0 1 75.28 23.92" fill="none" stroke="#FF9F43" stroke-width="16" />
          
          <!-- 2 - 3: Yellow -->
          <path d="M 75.28 23.92 A 80 80 0 0 1 124.72 23.92" fill="none" stroke="#FFB800" stroke-width="16" />
          
          <!-- 3 - 4: Light Green -->
          <path d="M 124.72 23.92 A 80 80 0 0 1 164.72 52.98" fill="none" stroke="#28C76F" stroke-width="16" />
          
          <!-- 4 - 5: Dark Green -->
          <path d="M 164.72 52.98 A 80 80 0 0 1 180 100" fill="none" stroke="#00A859" stroke-width="16" />
          
          <!-- Outward Ticks (0, 1, 2, 3, 4, 5) positioned outside the arc band -->
          <text x="-2" y="108" font-size="11" fill="#64748B" font-weight="700" text-anchor="middle">0</text>
          <text x="18" y="42" font-size="11" fill="#64748B" font-weight="700" text-anchor="middle">1</text>
          <text x="68" y="6" font-size="11" fill="#64748B" font-weight="700" text-anchor="middle">2</text>
          <text x="132" y="6" font-size="11" fill="#64748B" font-weight="700" text-anchor="middle">3</text>
          <text x="182" y="42" font-size="11" fill="#64748B" font-weight="700" text-anchor="middle">4</text>
          <text x="202" y="108" font-size="11" fill="#64748B" font-weight="700" text-anchor="middle">5</text>

          <!-- Needle -->
          <g transform="translate(100, 100) rotate(${needleAngle})">
            <line x1="0" y1="0" x2="0" y2="-68" stroke="#002B49" stroke-width="4" stroke-linecap="round" />
            <circle cx="0" cy="0" r="8" fill="#002B49" />
            <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
          </g>
        </svg>
      </div>

      <div class="gauge-score-value" style="margin-top: 4px;">${score.toFixed(1)}</div>
      <div class="gauge-score-label">/ ${maxScore.toFixed(1)}</div>
      <div style="font-size: 11px; color: #64748B; font-weight: 600; margin-top: 6px;">${countText}</div>
    </div>
  `;
}
