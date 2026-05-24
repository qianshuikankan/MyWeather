import { WeatherApp } from '../core.js';
import { API } from '../api.js';

/** 严重程度的颜色 */
const SEVERITY_COLORS = {
  extreme:   { bg: '#fef2f2', text: '#dc2626', badge: '#dc2626', label: '极端' },
  severe:    { bg: '#fff7ed', text: '#ea580c', badge: '#ea580c', label: '严重' },
  moderate:  { bg: '#fffbeb', text: '#ca8a04', badge: '#d97706', label: '中度' },
  minor:     { bg: '#eff6ff', text: '#2563eb', badge: '#2563eb', label: '轻度' },
  unknown:   { bg: '#f8fafc', text: '#64748b', badge: '#64748b', label: '未知' },
};

WeatherApp.register('alert', {
  name: '天气预警',

  init() {
    this.summaryEl = document.getElementById('alertSummary');
    this.badgeEl = document.getElementById('alertBadge');
    this.subEntry = document.querySelector('[data-modal="alert"]');
    this._alerts = [];
  },

  async fetch(location) {
    return API.getAlerts(location.lat, location.lon);
  },

  render(data) {
    const list = data.alerts || [];
    this._alerts = list;

    if (list.length === 0) {
      this.summaryEl.textContent = '暂无预警';
      this.badgeEl.style.display = 'none';
      // 恢复默认样式
      if (this.subEntry) {
        this.subEntry.style.background = '';
        this.subEntry.style.borderRadius = '';
        this.subEntry.style.marginTop = '';
        this.subEntry.style.marginBottom = '';
        this.subEntry.style.borderLeft = '';
        this.subEntry.querySelectorAll('.sub-entry-label, .sub-entry-summary, .sub-entry-arrow').forEach(el => {
          el.style.color = '';
        });
        const dot = this.subEntry.querySelector('.severity-dot');
        if (dot) dot.remove();
      }
      return;
    }

    this.badgeEl.style.display = '';
    this.badgeEl.textContent = list.length;

    // 按严重程度排序
    const order = { extreme: 0, severe: 1, moderate: 2, minor: 3 };
    list.sort((a, b) => (order[a.severity] ?? 99) - (order[b.severity] ?? 99));

    const worst = list[0];
    const c = SEVERITY_COLORS[worst.severity] || SEVERITY_COLORS.unknown;
    this.summaryEl.textContent = `${list.length} 条预警 · ${worst.eventType?.name || ''}`;

    // 添加彩色严重程度指示点
    let dot = this.subEntry?.querySelector('.severity-dot');
    if (!dot && this.subEntry) {
      dot = document.createElement('span');
      dot.className = 'severity-dot';
      this.subEntry.insertBefore(dot, this.summaryEl);
    }
    if (dot) {
      dot.style.cssText = `display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.badge};margin-right:6px;flex-shrink:0`;
    }

    // 主页面预警栏上色
    if (this.subEntry) {
      this.subEntry.style.background = c.bg;
      this.subEntry.style.borderRadius = 'var(--radius-sm)';
      this.subEntry.style.marginTop = '4px';
      this.subEntry.style.marginBottom = '4px';
      // 标签文字颜色
      const label = this.subEntry.querySelector('.sub-entry-label');
      if (label) label.style.color = c.text;
      this.subEntry.style.borderLeft = `4px solid ${c.badge}`;
      // 摘要文字用 badge 色
      const summary = this.subEntry.querySelector('.sub-entry-summary');
      if (summary) summary.style.color = c.badge;
      // 箭头
      const arrow = this.subEntry.querySelector('.sub-entry-arrow');
      if (arrow) arrow.style.color = c.badge;
      // 图标
      const iconSvg = this.subEntry.querySelector('.sub-icon-alert svg');
      if (iconSvg) {
        iconSvg.querySelectorAll('[stroke]').forEach(el => el.setAttribute('stroke', c.badge));
      }
    }
  },

  renderDetail() {
    if (!this._alerts.length) {
      return '<div class="empty-state"><p>当前无天气预警</p></div>';
    }

    let html = '';
    this._alerts.forEach(a => {
      const c = SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.unknown;
      const colorName = a.color?.code || a.severity || 'unknown';

      html += `
        <div style="margin-bottom:12px;border-radius:10px;overflow:hidden;border:1px solid var(--border)">
          <div style="padding:10px 14px;background:${c.bg};color:${c.text};display:flex;align-items:center;gap:8px">
            <span style="font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:4px;background:${c.badge}22;color:${c.badge}">${c.label}</span>
            <span style="font-weight:600">${a.eventType?.name || ''}</span>
            <span style="margin-left:auto;font-size:0.75rem;opacity:0.8">${a.senderName || ''}</span>
          </div>
          <div style="padding:12px 14px;background:var(--bg-card-alt)">
            <div style="font-weight:600;margin-bottom:6px;color:var(--text-primary)">${a.headline || ''}</div>
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px">${a.description || ''}</p>
            ${a.instruction ? `<div style="font-size:0.78rem;color:var(--text-muted);white-space:pre-line">${a.instruction}</div>` : ''}
            <div style="font-size:0.7rem;color:var(--text-muted);margin-top:8px;display:flex;gap:16px;flex-wrap:wrap">
              <span>发布：${a.issuedTime || ''}</span>
              <span>生效：${a.effectiveTime || ''}</span>
              <span>过期：${a.expireTime || ''}</span>
            </div>
          </div>
        </div>`;
    });

    return html;
  },

  showLoading() {
    this.summaryEl.textContent = '加载中...';
    this.badgeEl.style.display = 'none';
  },

  showError() {
    this.summaryEl.textContent = '预警加载失败';
    this.badgeEl.style.display = 'none';
  },
});
