const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  senderUid: {
    type: String,
    required: true,
    index: true
  },
  receiverUid: {
    type: String,
    required: true,
    index: true
  },
  // Store reference to the User who shared their profile
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shareMethod: {
    type: String,
    enum: ['NFC', 'QR'],
    required: true
  },
  location: {
    latitude: {
      type: Number,
      validate: {
        validator: function(v) {
          return v >= -90 && v <= 90;
        },
        message: 'Latitude must be between -90 and 90'
      }
    },
    longitude: {
      type: Number,
      validate: {
        validator: function(v) {
          return v >= -180 && v <= 180;
        },
        message: 'Longitude must be between -180 and 180'
      }
    },
    address: {
      type: String,
      trim: true
    },
    accuracy: Number
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    screenResolution: String,
    timestamp: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
connectionSchema.index({ senderUid: 1, createdAt: -1 });
connectionSchema.index({ receiverUid: 1, createdAt: -1 });
connectionSchema.index({ createdAt: -1 });
connectionSchema.index({ sharedBy: 1 });

module.exports = mongoose.model('Connection', connectionSchema); 