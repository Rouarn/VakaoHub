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
  var iconMap = {
    vakaohub: './assets/icons/vakaohub.png',
    wiredeck: './assets/icons/wiredeck.png',
    dianmo: './assets/icons/dianmo.png',
  };
  var palette = ['#5fbedc', '#f0995f', '#a27fc2', '#eddf55'];

  var state = {
    platform: detectPlatform(),
    arch: 'universal',
    apps: [],
    totalApps: 0,
    totalPlatforms: 0,
    loading: false,
    error: '',
    query: '',
  };

  var apiBase = resolveApi();
  var archSelect = document.getElementById('arch');
  var platformBox = document.getElementById('platforms');
  var appsBox = document.getElementById('apps-grid');
  var statusBox = document.getElementById('status');
  var noteBox = document.getElementById('platform-note');
  var searchInput = document.getElementById('search');

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
    for (var index = 0; index < key.length; index += 1) {
      hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
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
        renderStatus();
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

  function iconFor(app) {
    var source = app.iconUrl || iconMap[app.appKey] || '';
    if (!source) {
      var fallback = el('div', {
        class: 'app-icon',
        style: 'background:' + colorFor(app.appKey),
      });
      fallback.textContent = (app.name || '?').trim().charAt(0).toUpperCase();
      return fallback;
    }

    var box = el('div', { class: 'app-icon' });
    box.appendChild(el('img', { src: source, alt: app.name, loading: 'lazy' }));
    return box;
  }

  function matchesQuery(app) {
    if (!state.query) return true;
    var value = state.query.toLowerCase();
    return (
      (app.name || '').toLowerCase().indexOf(value) >= 0 ||
      (app.appKey || '').toLowerCase().indexOf(value) >= 0 ||
      (app.description || '').toLowerCase().indexOf(value) >= 0
    );
  }

  function renderApps() {
    appsBox.textContent = '';

    if (state.loading) {
      appsBox.appendChild(el('div', { class: 'empty', text: '正在读取软件目录…' }));
      return;
    }

    var visible = state.apps.filter(matchesQuery);
    if (!visible.length) {
      appsBox.appendChild(
        el('div', {
          class: 'empty',
          text: state.query ? '没有匹配的软件。' : '该平台暂无发布版本。',
        }),
      );
      return;
    }

    visible.forEach(function (app) {
      var latest = app.latest;
      var icon = iconFor(app);

      var title = el('div', { class: 'app-title' }, [
        el('h3', { text: app.name }),
        el('p', {
          text: (app.category || 'application') + ' / ' + (app.appKey || ''),
        }),
      ]);

      var version = el('div', { class: 'app-version' }, [
        el('strong', { text: latest ? 'v' + latest.versionName : '—' }),
        el('span', {
          text: latest && latest.publishedAt ? formatDate(latest.publishedAt) : '',
        }),
      ]);

      var downloads = el('div', { class: 'app-downloads' });
      (latest ? latest.artifacts : []).forEach(function (artifact) {
        var label =
          artifact.format.toUpperCase() +
          ' · ' +
          artifact.arch +
          ' · ' +
          formatSize(artifact.size);
        downloads.appendChild(
          el(
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
          ),
        );
      });

      var links = el('div', { class: 'app-links' });
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
        el('article', { class: 'app-card' }, [
          el('div', { class: 'app-head' }, [icon, title, version]),
          el('p', { class: 'app-desc', text: app.description || '暂无描述' }),
          downloads,
          links,
        ]),
      );
    });
  }

  var PLATFORM_LABELS = {
    android: 'Android',
    darwin: 'macOS',
    win32: 'Windows',
    linux: 'Linux',
  };

  function platformLabel(platform) {
    return PLATFORM_LABELS[platform] || platform || '桌面';
  }

  function archLabel(platform, arch) {
    if (!arch) return 'Universal';
    if (arch === 'universal') return 'Universal';
    if (arch === 'arm64') return platform === 'darwin' ? 'Apple Silicon' : 'arm64';
    if (arch === 'x64') return platform === 'darwin' ? 'Intel' : 'x64';
    return arch;
  }

  function updateHero() {
    var isAndroid = state.platform === 'android';
    var target = state.apps.filter(function (app) {
      return app.latest && app.latest.artifacts.length &&
        (isAndroid || app.appKey === 'vakaohub');
    })[0];
    if (!target) return;

    var artifact = target.latest.artifacts[0];
    var link = document.getElementById('hero-download');
    if (link && artifact) link.href = artifact.downloadUrl;

    var label = document.getElementById('hero-download-label');
    if (label && artifact) {
      label.textContent = '下载 ' + platformLabel(artifact.platform) + ' 版';
    }

    var version = document.getElementById('hero-version');
    if (version) version.textContent = 'v' + target.latest.versionName;

    var platform = document.getElementById('hero-platform');
    if (platform && artifact) {
      platform.textContent =
        platformLabel(artifact.platform) +
        ' · ' +
        archLabel(artifact.platform, artifact.arch) +
        ' · ' +
        artifact.format.toUpperCase();
    }
  }

  function updateStats() {
    var count = state.totalApps || state.apps.length;
    var stat = document.getElementById('stat-apps');
    if (stat) stat.textContent = String(count).padStart(2, '0');
    var summary = document.getElementById('float-summary');
    if (summary && state.totalApps) {
      summary.textContent = state.totalApps + ' apps · ' + state.totalPlatforms + ' platforms';
    }
  }

  async function loadTotals() {
    var platforms = ['darwin', 'win32', 'android', 'linux'];
    try {
      var bodies = await Promise.all(
        platforms.map(function (platform) {
          return fetch(
            apiBase + '/catalog?platform=' + platform + '&arch=universal',
          ).then(function (response) {
            return response.json();
          });
        }),
      );
      var keys = new Set();
      var active = 0;
      bodies.forEach(function (body) {
        var apps = body && body.data && body.data.apps ? body.data.apps : [];
        if (apps.length) active += 1;
        apps.forEach(function (app) {
          keys.add(app.appKey);
        });
      });
      state.totalApps = keys.size;
      state.totalPlatforms = active;
      updateStats();
    } catch {
      /* keep current-platform count */
    }
  }

  var activeRequest = null;

  function load() {
    // 切换平台/架构时取消上一次请求，避免慢响应覆盖新数据
    if (activeRequest) activeRequest.abort();
    var controller = new AbortController();
    activeRequest = controller;

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

    fetch(url, { signal: controller.signal })
      .then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok || body.code !== 200) {
            throw new Error(body && body.message ? body.message : 'HTTP ' + response.status);
          }
          return body.data;
        });
      })
      .then(function (data) {
        if (activeRequest !== controller) return;
        state.apps = data.apps || [];
        updateHero();
        updateStats();
      })
      .catch(function (error) {
        if (error && error.name === 'AbortError') return;
        if (activeRequest !== controller) return;
        state.apps = [];
        state.error = '加载失败：' + error.message;
      })
      .finally(function () {
        if (activeRequest !== controller) return;
        activeRequest = null;
        state.loading = false;
        renderStatus();
        renderApps();
      });
  }

  archSelect.addEventListener('change', function () {
    state.arch = archSelect.value;
    load();
  });

  searchInput.addEventListener('input', function () {
    state.query = searchInput.value.trim();
    renderApps();
  });

  document.getElementById('refresh').addEventListener('click', load);
  document.getElementById('api-label').textContent = apiBase;

  renderPlatforms();
  renderStatus();
  load();
  loadTotals();
})();
