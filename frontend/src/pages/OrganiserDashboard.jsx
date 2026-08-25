import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const OrganiserDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalRevenue: 0, totalTicketsSold: 0, waitlistDemand: 0 });

  // Check if the user is actually an Organiser
  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'Organiser') {
        alert("Access Denied: You must be an Organiser to view this page.");
        navigate('/');
    } else {
        // Fetch stats if they are an Organiser
        const fetchStats = async () => {
            try {
                const response = await api.get('/events/analytics/my-stats');
                setStats(response.data);
            } catch (err) {
                console.error("Failed to fetch organiser stats", err);
            }
        };
        fetchStats();
    }
  }, [navigate]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    venueName: '',
    bannerImageUrl: '',
    rows: 10,
    cols: 10,
    basePrice: 150
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        const response = await api.post('/events', formData);
        alert(`🎉 ${response.data.message}`);
        navigate('/'); // Go back to catalog to see the new event
    } catch (error) {
        alert(error.response?.data?.message || "Failed to create event. Are you logged in as an Organiser?");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto glass-panel p-10 rounded-2xl shadow-2xl mt-10">
      <h2 className="text-4xl font-extrabold mb-8 text-white text-center">Organiser Dashboard</h2>
      <p className="text-gray-400 text-center mb-8">Create a new event and publish it directly to the platform.</p>

      {/* Analytics Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl text-center shadow-lg">
              <h3 className="text-gray-400 font-bold mb-2">Total Revenue</h3>
              <p className="text-3xl font-extrabold text-neonGreen">${stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl text-center shadow-lg">
              <h3 className="text-gray-400 font-bold mb-2">Tickets Sold</h3>
              <p className="text-3xl font-extrabold text-white">{stats.totalTicketsSold.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl text-center shadow-lg">
              <h3 className="text-gray-400 font-bold mb-2">Waitlist Demand</h3>
              <p className="text-3xl font-extrabold text-neonYellow">{stats.waitlistDemand.toLocaleString()}</p>
          </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Event Title</label>
                <input type="text" name="title" required onChange={handleChange} placeholder="e.g. The Eras Tour" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-neonGreen" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Venue Name</label>
                <input type="text" name="venueName" required onChange={handleChange} placeholder="e.g. Wembley Stadium" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-neonGreen" />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea name="description" required onChange={handleChange} placeholder="Describe your event..." className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-neonGreen h-24" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date & Time</label>
                <input type="datetime-local" name="date" required onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-400 focus:outline-none focus:border-neonGreen" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Base Ticket Price ($)</label>
                <input type="number" name="basePrice" required min="1" defaultValue="150" onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-neonGreen" />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Banner Image URL</label>
            <input type="url" name="bannerImageUrl" required onChange={handleChange} placeholder="https://images.unsplash.com/photo-xxxxx.jpg" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-neonGreen" />
            <p className="text-xs text-gray-500 mt-1">⚠️ Use a direct image link ending in <span className="text-neonYellow">.jpg</span> or <span className="text-neonYellow">.png</span> (e.g. from Unsplash). Regular webpage URLs will not display correctly.</p>
        </div>

        <div className="pt-6">
            <button type="submit" disabled={loading} className="w-full bg-neonGreen text-darker font-bold py-4 rounded-lg hover:bg-green-400 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                {loading ? "Publishing Event..." : "Publish Event"}
            </button>
        </div>
      </form>
    </div>
  );
};

export default OrganiserDashboard;
