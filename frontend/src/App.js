import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';
import Dashboard from './components/Dashboard';
import VehicleDetail from './components/VehicleDetail';
import Settings from './components/Settings';
import './App.css';

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [importStatus, setImportStatus] = useState(null);
  const [showImportComplete, setShowImportComplete] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  // Update the time every minute
  React.useEffect(() => {
    const interval = setInterval(() => setLastUpdated(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle import completion fade out
  React.useEffect(() => {
    if (showImportComplete) {
      const timer = setTimeout(() => setShowImportComplete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showImportComplete]);

  // Poll import progress
  React.useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/import/progress');
        const progress = await response.json();

        if (progress.status === 'idle') {
          setImportStatus(null);
          setShowImportComplete(false);
        } else if (progress.status === 'complete') {
          setImportStatus(null);
          setShowImportComplete(true);
        } else {
          setImportStatus(progress.message);
        }
      } catch (error) {
        console.error('Error fetching import progress:', error);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleViewVehicle = (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    setCurrentView('detail');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedVehicleId(null);
  };

  return (
    <div className={`app ${isDark ? 'dark' : 'light'}`}>
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
          <span className="last-updated">Last updated: {lastUpdated.toLocaleTimeString()}</span>
          <button className="icon-button" onClick={toggleTheme} title="Toggle dark/light mode">
            {isDark ? '☀️' : '🌙'}
          </button>
          <button className="icon-button" onClick={() => setShowSettings(true)} title="Settings">
            ⚙️
          </button>
        </div>
      </div>

      {currentView === 'dashboard' ? (
        <Dashboard onViewVehicle={handleViewVehicle} />
      ) : (
        <VehicleDetail vehicleId={selectedVehicleId} onBack={handleBackToDashboard} />
      )}

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
