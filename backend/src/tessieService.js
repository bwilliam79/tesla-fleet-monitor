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

        // Insert or update vehicle (Tessie doesn't provide model/year, so we'll use display_name)
        await this.dbRun(
          db,
          `INSERT OR REPLACE INTO vehicles (id, name, vin, model, color, year)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            vehicleId,
            vehicle.display_name || vehicle.vin,
            vehicle.vin,
            vehicle.vehicle_config?.model || 'Unknown',
            vehicle.color || 'Unknown',
            null,  // Tessie doesn't provide year
          ]
        );

        // Get historical metrics/states (using vehicle.id, not vin)
        const history = await client.getVehicleHistory(vehicle.id);

        // Insert metrics (Tessie provides battery_level, battery_range, power, inside_temp, etc.)
        for (const state of history) {
          // Tessie provides power in kW directly
          const powerKw = state.power ? state.power / 1000 : null;
          const insideTemp = state.inside_temp || null;

          // Determine charging state from the state field
          let chargingState = 'Idle';
          if (state.charging_state === 'Charging') {
            chargingState = 'Charging';
          } else if (state.state === 'driving') {
            chargingState = 'Discharging';
          }

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
              state.timestamp,
              state.battery_level,
              state.battery_range,
              state.odometer,
              null,  // Efficiency not available from individual states
              insideTemp,
              chargingState,
              powerKw,
            ]
          );
        }

        // Get trip history (called "drives" in Tessie, using vehicle.id)
        const drives = await client.getVehicleTrips(vehicle.id, 90);

        // Insert trips (Tessie provides drives with energy and distance data)
        for (const drive of drives) {
          // Calculate efficiency: Wh/km = (kWh * 1000) / km
          let efficiencyWhPerKm = null;
          if (drive.energy_used && drive.odometer_distance && drive.odometer_distance > 0) {
            efficiencyWhPerKm = (drive.energy_used * 1000) / drive.odometer_distance;
          }

          await this.dbRun(
            db,
            `INSERT OR IGNORE INTO trips
             (id, vehicle_id, start_time, end_time, start_location, end_location,
              distance_km, energy_used_kwh, efficiency_wh_per_km)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              vehicleId,
              drive.started_at,
              drive.ended_at || null,
              drive.starting_location,
              drive.ending_location,
              drive.odometer_distance,
              drive.energy_used,
              efficiencyWhPerKm,
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
