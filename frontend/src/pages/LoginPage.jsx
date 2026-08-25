import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(null); // tracks which demo button is loading

  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    try {
        await api.post('/auth/send-otp', { email });
        setOtpSent(true);
        alert("OTP sent! Check your email for the 6-digit code.");
    } catch (error) {
        alert(error.response?.data?.message || "Failed to send OTP");
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
        const response = await api.post('/auth/verify-otp', { email, otp });
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('role', response.data.user.role);
        
        alert("Successfully logged in!");
        navigate('/');
        window.location.reload(); // Force Navbar to update
    } catch (error) {
        alert(error.response?.data?.message || "Invalid OTP");
    } finally {
        setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    if (demoLoading) return; // Block all demo buttons while one is loading
    setDemoLoading(role);
    try {
      const response = await api.post('/auth/demo-login', { role });
      
      // Save the JWT Token and Role to Local Storage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.user.role);
      
      alert(`🎉 ${response.data.message}`);
      
      // Redirect back to the Event Catalog
      navigate('/');
      window.location.reload(); // Force Navbar to update
    } catch (error) {
      console.error(error);
      alert("Failed to connect to backend. Is the Node.js server running?");
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="glass-panel p-8 rounded-2xl shadow-2xl">
        <h2 className="text-3xl font-bold mb-8 text-center text-white">Sign In</h2>
        
        {/* The Legitimate (OTP) Login Section */}
        <div className="mb-8">
          <h3 className="text-neonGreen font-bold mb-4">Passwordless Login</h3>
          
          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <input 
                type="email" 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-neonGreen"
                required
                disabled={loading}
              />
              <button type="submit" disabled={loading} className={`font-bold py-3 rounded-lg transition ${loading ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-neonGreen text-darker hover:bg-green-400'}`}>
                {loading ? '⏳ Sending OTP...' : 'Send 6-Digit Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <p className="text-sm text-gray-400">Code sent to <span className="text-white">{email}</span></p>
              <input 
                type="text" 
                placeholder="Enter 6-digit OTP" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="p-3 rounded-lg bg-gray-800 text-white border border-gray-700 text-center tracking-widest text-xl focus:outline-none focus:border-neonGreen"
                maxLength={6}
                required
                disabled={loading}
              />
              <button type="submit" disabled={loading} className={`font-bold py-3 rounded-lg transition ${loading ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-neonGreen text-darker hover:bg-green-400'}`}>
                {loading ? '⏳ Verifying...' : 'Verify & Login'}
              </button>
            </form>
          )}
        </div>

        <div className="border-t border-gray-700 my-6 relative">
          <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0b1120] px-3 text-gray-500 text-sm font-bold">OR</span>
        </div>

        {/* The Demo Login Section */}
        <div>
          <h3 className="text-neonYellow font-bold mb-4">1-Click Demo Login</h3>
          <div className="flex flex-col gap-3">
            <button onClick={() => handleDemoLogin('Customer')} disabled={!!demoLoading} className={`font-bold py-3 rounded-lg transition border ${demoLoading === 'Customer' ? 'bg-gray-600 text-gray-400 cursor-not-allowed border-gray-600' : demoLoading ? 'bg-gray-900 text-gray-600 cursor-not-allowed border-gray-700' : 'bg-gray-800 text-white hover:bg-gray-700 border-gray-600'}`}>
              {demoLoading === 'Customer' ? '⏳ Logging in...' : 'Login as Demo Customer'}
            </button>
            <button onClick={() => handleDemoLogin('Organiser')} disabled={!!demoLoading} className={`font-bold py-3 rounded-lg transition border ${demoLoading === 'Organiser' ? 'bg-gray-600 text-gray-400 cursor-not-allowed border-gray-600' : demoLoading ? 'bg-gray-900 text-gray-600 cursor-not-allowed border-gray-700' : 'bg-gray-800 text-white hover:bg-gray-700 border-gray-600'}`}>
              {demoLoading === 'Organiser' ? '⏳ Logging in...' : 'Login as Demo Organiser'}
            </button>
            <button onClick={() => handleDemoLogin('Admin')} disabled={!!demoLoading} className={`font-bold py-3 rounded-lg transition border mt-4 ${demoLoading === 'Admin' ? 'bg-gray-600 text-gray-400 cursor-not-allowed border-gray-600' : demoLoading ? 'bg-gray-900 text-gray-600 cursor-not-allowed border-gray-700' : 'bg-red-900/20 text-red-400 hover:bg-red-900/40 border-red-500/50'}`}>
              {demoLoading === 'Admin' ? '⏳ Logging in...' : 'Login as Demo Admin (God Mode)'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
