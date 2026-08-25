const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  seatId: {
    type: String, // e.g., "A1", "C4"
    required: true
  },
  status: {
    type: String,
    enum: ['BOOKED', 'CANCELLED'],
    default: 'BOOKED'
  },
  bookingRef: {
    type: String,
    required: true,
    unique: true
  },
  purchasedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
