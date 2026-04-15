const { v4: uuidv4 } = require('uuid');

const VEHICLE_MODELS = [
  { name: 'Model S Plaid', model: 'S', year: 2023, color: 'Pearl White Multi-Coat' },
  { name: 'Model 3 Long Range', model: '3', year: 2022, color: 'Midnight Silver Metallic' },
  { name: 'Model Y Performance', model: 'Y', year: 2024, color: 'Ultra Red' },
  { name: 'Model X Plaid', model: 'X', year: 2023, color: 'Solid Black' }
];

const LOCATIONS = [
  'Home - San Francisco',
  'Office - Mountain View',
  'Supercharger - San Jose',
  'Beach - Santa Cruz',
  'Coffee Shop - Palo Alto'
];

// Generate mock vehicle data
function generateMockVehicles() {
  return VEHICLE_MODELS.map((model, idx) => ({
    id: `vehicle-${idx + 1}`,
    name: model.name,
    vin: `5YJ3E1EA${String(idx + 1).padStart(8, '0')}`,
    model: model.model,
    color: model.color,
    year: model.year
  }));
}

// Generate mock metrics for a vehicle over the past 7 days
function generateMockMetrics(vehicleId) {
  const metrics = [];
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  // Generate data every 15 minutes for the past 7 days
  for (let i = 0; i < 672; i++) { // 7 days * 24 hours * 4 (15 min intervals)
    const timestamp = now - (sevenDaysMs - i * 15 * 60 * 1000);
    const chargingStates = ['Charging', 'Discharging', 'Idle'];
    const randomCharging = chargingStates[Math.floor(Math.random() * 3)];

    let soc = 70 + Math.sin(i / 100) * 20 + Math.random() * 5;
    soc = Math.max(5, Math.min(100, soc));

    metrics.push({
      id: uuidv4(),
      vehicle_id: vehicleId,
      timestamp: Math.floor(timestamp / 1000),
      state_of_charge: Math.round(soc),
      battery_range_km: soc * 4 + Math.random() * 20,
      odometer_km: 50000 + i * Math.random() * 0.1,
      efficiency_wh_per_km: 150 + Math.random() * 50,
      temperature_celsius: 18 + Math.random() * 10,
      charging_state: randomCharging,
      power_kw: randomCharging === 'Charging' ? 7 + Math.random() * 3 :
                randomCharging === 'Idle' ? 0 : -20 - Math.random() * 50
    });
  }

  return metrics;
}

// Generate mock trips
function generateMockTrips(vehicleId) {
  const trips = [];
  const now = Date.now();

  for (let i = 0; i < 20; i++) {
    const startTime = Math.floor((now - Math.random() * 7 * 24 * 60 * 60 * 1000) / 1000);
    const distance = 10 + Math.random() * 100;
    const efficiency = 150 + Math.random() * 80;
    const energyUsed = distance * efficiency / 1000;

    trips.push({
      id: uuidv4(),
      vehicle_id: vehicleId,
      start_time: startTime,
      end_time: startTime + Math.floor(distance / 100 * 3600),
      start_location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
      end_location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
      distance_km: distance,
      energy_used_kwh: energyUsed,
      efficiency_wh_per_km: efficiency
    });
  }

  return trips;
}

module.exports = {
  generateMockVehicles,
  generateMockMetrics,
  generateMockTrips
};
