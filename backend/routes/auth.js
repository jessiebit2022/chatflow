const express = require('express');
const User = require('../models/User');
const { authenticate, generateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'Username, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmailOrUsername(email);
    if (existingUser) {
      return res.status(409).json({
        message: 'User with this email or username already exists'
      });
    }

    // Check if username is already taken
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({
        message: 'Username is already taken'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data (without password) and token
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toPublicJSON()
    });

  } catch (error) {
    console.error('Registration error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors: errorMessages
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken`
      });
    }

    res.status(500).json({
      message: 'Internal server error during registration'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Basic validation
    if (!identifier || !password) {
      return res.status(400).json({
        message: 'Email/username and password are required'
      });
    }

    // Find user by email or username
    const user = await User.findByEmailOrUsername(identifier);
    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Update user status to online
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: user.toPublicJSON()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Internal server error during login'
    });
  }
});

// Verify token and get current user
router.get('/verify', authenticate, async (req, res) => {
  try {
    // Update last seen
    req.user.lastSeen = new Date();
    await req.user.save();

    res.json({
      message: 'Token is valid',
      user: req.user.toPublicJSON()
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      message: 'Internal server error during verification'
    });
  }
});

// Logout user
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Update user status to offline
    req.user.status = 'offline';
    req.user.lastSeen = new Date();
    await req.user.save();

    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Internal server error during logout'
    });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const updates = {};

    // Only update provided fields
    if (username) {
      // Check if new username is already taken by another user
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: req.user._id } 
      });
      
      if (existingUser) {
        return res.status(409).json({
          message: 'Username is already taken'
        });
      }
      
      updates.username = username;
    }

    if (avatar !== undefined) {
      updates.avatar = avatar;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'No valid fields to update'
      });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser.toPublicJSON()
    });

  } catch (error) {
    console.error('Profile update error:', error);

    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors: errorMessages
      });
    }

    res.status(500).json({
      message: 'Internal server error during profile update'
    });
  }
});

// Update user status
router.patch('/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['online', 'offline', 'away'].includes(status)) {
      return res.status(400).json({
        message: 'Valid status is required (online, offline, away)'
      });
    }

    req.user.status = status;
    req.user.lastSeen = new Date();
    await req.user.save();

    res.json({
      message: 'Status updated successfully',
      user: req.user.toPublicJSON()
    });

  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({
      message: 'Internal server error during status update'
    });
  }
});

module.exports = router;