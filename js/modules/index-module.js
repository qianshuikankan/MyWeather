import { WeatherApp } from '../core.js';
import { API } from '../api.js';

WeatherApp.register('index', {
  name: '生活指数',

  init() {
    this.container = document.getElementById('indexContainer');
    this._allData = [];
    this._currentIndices = [];
    this.SHOW_COUNT = 5;
  },

  async fetch(location) {
    return API.getIndices(location.id, 0);
  },

  render(data) {
    const list = data.daily || [];
    this._allData = list;

    // 在 section-header 中放置按钮
    const section = document.getElementById('sec-index');
    const header = section?.querySelector('.section-header');
    if (header) {
      header.innerHTML = `
        <h2 class="section-title">生活指数</h2>
        <div class="header-actions">
          <button class="btn-index" id="btnShuffle">换一批</button>
          <button class="btn-detail" data-modal="index">查看全部</button>
        </div>`;
    }

    this._grid = this.container;
    this._grid.innerHTML = '';

    this._shuffleBtn = document.getElementById('btnShuffle');
    this._pickRandom();

    this._shuffleBtn?.addEventListener('click', () => {
      this._pickRandom(true);
    });
  },

  _pickRandom(forceDifferent = false) {
    const total = this._allData.length;
    if (total === 0) return;
    const n = Math.min(this.SHOW_COUNT, total);

    let pick;
    if (total <= n) {
      pick = Array.from({ length: total }, (_, i) => i);
    } else if (forceDifferent && total > n) {
      do {
        pick = this._shuffleIndices(total, n);
      } while (this._arraysEqual(pick, this._currentIndices));
    } else {
      pick = this._shuffleIndices(total, n);
    }

    this._currentIndices = pick;
    this._renderGrid(pick);
  },

  _renderGrid(indices) {
    const nameMap = {
      '空气污染扩散条件指数': '空气污染扩散指数',
    };
    let html = '';
    indices.forEach(i => {
      const idx = this._allData[i];
      const displayName = nameMap[idx.name] || idx.name;
      html += `
        <div class="index-card">
          <div class="idx-name">${displayName}</div>
          <div class="idx-num">${idx.level || '--'}</div>
          <div class="idx-level">${idx.category || '--'}</div>
        </div>`;
    });
    this._grid.innerHTML = html;
  },

  _shuffleIndices(total, n) {
    const arr = Array.from({ length: total }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, n);
  },

  _arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    const sa = [...a].sort(), sb = [...b].sort();
    return sa.every((v, i) => v === sb[i]);
  },

  renderDetail() {
    const nameMap = {
      '空气污染扩散条件指数': '空气污染扩散指数',
    };
    let html = '<div class="index-grid">';
    this._allData.forEach(idx => {
      const displayName = nameMap[idx.name] || idx.name;
      html += `
        <div class="index-card">
          <div class="idx-name">${displayName}</div>
          <div class="idx-num">${idx.level || '--'}</div>
          <div class="idx-level">${idx.category || '--'}</div>
        </div>`;
    });
    html += '</div>';
    return html;
  },

  showLoading() {
    this.container.innerHTML = '<div class="loading-pulse"><div class="pulse-row"></div></div>';
  },
});
