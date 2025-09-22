const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Room name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Room description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['private', 'group', 'public'],
    required: true,
    default: 'group'
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  avatar: {
    type: String,
    default: null
  },
  settings: {
    allowInvites: {
      type: Boolean,
      default: true
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    maxParticipants: {
      type: Number,
      default: 100,
      max: 1000
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
roomSchema.index({ type: 1 });
roomSchema.index({ participants: 1 });
roomSchema.index({ creator: 1 });
roomSchema.index({ lastActivity: -1 });

// For private chats, ensure only 2 participants
roomSchema.pre('save', function(next) {
  if (this.type === 'private' && this.participants.length > 2) {
    return next(new Error('Private rooms can only have 2 participants'));
  }
  next();
});

// Static method to create private room between two users
roomSchema.statics.createPrivateRoom = async function(user1Id, user2Id) {
  // Check if private room already exists between these users
  const existingRoom = await this.findOne({
    type: 'private',
    'participants.user': { $all: [user1Id, user2Id] }
  });

  if (existingRoom) {
    return existingRoom;
  }

  // Create new private room
  const privateRoom = new this({
    type: 'private',
    participants: [
      { user: user1Id, role: 'member' },
      { user: user2Id, role: 'member' }
    ],
    creator: user1Id,
    name: null // Private rooms don't have names
  });

  return await privateRoom.save();
};

// Static method to find rooms for a user
roomSchema.statics.findUserRooms = function(userId) {
  return this.find({
    'participants.user': userId,
    isActive: true
  })
  .populate('participants.user', 'username avatar status')
  .populate('creator', 'username avatar')
  .sort({ lastActivity: -1 });
};

// Instance method to add participant to room
roomSchema.methods.addParticipant = function(userId, role = 'member') {
  // Check if user is already a participant
  const existingParticipant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );

  if (existingParticipant) {
    throw new Error('User is already a participant in this room');
  }

  // Check max participants limit
  if (this.participants.length >= this.settings.maxParticipants) {
    throw new Error('Room has reached maximum participants limit');
  }

  this.participants.push({
    user: userId,
    role: role,
    joinedAt: new Date()
  });

  this.lastActivity = new Date();
  return this.save();
};

// Instance method to remove participant from room
roomSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(
    p => p.user.toString() !== userId.toString()
  );

  this.lastActivity = new Date();
  return this.save();
};

// Instance method to update participant role
roomSchema.methods.updateParticipantRole = function(userId, newRole) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );

  if (!participant) {
    throw new Error('User is not a participant in this room');
  }

  participant.role = newRole;
  this.lastActivity = new Date();
  return this.save();
};

// Instance method to check if user is admin or moderator
roomSchema.methods.isUserAdmin = function(userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  return participant && (participant.role === 'admin' || participant.role === 'moderator');
};

// Virtual to get room display name
roomSchema.virtual('displayName').get(function() {
  if (this.type === 'private') {
    // For private rooms, display name would be the other user's name
    // This would be handled in the frontend or when populating
    return 'Private Chat';
  }
  return this.name || 'Unnamed Room';
});

// Ensure virtual fields are serialized
roomSchema.set('toJSON', { virtuals: true });
roomSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Room', roomSchema);