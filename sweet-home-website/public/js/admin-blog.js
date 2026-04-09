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

    function ensureInternalLinkStyles() {
      if (document.getElementById('internal-link-modal-styles')) return;
      var style = document.createElement('style');
      style.id = 'internal-link-modal-styles';
      style.textContent = `
        .ql-internal-link-btn {
          margin-left: 6px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          height: 24px;
          padding: 0 8px;
          font-size: 12px;
          line-height: 22px;
          background: #f8fafc;
          color: #111827;
          cursor: pointer;
        }
        .internal-link-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 12000;
        }
        .internal-link-modal__panel {
          width: min(560px, calc(100vw - 24px));
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          padding: 16px;
        }
        .internal-link-modal__panel h3 {
          margin: 0 0 10px;
          font-size: 18px;
          color: #111827;
        }
        .internal-link-modal__grid {
          display: grid;
          gap: 10px;
        }
        .internal-link-modal__grid label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
        }
        .internal-link-modal__grid input,
        .internal-link-modal__grid select {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          min-height: 38px;
          padding: 8px 10px;
          font-size: 14px;
          color: #111827;
        }
        .internal-link-modal__actions {
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .internal-link-modal__btn {
          min-height: 36px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: #fff;
          color: #111827;
          padding: 0 12px;
          font-size: 13px;
          cursor: pointer;
        }
        .internal-link-modal__btn--primary {
          background: #1f7a45;
          border-color: #1f7a45;
          color: #fff;
        }
      `;
      document.head.appendChild(style);
    }

    function openInternalLinkModal() {
      var presets = Array.isArray(window.__BLOG_INTERNAL_LINK_PRESETS__) ? window.__BLOG_INTERNAL_LINK_PRESETS__ : [];
      if (!presets.length) {
        alert('No internal link presets found. Please contact admin.');
        return;
      }
      ensureInternalLinkStyles();
      function escHtml(value) {
        return String(value || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      var range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
      var selectedText = (range.length > 0 ? quill.getText(range.index, range.length) : '').trim();

      var overlay = document.createElement('div');
      overlay.className = 'internal-link-modal';
      overlay.innerHTML = `
        <div class="internal-link-modal__panel" role="dialog" aria-modal="true" aria-label="Insert internal link preset">
          <h3>Insert Internal Link</h3>
          <div class="internal-link-modal__grid">
            <div>
              <label for="internalLinkPreset">Landing page preset</label>
              <select id="internalLinkPreset">
                ${presets.map(function (p) {
                  return '<option value="' + escHtml(String(p.key || '')) + '">' + escHtml(String(p.label || p.key || '')) + '</option>';
                }).join('')}
              </select>
            </div>
            <div>
              <label for="internalLinkLabel">Display text</label>
              <input id="internalLinkLabel" type="text" value="${escHtml(selectedText || '')}" placeholder="e.g. Explore Berlin opportunities">
            </div>
            <div>
              <label for="internalLinkStyle">Display style</label>
              <select id="internalLinkStyle">
                <option value="inline">Inline link</option>
                <option value="button">Button</option>
              </select>
            </div>
          </div>
          <div class="internal-link-modal__actions">
            <button type="button" class="internal-link-modal__btn" data-action="cancel">Cancel</button>
            <button type="button" class="internal-link-modal__btn internal-link-modal__btn--primary" data-action="insert">Insert link</button>
          </div>
        </div>
      `;

      function close() {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close();
      });

      overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
      overlay.querySelector('[data-action="insert"]').addEventListener('click', function () {
        var keyEl = overlay.querySelector('#internalLinkPreset');
        var labelEl = overlay.querySelector('#internalLinkLabel');
        var styleEl = overlay.querySelector('#internalLinkStyle');
        var key = (keyEl && keyEl.value) ? String(keyEl.value).trim() : '';
        var label = (labelEl && labelEl.value) ? String(labelEl.value).trim() : '';
        var style = (styleEl && styleEl.value) ? String(styleEl.value).trim() : 'inline';
        if (!key) return;
        if (!label) {
          alert('Please add display text for the link.');
          if (labelEl) labelEl.focus();
          return;
        }
        var token = '[[landing:' + key + '|' + label + '|' + (style === 'button' ? 'button' : 'inline') + ']]';
        quill.insertText(range.index, token, 'user');
        quill.setSelection(range.index + token.length, 0, 'silent');
        close();
      });

      document.body.appendChild(overlay);
      var labelInput = overlay.querySelector('#internalLinkLabel');
      if (labelInput) labelInput.focus();
    }

    function mountInternalLinkButton() {
      var toolbarEl = qRoot.parentNode.querySelector('.ql-toolbar');
      if (!toolbarEl || toolbarEl.querySelector('.ql-internal-link-btn')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ql-internal-link-btn';
      btn.textContent = 'Internal Link';
      btn.addEventListener('click', openInternalLinkModal);
      toolbarEl.appendChild(btn);
    }
    mountInternalLinkButton();

    var explicitBtn = document.getElementById('insertInternalLinkBtn');
    if (explicitBtn) {
      explicitBtn.addEventListener('click', openInternalLinkModal);
    }

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


