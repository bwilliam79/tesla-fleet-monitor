import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './VehicleDetail.css';

function VehicleDetail({ vehicleId, onBack }) {
  const [vehicle, setVehicle] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [vehicleRes, metricsRes, tripsRes] = await Promise.all([
          axios.get(`/api/vehicles/${vehicleId}`),
          axios.get(`/api/vehicles/${vehicleId}/metrics`),
          axios.get(`/api/vehicles/${vehicleId}/trips?limit=100`)
        ]);

        setVehicle(vehicleRes.data);
        setMetrics(metricsRes.data.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })
        })));
        setTrips(tripsRes.data);
      } catch (err) {
        console.error('Failed to load vehicle data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (vehicleId) {
      fetchData();
    }
  }, [vehicleId]);

  if (loading || !vehicle) {
    return <div className="loading">Loading vehicle details...</div>;
  }

  return (
    <div className="vehicle-detail">
      <div className="container">
        <div className="detail-header">
          <button className="back-button" onClick={onBack}>← Back to Fleet</button>
          <h1>{vehicle.name}</h1>
          <p className="vehicle-meta">{vehicle.year} {vehicle.color}</p>
        </div>

        <div className="detail-grid">
          <div className="card">
            <h3>Battery History (7 Days)</h3>
            {metrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.08)" />
                  <XAxis dataKey="timestamp" stroke="#2D4A58" />
                  <YAxis stroke="#2D4A58" />
                  <Tooltip contentStyle={{ background: 'rgba(7, 10, 20, 0.95)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: '#C8E6F0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="state_of_charge" stroke="#00D4FF" name="SOC (%)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted">No data available</p>
            )}
          </div>

          <div className="card">
            <h3>Efficiency Over Time</h3>
            {metrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.08)" />
                  <XAxis dataKey="timestamp" stroke="#2D4A58" />
                  <YAxis stroke="#2D4A58" />
                  <Tooltip contentStyle={{ background: 'rgba(7, 10, 20, 0.95)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: '#C8E6F0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="efficiency_wh_per_mi" stroke="#00E676" name="Wh/mi" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted">No data available</p>
            )}
          </div>

          <div className="card">
            <h3>Range vs Temperature</h3>
            {metrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.08)" />
                  <XAxis dataKey="timestamp" stroke="#2D4A58" />
                  <YAxis stroke="#2D4A58" />
                  <Tooltip contentStyle={{ background: 'rgba(7, 10, 20, 0.95)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: '#C8E6F0' }} />
                  <Legend />
                  <Bar dataKey="battery_range_mi" fill="rgba(0,212,255,0.6)" name="Range (mi)" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted">No data available</p>
            )}
          </div>

          <div className="card">
            <h3>Power Draw (kW)</h3>
            {metrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.08)" />
                  <XAxis dataKey="timestamp" stroke="#2D4A58" />
                  <YAxis stroke="#2D4A58" />
                  <Tooltip contentStyle={{ background: 'rgba(7, 10, 20, 0.95)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: '#C8E6F0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="power_kw" stroke="#FFB300" name="Power (kW)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted">No data available</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Recent Trips</h3>
          <div className="trips-table">
            <div className="trips-header">
              <div className="col-date">Date</div>
              <div className="col-distance">Distance</div>
              <div className="col-efficiency">Efficiency</div>
              <div className="col-energy">Energy</div>
            </div>
            {trips.map(trip => (
              <div key={trip.id} className="trips-row">
                <div className="col-date">
                  {new Date(trip.start_time * 1000).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="col-distance">{trip.distance_mi.toFixed(1)} mi</div>
                <div className="col-efficiency">{trip.efficiency_wh_per_mi ? trip.efficiency_wh_per_mi.toFixed(0) : 'N/A'} Wh/mi</div>
                <div className="col-energy">{trip.energy_used_kwh.toFixed(2)} kWh</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VehicleDetail;
