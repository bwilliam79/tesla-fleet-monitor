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

  setConfigValue(db, key, value) {
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
  },

  async pollCurrentState(apiKey, db) {
    try {
      const client = new TessieClient(apiKey);
      const vehicles = await client.getVehicles();

      for (const vehicle of vehicles) {
        if (!vehicle.is_active) continue;

        const row = await this.dbGet(db, 'SELECT id FROM vehicles WHERE vin = ?', [vehicle.vin]);
        if (!row) continue;

        const state = vehicle.last_state || {};
        const chargeState = state.charge_state || {};

        // Tessie condenses some fields directly onto last_state; fall back to nested charge_state
        const soc = state.battery_level ?? chargeState.battery_level ?? null;
        const range = state.battery_range ?? chargeState.battery_range ?? null;
        const chargingStateRaw = state.charging_state ?? chargeState.charging_state ?? null;
        const insideTemp = state.inside_temp ?? null;
        const odometer = state.odometer ?? state.vehicle_state?.odometer ?? null;

        // charger_power (kW) is the AC charge rate; fall back to raw power field
        const powerKw = chargeState.charger_power != null
          ? chargeState.charger_power
          : (state.power != null ? state.power / 1000 : null);

        let chargingState = 'Idle';
        if (chargingStateRaw === 'Charging') chargingState = 'Charging';
        else if (state.state === 'driving') chargingState = 'Discharging';

        const timestamp = Math.floor(Date.now() / 1000);

        await this.dbRun(
          db,
          `INSERT OR IGNORE INTO metrics
           (id, vehicle_id, timestamp, state_of_charge, battery_range_mi,
            odometer_mi, efficiency_wh_per_mi, temperature_celsius,
            charging_state, power_kw)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), row.id, timestamp, soc, range, odometer, null, insideTemp, chargingState, powerKw]
        );
      }
    } catch (err) {
      console.error('pollCurrentState error:', err.message);
    }
  },

  async importTessieData(apiKey, db) {
    importProgress = { status: 'starting', message: 'Initializing import...' };

    try {
      const client = new TessieClient(apiKey);

      // Step 1: Get all vehicles
      importProgress = { status: 'fetching_vehicles', message: 'Fetching vehicles from Tessie...' };
      const vehicles = await client.getVehicles();
      console.log(`Fetched ${vehicles?.length ?? 0} vehicles from Tessie`);

      if (!vehicles || vehicles.length === 0) {
        throw new Error('No vehicles found in Tessie account');
      }

      let vehicleCount = 0;
      const totalVehicles = vehicles.length;

      // Step 2: Import each vehicle and its data (skip inactive vehicles)
      for (const vehicle of vehicles) {
        // Skip inactive vehicles (is_active: false means archived/inactive).
        // Don't log the VIN fallback — VINs uniquely identify a vehicle/owner
        // and we don't want them persisted in docker logs.
        if (!vehicle.is_active) {
          console.log(`Skipping inactive vehicle: ${vehicle.display_name || '(unnamed)'}`);
          continue;
        }
        vehicleCount++;
        importProgress = {
          status: 'importing_vehicle_data',
          message: `Importing vehicle ${vehicleCount}/${totalVehicles}: ${vehicle.name || vehicle.vin}...`,
          progress: Math.round((vehicleCount / totalVehicles) * 100),
        };

        // Check if vehicle exists
        const existing = await this.dbGet(db, 'SELECT id FROM vehicles WHERE vin = ?', [vehicle.vin]);
        const vehicleId = existing ? existing.id : uuidv4();

        // Extract display_name from last_state (that's where Tessie puts it)
        const displayName = vehicle.last_state?.display_name || vehicle.display_name || vehicle.vin;

        // Extract model from vehicle_config
        let model = 'Unknown';
        if (vehicle.last_state?.vehicle_config?.model) {
          model = vehicle.last_state.vehicle_config.model;
        }

        // Extract color from last_state or use Unknown
        let color = 'Unknown';
        // Check multiple possible locations for exterior_color
        if (vehicle.last_state?.vehicle_state?.exterior_color) {
          color = vehicle.last_state.vehicle_state.exterior_color;
        } else if (vehicle.last_state?.vehicle_config?.exterior_color) {
          color = vehicle.last_state.vehicle_config.exterior_color;
        } else if (vehicle.exterior_color) {
          color = vehicle.exterior_color;
        }
        // Clean up color name by removing "ExteriorColor" prefix and adding spaces before capitals
        if (color.startsWith('ExteriorColor')) {
          color = color.replace('ExteriorColor', '');
        }
        // Add spaces before capital letters (e.g., PearlWhite → Pearl White)
        color = color.replace(/([a-z])([A-Z])/g, '$1 $2');

        // Insert or update vehicle
        await this.dbRun(
          db,
          `INSERT OR REPLACE INTO vehicles (id, name, vin, model, color, year)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            vehicleId,
            displayName,
            vehicle.vin,
            model,
            color,
            null,  // Tessie doesn't provide year
          ]
        );

        // Get historical metrics/states (using vehicle.vin).
        // Don't log a raw state sample — individual states include latitude,
        // longitude, and odometer, all of which are private.
        const history = await client.getVehicleHistory(vehicle.vin);
        console.log(`Got ${history.length} historical states for ${displayName}`);

        // Insert metrics (Tessie provides battery_level, battery_range, power, inside_temp, etc.)
        let insertedCount = 0;
        for (const state of history) {
          try {
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
               (id, vehicle_id, timestamp, state_of_charge, battery_range_mi,
                odometer_mi, efficiency_wh_per_mi, temperature_celsius,
                charging_state, power_kw)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                uuidv4(),
                vehicleId,
                state.timestamp,
                state.battery_level,
                state.battery_range,  // Already in miles from Tessie API
                state.odometer,  // Already in miles from Tessie API
                null,  // Efficiency not available from individual states
                insideTemp,
                chargingState,
                powerKw,
              ]
            );
            insertedCount++;
          } catch (err) {
            console.error(`Error inserting metric for ${displayName}:`, err.message);
          }
        }
        console.log(`Inserted ${insertedCount} metrics for ${displayName}`);

        // Get trip history (called "drives" in Tessie, using vehicle.vin)
        const drives = await client.getVehicleTrips(vehicle.vin, 90);

        // Insert trips (Tessie provides drives with energy and distance data in miles)
        for (const drive of drives) {
          // Calculate efficiency: Wh/mi = (kWh * 1000) / miles
          let efficiencyWhPerMi = null;
          if (drive.energy_used && drive.odometer_distance && drive.odometer_distance > 0) {
            efficiencyWhPerMi = (drive.energy_used * 1000) / drive.odometer_distance;
          }

          await this.dbRun(
            db,
            `INSERT OR IGNORE INTO trips
             (id, vehicle_id, start_time, end_time, start_location, end_location,
              distance_mi, energy_used_kwh, efficiency_wh_per_mi)
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
              efficiencyWhPerMi,
            ]
          );
        }
      }

      // Mark import as complete in database
      await this.setConfigValue(db, 'tessie_import_complete', 'true');
      importProgress = { status: 'complete', message: 'Import complete!' };
      return { success: true, message: 'Tessie data imported successfully' };
    } catch (error) {
      importProgress = { status: 'error', message: `Import failed: ${error.message}` };
      throw error;
    }
  },
};

module.exports = TessieService;
