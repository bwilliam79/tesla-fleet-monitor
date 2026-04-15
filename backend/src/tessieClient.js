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
    const response = await this.request('/api/1/vehicles');
    console.log('Tessie getVehicles response:', JSON.stringify(response, null, 2));
    return response.response || response.results || [];
  }

  async getVehicleData(vin) {
    const response = await this.request(`/api/1/vehicles/${vin}`);
    return response;
  }

  async getVehicleHistory(vin, days = 7) {
    const response = await this.request(`/api/1/vehicles/${vin}/history?days=${days}`);
    return response.response || response.results || [];
  }

  async getVehicleTrips(vin, days = 90) {
    const response = await this.request(`/api/1/vehicles/${vin}/drives?days=${days}`);
    return response.response || response.results || [];
  }
}

module.exports = TessieClient;
