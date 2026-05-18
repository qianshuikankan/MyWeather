import { WeatherApp } from '../core.js';
import { API, ICON_URL } from '../api.js';

WeatherApp.register('daily', {
  name: '逐天预报',

  init() {
    this.container = document.getElementById('dailyContainer');
    this._data7d = null;
    this._data15d = null;
  },

  async fetch(location) {
    // 同时取 7d 和 15d 数据
    const [r7, r15] = await Promise.allSettled([
      API.getDailyForecast(location.id, 7),
      API.getDailyForecast15d(location.id),
    ]);
    if (r7.status === 'fulfilled') this._data7d = r7.value.daily || [];
    if (r15.status === 'fulfilled') this._data15d = r15.value.daily || [];
    return r7.status === 'fulfilled' ? r7.value : null;
  },

  render(data) {
    const list = this._data7d;
    if (!list) return;
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    let html = '<div class="daily-scroll"><div class="daily-track">';

    list.forEach((d, i) => {
      const date = new Date(d.fxDate);
      const dayName = i === 0 ? '今天' : i === 1 ? '明天' : days[date.getDay()];
      html += `
        <div class="daily-card">
          <div class="dc-day">${dayName}</div>
          <div class="dc-date">${d.fxDate.slice(5)}</div>
          <img class="dc-icon" src="${ICON_URL}/${d.iconDay}.svg" alt="${d.textDay}">
          <div class="dc-temps">
            <span class="dc-high">${d.tempMax}°</span>
            <span class="dc-low">${d.tempMin}°</span>
          </div>
          <div class="dc-wind">${d.windDirDay || ''} ${d.windScaleDay || ''}级</div>
        </div>`;
    });

    html += '</div></div>';
    this.container.innerHTML = html;
  },

  renderDetail() {
    const list = this._data15d || this._data7d;
    if (!list || !list.length) {
      return '<div class="empty-state"><p>暂无数据</p></div>';
    }

    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const xLabels = list.map(d => d.fxDate.slice(5));
    const highs = list.map(d => parseInt(d.tempMax));
    const lows = list.map(d => parseInt(d.tempMin));

    // 卡片 HTML（横向滚动）
    const cardsHtml = list.map((d, i) => {
      const date = new Date(d.fxDate);
      const dayName = i === 0 ? '今天' : i === 1 ? '明天' : days[date.getDay()];
      return `
        <div class="daily-card" style="width:110px;flex-shrink:0">
          <div class="dc-day">${dayName}</div>
          <div class="dc-date">${d.fxDate.slice(5)}</div>
          <img class="dc-icon" src="${ICON_URL}/${d.iconDay}.svg" alt="${d.textDay}" style="width:32px;height:32px">
          <div class="dc-temps">
            <span class="dc-high">${d.tempMax}°</span>
            <span class="dc-low">${d.tempMin}°</span>
          </div>
          <div class="dc-wind">${d.windDirDay || ''} ${d.windScaleDay || ''}级</div>
        </div>`;
    }).join('');

    // 天气图标标记（暗色模式不用图片图标，改用圆点）
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const iconMarkers = isDark ? [] : list.map((d, i) => ({
      coord: [i, highs[i]],
      symbol: `image://${ICON_URL}/${d.iconDay}.svg`,
      symbolSize: 26,
    }));

    return {
      html: `
        <div style="overflow-x:auto;padding-bottom:6px;margin-bottom:12px">
          <div style="display:flex;gap:6px;min-width:max-content">${cardsHtml}</div>
        </div>
        <div id="dailyDetailChart" style="width:100%;height:380px"></div>`,
      onReady: () => {
        if (typeof echarts === 'undefined') return;
        const chart = echarts.init(document.getElementById('dailyDetailChart'));
        chart.setOption({
          tooltip: {
            trigger: 'axis',
            formatter: params => {
              const i = params[0].dataIndex;
              const d = list[i];
              let s = `<strong>${d.fxDate}</strong><br/>
                <img src="${ICON_URL}/${d.iconDay}.svg" style="width:24px;height:24px;vertical-align:middle"> ${d.textDay}<br/>
                <span style="color:#ef4444">● 最高 ${highs[i]}°</span><br/>
                <span style="color:#3b82f6">● 最低 ${lows[i]}°</span>`;
              if (d.windDirDay) s += `<br/>🍃 白天 ${d.windDirDay} ${d.windScaleDay}级`;
              if (d.windDirNight) s += `<br/>🌙 夜间 ${d.windDirNight} ${d.windScaleNight}级`;
              return s;
            }
          },
          grid: { left: 45, right: 25, top: 50, bottom: 30 },
          xAxis: {
            type: 'category',
            data: xLabels,
            axisLabel: { fontSize: 12, rotate: 30 }
          },
          yAxis: {
            type: 'value',
            axisLabel: { fontSize: 12, formatter: '{value}°' }
          },
          dataZoom: [
            { type: 'slider', start: 0, end: 47, height: 24, bottom: 4 }
          ],
          series: [
            {
              name: '最高温',
              type: 'line',
              data: highs,
              smooth: true,
              symbol: 'circle',
              symbolSize: 7,
              lineStyle: { color: '#ef4444', width: 2 },
              itemStyle: { color: '#ef4444' },
              label: { show: true, formatter: '{c}°', position: 'top', fontSize: 11, fontWeight: 600, color: '#ef4444' },
              markPoint: { data: iconMarkers, symbolSize: 24, symbolOffset: [0, -44] },
              areaStyle: {
                color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [{ offset: 0, color: 'rgba(239,68,68,0.12)' }, { offset: 1, color: 'rgba(239,68,68,0)' }] }
              }
            },
            {
              name: '最低温',
              type: 'line',
              data: lows,
              smooth: true,
              symbol: 'circle',
              symbolSize: 7,
              lineStyle: { color: '#3b82f6', width: 2 },
              itemStyle: { color: '#3b82f6' },
              label: { show: true, formatter: '{c}°', position: 'bottom', fontSize: 11, fontWeight: 600, color: '#3b82f6' },
              areaStyle: {
                color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.12)' }, { offset: 1, color: 'rgba(59,130,246,0)' }] }
              }
            }
          ]
        });

        const resize = () => chart.resize();
        window.addEventListener('resize', resize);
        window.addEventListener('weather-modal-closed', () => {
          window.removeEventListener('resize', resize);
          chart.dispose();
        }, { once: true });
      }
    };
  },

  showLoading() {
    this.container.innerHTML = '<div class="loading-pulse"><div class="pulse-row"></div><div class="pulse-row"></div></div>';
  },
});
