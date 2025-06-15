const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Save a new connection (when someone receives a profile)
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { 
      profileData, 
      method, 
      timestamp 
    } = req.body;
    
    // Extract data from the new format
    const senderUid = profileData?.firebaseUid;
    const shareMethod = method?.toUpperCase(); // Convert to uppercase for consistency
    
    // Validate required fields
    if (!senderUid || !method) {
      return res.status(400).json({ 
        error: 'Validation error', 
        message: 'Sender UID and method are required' 
      });
    }
    
    if (!['NFC', 'QR'].includes(shareMethod)) {
      return res.status(400).json({ 
        error: 'Validation error', 
        message: 'Method must be either nfc or qr' 
      });
    }
    
    // Prevent self-connections
    console.log("req", req.user.uid);
    console.log("senderUid", senderUid);
    if (senderUid === req.user.uid) {
      return res.status(400).json({ 
        error: 'Validation error', 
        message: 'Cannot connect to yourself' 
      });
    }

    // Find the sender user by firebaseUid to get their ObjectId
    const senderUser = await User.findOne({ firebaseUid: senderUid });
    if (!senderUser) {
      return res.status(404).json({ 
        error: 'User not found', 
        message: 'Sender user not found' 
      });
    }
    
    // Check if connection already exists (optional duplicate prevention)
    const existingConnection = await Connection.findOne({
      senderUid: senderUid,
      receiverUid: req.user.uid,
      sharedBy: senderUser._id,
      createdAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
      }
    });
    
    if (existingConnection) {
      return res.status(409).json({ 
        error: 'Duplicate connection', 
        message: 'Connection already exists within the last 24 hours' 
      });
    }
    
    // Create new connection
    const connection = new Connection({
      senderUid: senderUid,
      receiverUid: req.user.uid,
      sharedBy: senderUser._id, // Store ObjectId reference instead of full profile
      shareMethod: shareMethod,
      location: {},
      deviceInfo: {
        timestamp: timestamp
      }
    });
    
    await connection.save();
    
    // Populate the user data for response
    await connection.populate('sharedBy', 'profile');
    
    res.status(201).json({ 
      success: true, 
      message: 'Connection saved successfully', 
      connection: connection 
    });
  } catch (error) {
    console.error('Save connection error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to save connection' 
    });
  }
});

// Get received connections (profiles received by the user)
router.get('/received', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const connections = await Connection.find({ 
      receiverUid: req.user.uid,
      isActive: true 
    })
    .populate('sharedBy', 'profile')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
    
    const total = await Connection.countDocuments({ 
      receiverUid: req.user.uid,
      isActive: true 
    });
    
    res.json({ 
      success: true, 
      connections: connections,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: connections.length,
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('Get received connections error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to fetch connections' 
    });
  }
});

// Get sent connections (profiles shared by the user)
router.get('/sent', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const connections = await Connection.find({ 
      senderUid: req.user.uid,
      isActive: true 
    })
    .populate('sharedBy', 'profile')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
    
    const total = await Connection.countDocuments({ 
      senderUid: req.user.uid,
      isActive: true 
    });
    
    res.json({ 
      success: true, 
      connections: connections,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: connections.length,
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('Get sent connections error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to fetch connections' 
    });
  }
});

// Get connection statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [receivedCount, sentCount, nfcCount, qrCount] = await Promise.all([
      Connection.countDocuments({ receiverUid: req.user.uid, isActive: true }),
      Connection.countDocuments({ senderUid: req.user.uid, isActive: true }),
      Connection.countDocuments({ 
        $or: [{ receiverUid: req.user.uid }, { senderUid: req.user.uid }],
        shareMethod: 'NFC',
        isActive: true 
      }),
      Connection.countDocuments({ 
        $or: [{ receiverUid: req.user.uid }, { senderUid: req.user.uid }],
        shareMethod: 'QR',
        isActive: true 
      })
    ]);
    
    res.json({ 
      success: true, 
      stats: {
        received: receivedCount,
        sent: sentCount,
        nfc: nfcCount,
        qr: qrCount,
        total: receivedCount + sentCount
      }
    });
  } catch (error) {
    console.error('Get connection stats error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to fetch statistics' 
    });
  }
});

// Get connection details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await Connection.findOne({
      _id: req.params.id,
      $or: [
        { receiverUid: req.user.uid },
        { senderUid: req.user.uid }
      ],
      isActive: true
    })
    .populate('sharedBy', 'profile');
    
    if (!connection) {
      return res.status(404).json({ 
        error: 'Connection not found', 
        message: 'Connection not found or access denied' 
      });
    }
    
    res.json({ 
      success: true, 
      connection: connection 
    });
  } catch (error) {
    console.error('Get connection error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to fetch connection' 
    });
  }
});

// Delete a connection
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await Connection.findOne({
      _id: req.params.id,
      receiverUid: req.user.uid, // Only receiver can delete
      isActive: true
    });
    
    if (!connection) {
      return res.status(404).json({ 
        error: 'Connection not found', 
        message: 'Connection not found or access denied' 
      });
    }
    
    connection.isActive = false;
    await connection.save();
    
    res.json({ 
      success: true, 
      message: 'Connection deleted successfully' 
    });
  } catch (error) {
    console.error('Delete connection error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to delete connection' 
    });
  }
});

module.exports = router; 