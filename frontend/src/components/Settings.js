import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Settings.css';

function Settings({ onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch current API key status
    const fetchStatus = async () => {
      try {
        const res = await axios.get('/api/config/status');
        setStatus(res.data.message);
      } catch (err) {
        // Not critical if this fails
      }
    };
    fetchStatus();
  }, []);

  const handleSetApiKey = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      alert('Please enter a valid API key');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/config/api-key', { apiKey: apiKey.trim() });
      setStatus(res.data.message);
      setApiKey('');
      alert('API Key configured successfully! Mock data has been cleared.');
      // Reload page to show real data
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      alert('Error setting API key: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClearApiKey = async () => {
    if (!window.confirm('Clear API key and restore mock data?')) return;

    setLoading(true);
    try {
      const res = await axios.post('/api/config/clear-api-key');
      setStatus(res.data.message);
      alert('API key cleared. Mock data has been restored.');
      // Reload page to show mock data
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      alert('Error clearing API key: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          <section className="settings-section">
            <h3>Tessie API Configuration</h3>
            <p className="section-description">
              Connect to your real Tesla vehicles via Tessie. When an API key is provided,
              mock data will be cleared and replaced with live vehicle data.
            </p>

            <form onSubmit={handleSetApiKey}>
              <div className="form-group">
                <label htmlFor="apiKey">Tessie API Key</label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Tessie API key..."
                  disabled={loading}
                />
                <p className="field-hint">
                  Get your API key from <a href="https://tessie.com" target="_blank" rel="noopener noreferrer">tessie.com</a>
                </p>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={loading} className="primary-button">
                  {loading ? 'Saving...' : 'Set API Key'}
                </button>
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  disabled={loading}
                  className="danger-button"
                >
                  Clear & Restore Mock Data
                </button>
              </div>
            </form>

            {status && (
              <div className="status-message">
                <strong>Status:</strong> {status}
              </div>
            )}
          </section>

          <section className="settings-section">
            <h3>About</h3>
            <p>
              <strong>Tesla Fleet Monitor</strong><br/>
              Version 1.0.0<br/>
              <br/>
              A sleek dashboard for monitoring multiple Tesla vehicles with real-time metrics,
              efficiency leaderboards, and trip history.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Settings;
