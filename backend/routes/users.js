const express = require('express');
const User = require('../models/User');
const Room = require('../models/Room');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all users (excluding current user)
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, status, limit = 20, page = 1 } = req.query;
    
    // Build query
    const query = {
      _id: { $ne: req.user._id }, // Exclude current user
      isActive: true
    };

    // Add search filter
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Add status filter
    if (status && ['online', 'offline', 'away'].includes(status)) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users
    const users = await User.find(query)
      .select('-password')
      .sort({ status: -1, lastSeen: -1, username: 1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);

    res.json({
      users: users.map(user => user.toPublicJSON()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
        totalUsers,
        hasMore: skip + users.length < totalUsers
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      message: 'Internal server error while fetching users'
    });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      user: user.toPublicJSON()
    });

  } catch (error) {
    console.error('Get user by ID error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid user ID format'
      });
    }

    res.status(500).json({
      message: 'Internal server error while fetching user'
    });
  }
});

// Get online users
router.get('/status/online', authenticate, async (req, res) => {
  try {
    const onlineUsers = await User.find({
      _id: { $ne: req.user._id },
      status: 'online',
      isActive: true
    })
    .select('-password')
    .sort({ username: 1 });

    res.json({
      onlineUsers: onlineUsers.map(user => user.toPublicJSON())
    });

  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({
      message: 'Internal server error while fetching online users'
    });
  }
});

// Create or get private room with another user
router.post('/:id/private-room', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the other user exists
    const otherUser = await User.findById(id);
    if (!otherUser || !otherUser.isActive) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Don't allow creating room with self
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        message: 'Cannot create private room with yourself'
      });
    }

    // Create or get existing private room
    const room = await Room.createPrivateRoom(req.user._id, id);

    // Populate the room data
    await room.populate('participants.user', 'username avatar status');

    res.json({
      message: 'Private room created/retrieved successfully',
      room
    });

  } catch (error) {
    console.error('Create private room error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid user ID format'
      });
    }

    res.status(500).json({
      message: 'Internal server error while creating private room'
    });
  }
});

// Get user's rooms
router.get('/:id/rooms', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Only allow users to get their own rooms or if they're admin
    if (id !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Access denied. You can only view your own rooms.'
      });
    }

    const rooms = await Room.findUserRooms(id);

    res.json({
      rooms
    });

  } catch (error) {
    console.error('Get user rooms error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid user ID format'
      });
    }

    res.status(500).json({
      message: 'Internal server error while fetching user rooms'
    });
  }
});

// Search users by username or email
router.get('/search/:query', authenticate, async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        message: 'Search query must be at least 2 characters long'
      });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      isActive: true,
      $or: [
        { username: { $regex: query.trim(), $options: 'i' } },
        { email: { $regex: query.trim(), $options: 'i' } }
      ]
    })
    .select('-password')
    .limit(parseInt(limit))
    .sort({ username: 1 });

    res.json({
      users: users.map(user => user.toPublicJSON())
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      message: 'Internal server error while searching users'
    });
  }
});

// Get user statistics (optional feature)
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Only allow users to get their own stats
    if (id !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Access denied. You can only view your own statistics.'
      });
    }

    // Get user's room count
    const roomCount = await Room.countDocuments({
      'participants.user': id,
      isActive: true
    });

    // Get user's private room count
    const privateRoomCount = await Room.countDocuments({
      'participants.user': id,
      type: 'private',
      isActive: true
    });

    // Get user's group room count
    const groupRoomCount = await Room.countDocuments({
      'participants.user': id,
      type: 'group',
      isActive: true
    });

    res.json({
      stats: {
        totalRooms: roomCount,
        privateRooms: privateRoomCount,
        groupRooms: groupRoomCount,
        memberSince: req.user.createdAt,
        lastSeen: req.user.lastSeen,
        status: req.user.status
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid user ID format'
      });
    }

    res.status(500).json({
      message: 'Internal server error while fetching user statistics'
    });
  }
});

module.exports = router;