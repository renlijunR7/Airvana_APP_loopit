(function () {
  'use strict';

  var references = window.AirvanaScreenshotReferences;
  var error = document.getElementById('gallery-error');
  if (!references || typeof references.list !== 'function') {
    error.hidden = false;
    document.getElementById('gallery-selected-title').textContent = '截图未能载入';
    return;
  }

  var items = references.list();
  if (!items.length) {
    error.hidden = false;
    return;
  }
  var params = new URLSearchParams(window.location.search);
  var initialKey = params.get('game');
  var selected = items.findIndex(function (item) { return item.key === initialKey; });
  if (selected < 0) selected = 0;
  var imageIndex = 0;
  var full = params.get('view') === 'full' || params.get('full') === '1';
  var frame = null;
  var gameNav = document.getElementById('gallery-game-nav');
  var imageNav = document.getElementById('gallery-image-nav');
  var stage = document.getElementById('gallery-stage');
  var coreButton = document.getElementById('gallery-core');
  var fullButton = document.getElementById('gallery-full');
  var currentImageCount = 0;

  items.forEach(function (item, index) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.title;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', function () { select(index); });
    gameNav.appendChild(button);
  });

  function updateURL() {
    var url = new URL(window.location.href);
    url.searchParams.set('game', items[selected].key);
    url.searchParams.delete('full');
    if (full) url.searchParams.set('view', 'full');
    else url.searchParams.delete('view');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  function renderImageNav(item) {
    var count = item.images.length;
    if (count !== currentImageCount) {
      imageNav.replaceChildren();
      for (var i = 0; i < count; i++) {
        (function (index) {
          var button = document.createElement('button');
          button.type = 'button';
          button.textContent = '截图 ' + (index + 1);
          button.addEventListener('click', function () {
            imageIndex = index;
            render();
          });
          imageNav.appendChild(button);
        })(i);
      }
      currentImageCount = count;
    }
    imageNav.hidden = count < 2;
    Array.prototype.forEach.call(imageNav.children, function (button, index) {
      button.setAttribute('aria-pressed', String(index === imageIndex));
    });
  }

  function render() {
    var item = items[selected];
    error.hidden = true;
    document.title = item.title + ' · 原图展示 · Airvana';
    document.getElementById('gallery-selected-title').textContent = item.title;
    document.getElementById('gallery-position').textContent = (selected + 1) + ' / ' + items.length;
    document.getElementById('gallery-view-note').textContent = full
      ? '展示你上传的完整截图，包含原图外围和界面。'
      : '仅裁去截图外围，画面内素材保持原样。';
    document.getElementById('gallery-interactive-link').href = '/reference-arcade.html?game=' + encodeURIComponent(item.key);
    coreButton.setAttribute('aria-pressed', String(!full));
    fullButton.setAttribute('aria-pressed', String(full));
    Array.prototype.forEach.call(gameNav.children, function (button, index) {
      button.setAttribute('aria-pressed', String(index === selected));
    });
    renderImageNav(item);
    try {
      if (!frame) {
        frame = references.createFrame(item.key, imageIndex, { full: full });
        stage.replaceChildren(frame);
      } else {
        references.applyFrame(frame, item.key, imageIndex, { full: full });
      }
      var image = frame.querySelector('img');
      if (image) {
        image.addEventListener('error', function () { error.hidden = false; }, { once: true });
        image.addEventListener('load', function () { error.hidden = true; }, { once: true });
        if (image.complete && !image.naturalWidth) error.hidden = false;
      }
    } catch (problem) {
      error.hidden = false;
    }
    updateURL();
  }

  function select(index) {
    selected = (index + items.length) % items.length;
    imageIndex = 0;
    render();
    var active = gameNav.children[selected];
    if (active) {
      var left = active.offsetLeft - gameNav.offsetLeft;
      if (left < gameNav.scrollLeft) gameNav.scrollLeft = left;
      else if (left + active.offsetWidth > gameNav.scrollLeft + gameNav.clientWidth) {
        gameNav.scrollLeft = left + active.offsetWidth - gameNav.clientWidth;
      }
    }
  }

  coreButton.addEventListener('click', function () { full = false; render(); });
  fullButton.addEventListener('click', function () { full = true; render(); });
  document.getElementById('gallery-previous').addEventListener('click', function () { select(selected - 1); });
  document.getElementById('gallery-next').addEventListener('click', function () { select(selected + 1); });
  window.addEventListener('popstate', function () {
    var search = new URLSearchParams(window.location.search);
    var index = items.findIndex(function (item) { return item.key === search.get('game'); });
    full = search.get('view') === 'full' || search.get('full') === '1';
    select(index < 0 ? 0 : index);
  });
  select(selected);
})();
