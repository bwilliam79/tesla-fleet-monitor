const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { generateMockVehicles, generateMockMetrics, generateMockTrips } = require('./mockData');
const TessieService = require('./tessieService');

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend build
const frontendBuildPath = path.join(__dirname, '../../frontend/build');
app.use(express.static(frontendBuildPath));

// Initialize mock data on startup
function initializeMockData() {
  const vehicles = generateMockVehicles();

  vehicles.forEach(vehicle => {
    db.run(
      'INSERT OR IGNORE INTO vehicles (id, name, vin, model, color, year) VALUES (?, ?, ?, ?, ?, ?)',
      [vehicle.id, vehicle.name, vehicle.vin, vehicle.model, vehicle.color, vehicle.year]
    );

    const metrics = generateMockMetrics(vehicle.id);
    metrics.forEach(metric => {
      db.run(
        `INSERT OR IGNORE INTO metrics
         (id, vehicle_id, timestamp, state_of_charge, battery_range_km, odometer_km,
          efficiency_wh_per_km, temperature_celsius, charging_state, power_kw)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [metric.id, metric.vehicle_id, metric.timestamp, metric.state_of_charge,
         metric.battery_range_km, metric.odometer_km, metric.efficiency_wh_per_km,
         metric.temperature_celsius, metric.charging_state, metric.power_kw]
      );
    });

    const trips = generateMockTrips(vehicle.id);
    trips.forEach(trip => {
      db.run(
        `INSERT OR IGNORE INTO trips
         (id, vehicle_id, start_time, end_time, start_location, end_location,
          distance_km, energy_used_kwh, efficiency_wh_per_km)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [trip.id, trip.vehicle_id, trip.start_time, trip.end_time, trip.start_location,
         trip.end_location, trip.distance_km, trip.energy_used_kwh, trip.efficiency_wh_per_km]
      );
    });
  });
}

// Routes

// Get all vehicles with latest metrics
app.get('/api/vehicles', (req, res) => {
  db.all(
    `SELECT v.*, m.state_of_charge, m.battery_range_km, m.charging_state, m.timestamp
     FROM vehicles v
     LEFT JOIN metrics m ON v.id = m.vehicle_id
     WHERE m.timestamp = (SELECT MAX(timestamp) FROM metrics WHERE vehicle_id = v.id)
     ORDER BY v.name`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// Get specific vehicle details
app.get('/api/vehicles/:vehicleId', (req, res) => {
  db.get(
    'SELECT * FROM vehicles WHERE id = ?',
    [req.params.vehicleId],
    (err, vehicle) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
      res.json(vehicle);
    }
  );
});

// Get metrics history for a vehicle
app.get('/api/vehicles/:vehicleId/metrics', (req, res) => {
  const hours = req.query.hours;
  let query = 'SELECT * FROM metrics WHERE vehicle_id = ?';
  let params = [req.params.vehicleId];

  if (hours) {
    const cutoff = Math.floor(Date.now() / 1000) - (hours * 3600);
    query += ' AND timestamp >= ?';
    params.push(cutoff);
  }

  query += ' ORDER BY timestamp ASC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Get trip history
app.get('/api/vehicles/:vehicleId/trips', (req, res) => {
  const limit = req.query.limit || 20;

  db.all(
    `SELECT * FROM trips
     WHERE vehicle_id = ?
     ORDER BY start_time DESC
     LIMIT ?`,
    [req.params.vehicleId, limit],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// Get efficiency leaderboard (monthly average)
app.get('/api/leaderboard/efficiency', (req, res) => {
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 3600);

  db.all(
    `SELECT
       v.id, v.name, v.model,
       ROUND(AVG(m.efficiency_wh_per_km), 2) as avg_efficiency,
       COUNT(*) as data_points,
       MIN(m.timestamp) as first_reading,
       MAX(m.timestamp) as last_reading
     FROM vehicles v
     LEFT JOIN metrics m ON v.id = m.vehicle_id AND m.timestamp >= ?
     GROUP BY v.id
     ORDER BY avg_efficiency ASC`,
    [thirtyDaysAgo],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// Get fleet overview stats
app.get('/api/fleet/stats', (req, res) => {
  db.all(
    `SELECT
       COUNT(DISTINCT v.id) as total_vehicles,
       ROUND(AVG(m.state_of_charge), 1) as avg_soc,
       ROUND(AVG(m.battery_range_km), 1) as avg_range,
       SUM(CASE WHEN m.charging_state = 'Charging' THEN 1 ELSE 0 END) as charging_count
     FROM vehicles v
     LEFT JOIN metrics m ON v.id = m.vehicle_id
     WHERE m.timestamp = (SELECT MAX(timestamp) FROM metrics)`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows?.[0] || {});
    }
  );
});

// Get recent trips across all vehicles
app.get('/api/trips/recent', (req, res) => {
  const limit = req.query.limit || 30;

  db.all(
    `SELECT t.*, v.name, v.model
     FROM trips t
     JOIN vehicles v ON t.vehicle_id = v.id
     ORDER BY t.start_time DESC
     LIMIT ?`,
    [limit],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Configuration endpoints
let apiKeyConfig = process.env.TESSIE_API_KEY || null;

// Helper functions for persistent config
const getConfigValue = (key) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM config WHERE key = ?', [key], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.value : null);
    });
  });
};

const setConfigValue = (key, value) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
      [key, value],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

app.get('/api/config/status', (req, res) => {
  if (apiKeyConfig) {
    res.json({ message: 'Using Tessie API (production data)' });
  } else {
    res.json({ message: 'Using mock data' });
  }
});

app.post('/api/config/api-key', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || !apiKey.trim()) {
    return res.status(400).json({ error: 'API key is required' });
  }

  const isFirstTimeSetup = !apiKeyConfig;
  apiKeyConfig = apiKey.trim();

  // Persist API key to database
  setConfigValue('tessie_api_key', apiKeyConfig).catch(err => {
    console.error('Failed to save API key:', err);
  });

  // Clear import completion flag so we'll retry on next startup if it fails
  setConfigValue('tessie_import_complete', 'false').catch(err => {
    console.error('Failed to clear import flag:', err);
  });

  // Only clear data on first setup, not on re-setting the key
  if (isFirstTimeSetup) {
    db.run('DELETE FROM metrics');
    db.run('DELETE FROM trips');
    db.run('DELETE FROM vehicles');
  }

  // Start importing Tessie data asynchronously
  setImmediate(() => {
    TessieService.importTessieData(apiKeyConfig, db).catch(err => {
      console.error('Tessie import error:', err);
    });
  });

  res.json({ message: 'API key configured. Starting Tessie data import...' });
});

// Get import progress
app.get('/api/import/progress', (req, res) => {
  const progress = TessieService.getImportProgress();
  res.json(progress || { status: 'idle' });
});

app.post('/api/config/clear-api-key', (req, res) => {
  apiKeyConfig = null;

  // Clear API key and import flags from database
  setConfigValue('tessie_api_key', null).catch(err => {
    console.error('Failed to clear API key:', err);
  });
  setConfigValue('tessie_import_complete', 'false').catch(err => {
    console.error('Failed to clear import flag:', err);
  });

  // Clear all data
  db.run('DELETE FROM metrics');
  db.run('DELETE FROM trips');
  db.run('DELETE FROM vehicles');

  // Restore mock data
  initializeMockData();

  res.json({ message: 'API key cleared. Mock data restored.' });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, async () => {
  console.log(`Tesla Fleet Monitor API running on port ${PORT}`);

  // Load API key from database on startup
  const savedApiKey = await getConfigValue('tessie_api_key');
  const importComplete = await getConfigValue('tessie_import_complete');

  if (savedApiKey && !apiKeyConfig) {
    apiKeyConfig = savedApiKey;
    console.log('Loaded API key from database');

    // Always check if we should attempt import
    // Reset the completion flag and clear old data, then retry
    console.log('Clearing database and retrying Tessie import...');
    await setConfigValue('tessie_import_complete', 'false');
    db.run('DELETE FROM metrics');
    db.run('DELETE FROM trips');
    db.run('DELETE FROM vehicles');
    TessieService.importTessieData(apiKeyConfig, db).catch(err => {
      console.error('Tessie import error on startup:', err);
    });
  } else {
    // Only initialize mock data if no API key is configured
    console.log('No API key found, initializing mock data');
    initializeMockData();
  }
});

module.exports = server;
