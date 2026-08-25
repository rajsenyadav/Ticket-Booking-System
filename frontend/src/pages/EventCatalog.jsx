import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const EventCatalog = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Strict Role Segregation: Kick Organisers out to their Dashboard
  useEffect(() => {
    if (localStorage.getItem('role') === 'Organiser') {
        navigate('/organiser/dashboard');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get('/events');
        setEvents(response.data);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) {
      return <div className="text-center text-neonGreen font-bold mt-20">Loading Events...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-4xl font-extrabold mb-8 text-white">Upcoming Events</h2>
      
      {events.length === 0 && (
          <div className="glass-panel p-8 text-center text-gray-400">
              No events found.
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {events.map(event => (
          <Link key={event._id} to={`/event/${event._id}/seats`} className="glass-panel rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-300 block cursor-pointer">
            <img src={event.bannerImageUrl} alt={event.title} className="w-full h-48 object-cover border-b border-gray-700" />
            <div className="p-6">
              <h3 className="text-2xl font-bold text-neonGreen mb-2">{event.title}</h3>
              <p className="text-gray-400 mb-1">📍 {event.venueName}</p>
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-gray-500">📅 {new Date(event.date).toLocaleDateString()}</p>
                <p className="font-bold text-lg text-white">${event.basePrice}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default EventCatalog;
