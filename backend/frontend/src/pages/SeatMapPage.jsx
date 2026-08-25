import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MockPaymentGateway from '../components/MockPaymentGateway';
import api from '../api/axios';

const SeatMapPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  // Strict Role Segregation: Kick Organisers out to their Dashboard
  useEffect(() => {
    if (localStorage.getItem('role') === 'Organiser') {
        alert("Access Denied: Organisers cannot purchase tickets.");
        navigate('/organiser/dashboard');
    }
  }, [navigate]);
  
  // Storage for the selected seat and the 10-minute visual countdown
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [purchasedTicket, setPurchasedTicket] = useState(null);
  const [onWaitlist, setOnWaitlist] = useState(false);

  // Live database statuses
  const [bookedSeats, setBookedSeats] = useState([]);
  const [heldSeats, setHeldSeats] = useState([]);

  // 1. Fetch live seat statuses from backend on mount and poll every 5 seconds
  useEffect(() => {
     const fetchSeatStatus = async () => {
         try {
             const response = await api.get(`/book/status/${eventId}`);
             setBookedSeats(response.data.bookedSeats);
             setHeldSeats(response.data.heldSeats);
         } catch (error) {
             console.error("Failed to fetch seat statuses", error);
         }
     };
     
     fetchSeatStatus();
     const interval = setInterval(fetchSeatStatus, 5000);
     return () => clearInterval(interval);
  }, [eventId]);

  // 2. On component mount, check if there's an existing lock in localStorage
  useEffect(() => {
     const savedLock = localStorage.getItem(`lock_${eventId}`);
     if (savedLock) {
         const { seatId, expiresAt } = JSON.parse(savedLock);
         const remaining = Math.floor((expiresAt - Date.now()) / 1000);
         if (remaining > 0) {
             setSelectedSeat(seatId);
             setTimeLeft(remaining);
         } else {
             localStorage.removeItem(`lock_${eventId}`); // Cleanup expired lock
         }
     }
  }, [eventId]);

  // 3. The Visual Countdown Timer Logic
  useEffect(() => {
     if (timeLeft > 0) {
         const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
         return () => clearInterval(timer);
     } else if (timeLeft === 0 && selectedSeat) {
         // Time expired! Reset UI
         setSelectedSeat(null);
         localStorage.removeItem(`lock_${eventId}`);
         alert("Your 10-minute lock has expired!");
     }
  }, [timeLeft, selectedSeat, eventId]);

  // Generate 100 Seats
  const rows = 10;
  const cols = 10;
  const seats = [];
  const rowLetters = "ABCDEFGHIJ";
  for (let r = 0; r < rows; r++) {
    for (let c = 1; c <= cols; c++) {
      seats.push(`${rowLetters[r]}${c}`);
    }
  }

  // 4. Handling the Click (Frontend UI Lock + Backend Redis Lock)
  const handleSeatClick = async (seatId) => {
    
    // FRONTEND LOCK CHECK (Anti-Spam UI)
    if (selectedSeat) {
        alert("You are already holding a seat! Please finish checking out or wait for the timer to expire.");
        return;
    }
    if (bookedSeats.includes(seatId) || heldSeats.includes(seatId)) return;

    try {
        // BACKEND REDIS LOCK (The Real Security)
        const response = await api.post('/book/hold', { eventId, seatId });
        
        // Success! Lock it in React state & Local Storage
        setSelectedSeat(seatId);
        setTimeLeft(response.data.expiresInSeconds); 
        
        localStorage.setItem(`lock_${eventId}`, JSON.stringify({
            seatId,
            expiresAt: Date.now() + (response.data.expiresInSeconds * 1000)
        }));

    } catch (error) {
        alert(error.response?.data?.message || "Failed to hold seat. Please Login first!");
    }
  };

  const handleCheckoutComplete = async (status, seat, event) => {
    try {
        // Send final confirmation/failure to Backend
        const response = await api.post('/book/confirm', { eventId: event, seatId: seat, paymentStatus: status });
        
        if (status === "SUCCESS") {
           setPurchasedTicket({
               seat,
               bookingRef: response.data.ticket.bookingRef,
               qrCode: response.data.qrCode
           });
           setBookedSeats(prev => [...prev, seat]); // Optimistic UI update
        } else {
           alert(`❌ FAILED! Payment failed. The Redis lock for Seat ${seat} has been released.`);
        }
    } catch(err) {
        alert(err.response?.data?.message || "Error confirming booking.");
    } finally {
        // Reset everything
        setSelectedSeat(null); 
        setTimeLeft(0);
        localStorage.removeItem(`lock_${eventId}`);
    }
  };

  const handleJoinWaitlist = async () => {
      try {
          const response = await api.post('/waitlist/join', { eventId });
          alert(response.data.message);
          setOnWaitlist(true);
      } catch (error) {
          alert(error.response?.data?.message || "Failed to join waitlist. Please Login first!");
      }
  };

  const isSoldOut = bookedSeats.length >= 100;

  // Format time helper (e.g. 600 -> 10:00)
  const formatTime = (seconds) => {
      const m = Math.floor(seconds / 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
      
      {/* Left Side: Seat Map Grid */}
      <div className="flex-1 glass-panel p-8 rounded-2xl shadow-2xl">
        <h2 className="text-3xl font-bold mb-6 text-white text-center">Select Your Seat</h2>
        
        <div className="w-3/4 mx-auto h-8 bg-gray-700 rounded-t-full mb-10 flex items-center justify-center text-sm font-bold text-gray-400">
          STAGE
        </div>

        <div className="grid grid-cols-10 gap-2 justify-center mx-auto max-w-2xl">
          {seats.map(seatId => {
            // If the user has a selected seat, visually disable all other green seats
            let isVisuallyDisabled = selectedSeat && selectedSeat !== seatId;
            
            let bgColor = isVisuallyDisabled 
                 ? "bg-gray-800 cursor-not-allowed text-gray-600" 
                 : "bg-neonGreen hover:bg-green-400 cursor-pointer text-darker shadow-[0_0_8px_rgba(34,197,94,0.3)]";
            
            let opacity = "opacity-100";
            
            if (bookedSeats.includes(seatId)) {
              bgColor = "bg-neonGrey cursor-not-allowed text-gray-500";
              opacity = "opacity-50";
            } else if (heldSeats.includes(seatId)) {
              bgColor = "bg-neonYellow cursor-not-allowed text-darker";
            } else if (selectedSeat === seatId) {
               bgColor = "bg-white text-darker shadow-[0_0_15px_rgba(255,255,255,0.8)]"; 
            }

            return (
              <button 
                key={seatId}
                onClick={() => handleSeatClick(seatId)}
                className={`w-full aspect-square rounded-md flex items-center justify-center text-xs font-bold transition-all ${bgColor} ${opacity}`}
              >
                {seatId}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Side: Checkout Panel */}
      <div className="w-full md:w-80 glass-panel p-6 rounded-2xl h-fit border border-gray-700">
         {isSoldOut ? (
             <div className="text-center mt-4">
                 <h3 className="text-2xl font-bold mb-4 text-red-500">Event Sold Out</h3>
                 <p className="text-gray-400 mb-6 text-sm">All seats have been booked. Join the waitlist to be notified if a seat opens up.</p>
                 {onWaitlist ? (
                     <div className="bg-green-900/40 text-neonGreen font-bold py-3 px-4 rounded-lg border border-green-500">
                         ✅ You are on the waitlist!
                     </div>
                 ) : (
                     <button onClick={handleJoinWaitlist} className="w-full bg-neonYellow hover:bg-yellow-400 text-darker font-bold py-3 rounded-lg transition-colors">
                         Join Waitlist
                     </button>
                 )}
             </div>
         ) : purchasedTicket ? (
             <div className="text-center">
                 <h3 className="text-2xl font-bold mb-2 text-neonGreen">Ticket Confirmed!</h3>
                 <p className="text-gray-400 mb-4 font-mono">Ref: {purchasedTicket.bookingRef}</p>
                 <div className="bg-white p-4 rounded-xl inline-block mb-4 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                     <img src={purchasedTicket.qrCode} alt="QR Code" className="w-48 h-48" />
                 </div>
                 <p className="text-xl font-bold text-white mb-6">Seat {purchasedTicket.seat}</p>
                 <button onClick={() => setPurchasedTicket(null)} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors border border-gray-600">
                     Book Another Seat
                 </button>
             </div>
         ) : selectedSeat ? (
            <div>
               <h3 className="text-xl font-bold mb-4">Checkout</h3>
               <p className="text-gray-400 mb-2">Selected Seat: <span className="text-white font-bold text-lg">{selectedSeat}</span></p>
               <p className="text-gray-400 mb-2">Price: <span className="text-white font-bold text-lg">$150</span></p>
               
               {/* THE VISUAL TIMER */}
               <div className="mt-4 p-4 bg-gray-900 rounded-lg text-center border border-red-900/30">
                  <p className="text-gray-400 text-sm mb-1">Time remaining to checkout:</p>
                  <p className="text-3xl font-mono font-bold text-red-500">{formatTime(timeLeft)}</p>
               </div>

               <MockPaymentGateway 
                  seatId={selectedSeat} 
                  eventId={eventId} 
                  onCheckoutComplete={handleCheckoutComplete} 
               />
            </div>
         ) : (
             <p className="text-gray-500 italic text-center mt-10">Click a green seat to begin checkout.</p>
         )}
      </div>

    </div>
  );
};

export default SeatMapPage;
