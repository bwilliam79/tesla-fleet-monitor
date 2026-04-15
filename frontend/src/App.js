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
  const { isDark, toggleTheme } = useTheme();

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
        <div className="header-left">
          <h1 className="logo">⚡ Tesla Fleet</h1>
        </div>
        <div className="header-controls">
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
