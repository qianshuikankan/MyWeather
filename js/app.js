/* ================================================================
   app.js — 入口文件
   ================================================================
   职责：
   1. 导入所有模块（模块在 import 时自动注册到 WeatherApp）
   2. 城市搜索（输入 → 防抖 → 请求 → 选择）
   3. 主题切换
   4. 初始化 WeatherApp
   ================================================================ */

import { WeatherApp } from './core.js';
import { API } from './api.js';

/* ---- 引入所有模块（自注册）---- */
import './modules/current.js';
import './modules/hourly.js';
import './modules/daily.js';
import './modules/minutely.js';
import './modules/alert.js';
import './modules/air.js';
import './modules/index-module.js';
import './modules/astronomy.js';
import './modules/timeline.js';

/* ============================================================
   主题切换
   ============================================================ */
function initTheme() {
  const saved = localStorage.getItem('weather-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeButton(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('weather-theme', next);
  updateThemeButton(next);
}

function updateThemeButton(theme) {
  const btn = document.getElementById('themeToggle');
  btn.textContent = theme === 'dark' ? '亮色模式' : '暗色模式';
}

/* ============================================================
   城市搜索
   ============================================================ */
const searchInput = document.getElementById('searchInput');
const suggestionList = document.getElementById('suggestionList');
const headerCity = document.getElementById('headerCity');
const welcome = document.getElementById('welcome');

let debounceTimer = null;

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const val = searchInput.value.trim();
  if (!val) {
    suggestionList.classList.remove('show');
    return;
  }
  debounceTimer = setTimeout(() => searchCity(val), 300);
});

async function searchCity(keyword) {
  try {
    const cities = await API.searchCity(keyword);
    renderSuggestions(cities);
  } catch (err) {
    console.error('城市搜索失败:', err);
    suggestionList.innerHTML =
      `<li style="color:var(--text-muted);cursor:default">搜索失败，请重试</li>`;
    suggestionList.classList.add('show');
  }
}

function renderSuggestions(cities) {
  if (!cities.length) {
    suggestionList.innerHTML =
      `<li style="color:var(--text-muted);cursor:default">未找到匹配城市</li>`;
    suggestionList.classList.add('show');
    return;
  }

  suggestionList.innerHTML = cities
    .map(
      (c) =>
        `<li data-id="${c.id}" data-name="${c.name}" data-adm="${c.adm1} ${c.adm2}" data-lat="${c.lat}" data-lon="${c.lon}">
          ${c.name}
          <span class="city-adm">${c.adm1}, ${c.adm2}</span>
        </li>`
    )
    .join('');

  suggestionList.classList.add('show');
}

// 选择城市
suggestionList.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li || !li.dataset.id) return;

  const location = {
    id: li.dataset.id,
    name: li.dataset.name,
    adm: li.dataset.adm,
    lat: li.dataset.lat,
    lon: li.dataset.lon,
  };

  selectCity(location);
});

function selectCity(location) {
  // 更新 UI
  searchInput.value = location.name;
  headerCity.textContent = `${location.name}, ${location.adm}`;
  suggestionList.classList.remove('show');
  welcome.style.display = 'none';

  // 刷新所有模块
  WeatherApp.refresh(location);
}

// 输入框失焦时隐藏建议列表
searchInput.addEventListener('blur', () => {
  setTimeout(() => suggestionList.classList.remove('show'), 200);
});

// 搜索按钮点击
document.getElementById('searchBtn').addEventListener('click', () => {
  const val = searchInput.value.trim();
  if (val) searchCity(val);
});

// Enter 提交搜索
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const firstItem = suggestionList.querySelector('li[data-id]');
    if (firstItem) {
      firstItem.click();
    } else {
      // 无建议列表时直接搜索
      const val = searchInput.value.trim();
      if (val) searchCity(val);
    }
  }
});

/* ============================================================
   初始化
   ============================================================ */
async function init() {
  initTheme();

  // 初始化 API（需先设置 API_HOST）
  API.init();

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // 初始化所有模块
  await WeatherApp.init();

  console.log('[WeatherPro] 应用启动完成');
  console.log('[WeatherPro] 重要: 如果搜索失败，请在 js/api.js 中设置 API_HOST');
}

document.addEventListener('DOMContentLoaded', init);
