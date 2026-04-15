const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'tesla_fleet.db');
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

  // Metrics table - stores periodic snapshots of vehicle data (all distances in miles)
  db.run(`
    CREATE TABLE IF NOT EXISTS metrics (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      state_of_charge INTEGER,
      battery_range_mi REAL,
      odometer_mi REAL,
      efficiency_wh_per_mi REAL,
      temperature_celsius REAL,
      charging_state TEXT,
      power_kw REAL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    )
  `);

  // Trips table - for trip history (all distances in miles)
  db.run(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      start_location TEXT,
      end_location TEXT,
      distance_mi REAL,
      energy_used_kwh REAL,
      efficiency_wh_per_mi REAL,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    )
  `);

  // Config table - for storing API key and import status
  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Create indices for faster queries
  db.run(`CREATE INDEX IF NOT EXISTS idx_metrics_vehicle_timestamp
          ON metrics(vehicle_id, timestamp DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_trips_vehicle_time
          ON trips(vehicle_id, start_time DESC)`);
});

module.exports = db;
