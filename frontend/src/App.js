import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import VehicleDetail from './components/VehicleDetail';
import Settings from './components/Settings';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [importStatus, setImportStatus] = useState(null);
  const [showImportComplete, setShowImportComplete] = useState(false);
  const completedRef = React.useRef(false);

  // Update the time every minute
  React.useEffect(() => {
    const interval = setInterval(() => setLastUpdated(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Dismiss the import-complete toast after 3 seconds (fires only once per import)
  React.useEffect(() => {
    if (showImportComplete) {
      const timer = setTimeout(() => setShowImportComplete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showImportComplete]);

  // Poll import progress at 500ms; show completion toast exactly once per cycle
  React.useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/import/progress');
        const progress = await response.json();

        if (progress.status === 'idle') {
          setImportStatus(null);
          completedRef.current = false;
        } else if (progress.status === 'complete') {
          setImportStatus(null);
          if (!completedRef.current) {
            completedRef.current = true;
            setShowImportComplete(true);
          }
        } else {
          setImportStatus(progress.message);
          completedRef.current = false;
        }
      } catch (error) {
        console.error('Error fetching import progress:', error);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-title">Tesla Fleet Monitor</div>
        <div className="header-status">
          {importStatus && (
            <span className="status-text import-progress">{importStatus}</span>
          )}
          {showImportComplete && (
            <span className="status-text import-complete">Import complete!</span>
          )}
        </div>
        <div className="header-controls">
          <span className="last-updated">Updated {lastUpdated.toLocaleTimeString()}</span>
          <button className="icon-button" onClick={() => setShowSettings(true)} title="Settings" aria-label="Open settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {currentView === 'dashboard' ? (
        <Dashboard onViewVehicle={(id) => { setSelectedVehicleId(id); setCurrentView('detail'); }} />
      ) : (
        <VehicleDetail vehicleId={selectedVehicleId} onBack={() => { setCurrentView('dashboard'); setSelectedVehicleId(null); }} />
      )}

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
