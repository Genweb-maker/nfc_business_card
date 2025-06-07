const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found', 
        message: 'Profile not found' 
      });
    }
    
    res.json({ 
      success: true, 
      user: user 
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to fetch profile' 
    });
  }
});

// Create or update user profile
router.post('/profile', authenticateToken, async (req, res) => {
  try {
    const { profile } = req.body;
    
    // Validate required fields
    if (!profile.fullName || !profile.email) {
      return res.status(400).json({ 
        error: 'Validation error', 
        message: 'Full name and email are required' 
      });
    }
    
    // Check if user exists
    let user = await User.findOne({ firebaseUid: req.user.uid });
    
    if (user) {
      // Update existing user
      user.profile = { ...user.profile, ...profile };
      user.email = profile.email;
      await user.save();
    } else {
      // Create new user
      user = new User({
        firebaseUid: req.user.uid,
        email: profile.email,
        profile: profile
      });
      await user.save();
    }
    
    res.json({ 
      success: true, 
      message: 'Profile saved successfully', 
      user: user 
    });
  } catch (error) {
    console.error('Save profile error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to save profile' 
    });
  }
});

// Get public profile (for sharing)
router.get('/profile/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ 
      firebaseUid: req.params.uid,
      isActive: true 
    });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found', 
        message: 'Profile not found or inactive' 
      });
    }
    
    // Return only public profile data
    res.json({ 
      success: true, 
      profile: user.profile 
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to fetch profile' 
    });
  }
});

// Delete user profile
router.delete('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found', 
        message: 'Profile not found' 
      });
    }
    
    user.isActive = false;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Profile deactivated successfully' 
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to delete profile' 
    });
  }
});

// Generate QR code for user profile
router.post('/qr', authenticateToken, async (req, res) => {
  try {
    const QRCode = require('qrcode');
    
    // Get user profile
    const user = await User.findOne({ firebaseUid: req.user.uid });
    
    if (!user || !user.profile) {
      return res.status(404).json({ 
        error: 'Profile not found', 
        message: 'Please create your profile first' 
      });
    }

    // Validate required fields
    if (!user.profile.fullName || !user.profile.email) {
      return res.status(400).json({ 
        error: 'Incomplete profile', 
        message: 'Profile must have name and email' 
      });
    }

    // Create profile data for sharing
    const profileData = {
      type: 'nfc-business-card',
      version: '1.0',
      senderUid: req.user.uid,
      profile: {
        fullName: user.profile.fullName,
        email: user.profile.email,
        phoneNumber: user.profile.phoneNumber || '',
        companyName: user.profile.companyName || '',
        jobTitle: user.profile.jobTitle || '',
        linkedIn: user.profile.linkedIn || '',
        website: user.profile.website || '',
        bio: user.profile.bio || ''
      },
      timestamp: new Date().toISOString()
    };

    const dataString = JSON.stringify(profileData);
    
    // Generate QR code options from request
    const { size = 300, format = 'png', quality = 0.92 } = req.body;
    
    const qrOptions = {
      type: format === 'svg' ? 'svg' : 'png',
      quality: quality,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: parseInt(size)
    };

    // Generate QR code
    if (format === 'svg') {
      const qrCodeSVG = await QRCode.toString(dataString, { ...qrOptions, type: 'svg' });
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(qrCodeSVG);
    } else {
      const qrCodeBuffer = await QRCode.toBuffer(dataString, qrOptions);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="business-card-qr.png"`);
      res.send(qrCodeBuffer);
    }

  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to generate QR code' 
    });
  }
});

module.exports = router; 