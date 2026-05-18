import { WeatherApp } from '../core.js';
import { API } from '../api.js';

WeatherApp.register('minutely', {
  name: '分钟级降水',

  init() {
    this.summaryEl = document.getElementById('minutelySummary');
    this._data = null;
  },

  async fetch(location) {
    return API.getMinutely(location.lat, location.lon);
  },

  render(data) {
    this._data = data;
    const list = data.minutely || [];
    if (list.length) {
      const hasRain = list.some(m => parseFloat(m.precip) > 0);
      const max = data.max;
      const summary = data.summary || '';
      if (hasRain) {
        this.summaryEl.textContent = `${summary}${max ? `，最大强度 ${max}mm` : ''}`;
      } else {
        this.summaryEl.textContent = '未来2小时无降雨';
      }
    } else {
      this.summaryEl.textContent = '暂无分钟级降水数据';
    }
  },

  renderDetail() {
    const data = this._data;
    const list = data?.minutely || [];
    if (!list.length) {
      return '<div class="empty-state"><p>暂无分钟级降水数据</p></div>';
    }

    const times = list.map(m => {
      const d = new Date(m.fxTime);
      return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
    });
    const values = list.map(m => parseFloat(m.precip) || 0);
    const summary = data.summary || '';

    return {
      html: `
        <div style="margin-bottom:12px;padding:10px 14px;background:var(--bg-card-alt);border-radius:8px">
          <span style="font-weight:600">${summary}</span>
          ${data.max ? `<span style="margin-left:12px;color:var(--text-muted)">最大强度：${data.max}mm</span>` : ''}
        </div>
        <div id="minutelyChart" style="width:100%;height:300px"></div>`,
      onReady: () => {
        if (typeof echarts === 'undefined') return;
        const chart = echarts.init(document.getElementById('minutelyChart'));

        chart.setOption({
          tooltip: {
            trigger: 'axis',
            formatter: params => {
              const i = params[0].dataIndex;
              return `<strong>${times[i]}</strong><br/>💧 ${values[i].toFixed(1)}mm`;
            }
          },
          grid: { left: 55, right: 25, top: 20, bottom: 40 },
          xAxis: {
            type: 'category',
            data: times,
            axisLabel: { fontSize: 11, interval: 5 }
          },
          yAxis: {
            type: 'value',
            name: 'mm',
            axisLabel: { fontSize: 12 }
          },
          dataZoom: [
            { type: 'inside', start: 0, end: 100 },
            { type: 'slider', start: 0, end: 100, height: 24, bottom: 4 }
          ],
          series: [{
            type: 'bar',
            data: values,
            barWidth: '60%',
            itemStyle: {
              color: {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: '#3b82f6' },
                  { offset: 1, color: '#93c5fd' }
                ]
              },
              borderRadius: [2, 2, 0, 0]
            }
          }]
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
    this.summaryEl.textContent = '加载中...';
  },

  showError() {
    this.summaryEl.textContent = '数据加载失败';
  },
});
