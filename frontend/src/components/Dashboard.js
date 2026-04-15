import React, { useState, useEffect } from 'react';
import axios from 'axios';
import VehicleCard from './VehicleCard';
import EfficiencyLeaderboard from './EfficiencyLeaderboard';
import RecentTrips from './RecentTrips';
import FleetStats from './FleetStats';
import './Dashboard.css';

function Dashboard({ onViewVehicle }) {
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [vehiclesRes, statsRes] = await Promise.all([
          axios.get('/api/vehicles'),
          axios.get('/api/fleet/stats')
        ]);
        setVehicles(vehiclesRes.data);
        setStats(statsRes.data);
        setError(null);
      } catch (err) {
        setError('Failed to load fleet data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="loading">Loading your Tesla fleet...</div>;
  }

  return (
    <div className="dashboard">
      <div className="container">
        <header className="dashboard-header">
          <div>
            <h1>Tesla Fleet Monitor</h1>
            <p className="subtitle">Real-time monitoring for your electric fleet</p>
          </div>
          <div className="last-updated">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </header>

        {error && <div className="error">{error}</div>}

        {stats && <FleetStats stats={stats} />}

        <section className="section">
          <h2>Your Vehicles</h2>
          <div className="vehicles-grid">
            {vehicles.map(vehicle => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onClick={() => onViewVehicle(vehicle.id)}
              />
            ))}
          </div>
        </section>

        <div className="two-column">
          <EfficiencyLeaderboard />
          <RecentTrips />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
