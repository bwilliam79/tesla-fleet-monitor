import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RecentTrips.css';

function RecentTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await axios.get('/api/trips/recent?limit=15');
        setTrips(res.data);
      } catch (err) {
        console.error('Failed to load trips:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="card recent-trips"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="card recent-trips">
      <h3>Recent Trips</h3>
      <p className="subtitle">Fleet trip history</p>

      <div className="trips-timeline">
        {trips.slice(0, 10).map((trip) => (
          <div key={trip.id} className="trip-item">
            <div className="trip-time">
              <div className="time-badge">{formatTime(trip.start_time)}</div>
            </div>
            <div className="trip-details">
              <div className="trip-vehicle">{trip.name}</div>
              <div className="trip-route">
                {trip.start_location} → {trip.end_location}
              </div>
              <div className="trip-stats">
                <span>{trip.distance_mi.toFixed(1)} mi</span>
                <span>•</span>
                <span>{trip.efficiency_wh_per_mi.toFixed(0)} Wh/mi</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {trips.length === 0 && (
        <div className="empty-state">
          <p>No recent trips recorded</p>
        </div>
      )}
    </div>
  );
}

export default RecentTrips;
