(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var platformLabels = {
    darwin: 'macOS',
    win32: 'Windows',
    android: 'Android',
    linux: 'Linux',
  };
  var platformOrder = ['darwin', 'win32', 'android', 'linux'];
  var palette = ['#5fbedc', '#f0995f', '#a27fc2', '#eddf55'];

  var state = {
    platform: detectPlatform(),
    arch: 'universal',
    apps: [],
    loading: false,
    error: '',
  };

  var apiBase = resolveApi();
  var archSelect = document.getElementById('arch');
  var platformBox = document.getElementById('platforms');
  var appsBox = document.getElementById('apps');
  var statusBox = document.getElementById('status');
  var noteBox = document.getElementById('platform-note');

  function resolveApi() {
    var override = params.get('api');
    if (override) return override.replace(/\/+$/, '');
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      if (location.port && location.port !== '3000') {
        return 'http://127.0.0.1:3000/api/v1';
      }
    }
    if (location.protocol === 'file:') return 'http://127.0.0.1:3000/api/v1';
    return '/api/v1';
  }

  function detectPlatform() {
    var ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) return 'android';
    if (/mac|iphone|ipad/.test(ua)) return 'darwin';
    if (/win/.test(ua)) return 'win32';
    return 'linux';
  }

  function el(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};
    children = children || [];
    Object.keys(props).forEach(function (key) {
      if (key === 'class') node.className = props[key];
      else if (key === 'text') node.textContent = props[key];
      else node.setAttribute(key, props[key]);
    });
    children.forEach(function (child) {
      if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else if (child) node.appendChild(child);
    });
    return node;
  }

  function colorFor(key) {
    var hash = 0;
    for (var i = 0; i < key.length; i += 1) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    return palette[hash % palette.length];
  }

  function formatSize(bytes) {
    if (!bytes) return '未知大小';
    var units = ['B', 'KB', 'MB', 'GB'];
    var index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return (bytes / Math.pow(1024, index)).toFixed(1) + ' ' + units[index];
  }

  function formatDate(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('zh-CN');
  }

  function renderPlatforms() {
    platformBox.textContent = '';
    platformOrder.forEach(function (platform) {
      var button = el('button', {
        type: 'button',
        class: platform === state.platform ? 'active' : '',
        text: platformLabels[platform],
      });
      button.addEventListener('click', function () {
        state.platform = platform;
        renderPlatforms();
        load();
      });
      platformBox.appendChild(button);
    });
  }

  function renderStatus() {
    statusBox.hidden = !state.error;
    statusBox.textContent = state.error || '';
    noteBox.hidden = state.platform !== 'darwin';
  }

  function renderApps() {
    appsBox.textContent = '';

    if (state.loading) {
      appsBox.appendChild(el('div', { class: 'empty', text: '正在加载…' }));
      return;
    }

    if (!state.apps.length) {
      appsBox.appendChild(
        el('div', { class: 'empty', text: '该平台暂无发布版本，稍后再来看看。' }),
      );
      return;
    }

    state.apps.forEach(function (app) {
      var latest = app.latest;
      var icon = el('div', {
        class: 'icon',
        style: 'background:' + colorFor(app.appKey),
      });
      if (app.iconUrl) {
        var img = el('img', { src: app.iconUrl, alt: app.name });
        icon.appendChild(img);
      } else {
        icon.textContent = (app.name || '?').trim().charAt(0).toUpperCase();
      }

      var head = el('div', { class: 'card-head' }, [
        icon,
        el('div', {}, [
          el('h3', { text: app.name }),
          el('p', {
            class: 'meta',
            text:
              (app.category || '应用') +
              ' · ' +
              (latest ? 'v' + latest.versionName : '暂无版本'),
          }),
        ]),
      ]);

      var artifacts = el('div', { class: 'artifacts' });
      (latest ? latest.artifacts : []).forEach(function (artifact) {
        var label =
          artifact.format.toUpperCase() +
          ' · ' +
          artifact.arch +
          ' · ' +
          formatSize(artifact.size);
        var link = el(
          'a',
          {
            class: 'download',
            href: artifact.downloadUrl,
            rel: 'noreferrer',
          },
          [
            el('strong', { text: '下载 ' + artifact.format.toUpperCase() }),
            el('span', { text: label }),
          ],
        );
        artifacts.appendChild(link);
      });

      var links = el('div', { class: 'links' });
      if (app.homepage) {
        links.appendChild(
          el('a', { href: app.homepage, target: '_blank', rel: 'noreferrer', text: '主页' }),
        );
      }
      if (app.repoUrl) {
        links.appendChild(
          el('a', { href: app.repoUrl, target: '_blank', rel: 'noreferrer', text: '源码' }),
        );
      }

      appsBox.appendChild(
        el('article', { class: 'card' }, [
          head,
          el('p', { class: 'desc', text: app.description || '暂无描述' }),
          artifacts,
          links,
        ]),
      );
    });
  }

  function load() {
    state.loading = true;
    state.error = '';
    renderStatus();
    renderApps();

    var url =
      apiBase +
      '/catalog?platform=' +
      encodeURIComponent(state.platform) +
      '&arch=' +
      encodeURIComponent(state.arch);

    fetch(url)
      .then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok || body.code !== 200) {
            throw new Error(body && body.message ? body.message : 'HTTP ' + response.status);
          }
          return body.data;
        });
      })
      .then(function (data) {
        state.apps = data.apps || [];
      })
      .catch(function (error) {
        state.apps = [];
        state.error = '加载失败：' + error.message;
      })
      .finally(function () {
        state.loading = false;
        renderStatus();
        renderApps();
      });
  }

  archSelect.addEventListener('change', function () {
    state.arch = archSelect.value;
    load();
  });

  document.getElementById('refresh').addEventListener('click', load);
  document.getElementById('api-label').textContent = '接口：' + apiBase;

  renderPlatforms();
  load();
})();
