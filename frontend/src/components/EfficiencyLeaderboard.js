import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatEfficiency } from '../utils';
import './EfficiencyLeaderboard.css';

function EfficiencyLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get('/api/leaderboard/efficiency');
        setLeaderboard(res.data);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return <div className="card leaderboard"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="card leaderboard">
      <h3>Efficiency Leaderboard</h3>
      <p className="subtitle">30-day average (Wh/mi)</p>

      <div className="leaderboard-list">
        {leaderboard.map((vehicle, index) => (
          <div key={vehicle.id} className="leaderboard-item">
            <div className="rank">
              <span className={`rank-badge rank-${index + 1}`}>#{index + 1}</span>
            </div>
            <div className="vehicle-info">
              <div className="vehicle-name">{vehicle.name}</div>
              <div className="vehicle-meta">{vehicle.model} Model</div>
            </div>
            <div className="efficiency-score">
              <span className="value">{formatEfficiency(vehicle.avg_efficiency)}</span>
              <span className="unit">Wh/mi</span>
            </div>
          </div>
        ))}
      </div>

      <div className="leaderboard-footer">
        <span className="data-points">
          Based on {leaderboard[0]?.data_points || 0} data points
        </span>
      </div>
    </div>
  );
}

export default EfficiencyLeaderboard;
