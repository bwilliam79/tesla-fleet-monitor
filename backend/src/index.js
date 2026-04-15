const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { generateMockVehicles, generateMockMetrics, generateMockTrips } = require('./mockData');

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
  const hours = req.query.hours || 24;
  const cutoff = Math.floor(Date.now() / 1000) - (hours * 3600);

  db.all(
    `SELECT * FROM metrics
     WHERE vehicle_id = ? AND timestamp >= ?
     ORDER BY timestamp ASC`,
    [req.params.vehicleId, cutoff],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
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

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Tesla Fleet Monitor API running on port ${PORT}`);
  initializeMockData();
});

module.exports = server;
