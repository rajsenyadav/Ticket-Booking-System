import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalRevenue: 0, totalTicketsSold: 0, totalUsers: 0, activeEvents: 0, liveTrafficHolds: 0 });
  const [organisers, setOrganisers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if the user is actually an Admin
  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'Admin') {
        alert("Access Denied: You must be an Admin to view this page.");
        navigate('/');
    } else {
        fetchAdminData();
    }
  }, [navigate]);

  const fetchAdminData = async () => {
      try {
          const statsRes = await api.get('/admin/stats');
          const orgsRes = await api.get('/admin/organisers');
          const eventsRes = await api.get('/admin/events');
          
          setStats(statsRes.data);
          setOrganisers(orgsRes.data);
          setEvents(eventsRes.data);
      } catch (err) {
          console.error("Failed to fetch admin data", err);
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteUser = async (userId, email) => {
      const confirmDelete = window.confirm(`🛑 DANGER ZONE 🛑\n\nAre you absolutely sure you want to permanently delete user [${email}]?\n\nWARNING: This will wipe their account, all their tickets, and if they are an Organiser, it will CASCADE DELETE all events they created and ALL TICKETS anyone bought for those events!\n\nThis cannot be undone.`);
      if (!confirmDelete) return;

      try {
          const res = await api.delete(`/admin/user/${userId}`);
          alert(`✅ ${res.data.message}`);
          fetchAdminData(); // Refresh UI
      } catch (err) {
          alert("Failed to delete user.");
      }
  };

  const handleDeleteEvent = async (eventId, title) => {
      const confirmDelete = window.confirm(`🛑 DANGER ZONE 🛑\n\nAre you absolutely sure you want to permanently delete the event [${title}]?\n\nWARNING: This will CASCADE DELETE all tickets purchased for this event and wipe the waitlist!\n\nThis cannot be undone.`);
      if (!confirmDelete) return;

      try {
          const res = await api.delete(`/admin/event/${eventId}`);
          alert(`✅ ${res.data.message}`);
          fetchAdminData(); // Refresh UI
      } catch (err) {
          alert("Failed to delete event.");
      }
  };

  if (loading) return <div className="text-center text-neonGreen font-bold mt-20">Loading God Mode...</div>;

  return (
    <div className="max-w-6xl mx-auto mt-10 space-y-12">
      
      {/* Header */}
      <div className="text-center">
        <h2 className="text-5xl font-extrabold text-white mb-4">Platform <span className="text-red-500">God Mode</span></h2>
        <p className="text-gray-400">Live analytics and platform health overview.</p>
      </div>

      {/* Analytics Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl text-center shadow-[0_0_15px_rgba(34,197,94,0.1)]">
              <h3 className="text-gray-400 font-bold mb-2 text-sm uppercase">Total Revenue</h3>
              <p className="text-3xl font-extrabold text-neonGreen">${stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl text-center shadow-lg">
              <h3 className="text-gray-400 font-bold mb-2 text-sm uppercase">Tickets Sold</h3>
              <p className="text-3xl font-extrabold text-white">{stats.totalTicketsSold.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl text-center shadow-lg">
              <h3 className="text-gray-400 font-bold mb-2 text-sm uppercase">Active Events</h3>
              <p className="text-3xl font-extrabold text-neonYellow">{stats.activeEvents.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl text-center shadow-lg">
              <h3 className="text-gray-400 font-bold mb-2 text-sm uppercase">Total Users</h3>
              <p className="text-3xl font-extrabold text-white">{stats.totalUsers.toLocaleString()}</p>
          </div>
          <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-xl text-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <h3 className="text-red-400 font-bold mb-2 text-sm uppercase">Live Redis Locks</h3>
              <p className="text-3xl font-extrabold text-red-500">{stats.liveTrafficHolds.toLocaleString()}</p>
          </div>
      </div>

      {/* Organiser Directory */}
      <div className="glass-panel p-8 rounded-2xl shadow-2xl">
          <h3 className="text-2xl font-bold text-white mb-6">Organiser Directory</h3>
          
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="border-b border-gray-700 text-gray-400">
                          <th className="py-4 px-6 font-medium">Email</th>
                          <th className="py-4 px-6 font-medium">Joined Date</th>
                          <th className="py-4 px-6 font-medium">Total Events Hosted</th>
                          <th className="py-4 px-6 font-medium text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {organisers.map((org, idx) => (
                          <tr key={org._id} className={idx !== organisers.length - 1 ? "border-b border-gray-800" : ""}>
                              <td className="py-4 px-6 text-white">{org.email}</td>
                              <td className="py-4 px-6 text-gray-400">{new Date(org.createdAt).toLocaleDateString()}</td>
                              <td className="py-4 px-6 text-neonGreen font-bold">{org.totalEventsHosted}</td>
                              <td className="py-4 px-6 text-right">
                                  <button onClick={() => handleDeleteUser(org._id, org.email)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded text-sm transition-colors">
                                      Delete User
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {organisers.length === 0 && (
                          <tr>
                              <td colSpan="4" className="py-8 text-center text-gray-500">No organisers found on the platform.</td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Events Directory */}
      <div className="glass-panel p-8 rounded-2xl shadow-2xl">
          <h3 className="text-2xl font-bold text-white mb-6">Events Directory</h3>
          
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="border-b border-gray-700 text-gray-400">
                          <th className="py-4 px-6 font-medium">Event Title</th>
                          <th className="py-4 px-6 font-medium">Date</th>
                          <th className="py-4 px-6 font-medium">Price</th>
                          <th className="py-4 px-6 font-medium text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {events.map((event, idx) => (
                          <tr key={event._id} className={idx !== events.length - 1 ? "border-b border-gray-800" : ""}>
                              <td className="py-4 px-6 text-white font-bold">{event.title}</td>
                              <td className="py-4 px-6 text-gray-400">{new Date(event.date).toLocaleDateString()}</td>
                              <td className="py-4 px-6 text-neonGreen font-bold">${event.basePrice}</td>
                              <td className="py-4 px-6 text-right">
                                  <button onClick={() => handleDeleteEvent(event._id, event.title)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded text-sm transition-colors">
                                      Delete Event
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {events.length === 0 && (
                          <tr>
                              <td colSpan="4" className="py-8 text-center text-gray-500">No events found on the platform.</td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
