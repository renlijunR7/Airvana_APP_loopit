export const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

export function createDialogManager(modalRoot) {
  let activeCleanup = null;

  function openDialog({ title, message = '', contentHtml = '', fields = [], confirmText = '确认', cancelText = '取消', danger = false, wide = false, onMount = null }) {
    if (activeCleanup) activeCleanup(null);
    const previousFocus = document.activeElement;
    return new Promise(resolve => {
      const e = escapeHtml;
      modalRoot.innerHTML = `<div class="modal-backdrop" role="presentation"><form class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-description"><h2 id="modal-title">${e(title)}</h2>${message ? `<p id="modal-description">${e(message)}</p>` : '<span id="modal-description" class="sr-only">对话框</span>'}${contentHtml ? `<div class="modal-content">${contentHtml}</div>` : ''}<div class="modal-fields">${fields.map(field => `<div class="field"><label for="modal-${e(field.name)}">${e(field.label)}</label>${field.hint ? `<span class="field-hint">${e(field.hint)}</span>` : ''}${field.type === 'select' ? `<select id="modal-${e(field.name)}" name="${e(field.name)}" ${field.required ? 'required' : ''} ${field.readonly ? 'disabled' : ''}>${(field.options || []).map(option => `<option value="${e(option.value)}" ${String(option.value) === String(field.value ?? '') ? 'selected' : ''}>${e(option.label)}</option>`).join('')}</select>` : field.type === 'textarea' ? `<textarea id="modal-${e(field.name)}" name="${e(field.name)}" ${field.required ? 'required' : ''} ${field.readonly ? 'readonly' : ''}>${e(field.value || '')}</textarea>` : `<input id="modal-${e(field.name)}" name="${e(field.name)}" type="${e(field.type || 'text')}" value="${e(field.value || '')}" ${field.required ? 'required' : ''} ${field.readonly ? 'readonly' : ''}>`}</div>`).join('')}</div><div class="modal-actions">${cancelText ? `<button type="button" class="btn ghost" data-modal-cancel>${e(cancelText)}</button>` : ''}<button class="btn ${danger ? 'danger' : 'primary'}">${e(confirmText)}</button></div></form></div>`;
      const form = modalRoot.querySelector('form');
      const backdrop = modalRoot.querySelector('.modal-backdrop');
      const focusableSelector = 'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]';
      let done = false;
      const close = value => {
        if (done) return;
        done = true;
        document.removeEventListener('keydown', onKeydown);
        modalRoot.innerHTML = '';
        activeCleanup = null;
        if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
        resolve(value);
      };
      const onKeydown = event => {
        if (event.key === 'Escape') { event.preventDefault(); close(null); return; }
        if (event.key !== 'Tab') return;
        const focusable = [...form.querySelectorAll(focusableSelector)];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      };
      activeCleanup = close;
      document.addEventListener('keydown', onKeydown);
      modalRoot.querySelector('[data-modal-cancel]')?.addEventListener('click', () => close(null));
      backdrop.addEventListener('click', event => { if (event.target === backdrop) close(null); });
      form.addEventListener('submit', event => { event.preventDefault(); close(Object.fromEntries(new FormData(form))); });
      if (typeof onMount === 'function') onMount(form);
      (form.querySelector('input:not([readonly]),textarea:not([readonly]),select:not([disabled])') || form.querySelector(focusableSelector))?.focus();
    });
  }

  return { openDialog };
}

export function campaignWindowState(campaign, now = new Date()) {
  if (campaign.status !== 'active') return { open: false, reason: `Campaign ${campaign.status === 'paused' ? '已暂停' : '未开放'}` };
  if (new Date(campaign.startsAt) > now) return { open: false, reason: '尚未开始' };
  if (new Date(campaign.endsAt) < now) return { open: false, reason: '已超过交付截止时间' };
  return { open: true, reason: '开放中' };
}

export function downloadCsv(filename, rows) {
  const cell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = `\ufeff${rows.map(row => row.map(cell).join(',')).join('\n')}`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = filename;
  document.body.append(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

export function splitList(value) {
  return String(value || '').split(/[\n,]/).map(item => item.trim()).filter(Boolean);
}
