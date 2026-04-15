import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import VehicleDetail from './components/VehicleDetail';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  const handleViewVehicle = (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    setCurrentView('detail');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedVehicleId(null);
  };

  return (
    <div className="app">
      {currentView === 'dashboard' ? (
        <Dashboard onViewVehicle={handleViewVehicle} />
      ) : (
        <VehicleDetail vehicleId={selectedVehicleId} onBack={handleBackToDashboard} />
      )}
    </div>
  );
}

export default App;
