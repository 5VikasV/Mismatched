export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const num=v=>new Intl.NumberFormat('en-IN',{maximumFractionDigits:6}).format(v??0);
export const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(v??0);
export const field=(name,label,value='',type='text')=>`<label class="field"><span class="field-label">${esc(label)}</span><input class="input" name="${esc(name)}" type="${type}" value="${esc(value??'')}" ${type==='number'?'step="any"':''}></label>`;
