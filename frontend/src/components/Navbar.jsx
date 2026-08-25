import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const role = localStorage.getItem('role');
  const navigate = useNavigate();

  const handleLogout = () => {
      localStorage.removeItem('role');
      localStorage.removeItem('token');
      navigate('/');
      window.location.reload();
  };

  return (
    <nav className="flex justify-between items-center mb-12 border-b border-gray-800 pb-4">
      <Link to="/" className="text-2xl font-bold tracking-wider text-neonGreen hover:text-green-400 transition">
        🎟️ TicketBooking
      </Link>
      <div className="space-x-4 flex items-center">
        {role === 'Organiser' && (
           <Link to="/organiser/dashboard" className="text-gray-300 hover:text-neonGreen px-4 py-2 font-bold transition">
             Organiser Dashboard
           </Link>
        )}
        {role === 'Admin' && (
           <Link to="/admin/dashboard" className="text-red-400 hover:text-red-300 px-4 py-2 font-bold transition">
             Admin God Mode
           </Link>
        )}
        {role ? (
            <button onClick={handleLogout} className="bg-gray-700 text-white px-5 py-2 rounded-md font-bold hover:bg-gray-600 transition border border-gray-500">
              Logout
            </button>
        ) : (
            <Link to="/login" className="bg-neonGreen text-darker px-5 py-2 rounded-md font-bold hover:bg-green-400 transition">
              Sign In
            </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
