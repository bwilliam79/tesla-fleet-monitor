const https = require('https');

class TessieClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'api.tessie.com';
  }

  async request(path, method = 'GET') {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseURL,
        port: 443,
        path: path,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            } else {
              resolve(JSON.parse(data));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async getVehicles() {
    const response = await this.request('/vehicles');
    return response.response || response.results || [];
  }

  async getVehicleData(vin) {
    const response = await this.request(`/${vin}`);
    return response;
  }

  async getVehicleHistory(vin, days = 7) {
    const now = Math.floor(Date.now() / 1000);
    const from = now - (days * 24 * 3600);
    // Use interval=120 (2 minutes) to stay under 10000 data point limit
    // Don't use condense - we need full objects with all fields
    const response = await this.request(`/${vin}/states?from=${from}&to=${now}&interval=120&condense=false`);
    if (Array.isArray(response)) return response;
    if (response.results) {
      if (Array.isArray(response.results)) return response.results;
    }
    if (Array.isArray(response.response)) return response.response;
    return [];
  }

  async getVehicleTrips(vin, days = 90) {
    const now = Math.floor(Date.now() / 1000);
    const from = now - (days * 24 * 3600);
    const response = await this.request(`/${vin}/drives?from=${from}&to=${now}`);
    if (Array.isArray(response)) return response;
    if (response.results) {
      if (Array.isArray(response.results)) return response.results;
    }
    if (Array.isArray(response.response)) return response.response;
    return [];
  }
}

module.exports = TessieClient;
