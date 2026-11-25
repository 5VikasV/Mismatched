export const CONFIDENCE_THRESHOLD = 0.7;
export const CONFIDENCE_FIELDS = ['material', 'grade', 'quantityKg', 'pricePerKg'];

const FIELD_ALIASES = {
  material: ['material'],
  grade: ['grade'],
  quantityKg: ['quantityKg', 'quantity'],
  pricePerKg: ['pricePerKg', 'price'],
};

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function getFieldConfidence(suggestions, fieldName) {
  const keys = FIELD_ALIASES[fieldName];
  if (!keys || !suggestions || typeof suggestions !== 'object') return null;
  const map = suggestions.confidence && typeof suggestions.confidence === 'object' ? suggestions.confidence : {};
  let raw;
  for (const key of keys) {
    if (map[key] !== undefined) { raw = map[key]; break; }
    if (suggestions[`${key}Confidence`] !== undefined) { raw = suggestions[`${key}Confidence`]; break; }
  }
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0 || raw > 1) return null;
  return Math.round(raw * 1000) / 1000;
}

export function needsLabTest(score) {
  return typeof score === 'number' && Number.isFinite(score) && score >= 0 && score < CONFIDENCE_THRESHOLD;
}

export function renderFieldConfidence(fieldName, label, suggestions) {
  const score = getFieldConfidence(suggestions, fieldName);
  if (score === null) return '';
  const pct = Math.round(score * 100);
  const low = needsLabTest(score);
  return `<span class="field-confidence" data-confidence-for="${esc(fieldName)}" data-confidence="${score}">` +
    `<span class="confidence-bar${low ? ' confidence-bar--low' : ''}" data-confidence-bar="${esc(fieldName)}" role="meter" aria-label="${esc(label)} confidence ${pct}%" aria-valuemin="0" aria-valuemax="1" aria-valuenow="${score}">` +
      `<span class="confidence-bar-fill" style="width:${pct}%"></span>` +
    `</span>` +
    `<span class="confidence-score">${pct}%</span>` +
    (low ? `<span class="badge amber needs-lab-test" data-needs-lab-test="${esc(fieldName)}">Needs lab test</span>` : '') +
  `</span>`;
}
