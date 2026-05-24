
const WeatherApp = {

  _modules: {},       // { name: { init, fetch, render, renderDetail, ... } }
  _location: null,    // 当前选中城市 { id, name, adm }
  _modalEl: null,     // Modal DOM 元素缓存

  /* ============================================================
     模块注册
     ============================================================ */
  register(name, module) {
    if (this._modules[name]) {
      console.warn(`[WeatherApp] 模块 "${name}" 已注册，将被覆盖`);
    }
    this._modules[name] = module;
    return this; 
  },

  getModule(name) {
    return this._modules[name];
  },

  /* ============================================================
     初始化，依次调用所有模块的 init()
     ============================================================ */
  async init() {
    for (const [name, mod] of Object.entries(this._modules)) {
      if (typeof mod.init === 'function') {
        try {
          await mod.init.call(mod);
        } catch (err) {
          console.error(`[${name}] init 失败:`, err);
        }
      }
    }
    this._bindModalEvents();
    console.log('[WeatherApp] 所有模块初始化完成');
  },

  /* ============================================================
     刷新，切换城市后调用，所有模块并行 fetch + render
     ============================================================ */
  async refresh(location) {
    this._location = location;

    // 显示所有 section
    document.querySelectorAll('[data-module]').forEach(el => {
      el.style.display = '';
    });

    const fetches = Object.entries(this._modules).map(async ([name, mod]) => {
      if (typeof mod.fetch !== 'function') return;
      try {
        // 每个模块显示加载状态
        if (typeof mod.showLoading === 'function') mod.showLoading();
        const data = await mod.fetch(location);
        if (typeof mod.render === 'function') {
          mod.render(data);
        }
      } catch (err) {
        console.error(`[${name}] 请求失败:`, err);
        if (typeof mod.showError === 'function') {
          mod.showError(err);
        }
      }
    });

    await Promise.allSettled(fetches);
  },

  /* ============================================================
     Modal 系统
     ============================================================ */
  openModal(content, title, onReady) {
    const overlay = document.getElementById('modalOverlay');
    const body = document.getElementById('modalBody');
    const titleEl = document.getElementById('modalTitle');

    if (typeof content === 'string') {
      body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      body.innerHTML = '';
      body.appendChild(content);
    } else if (typeof content === 'object' && content !== null) {
      // 支持 { html, onReady } 格式
      body.innerHTML = content.html || '';
      onReady = content.onReady || onReady;
    }

    if (title) titleEl.textContent = title;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // 等 Modal 过渡动画完成后执行回调
    if (typeof onReady === 'function') {
      setTimeout(onReady, 300);
    }
  },

  closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    window.dispatchEvent(new CustomEvent('weather-modal-closed'));
  },

  /* Modal 事件绑定 */
  _bindModalEvents() {
    const overlay = document.getElementById('modalOverlay');
    const closeBtn = document.getElementById('modalClose');

    // 点击 backdrop 关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });

    // 关闭按钮
    closeBtn.addEventListener('click', () => this.closeModal());

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        this.closeModal();
      }
    });

    // 所有 [data-modal] 点击 → 打开对应模块详情
    document.addEventListener('click', async (e) => {
      const trigger = e.target.closest('[data-modal]');
      if (!trigger) return;

      const moduleName = trigger.dataset.modal;
      const mod = this.getModule(moduleName);
      if (mod && typeof mod.renderDetail === 'function') {
        const content = await mod.renderDetail();
        if (content) this.openModal(content, mod.name || moduleName);
      } else {
        this.openModal(
          '<div class="empty-state"><p>该功能尚未实现</p></div>',
          mod?.name || moduleName
        );
      }
    });
  },

  /* ============================================================
     工具方法
     ============================================================ */
  getLocation() {
    return this._location;
  },

  /* DOM 快捷查询 */
  $(sel) {
    return document.querySelector(sel);
  },

  $$(sel) {
    return document.querySelectorAll(sel);
  },

  /* 渲染骨架屏 loading */
  renderLoading(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="loading-pulse">
        <div class="pulse-row"></div>
        <div class="pulse-row"></div>
        <div class="pulse-row"></div>
      </div>`;
  },

  /* 渲染错误状态 */
  renderError(containerId, msg, retryFn) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="error-state">
        <p class="error-msg">${msg || '数据加载失败'}</p>
        <button class="btn-retry">重试</button>
      </div>`;
    el.querySelector('.btn-retry')?.addEventListener('click', retryFn);
  },
};


/* ================================================================
   导出
   ================================================================ */
export { WeatherApp };
