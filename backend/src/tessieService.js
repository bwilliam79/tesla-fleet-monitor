const { v4: uuidv4 } = require('uuid');
const TessieClient = require('./tessieClient');

let importProgress = null;

const TessieService = {
  getImportProgress() {
    return importProgress;
  },

  clearImportProgress() {
    importProgress = null;
  },

  dbRun(db, sql, params) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  },

  dbGet(db, sql, params) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  async importTessieData(apiKey, db) {
    importProgress = { status: 'starting', message: 'Initializing import...' };

    try {
      const client = new TessieClient(apiKey);

      // Step 1: Get all vehicles
      importProgress = { status: 'fetching_vehicles', message: 'Fetching vehicles from Tessie...' };
      const vehicles = await client.getVehicles();
      console.log('Vehicles fetched:', vehicles);

      if (!vehicles || vehicles.length === 0) {
        console.error('No vehicles found. Raw response was:', vehicles);
        throw new Error('No vehicles found in Tessie account');
      }

      let vehicleCount = 0;
      const totalVehicles = vehicles.length;

      // Step 2: Import each vehicle and its data
      for (const vehicle of vehicles) {
        vehicleCount++;
        importProgress = {
          status: 'importing_vehicle_data',
          message: `Importing vehicle ${vehicleCount}/${totalVehicles}: ${vehicle.name || vehicle.vin}...`,
          progress: Math.round((vehicleCount / totalVehicles) * 100),
        };

        // Check if vehicle exists
        const existing = await this.dbGet(db, 'SELECT id FROM vehicles WHERE vin = ?', [vehicle.vin]);
        const vehicleId = existing ? existing.id : uuidv4();

        // Insert or update vehicle
        await this.dbRun(
          db,
          `INSERT OR REPLACE INTO vehicles (id, name, vin, model, color, year)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            vehicleId,
            vehicle.name || vehicle.vin,
            vehicle.vin,
            vehicle.model,
            vehicle.color,
            vehicle.year,
          ]
        );

        // Get historical metrics
        const history = await client.getVehicleHistory(vehicle.vin);

        // Insert metrics
        for (const metric of history) {
          await this.dbRun(
            db,
            `INSERT OR IGNORE INTO metrics
             (id, vehicle_id, timestamp, state_of_charge, battery_range_km,
              odometer_km, efficiency_wh_per_km, temperature_celsius,
              charging_state, power_kw)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              vehicleId,
              Math.floor(new Date(metric.created_at).getTime() / 1000),
              metric.state_of_charge,
              metric.battery_range_km,
              metric.odometer_km,
              metric.efficiency_wh_per_km,
              metric.temperature_celsius,
              metric.charging_state,
              metric.power_kw,
            ]
          );
        }

        // Get trip history
        const trips = await client.getVehicleTrips(vehicle.vin, 90);

        // Insert trips
        for (const trip of trips) {
          await this.dbRun(
            db,
            `INSERT OR IGNORE INTO trips
             (id, vehicle_id, start_time, end_time, start_location, end_location,
              distance_km, energy_used_kwh, efficiency_wh_per_km)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              vehicleId,
              Math.floor(new Date(trip.start_time).getTime() / 1000),
              trip.end_time ? Math.floor(new Date(trip.end_time).getTime() / 1000) : null,
              trip.start_location,
              trip.end_location,
              trip.distance_km,
              trip.energy_used_kwh,
              trip.efficiency_wh_per_km,
            ]
          );
        }
      }

      importProgress = { status: 'complete', message: 'Import complete!' };
      return { success: true, message: 'Tessie data imported successfully' };
    } catch (error) {
      importProgress = { status: 'error', message: `Import failed: ${error.message}` };
      throw error;
    }
  },
};

module.exports = TessieService;
