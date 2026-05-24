import { WeatherApp } from '../core.js';
import { API, ICON_URL } from '../api.js';

WeatherApp.register('current', {
  name: '当前天气',

  init() {
    this.els = {
      city: document.getElementById('cwCity'),
      time: document.getElementById('cwTime'),
      temp: document.getElementById('cwTemp'),
      desc: document.getElementById('cwDesc'),
      icon: document.getElementById('cwIcon'),
      tempMax: document.getElementById('cwTempMax'),
      tempMin: document.getElementById('cwTempMin'),
      feels: document.getElementById('cwFeels'),
      humidity: document.getElementById('cwHumidity'),
      wind: document.getElementById('cwWind'),
      windScale: document.getElementById('cwWindScale'),
      windDir: document.getElementById('cwWindDir'),
      pressure: document.getElementById('cwPressure'),
      vis: document.getElementById('cwVis'),
      uv: document.getElementById('cwUV'),
      precip: document.getElementById('cwPrecip'),
    };
  },

  async fetch(location) {
    const [weather, daily, air] = await Promise.allSettled([
      API.getCurrentWeather(location.id),
      API.getDailyForecast(location.id, 1),
      API.getAirQuality(location.lat, location.lon),
    ]);
    return {
      weather: weather.status === 'fulfilled' ? weather.value : null,
      daily: daily.status === 'fulfilled' ? daily.value?.daily?.[0] : null,
      air: air.status === 'fulfilled' ? air.value?.current?.indexes?.[0] || air.value?.indexes?.[0] : null,
    };
  },

  render(data) {
    const now = data.weather?.now;
    const today = data.daily;
    const airIdx = data.air;
    if (!now) return;

    const loc = WeatherApp.getLocation();
    this.els.city.textContent = loc ? `${loc.name}, ${loc.adm}` : '--';
    this.els.time.textContent = data.weather?.updateTime ? data.weather.updateTime.replace('+08:00', '') : '--';
    this.els.temp.textContent = now.temp;
    this.els.desc.textContent = now.text;
    this.els.icon.src = `${ICON_URL}/${now.icon}.svg`;
    this.els.icon.alt = now.text;
    this.els.feels.textContent = now.feelsLike + '°';
    this.els.humidity.textContent = now.humidity + '%';
    this.els.wind.textContent = now.windSpeed + 'km/h';
    this.els.windScale.textContent = now.windScale + '级';
    this.els.windDir.textContent = now.windDir;
    this.els.pressure.textContent = now.pressure + 'hPa';
    this.els.vis.textContent = airIdx?.aqiDisplay || airIdx?.aqi || '--';
    this.els.uv.textContent = airIdx?.category || '--';
    this.els.precip.textContent = now.precip + 'mm';

    this.els.tempMax.textContent = today?.tempMax || '--';
    this.els.tempMin.textContent = today?.tempMin || '--';
  },

  showLoading() {
    Object.values(this.els).forEach(el => {
      if (el) el.textContent = '--';
    });
  },
});
