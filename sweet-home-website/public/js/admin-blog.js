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
        // Clear any previous error
        var errorMsg = document.querySelector('.file-error');
        if (errorMsg) errorMsg.remove();
        return;
      }
      
      // Validate file type
      var validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
      var fileType = file.type.toLowerCase();
      var fileExt = file.name.split('.').pop().toLowerCase();
      var isValidType = validTypes.includes(fileType) || ['heic', 'heif'].includes(fileExt);
      
      if (!isValidType) {
        var errorDiv = document.createElement('div');
        errorDiv.className = 'file-error';
        errorDiv.style.cssText = 'color: #dc2626; font-size: 0.875rem; margin-top: 0.5rem; padding: 0.5rem; background: #fee2e2; border-radius: 4px;';
        errorDiv.textContent = 'Invalid file type. Only JPEG, PNG, WebP, HEIC, and HEIF images are supported.';
        input.parentNode.appendChild(errorDiv);
        input.value = '';
        if (preview) { preview.style.display = 'none'; preview.src = ''; }
        if (placeholder) { placeholder.style.display = 'block'; }
        return;
      }
      
      // Validate file size (20 MB limit)
      var maxSize = 20 * 1024 * 1024; // 20 MB
      if (file.size > maxSize) {
        var errorDiv = document.createElement('div');
        errorDiv.className = 'file-error';
        errorDiv.style.cssText = 'color: #dc2626; font-size: 0.875rem; margin-top: 0.5rem; padding: 0.5rem; background: #fee2e2; border-radius: 4px;';
        errorDiv.innerHTML = 'File too large. Maximum file size is 20 MB. Please compress or resize your image. <a href="https://www.iloveimg.com/compress-image" target="_blank" style="color: #0066cc; text-decoration: underline;">Use an online compressor</a>.';
        input.parentNode.appendChild(errorDiv);
        input.value = '';
        if (preview) { preview.style.display = 'none'; preview.src = ''; }
        if (placeholder) { placeholder.style.display = 'block'; }
        return;
      }
      
      // Clear any previous error
      var errorMsg = document.querySelector('.file-error');
      if (errorMsg) errorMsg.remove();
      
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
      [{ 'header': [2, 3, 4, 5, 6, false] }], // Only H2-H6 (H1 is used automatically for the post title)
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
      form.addEventListener('submit', function(e) {
        if (isSubmitting) {
          e.preventDefault();
          return false;
        }
        
        // Validate title if it's a create form
        var titleInput = form.querySelector('input[name="title"]');
        if (titleInput && !titleInput.value.trim()) {
          e.preventDefault();
          alert('Please enter a title for your blog post.');
          titleInput.focus();
          return false;
        }
        
        // Validate file if cover image is selected
        var coverInput = form.querySelector('input[name="cover"]');
        if (coverInput && coverInput.files && coverInput.files[0]) {
          var file = coverInput.files[0];
          var maxSize = 20 * 1024 * 1024; // 20 MB
          if (file.size > maxSize) {
            e.preventDefault();
            alert('File too large. Maximum file size is 20 MB. Please compress or resize your image before uploading.');
            return false;
          }
        }
        
        if (!form.checkValidity()) {
          e.preventDefault();
          return false;
        }
        
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


