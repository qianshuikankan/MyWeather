import { WeatherApp } from '../core.js';
import { API } from '../api.js';

WeatherApp.register('astronomy', {
  name: '天文信息',

  init() {
    this.container = document.getElementById('astroContainer');
    this._todayData = null;
  },

  async fetch(location) {
    return API.getAstronomy(location.id, new Date().toISOString().slice(0, 10));
  },

  render(data) {
    if (data.code !== '200') return;
    this._todayData = data;
    const moonName = data.moonPhase?.[0]?.name || '--';

    this.container.innerHTML = `
      <div class="astro-summary">
        <div class="astro-item"><div class="a-label">日出</div><div class="a-value">${this._fmtTime(data.sunrise)}</div></div>
        <div class="astro-item"><div class="a-label">日落</div><div class="a-value">${this._fmtTime(data.sunset)}</div></div>
        <div class="astro-item"><div class="a-label">月升</div><div class="a-value">${this._fmtTime(data.moonrise)}</div></div>
        <div class="astro-item"><div class="a-label">月落</div><div class="a-value">${this._fmtTime(data.moonset)}</div></div>
        <div class="astro-item"><div class="a-label">月相</div><div class="a-value">${moonName}</div></div>
      </div>`;
  },

  async renderDetail() {
    const loc = WeatherApp.getLocation();
    if (!loc) return '<div class="empty-state"><p>请先选择城市</p></div>';

    const today = new Date();
    const dates = [];
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }

    // 后台开始加载数据
    const fetchPromise = API.getAstronomyBatch(loc.id, dates);

    // 先返回 loading 界面
    return {
      html: '<div class="loading-pulse"><div class="pulse-row"></div><div class="pulse-row"></div><div class="pulse-row"></div></div>',
      title: '天文信息',
      onReady: async () => {
        try {
          const results = await fetchPromise;
          const valid = results.filter(r => r.data?.sunrise);
          if (!valid.length) {
            document.getElementById('modalBody').innerHTML = '<div class="empty-state"><p>暂无天文数据</p></div>';
            return;
          }

          const xDates = valid.map(r => r.date.slice(5));
          const sunriseTimes = valid.map(r => this._toMinutes(r.data.sunrise));
          const sunsetTimes = valid.map(r => this._toMinutes(r.data.sunset));
          const dayLengths = valid.map((r, i) => (sunsetTimes[i] - sunriseTimes[i]) / 60);
          const moonPhases = valid.map(r => {
            const mp = r.data.moonPhase?.[0];
            return mp ? { value: parseFloat(mp.value), name: mp.name, icon: mp.icon } : null;
          });

          const cardsHtml = valid.map(r => {
            const mp = r.data.moonPhase?.[0];
            return `<div style="flex:0 0 auto;width:70px;text-align:center;padding:8px 4px;border-radius:6px;background:var(--bg-card-alt)">
              <div style="font-size:0.6rem;color:var(--text-muted)">${r.date.slice(5)}</div>
              <div style="font-size:0.6rem">${this._fmtTime(r.data.sunrise)}</div>
              <div style="font-size:0.65rem;color:var(--text-muted)">${this._fmtTime(r.data.sunset)}</div>
              <div style="font-size:0.55rem;color:var(--accent)">${mp?.name || '--'}</div>
            </div>`;
          }).join('');

          const tm = moonPhases?.[0];
          const body = document.getElementById('modalBody');
          const titleEl = document.getElementById('modalTitle');
          if (titleEl) titleEl.textContent = '天文信息';
          if (!body) return;

          body.innerHTML = `
            <div style="overflow-x:auto;padding-bottom:4px;margin-bottom:12px">
              <div style="display:flex;gap:4px;min-width:max-content">${cardsHtml}</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
              <div style="text-align:center;padding:10px;border-radius:8px;background:var(--bg-card-alt)">
                <div style="font-size:0.7rem;color:var(--text-muted)">今日月相</div>
                <div style="font-size:1rem;font-weight:600">${tm?.name || '--'}</div>
              </div>
              <div style="text-align:center;padding:10px;border-radius:8px;background:var(--bg-card-alt)">
                <div style="font-size:0.7rem;color:var(--text-muted)">月相值</div>
                <div style="font-size:1rem;font-weight:600">${tm?.value != null ? tm.value : '--'}</div>
              </div>
              <div style="text-align:center;padding:10px;border-radius:8px;background:var(--bg-card-alt)">
                <div style="font-size:0.7rem;color:var(--text-muted)">日照时长</div>
                <div style="font-size:1rem;font-weight:600">${dayLengths[0]?.toFixed(1)}h</div>
              </div>
            </div>
            <div id="astroChart" style="width:100%;height:300px;margin-bottom:16px"></div>
            <div style="overflow-x:auto;max-height:300px;overflow-y:auto">
              <table class="timeline-table">
                <thead><tr><th>日期</th><th>日出</th><th>日落</th><th>日照</th><th>月相</th></tr></thead>
                <tbody>${valid.map((r, i) => `<tr>
                  <td>${r.date.slice(5)}</td><td>${this._fmtTime(r.data.sunrise)}</td>
                  <td>${this._fmtTime(r.data.sunset)}</td><td>${dayLengths[i]?.toFixed(1)}h</td>
                  <td>${moonPhases[i]?.name || '--'}</td>
                </tr>`).join('')}</tbody>
              </table>
            </div>`;

          // ECharts
          if (typeof echarts !== 'undefined') {
            const chart = echarts.init(document.getElementById('astroChart'));
            chart.setOption({
              tooltip: {
                trigger: 'axis',
                formatter: params => {
                  const i = params[0].dataIndex;
                  const r = valid[i];
                  const mp = moonPhases[i];
                  let s = `<strong>${r.date}</strong><br/>日出 ${this._fmtTime(r.data.sunrise)}<br/>日落 ${this._fmtTime(r.data.sunset)}<br/>日照 ${dayLengths[i]?.toFixed(1)}h`;
                  if (mp) s += `<br/>月相 ${mp.name}`;
                  return s;
                }
              },
              legend: { data: ['日出', '日落', '日照时长'], top: 0, textStyle: { fontSize: 11 } },
              grid: { left: 50, right: 20, top: 35, bottom: 35 },
              xAxis: { type: 'category', data: xDates, axisLabel: { fontSize: 10, interval: 5 } },
              yAxis: [
                { type: 'value', name: '时刻', axisLabel: { fontSize: 10, formatter: v => {
                  const h = Math.floor(v / 60), m = Math.round(v % 60);
                  return h + ':' + String(m).padStart(2, '0');
                }}},
                { type: 'value', name: '小时', axisLabel: { fontSize: 10 } }
              ],
              dataZoom: [{ type: 'slider', start: 0, end: 40, height: 20, bottom: 4 }],
              series: [
                { name: '日出', type: 'line', data: sunriseTimes, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } },
                { name: '日落', type: 'line', data: sunsetTimes, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { color: '#ef4444', width: 2 }, itemStyle: { color: '#ef4444' } },
                { name: '日照时长', type: 'line', data: dayLengths, smooth: true, yAxisIndex: 1, symbol: 'diamond', symbolSize: 4, lineStyle: { color: '#3b82f6', width: 2, type: 'dashed' }, itemStyle: { color: '#3b82f6' } }
              ]
            });
            const resize = () => chart.resize();
            window.addEventListener('resize', resize);
            window.addEventListener('weather-modal-closed', () => { window.removeEventListener('resize', resize); chart.dispose(); }, { once: true });
          }
        } catch (err) {
          const b = document.getElementById('modalBody');
          if (b) b.innerHTML = '<div class="empty-state"><p>数据加载失败:' + err.message + '</p></div>';
        }
      }
    };
  },

  _fmtTime(isoStr) {
    if (!isoStr) return '--';
    const m = isoStr.match(/(\d{2}:\d{2})/);
    return m ? m[1] : '--';
  },

  _toMinutes(isoStr) {
    if (!isoStr) return 0;
    const m = isoStr.match(/(\d{2}):(\d{2})/);
    return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
  },

  showLoading() {
    this.container.innerHTML = '<div class="loading-pulse"><div class="pulse-row"></div></div>';
  },
});
