import React from 'react';
import './FleetStats.css';

function FleetStats({ stats }) {
  return (
    <div className="fleet-stats">
      <div className="stat-card card">
        <div className="stat-value">{stats.total_vehicles || 0}</div>
        <div className="stat-label">Total Vehicles</div>
      </div>
      <div className="stat-card card">
        <div className="stat-value">{Math.round(stats.avg_soc || 0)}%</div>
        <div className="stat-label">Avg. Battery</div>
      </div>
      <div className="stat-card card">
        <div className="stat-value">{Math.round(stats.avg_range || 0)}</div>
        <div className="stat-label">Avg. Range (km)</div>
      </div>
      <div className="stat-card card">
        <div className="stat-value">{stats.charging_count || 0}</div>
        <div className="stat-label">Charging Now</div>
      </div>
    </div>
  );
}

export default FleetStats;
