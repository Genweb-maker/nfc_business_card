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

module.exports = router; 