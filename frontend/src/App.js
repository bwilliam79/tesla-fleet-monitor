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
        <div className="header-title">
          <span className="header-title-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3.14.69 4.22 1.78L5.78 16.22C4.69 15.14 4 13.66 4 12c0-4.42 3.58-8 8-8zm0 14c-1.66 0-3.14-.69-4.22-1.78l10.44-10.44C19.31 8.86 20 10.34 20 12c0 4.42-3.58 8-8 8z"/>
            </svg>
          </span>
          Tesla Fleet Monitor
        </div>
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
          <button className="icon-button" onClick={toggleTheme} title="Toggle dark/light mode" aria-label="Toggle dark/light mode">
            {isDark ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <button className="icon-button" onClick={() => setShowSettings(true)} title="Settings" aria-label="Open settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
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
