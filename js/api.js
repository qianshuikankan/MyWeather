
const API_KEY = '0ba392ef7b6c4ebeb948e7a014b2084f';
let API_HOST = 'p363yxrrr5.re.qweatherapi.com';

const API = {

  BASE: '',
  GEO:  '',

  /* 初始化：设置 API_HOST*/
  init(host) {
    if (host) API_HOST = host;
    if (!API_HOST) {
      console.error('[API] 请设置 API_HOST（和风天气控制台 → 设置 → API Host）');
      return;
    }
    this.BASE = `https://${API_HOST}/v7`;
    this.GEO  = `https://${API_HOST}/geo/v2`;
    console.log(`[API] 已配置 Host: ${API_HOST}`);
  },

  /* ---- 缓存 ---- */
  _cache: new Map(),

  /* ---- 通用请求方法 ---- */
  async get(url, params = {}) {
    // 分离内部参数（_ttl）和 API 参数
    const ttl = params._ttl || 5;
    const apiParams = {};
    for (const [k, v] of Object.entries(params)) {
      if (!k.startsWith('_')) apiParams[k] = v;
    }

    const cacheKey = url + '?' + JSON.stringify(apiParams);

    // 检查缓存
    const cached = this._cache.get(cacheKey);
    if (cached && Date.now() < cached.expire) {
      return cached.data;
    }

    // 拼接参数（_ttl 不会带到 API URL）
    const allParams = { ...apiParams, key: API_KEY };
    const qs = new URLSearchParams(allParams).toString();
    const fullUrl = url + '?' + qs;

    try {
      const resp = await fetch(fullUrl);

      // 先检查 HTTP 状态码
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try {
          const errJson = await resp.json();
          if (errJson.error) {
            detail = errJson.error.detail || errJson.error.title || detail;
          }
        } catch {}
        throw new Error(`请求失败 (${detail})`);
      }

      const json = await resp.json();

      if (json.code !== '200') {
        const msg = json.code === '204' ? '无数据' : json.code === '401' ? 'Key 无效' : `错误码 ${json.code}`;
        throw new Error(msg);
      }

      this._cache.set(cacheKey, {
        data: json,
        expire: Date.now() + ttl * 60 * 1000,
      });

      return json;
    } catch (err) {
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        throw new Error('网络异常，请检查网络连接');
      }
      throw err;
    }
  },

  /* ---- 清除缓存 ---- */
  clearCache() {
    this._cache.clear();
  },

  /* ---- 城市搜索 ---- */
  async searchCity(keyword) {
    const data = await this.get(`${this.GEO}/city/lookup`, {
      location: keyword,
      range: 'cn',
      _ttl: 30, // 城市数据缓存 30 分钟
    });
    return data.location || [];
  },

  /* ============================================================
     以下为各数据接口，在后续 Part 中逐个完成
     ============================================================ */

  /* ---- 当前天气 ---- */
  async getCurrentWeather(locationId) {
    return this.get(`${this.BASE}/weather/now`, {
      location: locationId,
      _ttl: 0.25, 
    });
  },

  /* ---- 逐小时预报（未来 24h / 72h）---- */
  async getHourlyForecast(locationId, hours = 24) {
    return this.get(`${this.BASE}/weather/24h`, {
      location: locationId,
      _ttl: 30,
    });
  },

  /* ---- 逐天预报（7天 + 15天）---- */
  async getDailyForecast(locationId, days = 7) {
    return this.get(`${this.BASE}/weather/7d`, {
      location: locationId,
      _ttl: 60,
    });
  },

  async getDailyForecast15d(locationId) {
    return this.get(`${this.BASE}/weather/15d`, {
      location: locationId,
      _ttl: 60,
    });
  },

  /* ---- 分钟级降水（未来 2h，需传坐标）---- */
  async getMinutely(lat, lon) {
    return this.get(`${this.BASE}/minutely/5m`, {
      location: `${lon},${lat}`,
      _ttl: 5,
    });
  },

  /* ---- 天气预警（需传经纬度）---- */
  async getAlerts(lat, lon) {
    const url = `https://${API_HOST}/weatheralert/v1/current/${lat}/${lon}`;
    return this._fetchDirect(url, { _ttl: 10 });
  },

  /** 直接请求完整 URL（用于路径参数类 API） */
  async _fetchDirect(url, params = {}) {
    const ttl = params._ttl || 5;
    const cacheKey = url;

    const cached = this._cache.get(cacheKey);
    if (cached && Date.now() < cached.expire) return cached.data;

    const fullUrl = url + '?key=' + API_KEY;
    try {
      const resp = await fetch(fullUrl);
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try { const e = await resp.json(); detail = e.error?.detail || detail; } catch {}
        throw new Error(`请求失败 (${detail})`);
      }
      const json = await resp.json();
      this._cache.set(cacheKey, { data: json, expire: Date.now() + ttl * 60 * 1000 });
      return json;
    } catch (err) {
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        throw new Error('网络异常，请检查网络连接');
      }
      throw err;
    }
  },

  /* ---- 空气质量（新 API，需坐标）---- */
  async getAirQuality(lat, lon) {
    const [current, hourly] = await Promise.allSettled([
      this._fetchDirect(`https://${API_HOST}/airquality/v1/current/${lat}/${lon}`, { _ttl: 30 }),
      this._fetchDirect(`https://${API_HOST}/airquality/v1/hourly/${lat}/${lon}`, { _ttl: 60 }),
    ]);
    return {
      current: current.status === 'fulfilled' ? current.value : null,
      hourly: hourly.status === 'fulfilled' ? hourly.value?.hours || [] : [],
    };
  },

  /* ---- 生活指数 ---- */
  async getIndices(locationId, type = 0) {
    return this.get(`${this.BASE}/indices/1d`, {
      location: locationId,
      type,
      _ttl: 60,
    });
  },

  /* ---- 天文（单日，日期格式 yyyyMMdd）---- */
  async getAstronomy(locationId, date) {
    const d = date ? date.replace(/-/g, '') : '';
    return this.get(`${this.BASE}/astronomy/sunmoon`, {
      location: locationId,
      date: d,
      _ttl: 1440,
    });
  },

  /** 批量获取多天天文数据 */
  async getAstronomyBatch(locationId, dates) {
    const results = await Promise.allSettled(
      dates.map(d => this.getAstronomy(locationId, d))
    );
    return results
      .filter(r => r.status === 'fulfilled' && r.value?.code === '200')
      .map(r => ({ date: r.value.sunrise?.slice(0, 10) || '', data: r.value }));
  },

  /* ---- 时光机（历史天气，日期 yyyyMMdd）---- */
  async getHistoricalWeather(locationId, date) {
    const d = date.replace(/-/g, '');
    return this.get(`${this.BASE}/historical/weather`, {
      location: locationId,
      date: d,
      _ttl: 1440,
    });
  },

  /* ---- 时光机（历史空气质量）---- */
  async getHistoricalAir(locationId, date) {
    const d = date.replace(/-/g, '');
    return this.get(`${this.BASE}/historical/air`, {
      location: locationId,
      date: d,
      _ttl: 1440,
    });
  },
};

/* ---- 天气图标 CDN ---- */
const ICON_URL = 'https://cdn.jsdelivr.net/npm/qweather-icons@latest/icons';

export { API, API_KEY, ICON_URL };
