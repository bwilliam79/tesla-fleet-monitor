const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const TessieService = require('./tessieService');

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend build
const frontendBuildPath = path.join(__dirname, '../../frontend/build');
app.use(express.static(frontendBuildPath));

// API key is stored as a plain file in the data volume so it survives DB wipes
const API_KEY_FILE = path.join(__dirname, '../data/tessie_api_key');

function loadApiKey() {
  try {
    if (fs.existsSync(API_KEY_FILE)) {
      return fs.readFileSync(API_KEY_FILE, 'utf8').trim() || null;
    }
  } catch (err) {
    console.error('Error reading API key file:', err);
  }
  return null;
}

function saveApiKey(key) {
  fs.writeFileSync(API_KEY_FILE, key, 'utf8');
}

let apiKeyConfig = null;

// Routes

// Get all vehicles with latest metrics
app.get('/api/vehicles', (req, res) => {
  db.all(
    `SELECT v.*, m.state_of_charge, m.battery_range_mi, m.charging_state, m.timestamp
     FROM vehicles v
     LEFT JOIN metrics m ON v.id = m.vehicle_id AND m.timestamp = (SELECT MAX(timestamp) FROM metrics WHERE vehicle_id = v.id)
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

// Get daily stats (efficiency + energy) from trips for charts
app.get('/api/vehicles/:vehicleId/daily-stats', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const cutoff = Math.floor(Date.now() / 1000) - (days * 24 * 3600);

  db.all(
    `SELECT
       date(start_time, 'unixepoch') as day,
       ROUND(AVG(efficiency_wh_per_mi), 1) as avg_efficiency,
       ROUND(SUM(energy_used_kwh), 2) as total_energy_kwh,
       ROUND(SUM(distance_mi), 1) as total_distance_mi,
       COUNT(*) as trip_count
     FROM trips
     WHERE vehicle_id = ? AND start_time >= ? AND efficiency_wh_per_mi IS NOT NULL
     GROUP BY date(start_time, 'unixepoch')
     ORDER BY day ASC`,
    [req.params.vehicleId, cutoff],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// Get efficiency leaderboard (monthly average from trip data)
app.get('/api/leaderboard/efficiency', (req, res) => {
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 3600);

  db.all(
    `SELECT
       v.id, v.name, v.model,
       ROUND(AVG(t.efficiency_wh_per_mi), 2) as avg_efficiency,
       COUNT(*) as data_points,
       MIN(t.start_time) as first_reading,
       MAX(t.start_time) as last_reading
     FROM vehicles v
     LEFT JOIN trips t ON v.id = t.vehicle_id AND t.start_time >= ?
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
       ROUND(AVG(m.battery_range_mi), 1) as avg_range,
       SUM(CASE WHEN m.charging_state = 'Charging' THEN 1 ELSE 0 END) as charging_count
     FROM vehicles v
     LEFT JOIN metrics m ON v.id = m.vehicle_id AND m.timestamp = (SELECT MAX(timestamp) FROM metrics WHERE vehicle_id = v.id)`,
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

// Get config status
app.get('/api/config/status', (req, res) => {
  if (apiKeyConfig) {
    res.json({ message: 'Connected to Tessie API', hasApiKey: true });
  } else {
    res.json({ message: 'No API key configured', hasApiKey: false });
  }
});

// Set API key
app.post('/api/config/api-key', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || !apiKey.trim()) {
    return res.status(400).json({ error: 'API key is required' });
  }

  apiKeyConfig = apiKey.trim();
  saveApiKey(apiKeyConfig);

  // Clear existing vehicle data before fresh import
  db.run('DELETE FROM metrics');
  db.run('DELETE FROM trips');
  db.run('DELETE FROM vehicles');

  TessieService.clearImportProgress();
  setImmediate(() => {
    TessieService.importTessieData(apiKeyConfig, db).catch(err => {
      console.error('Tessie import error:', err);
    });
  });

  res.json({ message: 'API key saved. Starting Tessie data import...' });
});

// Wipe database and reimport from Tessie (API key file is NOT touched)
app.post('/api/config/wipe-and-reimport', (req, res) => {
  if (!apiKeyConfig) {
    return res.status(400).json({ error: 'No API key configured' });
  }

  db.run('DELETE FROM metrics');
  db.run('DELETE FROM trips');
  db.run('DELETE FROM vehicles');

  TessieService.clearImportProgress();
  setImmediate(() => {
    TessieService.importTessieData(apiKeyConfig, db).catch(err => {
      console.error('Tessie reimport error:', err);
    });
  });

  res.json({ message: 'Database wiped. Reimporting from Tessie...' });
});

// Get import progress
app.get('/api/import/progress', (req, res) => {
  const progress = TessieService.getImportProgress();
  res.json(progress || { status: 'idle' });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Tesla Fleet Monitor API running on port ${PORT}`);

  apiKeyConfig = loadApiKey();

  if (apiKeyConfig) {
    console.log('API key loaded from file. Starting Tessie import...');
    TessieService.clearImportProgress();
    db.run('DELETE FROM metrics');
    db.run('DELETE FROM trips');
    db.run('DELETE FROM vehicles');
    TessieService.importTessieData(apiKeyConfig, db).catch(err => {
      console.error('Tessie import error on startup:', err);
    });
  } else {
    console.log('No API key configured. Add your Tessie API key in Settings.');
  }
});

module.exports = server;
