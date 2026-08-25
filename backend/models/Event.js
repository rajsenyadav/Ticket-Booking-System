const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  venueName: {
    type: String,
    required: true
  },
  bannerImageUrl: {
    type: String,
    required: true
  },
  // We store the seat layout as an object defining rows and cols (e.g. 10x10)
  venueLayout: {
    rows: { type: Number, required: true },
    cols: { type: Number, required: true }
  },
  basePrice: {
    type: Number,
    required: true
  },
  organiserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Event', eventSchema);
