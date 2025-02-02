const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  Ni: {
    value: Number,
    prediction: Number,
    alert: Boolean,
  },
  Co: {
    value: Number,
    prediction: Number,
    alert: Boolean,
  },
  NH3: {
    value: Number,
    prediction: Number,
    alert: Boolean,
  },
});

module.exports = mongoose.model('Reading', readingSchema);