import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import EventCatalog from './pages/EventCatalog';
import SeatMapPage from './pages/SeatMapPage';
import LoginPage from './pages/LoginPage';
import OrganiserDashboard from './pages/OrganiserDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-darker text-white p-8 font-sans">
        <Navbar />
        <Routes>
          <Route path="/" element={<EventCatalog />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/event/:eventId/seats" element={<SeatMapPage />} />
          <Route path="/organiser/dashboard" element={<OrganiserDashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
