// <Rebecca Member 2 Start>
// Simple image preview + validation for the CaseForm/ImageUploader UI.
(() => {
  const input = document.querySelector('#images');
  const preview = document.querySelector('#image-preview');

  if (!input || !preview) return;

  input.addEventListener('change', () => {
    preview.innerHTML = '';

    const files = Array.from(input.files || []);

    if (files.length > 3) {
      alert('You can upload up to 3 images only.');
      input.value = '';
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert('Only image files are allowed.');
        input.value = '';
        preview.innerHTML = '';
        return;
      }

      if (file.size > 3 * 1024 * 1024) {
        alert(`${file.name} is too large. Max file size is 3MB.`);
        input.value = '';
        preview.innerHTML = '';
        return;
      }

      const image = document.createElement('img');
      image.src = URL.createObjectURL(file);
      image.alt = file.name;
      image.onload = () => URL.revokeObjectURL(image.src);
      preview.appendChild(image);
    }
  });
})();
// <Rebecca Member 2 End>
