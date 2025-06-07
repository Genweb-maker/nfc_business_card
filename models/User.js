const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  profile: {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    companyName: {
      type: String,
      trim: true
    },
    jobTitle: {
      type: String,
      trim: true
    },
    linkedIn: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500
    },
    profilePicture: {
      type: String,
      trim: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ firebaseUid: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema); 