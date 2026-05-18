import { WeatherApp } from '../core.js';
import { API } from '../api.js';

WeatherApp.register('timeline', {
  name: '历史天气（时光机）',

  init() {
    this.container = document.getElementById('timelineContainer');
    this._data = [];
  },

  async fetch(location) {
    // 生成最近10天的日期
    const dates = [];
    for (let i = 1; i <= 10; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    // 并行请求所有日期
    const jobs = dates.map(async dateStr => {
      const [wr, ar] = await Promise.allSettled([
        API.getHistoricalWeather(location.id, dateStr),
        API.getHistoricalAir(location.id, dateStr),
      ]);
      const w = wr.status === 'fulfilled' ? wr.value?.weatherDaily || wr.value?.now : null;
      const airHourly = ar.status === 'fulfilled' ? ar.value?.airHourly : null;
      const a = airHourly?.length ? airHourly[0] : null;
      return { date: dateStr, weather: w, air: a };
    });

    return Promise.all(jobs);
  },

  render(results) {
    this._data = results;
    const valid = results.filter(r => r.weather);

    if (!valid.length) {
      this.container.innerHTML = '<div class="empty-state"><p>暂无历史数据</p></div>';
      return;
    }

    let html = `<table class="timeline-table">
      <thead><tr><th>日期</th><th>最高</th><th>最低</th><th>天气</th><th>降水</th><th>AQI</th></tr></thead><tbody>`;

    valid.forEach(r => {
      const w = r.weather;
      const a = r.air;
      html += `<tr>
        <td>${r.date.slice(5)}</td>
        <td style="color:var(--temp-high)">${w.tempMax || '--'}°</td>
        <td style="color:var(--temp-low)">${w.tempMin || '--'}°</td>
        <td>${w.moonPhase || '--'}</td>
        <td>${w.precip ? w.precip + 'mm' : '--'}</td>
        <td>${a?.aqi || '--'}</td>
      </tr>`;
    });

    html += '</tbody></table>';
    this.container.innerHTML = html;
  },

  renderDetail() {
    const data = this._data;
    const valid = data.filter(r => r.weather);
    if (!valid.length) return '<div class="empty-state"><p>暂无历史数据</p></div>';

    const xDates = valid.map(r => r.date.slice(5));
    const highs = valid.map(r => parseInt(r.weather.tempMax) || 0);
    const lows = valid.map(r => parseInt(r.weather.tempMin) || 0);
    const precip = valid.map(r => parseFloat(r.weather.precip) || 0);
    const aqis = valid.map(r => parseInt(r.air?.aqi) || 0);
    const hasAir = aqis.some(v => v > 0);

    return {
      html: `
        <div style="overflow-x:auto;margin-bottom:16px">
          <table class="timeline-table">
            <thead><tr><th>日期</th><th>最高</th><th>最低</th><th>降水</th><th>湿度</th><th>气压</th><th>AQI</th></tr></thead>
            <tbody>${valid.map(r => `<tr>
              <td>${r.date.slice(5)}</td>
              <td style="color:var(--temp-high);font-weight:600">${r.weather.tempMax || '--'}°</td>
              <td style="color:var(--temp-low);font-weight:600">${r.weather.tempMin || '--'}°</td>
              <td>${r.weather.precip ? r.weather.precip + 'mm' : '--'}</td>
              <td>${r.weather.humidity || '--'}%</td>
              <td>${r.weather.pressure || '--'}hPa</td>
              <td>${r.air?.aqi || '--'}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
        <div id="timelineChart" style="width:100%;height:300px"></div>`,
      onReady: () => {
        if (typeof echarts === 'undefined') return;
        const chart = echarts.init(document.getElementById('timelineChart'));
        const series = [
          { name: '最高温', type: 'line', data: highs, smooth: true, symbol: 'circle', symbolSize: 6,
            lineStyle: { color: '#ef4444', width: 2 }, itemStyle: { color: '#ef4444' },
            label: { show: true, formatter: '{c}°', fontSize: 10, color: '#ef4444' } },
          { name: '最低温', type: 'line', data: lows, smooth: true, symbol: 'circle', symbolSize: 6,
            lineStyle: { color: '#3b82f6', width: 2 }, itemStyle: { color: '#3b82f6' },
            label: { show: true, formatter: '{c}°', fontSize: 10, color: '#3b82f6' } },
        ];
        if (hasAir) {
          series.push({ name: 'AQI', type: 'bar', data: aqis, yAxisIndex: 1, barWidth: 8,
            itemStyle: { color: 'rgba(59,130,246,0.3)', borderRadius: [2, 2, 0, 0] } });
        }
        chart.setOption({
          tooltip: { trigger: 'axis', formatter: params => {
            const i = params[0].dataIndex, r = valid[i];
            return `<strong>${r.date}</strong><br/>🌡 最高 ${highs[i]}° / 最低 ${lows[i]}°${r.weather.precip ? '<br/>💧 降水 ' + r.weather.precip + 'mm' : ''}${r.air?.aqi ? '<br/>AQI ' + r.air.aqi : ''}`;
          }},
          legend: { data: ['最高温', '最低温', ...(hasAir ? ['AQI'] : [])], top: 0, textStyle: { fontSize: 11 } },
          grid: { left: 45, right: 20, top: 35, bottom: 30 },
          xAxis: { type: 'category', data: xDates, axisLabel: { fontSize: 11 } },
          yAxis: [
            { type: 'value', axisLabel: { fontSize: 11, formatter: '{value}°' } },
            { type: 'value', axisLabel: { fontSize: 11 }, splitLine: { show: false } }
          ],
          series
        });
        const resize = () => chart.resize();
        window.addEventListener('resize', resize);
        window.addEventListener('weather-modal-closed', () => { window.removeEventListener('resize', resize); chart.dispose(); }, { once: true });
      }
    };
  },

  showLoading() {
    this.container.innerHTML = '<div class="loading-pulse"><div class="pulse-row"></div></div>';
  },

  showError() {
    this.container.innerHTML = '<div class="empty-state"><p>历史数据加载失败</p></div>';
  },
});
