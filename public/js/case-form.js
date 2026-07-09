// <Rebecca Member 2 Start>
// Evidence image preview + validation for the Report Scam form.
// Users can preview selected evidence files and remove one before submitting.
(() => {
  const input = document.querySelector('#images');
  const preview = document.querySelector('#image-preview');

  if (!input || !preview) return;

  const MAX_FILES = 3;
  const MAX_SIZE = 3 * 1024 * 1024;
  let selectedFiles = [];

  function syncFileInput() {
    const dataTransfer = new DataTransfer();
    selectedFiles.forEach((file) => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
  }

  function clearSelection(message) {
    if (message) alert(message);
    selectedFiles = [];
    input.value = '';
    preview.innerHTML = '';
  }

  function renderPreview() {
    preview.innerHTML = '';

    selectedFiles.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'evidence-preview-item';

      const image = document.createElement('img');
      image.src = URL.createObjectURL(file);
      image.alt = file.name;
      image.onload = () => URL.revokeObjectURL(image.src);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'image-remove-btn';
      removeButton.textContent = 'Remove';
      removeButton.setAttribute('aria-label', `Remove ${file.name}`);
      removeButton.addEventListener('click', () => {
        selectedFiles.splice(index, 1);
        syncFileInput();
        renderPreview();
      });

      const caption = document.createElement('span');
      caption.className = 'evidence-preview-name';
      caption.textContent = file.name;

      item.append(image, removeButton, caption);
      preview.appendChild(item);
    });
  }

  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);

    if (files.length > MAX_FILES) {
      clearSelection('You can upload up to 3 images only.');
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        clearSelection('Only image files are allowed.');
        return;
      }

      if (file.size > MAX_SIZE) {
        clearSelection(`${file.name} is too large. Max file size is 3MB.`);
        return;
      }
    }

    selectedFiles = files;
    renderPreview();
  });
})();
// <Rebecca Member 2 End>
