const Message = require('../models/Message');
const Room = require('../models/Room');
const User = require('../models/User');
const { authenticateSocket } = require('../middleware/auth');

// Store connected users with their socket IDs
const connectedUsers = new Map();

const socketHandler = (io, socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Authenticate socket connection
  socket.use((packet, next) => {
    authenticateSocket(socket, next);
  });

  // Handle authentication success
  socket.on('authenticate', async (token) => {
    try {
      // Authentication middleware will add user to socket
      if (socket.user) {
        // Add user to connected users map
        connectedUsers.set(socket.user._id.toString(), {
          socketId: socket.id,
          user: socket.user,
          joinedRooms: new Set()
        });

        // Update user status to online
        await User.findByIdAndUpdate(socket.user._id, {
          status: 'online',
          lastSeen: new Date()
        });

        // Join user to their personal room for notifications
        socket.join(`user_${socket.user._id}`);

        // Get user's rooms and join them
        const userRooms = await Room.findUserRooms(socket.user._id);
        userRooms.forEach(room => {
          socket.join(room._id.toString());
          connectedUsers.get(socket.user._id.toString()).joinedRooms.add(room._id.toString());
        });

        // Emit successful authentication
        socket.emit('authenticated', {
          user: socket.user.toPublicJSON(),
          rooms: userRooms
        });

        // Broadcast user online status to all their rooms
        userRooms.forEach(room => {
          socket.to(room._id.toString()).emit('user_status_changed', {
            userId: socket.user._id,
            status: 'online',
            timestamp: new Date()
          });
        });

        console.log(`👤 User authenticated: ${socket.user.username} (${socket.user._id})`);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  });

  // Join a room
  socket.on('join_room', async (data) => {
    try {
      if (!socket.user) {
        return socket.emit('error', { message: 'Not authenticated' });
      }

      const { roomId } = data;

      // Verify user is participant in this room
      const room = await Room.findById(roomId);
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      const isParticipant = room.participants.some(
        p => p.user.toString() === socket.user._id.toString()
      );

      if (!isParticipant) {
        return socket.emit('error', { message: 'Access denied to room' });
      }

      // Join the room
      socket.join(roomId);
      connectedUsers.get(socket.user._id.toString())?.joinedRooms.add(roomId);

      // Get recent messages for the room
      const messages = await Message.getRecentMessages(roomId, 50);

      // Emit room joined confirmation with recent messages
      socket.emit('room_joined', {
        roomId,
        messages: messages.reverse() // Reverse to show oldest first
      });

      // Notify other room participants that user joined
      socket.to(roomId).emit('user_joined_room', {
        roomId,
        user: socket.user.toPublicJSON(),
        timestamp: new Date()
      });

      console.log(`👤 User ${socket.user.username} joined room: ${roomId}`);

    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Leave a room
  socket.on('leave_room', async (data) => {
    try {
      if (!socket.user) {
        return socket.emit('error', { message: 'Not authenticated' });
      }

      const { roomId } = data;

      socket.leave(roomId);
      connectedUsers.get(socket.user._id.toString())?.joinedRooms.delete(roomId);

      // Notify other room participants that user left
      socket.to(roomId).emit('user_left_room', {
        roomId,
        user: socket.user.toPublicJSON(),
        timestamp: new Date()
      });

      socket.emit('room_left', { roomId });

      console.log(`👤 User ${socket.user.username} left room: ${roomId}`);

    } catch (error) {
      console.error('Leave room error:', error);
      socket.emit('error', { message: 'Failed to leave room' });
    }
  });

  // Send message
  socket.on('send_message', async (data) => {
    try {
      if (!socket.user) {
        return socket.emit('error', { message: 'Not authenticated' });
      }

      const { roomId, content, replyTo } = data;

      // Validate input
      if (!content || content.trim().length === 0) {
        return socket.emit('error', { message: 'Message content is required' });
      }

      if (content.length > 1000) {
        return socket.emit('error', { message: 'Message too long' });
      }

      // Verify user is participant in this room
      const room = await Room.findById(roomId);
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      const isParticipant = room.participants.some(
        p => p.user.toString() === socket.user._id.toString()
      );

      if (!isParticipant) {
        return socket.emit('error', { message: 'Access denied to room' });
      }

      // Create message
      const message = new Message({
        content: content.trim(),
        sender: socket.user._id,
        room: roomId,
        replyTo: replyTo || null
      });

      await message.save();

      // Populate message data
      await message.populate('sender', 'username avatar status');
      if (replyTo) {
        await message.populate('replyTo', 'content sender');
      }

      // Update room's last activity
      room.lastActivity = new Date();
      await room.save();

      // Emit message to all room participants
      io.to(roomId).emit('new_message', {
        message: message.toObject()
      });

      console.log(`💬 Message sent in room ${roomId} by ${socket.user.username}`);

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    try {
      if (!socket.user) return;

      const { roomId, isTyping } = data;

      // Emit typing status to other room participants
      socket.to(roomId).emit('user_typing', {
        roomId,
        user: socket.user.toPublicJSON(),
        isTyping,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Typing indicator error:', error);
    }
  });

  // Mark messages as read
  socket.on('mark_messages_read', async (data) => {
    try {
      if (!socket.user) return;

      const { roomId, messageIds } = data;

      // Mark messages as read
      if (messageIds && messageIds.length > 0) {
        await Message.updateMany(
          {
            _id: { $in: messageIds },
            room: roomId,
            sender: { $ne: socket.user._id }
          },
          {
            $addToSet: {
              readBy: {
                user: socket.user._id,
                readAt: new Date()
              }
            }
          }
        );

        // Emit read receipt to message senders
        socket.to(roomId).emit('messages_read', {
          roomId,
          messageIds,
          readBy: socket.user.toPublicJSON(),
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('Mark messages read error:', error);
    }
  });

  // Create group room
  socket.on('create_group', async (data) => {
    try {
      if (!socket.user) {
        return socket.emit('error', { message: 'Not authenticated' });
      }

      const { name, description, participantIds } = data;

      if (!name || name.trim().length === 0) {
        return socket.emit('error', { message: 'Group name is required' });
      }

      // Create participants array including creator
      const participants = [
        { user: socket.user._id, role: 'admin' }
      ];

      // Add other participants
      if (participantIds && participantIds.length > 0) {
        // Verify all participant IDs are valid users
        const validUsers = await User.find({
          _id: { $in: participantIds },
          isActive: true
        }).select('_id');

        validUsers.forEach(user => {
          participants.push({ user: user._id, role: 'member' });
        });
      }

      // Create group room
      const room = new Room({
        name: name.trim(),
        description: description?.trim() || null,
        type: 'group',
        participants,
        creator: socket.user._id
      });

      await room.save();
      await room.populate('participants.user', 'username avatar status');

      // Join creator to the room
      socket.join(room._id.toString());
      connectedUsers.get(socket.user._id.toString())?.joinedRooms.add(room._id.toString());

      // Notify all participants about the new group
      participants.forEach(participant => {
        const userConnection = connectedUsers.get(participant.user.toString());
        if (userConnection) {
          io.to(userConnection.socketId).emit('group_created', {
            room: room.toObject()
          });
        }
      });

      socket.emit('group_created', {
        room: room.toObject()
      });

      console.log(`👥 Group created: ${name} by ${socket.user.username}`);

    } catch (error) {
      console.error('Create group error:', error);
      socket.emit('error', { message: 'Failed to create group' });
    }
  });

  // Get online users in room
  socket.on('get_room_online_users', async (data) => {
    try {
      if (!socket.user) return;

      const { roomId } = data;

      // Get room participants
      const room = await Room.findById(roomId).populate('participants.user', 'username avatar status');
      if (!room) return;

      // Filter online users
      const onlineUsers = room.participants
        .filter(p => {
          const userConnection = connectedUsers.get(p.user._id.toString());
          return userConnection && p.user.status === 'online';
        })
        .map(p => p.user.toPublicJSON());

      socket.emit('room_online_users', {
        roomId,
        onlineUsers
      });

    } catch (error) {
      console.error('Get room online users error:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    try {
      if (socket.user) {
        console.log(`👤 User disconnected: ${socket.user.username} (${socket.id})`);

        // Update user status to offline
        await User.findByIdAndUpdate(socket.user._id, {
          status: 'offline',
          lastSeen: new Date()
        });

        // Get user's joined rooms
        const userConnection = connectedUsers.get(socket.user._id.toString());
        if (userConnection) {
          // Notify all rooms that user went offline
          userConnection.joinedRooms.forEach(roomId => {
            socket.to(roomId).emit('user_status_changed', {
              userId: socket.user._id,
              status: 'offline',
              timestamp: new Date()
            });
          });

          // Remove from connected users
          connectedUsers.delete(socket.user._id.toString());
        }
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });
};

module.exports = socketHandler;