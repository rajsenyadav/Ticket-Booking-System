import React, { useState } from 'react';

const MockPaymentGateway = ({ seatId, eventId, onCheckoutComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFakePayment = (status) => {
    setIsProcessing(true);

    // Simulate a 2-second bank network delay
    setTimeout(() => {
      setIsProcessing(false);
      onCheckoutComplete(status, seatId, eventId);
    }, 2000); 
  };

  return (
    <div className="mt-6 border-t border-gray-700 pt-6">
      <h4 className="text-gray-300 font-bold mb-3 text-sm tracking-widest uppercase">Payment Details</h4>
      
      <div className="flex flex-col gap-3 mb-6">
        <input disabled type="text" placeholder="Card Number (Fake)" className="p-3 rounded-lg bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed" value="**** **** **** 4242" />
        <div className="flex gap-3">
          <input disabled type="text" placeholder="MM/YY" className="w-1/2 p-3 rounded-lg bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed" value="12/28" />
          <input disabled type="text" placeholder="CVC" className="w-1/2 p-3 rounded-lg bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed" value="123" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
          <button 
             className={`font-bold py-3 rounded-lg transition text-darker ${isProcessing ? 'bg-green-700 cursor-wait' : 'bg-neonGreen hover:bg-green-400'}`}
             onClick={() => handleFakePayment("SUCCESS")} 
             disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "💳 Simulate Payment SUCCESS"}
          </button>

          <button 
             className={`font-bold py-3 rounded-lg transition text-white ${isProcessing ? 'bg-red-900 cursor-wait' : 'bg-red-600 hover:bg-red-500'}`}
             onClick={() => handleFakePayment("FAILED")} 
             disabled={isProcessing}
          >
             {isProcessing ? "Processing..." : "❌ Simulate Payment FAILURE"}
          </button>
      </div>
    </div>
  );
};

export default MockPaymentGateway;
