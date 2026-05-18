import { WeatherApp } from '../core.js';
import { API, ICON_URL } from '../api.js';

WeatherApp.register('hourly', {
  name: '逐小时预报',

  init() {
    this.container = document.getElementById('hourlyContainer');
    this.track = this.container?.querySelector('.hourly-track');
    this._data = null;
  },

  async fetch(location) {
    return API.getHourlyForecast(location.id, 24);
  },

  render(data) {
    this._data = data.hourly || [];
    const list = this._data;
    let html = '';
    const now = new Date();
    const currentHour = now.getHours();

    list.forEach((h, i) => {
      const hour = new Date(h.fxTime).getHours();
      const isNow = i === 0 || hour === currentHour;
      html += `
        <div class="hourly-cell ${isNow ? 'is-now' : ''}">
          <span class="h-time">${isNow ? '现在' : hour + ':00'}</span>
          <img class="h-icon" src="${ICON_URL}/${h.icon}.svg" alt="${h.text}">
          <span class="h-temp">${h.temp}°</span>
          ${h.precip ? `<span class="h-precip">${h.precip}mm</span>` : ''}
          <span class="h-wind">${h.windDir || ''} ${h.windScale || ''}级</span>
        </div>`;
    });

    this.track.innerHTML = html;
  },

  renderDetail() {
    const list = this._data;
    if (!list || !list.length) {
      return '<div class="empty-state"><p>暂无数据</p></div>';
    }

    const times = list.map(h => {
      const d = new Date(h.fxTime);
      return d.getHours() + ':00';
    });
    const temps = list.map(h => parseInt(h.temp));
    const precip = list.map(h => parseFloat(h.precip) || 0);
    const hasPrecip = precip.some(p => p > 0);

    return {
      html: `
        <div style="overflow-x:auto">
          <div style="display:flex;gap:2px;min-width:max-content;margin-bottom:16px">
            ${list.map((h, i) => `
              <div style="text-align:center;padding:6px 8px;min-width:48px;border-radius:4px;background:var(--bg-card-alt)">
                <div style="font-size:0.65rem;color:var(--text-muted)">${times[i]}</div>
                <img src="${ICON_URL}/${h.icon}.svg" style="width:24px;height:24px;margin:2px auto">
                <div style="font-size:0.8rem;font-weight:600">${h.temp}°</div>
                ${h.precip ? `<div style="font-size:0.6rem;color:var(--accent)">${h.precip}mm</div>` : ''}
                <div style="font-size:0.6rem;color:var(--text-muted)">${h.windDir || ''} ${h.windScale || ''}级</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div id="hourlyChart" style="width:100%;height:280px"></div>`,
      onReady: () => {
        if (typeof echarts === 'undefined') return;
        const chart = echarts.init(document.getElementById('hourlyChart'));

        const series = [{
          name: '温度',
          type: 'line',
          data: temps,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: '#f59e0b', width: 3 },
          itemStyle: { color: '#f59e0b' },
          areaStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(245,158,11,0.2)' }, { offset: 1, color: 'rgba(245,158,11,0)' }] }
          }
        }];

        if (hasPrecip) {
          series.push({
            name: '降水量',
            type: 'bar',
            data: precip,
            yAxisIndex: 1,
            barWidth: 8,
            itemStyle: { color: 'rgba(59,130,246,0.5)', borderRadius: [2, 2, 0, 0] }
          });
        }

        chart.setOption({
          tooltip: {
            trigger: 'axis',
            formatter: params => {
              const i = params[0].dataIndex;
              const h = list[i];
              let s = `<strong>${times[i]}</strong><br/>🌡 ${temps[i]}°`;
              if (h.windDir || h.windScale) s += `<br/>🍃 ${h.windDir || ''} ${h.windScale || ''}级`;
              if (hasPrecip && params[1]) s += `<br/>💧 ${precip[i]}mm`;
              return s;
            }
          },
          grid: { left: 45, right: 50, top: 30, bottom: 30 },
          xAxis: {
            type: 'category',
            data: times,
            axisLabel: { fontSize: 12 }
          },
          yAxis: [
            { type: 'value', axisLabel: { fontSize: 12, formatter: '{value}°' } },
            { type: 'value', min: 0, axisLabel: { fontSize: 12, formatter: '{value} mm' }, splitLine: { show: false } }
          ],
          series
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
    this.track.innerHTML = '<div class="loading-pulse"><div class="pulse-row"></div></div>';
  },
});
