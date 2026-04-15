const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../tesla_fleet.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
db.serialize(() => {
  // Vehicles table
  db.run(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      vin TEXT NOT NULL,
      model TEXT,
      color TEXT,
      year INTEGER
    )
  `);

  // Metrics table - stores periodic snapshots of vehicle data
  db.run(`
    CREATE TABLE IF NOT EXISTS metrics (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      state_of_charge INTEGER,
      battery_range_km REAL,
      odometer_km REAL,
      efficiency_wh_per_km REAL,
      temperature_celsius REAL,
      charging_state TEXT,
      power_kw REAL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    )
  `);

  // Trips table - for trip history
  db.run(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      start_location TEXT,
      end_location TEXT,
      distance_km REAL,
      energy_used_kwh REAL,
      efficiency_wh_per_km REAL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    )
  `);

  // Create indices for faster queries
  db.run(`CREATE INDEX IF NOT EXISTS idx_metrics_vehicle_timestamp
          ON metrics(vehicle_id, timestamp DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_trips_vehicle_time
          ON trips(vehicle_id, start_time DESC)`);
});

module.exports = db;
