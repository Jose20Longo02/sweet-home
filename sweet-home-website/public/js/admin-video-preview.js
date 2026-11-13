(function (window) {
  function youtubeId(url) {
    var value = String(url || '');
    var match = value.match(/youtu\.be\/([\w-]+)/)
      || value.match(/youtube(?:-nocookie)?\.com\/(?:embed|shorts|live)\/([\w-]+)/)
      || value.match(/[?&]v=([\w-]+)/);
    return match ? match[1] : '';
  }

  function vimeoParts(url) {
    var match = String(url || '').match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\w]+))?/);
    if (!match) return null;
    return { id: match[1], hash: match[2] || '' };
  }

  function embedFor(url) {
    var youtube = youtubeId(url);
    if (youtube) return 'https://www.youtube.com/embed/' + youtube + '?rel=0&modestbranding=1&playsinline=1';
    var vimeo = vimeoParts(url);
    if (!vimeo) return '';
    return 'https://player.vimeo.com/video/' + vimeo.id + '?playsinline=1' + (vimeo.hash ? '&h=' + vimeo.hash : '');
  }

  function fileSize(bytes) {
    var size = Number(bytes) || 0;
    if (size < 1024 * 1024) return Math.max(1, Math.round(size / 1024)) + ' KB';
    var mb = size / (1024 * 1024);
    return (Math.round(mb * 10) / 10) + ' MB';
  }

  function card(options) {
    var figure = document.createElement('figure');
    figure.className = 'video-card';
    var stage = document.createElement('div');
    stage.className = 'video-card-stage';
    var media;
    if (options.media === 'iframe') {
      media = document.createElement('iframe');
      media.src = options.src;
      media.title = options.title || 'Video preview';
      media.setAttribute('allow', 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      media.setAttribute('allowfullscreen', '');
    } else {
      media = document.createElement('video');
      media.src = options.src;
      media.controls = true;
      media.playsInline = true;
      media.preload = 'metadata';
    }
    stage.appendChild(media);
    if (options.removable) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'video-card-remove';
      button.setAttribute('aria-label', 'Remove video');
      button.textContent = '×';
      if (options.markExisting) button.setAttribute('data-remove-video', 'true');
      button.addEventListener('click', function (event) {
        if (!options.onRemove) return;
        event.preventDefault();
        options.onRemove();
      });
      stage.appendChild(button);
    }
    var caption = document.createElement('figcaption');
    var name = document.createElement('strong');
    name.textContent = options.title || 'Video';
    caption.appendChild(name);
    if (options.detail) {
      var detail = document.createElement('span');
      detail.textContent = options.detail;
      caption.appendChild(detail);
    }
    figure.appendChild(stage);
    figure.appendChild(caption);
    return figure;
  }

  function showFile(host, file, onRemove) {
    if (!host) return;
    host.innerHTML = '';
    if (!file) return;
    var url = URL.createObjectURL(file);
    host.appendChild(card({
      media: 'video',
      src: url,
      title: file.name,
      detail: fileSize(file.size),
      removable: true,
      onRemove: function () {
        URL.revokeObjectURL(url);
        host.innerHTML = '';
        if (onRemove) onRemove();
      }
    }));
  }

  function showSaved(host, url, title, detail) {
    if (!host) return;
    host.innerHTML = '';
    var value = String(url || '').trim();
    if (!value) return;
    var embed = embedFor(value);
    host.appendChild(card({
      media: embed ? 'iframe' : 'video',
      src: embed || value,
      title: title || 'Current video',
      detail: detail || 'Saved',
      removable: true,
      markExisting: true
    }));
  }

  function showLink(host, url) {
    if (!host) return;
    host.innerHTML = '';
    var value = String(url || '').trim();
    if (!/^https?:\/\//i.test(value)) return;
    var embed = embedFor(value);
    if (embed) {
      host.appendChild(card({ media: 'iframe', src: embed, title: 'Video link', detail: 'Preview' }));
      return;
    }
    if (/\.(mp4|mov|webm|mkv)(\?|#|$)/i.test(value)) {
      host.appendChild(card({ media: 'video', src: value, title: 'Video file', detail: 'Preview' }));
    }
  }

  window.AdminVideoPreview = {
    showFile: showFile,
    showSaved: showSaved,
    showLink: showLink,
    embedFor: embedFor
  };
})(window);
