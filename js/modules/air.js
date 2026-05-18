import { WeatherApp } from '../core.js';
import { API } from '../api.js';

function getAQIInfo(aqi) {
  const v = parseFloat(aqi);
  if (isNaN(v)) return { color: '#94a3b8', label: '--', bg: '#f8fafc' };
  if (v <= 50)   return { color: '#22c55e', label: '优',     bg: '#f0fdf4' };
  if (v <= 100)  return { color: '#eab308', label: '良',     bg: '#fefce8' };
  if (v <= 150)  return { color: '#f97316', label: '轻度污染', bg: '#fff7ed' };
  if (v <= 200)  return { color: '#ef4444', label: '中度污染', bg: '#fef2f2' };
  if (v <= 300)  return { color: '#a855f7', label: '重度污染', bg: '#faf5ff' };
  return               { color: '#7c3aed', label: '严重污染', bg: '#f5f3ff' };
}

WeatherApp.register('air', {
  name: '空气质量',

  init() {
    this.container = document.getElementById('airContainer');
    this._data = null;
    this._hours = [];
  },

  async fetch(location) {
    return API.getAirQuality(location.lat, location.lon);
  },

  render(data) {
    this._data = data.current;
    this._hours = data.hourly || [];
    const idx = data.current?.indexes?.[0] || {};
    const info = getAQIInfo(idx.aqi);
    const aqiVal = idx.aqiDisplay || idx.aqi || '--';
    const primary = idx.primaryPollutant?.name || '';
    const health = idx.health;

    // 小时预报数据（取最高 AQI 的 index）
    const hourHtml = this._hours.length ? this._renderHourly() : '';

    this.container.innerHTML = `
      <div class="air-wrapper">
        <div class="air-left">
          <div class="air-aqi" style="width:100px;height:100px;background:${info.bg};border:3px solid ${info.color}">
            <span class="aqi-value" style="font-size:2rem;color:${info.color}">${aqiVal}</span>
            <span class="aqi-level" style="color:${info.color};font-size:0.8rem">${info.label}</span>
          </div>
          <div style="text-align:center;margin-top:8px">
            <div style="font-size:0.85rem;color:var(--text-secondary)">${idx.name || ''}</div>
            ${primary ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">${primary}</div>` : ''}
            ${health?.effect ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">${health.effect}</div>` : ''}
          </div>
        </div>
        ${hourHtml ? `<div class="air-right">${hourHtml}</div>` : ''}
      </div>`;
  },

  _renderHourly() {
    let html = `<div style="font-size:0.85rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px">未来24小时 AQI 预报</div>
      <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px">`;

    this._hours.forEach((h, i) => {
      const idx = h.indexes?.[0] || {};
      const info = getAQIInfo(idx.aqi);
      const time = h.forecastTime || '';
      const hourLabel = time.length >= 13 ? time.slice(11, 16) : (i + 'h');

      html += `
        <div style="flex:0 0 auto;width:60px;text-align:center;padding:8px 4px;border-radius:8px;background:${info.bg}">
          <div style="font-size:0.68rem;color:var(--text-muted)">${hourLabel}</div>
          <div style="width:24px;height:24px;border-radius:50%;background:${info.color};margin:4px auto;display:flex;align-items:center;justify-content:center">
            <span style="font-size:0.6rem;color:#fff;font-weight:700">${idx.aqiDisplay || idx.aqi || '-'}</span>
          </div>
          <div style="font-size:0.6rem;color:${info.color}">${info.label}</div>
        </div>`;
    });

    html += '</div>';
    return html;
  },

  renderDetail() {
    const data = this._data;
    if (!data) return '<div class="empty-state"><p>暂无空气质量数据</p></div>';

    const idx = data.indexes?.[0] || {};
    const pollutants = data.pollutants || [];
    const stations = data.stations || [];
    const info = getAQIInfo(idx.aqi);
    const aqi = parseFloat(idx.aqi) || 0;
    const primary = idx.primaryPollutant?.name || '--';
    const health = idx.health;

    return {
      html: `
        <div id="airGauge" style="width:100%;height:220px;margin-bottom:12px"></div>

        <div style="margin-bottom:16px;padding:12px 16px;border-radius:8px;background:${info.bg};border-left:4px solid ${info.color}">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:2.5rem;font-weight:700;color:${info.color}">${idx.aqiDisplay || aqi}</span>
            <div>
              <div style="font-weight:600;color:${info.color}">${info.label} · ${idx.name || ''}</div>
              <div style="font-size:0.8rem;color:var(--text-muted)">首要污染物：${primary}</div>
            </div>
          </div>
          ${health?.effect ? `<div style="margin-top:8px;font-size:0.82rem;color:var(--text-secondary)">${health.effect}</div>` : ''}
        </div>

        <h4 style="font-size:0.9rem;font-weight:600;margin-bottom:8px">未来24小时 AQI 趋势</h4>
        <div id="airHourlyChart" style="width:100%;height:180px;margin-bottom:20px"></div>

        <h4 style="font-size:0.9rem;font-weight:600;margin-bottom:8px">污染物详情</h4>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px">
          ${pollutants.map(p => `
            <div style="padding:10px;border-radius:6px;background:var(--bg-card-alt);text-align:center">
              <div style="font-size:0.7rem;color:var(--text-muted)">${p.name}</div>
              <div style="font-size:1.1rem;font-weight:600;color:var(--text-primary);margin:2px 0">
                ${p.concentration.value != null ? p.concentration.value : '--'}
              </div>
              <div style="font-size:0.6rem;color:var(--text-muted)">${p.concentration.unit || ''}</div>
            </div>
          `).join('')}
        </div>

        ${health?.advice ? `
        <h4 style="font-size:0.9rem;font-weight:600;margin-bottom:8px">健康建议</h4>
        <div style="padding:12px;border-radius:8px;background:var(--bg-card-alt);font-size:0.85rem;color:var(--text-secondary)">
          <div style="margin-bottom:6px"><strong>一般人群：</strong>${health.advice.generalPopulation || ''}</div>
          <div><strong>敏感人群：</strong>${health.advice.sensitivePopulation || ''}</div>
        </div>
        ` : ''}

        ${stations.length ? `
        <h4 style="font-size:0.9rem;font-weight:600;margin:16px 0 8px">监测站</h4>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${stations.map(s => `
            <span style="font-size:0.75rem;padding:4px 10px;border-radius:4px;background:var(--bg-card-alt);color:var(--text-muted)">${s.name}</span>
          `).join('')}
        </div>` : ''}`,
      onReady: () => {
        if (typeof echarts === 'undefined') return;
        const chart = echarts.init(document.getElementById('airGauge'));
        chart.setOption({
          series: [{
            type: 'gauge',
            center: ['50%', '55%'], radius: '90%',
            startAngle: 210, endAngle: -30, min: 0, max: 500,
            splitNumber: 5,
            progress: { show: true, width: 12, itemStyle: { color: info.color } },
            axisLine: { lineStyle: { width: 12, color: [
              [0.1, '#22c55e'], [0.2, '#eab308'], [0.3, '#f97316'],
              [0.4, '#ef4444'], [0.6, '#a855f7'], [1, '#7c3aed'],
            ]}},
            axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
            detail: { valueAnimation: true, formatter: '{value}', fontSize: 28, fontWeight: 700, color: info.color, offsetCenter: [0, '40%'] },
            data: [{ value: aqi, name: info.label }],
          }]
        });

        // 小时趋势图
        const hours = this._hours;
        if (hours.length) {
          const hc = echarts.init(document.getElementById('airHourlyChart'));
          const hData = hours.map(h => {
            const idx = h.indexes?.[0] || {};
            return { value: parseInt(idx.aqi) || 0, time: (h.forecastTime || '').slice(11, 16) };
          });
          hc.setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: 40, right: 10, top: 10, bottom: 25 },
            xAxis: { type: 'category', data: hData.map(d => d.time), axisLabel: { fontSize: 10, interval: 3 } },
            yAxis: { type: 'value', min: 0, axisLabel: { fontSize: 10 } },
            series: [{
              type: 'bar', data: hData.map(d => d.value),
              barWidth: 12,
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
          window.addEventListener('resize', () => hc.resize());
          window.addEventListener('weather-modal-closed', () => { hc.dispose(); }, { once: true });
        }

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
    this.container.innerHTML = '<div class="loading-pulse"><div class="pulse-row"></div></div>';
  },
});
