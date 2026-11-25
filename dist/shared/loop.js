export const LOOP_STEPS = [
  { id: 'Scan', label: 'Scan', page: 'analysis', angleDeg: -90 },
  { id: 'Match', label: 'Match', page: 'directory', angleDeg: -18 },
  { id: 'Pool', label: 'Pool', page: 'planner', angleDeg: 54 },
  { id: 'Ship', label: 'Ship', page: 'planner', angleDeg: 126 },
  { id: 'Loop', label: 'Loop', page: 'sources', angleDeg: 198 },
];

function isStepActive(activeSteps, step, index) {
  if (!activeSteps) return false;
  const list = activeSteps instanceof Set ? [...activeSteps] : Array.isArray(activeSteps) ? activeSteps : [];
  return list.some(item => {
    if (typeof item === 'number') return item === index;
    const norm = String(item).trim().toLowerCase();
    return norm === step.id.toLowerCase() || norm === step.page.toLowerCase();
  });
}

export function renderLoop(container, options = {}) {
  if (!container) return null;
  const { activeSteps = [], onStepClick, variant = 'default', compact = false } = options;
  const isCompact = compact || variant === 'compact';
  const cx = 110;
  const cy = 110;
  const r = 68;
  const btnRadiusPct = 38.5;

  const markersMarkup = LOOP_STEPS.map((step, index) => {
    const rad = (step.angleDeg * Math.PI) / 180;
    const x = (cx + r * Math.cos(rad)).toFixed(2);
    const y = (cy + r * Math.sin(rad)).toFixed(2);
    const active = isStepActive(activeSteps, step, index);
    return `<circle class="scraploop-stop-marker${active ? ' is-active' : ''}" cx="${x}" cy="${y}" r="${isCompact ? 5.5 : 4.5}" />`;
  }).join('');

  const stopsMarkup = isCompact
    ? ''
    : `<div class="scraploop-stops" role="group" aria-label="Material loop steps">${LOOP_STEPS.map((step, index) => {
        const rad = (step.angleDeg * Math.PI) / 180;
        const left = (50 + btnRadiusPct * Math.cos(rad)).toFixed(2);
        const top = (50 + btnRadiusPct * Math.sin(rad)).toFixed(2);
        const active = isStepActive(activeSteps, step, index);
        return `<button type="button" class="scraploop-stop${active ? ' is-active' : ''}" data-loop-step="${step.id}" data-loop-page="${step.page}" aria-pressed="${active ? 'true' : 'false'}" style="--stop-x:${left}%;--stop-y:${top}%">${step.label}</button>`;
      }).join('')}</div>`;

  container.innerHTML = `<div class="scraploop-diagram${isCompact ? ' scraploop-diagram--compact' : ''}">
    <svg class="scraploop-svg" viewBox="0 0 220 220" role="img" aria-label="${isCompact ? 'Loading workspace' : 'ScrapLoop 5-step circular material flow'}">
      <circle class="scraploop-ring" cx="${cx}" cy="${cy}" r="${r}" />
      <circle class="scraploop-track" cx="${cx}" cy="${cy}" r="${r - 12}" />
      ${markersMarkup}
      <text class="scraploop-center-label" x="${cx}" y="${cy}">SCRAPLOOP</text>
      <g class="scraploop-orbit">
        <circle class="scraploop-travel-dot" cx="${cx}" cy="${(cy - r).toFixed(2)}" r="${isCompact ? 6.5 : 5.5}" />
      </g>
    </svg>
    ${stopsMarkup}
  </div>`;

  if (!isCompact) {
    container.querySelectorAll('[data-loop-step]').forEach((button, index) => {
      const step = LOOP_STEPS[index];
      button.addEventListener('click', () => {
        if (typeof onStepClick === 'function') onStepClick(step, index);
      });
    });
  }

  return container.querySelector('.scraploop-diagram');
}
