// <Rebecca Member 2 Start>
// Auto-save unfinished Report Scam forms into the user's Saved Drafts.
// This improves the Member 2 draft workflow: users can type, pause, leave, and continue later.
(() => {
  const form = document.querySelector('#case-form');
  const status = document.querySelector('#draft-autosave-status');

  if (!form || !status) return;

  const createUrl = form.dataset.autosaveCreateUrl;
  let updateUrl = form.dataset.autosaveUpdateUrl;
  let draftId = form.dataset.draftId;

  if (!createUrl && !updateUrl) return;

  const fields = ['title', 'description', 'category_id', 'platform', 'scam_date']
    .map((name) => form.elements[name])
    .filter(Boolean);

  const AUTOSAVE_DELAY = 2200;
  let timer = null;
  let lastSavedSignature = '';
  let isSaving = false;

  function formPayload() {
    return {
      title: form.elements.title?.value || '',
      description: form.elements.description?.value || '',
      category_id: form.elements.category_id?.value || '',
      platform: form.elements.platform?.value || '',
      scam_date: form.elements.scam_date?.value || '',
      draft_id: draftId || ''
    };
  }

  function payloadSignature(payload) {
    return JSON.stringify(payload);
  }

  function hasTypedContent(payload) {
    return Object.entries(payload).some(([key, value]) => {
      if (key === 'draft_id') return false;
      return String(value || '').trim() !== '';
    });
  }

  function setStatus(message, state = 'idle') {
    status.textContent = message;
    status.dataset.state = state;
  }

  async function autoSaveNow() {
    const payload = formPayload();
    const signature = payloadSignature(payload);

    if (!hasTypedContent(payload)) {
      setStatus('Auto-save is ready. Start typing to create a draft.', 'idle');
      return;
    }

    if (signature === lastSavedSignature || isSaving) return;

    const endpoint = updateUrl || createUrl;
    if (!endpoint) return;

    isSaving = true;
    setStatus('Saving draft...', 'saving');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Auto-save failed');

      const result = await response.json();

      if (result.draftId) {
        draftId = String(result.draftId);
        form.dataset.draftId = draftId;
        updateUrl = `/cases/drafts/${draftId}/autosave`;
        form.dataset.autosaveUpdateUrl = updateUrl;
      }

      lastSavedSignature = payloadSignature({ ...payload, draft_id: draftId || payload.draft_id });
      const time = new Date(result.updatedAt || Date.now()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      setStatus(`Draft auto-saved at ${time}.`, 'saved');
    } catch (err) {
      console.error(err);
      setStatus('Auto-save failed. You can still click Save as Draft.', 'error');
    } finally {
      isSaving = false;
    }
  }

  function scheduleAutoSave() {
    clearTimeout(timer);
    setStatus('Unsaved changes. Auto-saving soon...', 'pending');
    timer = setTimeout(autoSaveNow, AUTOSAVE_DELAY);
  }

  fields.forEach((field) => {
    field.addEventListener('input', scheduleAutoSave);
    field.addEventListener('change', scheduleAutoSave);
  });

  form.addEventListener('submit', () => {
    clearTimeout(timer);
    setStatus('Saving form...', 'saving');
  });
})();
// <Rebecca Member 2 End>
