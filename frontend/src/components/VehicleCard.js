import React from 'react';
import { kmToMiles, formatRangeMetric } from '../utils';
import './VehicleCard.css';

function VehicleCard({ vehicle, onClick }) {
  const soc = vehicle.state_of_charge || 0;
  const rangeKm = vehicle.battery_range_km || 0;
  const rangeMiles = formatRangeMetric(rangeKm);
  const status = vehicle.charging_state || 'Idle';

  const getStatusBadge = (status) => {
    let className = 'badge ';
    if (status === 'Charging') className += 'charging';
    else if (status === 'Idle') className += 'idle';
    return className;
  };

  return (
    <div className="vehicle-card card" onClick={onClick}>
      <div className="vehicle-header">
        <div>
          <h3 className="vehicle-name">{vehicle.name}</h3>
          <p className="vehicle-model">{vehicle.year} {vehicle.model}</p>
        </div>
        <span className={getStatusBadge(status)}>{status}</span>
      </div>

      <div className="battery-gauge">
        <div className="gauge-background">
          <div
            className="gauge-fill"
            style={{
              width: `${soc}%`,
              background: soc > 70 ? '#4caf50' : soc > 40 ? '#ffc107' : '#E82127'
            }}
          />
        </div>
        <div className="gauge-text">
          <span className="soc-value">{soc}%</span>
          <span className="range-value">{rangeMiles} mi range</span>
        </div>
      </div>

      <div className="vehicle-details">
        <div className="detail-item">
          <span className="detail-label">Color</span>
          <span className="detail-value">{vehicle.color}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">VIN</span>
          <span className="detail-value">{vehicle.vin?.slice(-4)}</span>
        </div>
      </div>

      <button className="view-button">View Details →</button>
    </div>
  );
}

export default VehicleCard;
