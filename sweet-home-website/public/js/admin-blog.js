document.addEventListener('DOMContentLoaded', function () {
  var input = document.getElementById('cover');
  var preview = document.getElementById('coverPreview');
  var placeholder = document.getElementById('coverPlaceholder');
  if (input) {
    input.addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) {
        if (preview) { preview.style.display = 'none'; preview.src = ''; }
        if (placeholder) { placeholder.style.display = 'block'; }
        return;
      }
      var url = URL.createObjectURL(file);
      if (preview) {
        preview.src = url;
        preview.onload = function () { URL.revokeObjectURL(url); };
        preview.style.display = 'block';
      }
      if (placeholder) { placeholder.style.display = 'none'; }
    });
  }

  // Rich text editor (Quill) initialization if present
  var qRoot = document.getElementById('editor');
  var qInput = document.getElementById('content');
  if (qRoot && window.Quill) {
    var toolbarOptions = [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ];
    var quill = new Quill('#editor', {
      theme: 'snow',
      placeholder: 'Write your article here...',
      modules: {
        toolbar: toolbarOptions
      }
    });

    // Show editor, hide textarea
    try { qRoot.style.display = ''; } catch (e) {}
    if (qInput && qInput.value) { quill.clipboard.dangerouslyPasteHTML(qInput.value); }
    if (qInput) { qInput.style.display = 'none'; }

    // On submit, copy HTML back to textarea
    var form = qInput && qInput.form;
    if (form) {
      form.addEventListener('submit', function () {
        qInput.value = quill.root.innerHTML;
      });
    }

    // Handle image uploads
    var toolbar = quill.getModule('toolbar');
    if (toolbar) {
      toolbar.addHandler('image', function () {
        var fileInput = document.createElement('input');
        fileInput.setAttribute('type', 'file');
        fileInput.setAttribute('accept', 'image/*');
        fileInput.onchange = function () {
          var file = fileInput.files && fileInput.files[0];
          if (!file) return;
          var formData = new FormData();
          formData.append('image', file);
          // Send current title so server can place image under blog/<provisional-slug>
          var titleInput = document.querySelector('input[name="title"]');
          if (titleInput && titleInput.value) {
            formData.append('title', titleInput.value);
          }
          // CSRF token
          var csrfEl = document.querySelector('input[name="_csrf"]');
          var csrf = csrfEl ? csrfEl.value : '';
          fetch('/admin/dashboard/blog/api/inline-image', {
            method: 'POST',
            headers: { 'x-csrf-token': csrf },
            body: formData
          }).then(function (res) { return res.json(); }).then(function (data) {
            if (data && data.url) {
              var range = quill.getSelection(true);
              quill.insertEmbed(range.index, 'image', data.url, 'user');
              quill.setSelection(range.index + 1);
            }
          }).catch(function (e) { console.error('Upload failed', e); });
        };
        fileInput.click();
      });
    }
  }

  // Prevent double submit and show uploading overlay for forms
  (function lockWhileUploading(){
    const forms = document.querySelectorAll('form[method="post"]');
    forms.forEach(form => {
      let isSubmitting = false;
      form.addEventListener('submit', function() {
        if (isSubmitting) return false;
        if (!form.checkValidity()) { return true; }
        isSubmitting = true;
        
        const overlay = document.getElementById('uploadOverlay');
        if (overlay) { 
          overlay.hidden = false; 
          overlay.style.display = 'flex'; 
        }
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.dataset.originalText = submitBtn.textContent || '';
          
          // Different text based on form action
          if (form.action.includes('/delete')) {
            submitBtn.textContent = 'Deleting...';
            if (overlay) {
              const title = overlay.querySelector('.upload-title');
              if (title) title.textContent = 'Deleting Post...';
            }
          } else if (form.action.includes('/edit') || form.action.includes('/update')) {
            submitBtn.textContent = 'Saving...';
            if (overlay) {
              const title = overlay.querySelector('.upload-title');
              if (title) title.textContent = 'Saving Changes...';
            }
          } else {
            submitBtn.textContent = 'Creating...';
            if (overlay) {
              const title = overlay.querySelector('.upload-title');
              if (title) title.textContent = 'Creating Post...';
            }
          }
        }
      }, { capture: true });
    });
  })();
});


