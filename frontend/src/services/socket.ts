import { io, Socket } from 'socket.io-client';
import { 
  Message, 
  Room, 
  User, 
  SocketMessage, 
  SocketUserStatus, 
  SocketUserTyping,
  SocketRoomJoined,
  SocketUserJoinedRoom,
  SocketUserLeftRoom,
  SocketMessagesRead,
  SocketGroupCreated,
  SocketAuthenticated,
  SocketRoomOnlineUsers,
  GroupFormData
} from '../types';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export type SocketEventCallback = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private eventCallbacks: Map<string, SocketEventCallback[]> = new Map();
  private isConnected: boolean = false;

  // Connect to socket server
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.socket) {
          this.disconnect();
        }

        this.socket = io(SOCKET_URL, {
          auth: {
            token
          },
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true
        });

        // Connection events
        this.socket.on('connect', () => {
          console.log('🔌 Connected to server');
          this.isConnected = true;
          
          // Authenticate after connection
          this.socket?.emit('authenticate', token);
        });

        this.socket.on('authenticated', (data: SocketAuthenticated) => {
          console.log('✅ Authentication successful');
          this.triggerCallback('authenticated', data);
          resolve();
        });

        this.socket.on('auth_error', (error: any) => {
          console.error('❌ Authentication failed:', error);
          this.triggerCallback('auth_error', error);
          reject(new Error(error.message || 'Authentication failed'));
        });

        this.socket.on('disconnect', () => {
          console.log('🔌 Disconnected from server');
          this.isConnected = false;
          this.triggerCallback('disconnect');
        });

        this.socket.on('connect_error', (error: any) => {
          console.error('🔌 Connection error:', error);
          this.triggerCallback('connect_error', error);
          reject(error);
        });

        // Chat events
        this.socket.on('new_message', (data: SocketMessage) => {
          this.triggerCallback('new_message', data);
        });

        this.socket.on('room_joined', (data: SocketRoomJoined) => {
          this.triggerCallback('room_joined', data);
        });

        this.socket.on('room_left', (data: { roomId: string }) => {
          this.triggerCallback('room_left', data);
        });

        this.socket.on('user_joined_room', (data: SocketUserJoinedRoom) => {
          this.triggerCallback('user_joined_room', data);
        });

        this.socket.on('user_left_room', (data: SocketUserLeftRoom) => {
          this.triggerCallback('user_left_room', data);
        });

        this.socket.on('user_typing', (data: SocketUserTyping) => {
          this.triggerCallback('user_typing', data);
        });

        this.socket.on('user_status_changed', (data: SocketUserStatus) => {
          this.triggerCallback('user_status_changed', data);
        });

        this.socket.on('messages_read', (data: SocketMessagesRead) => {
          this.triggerCallback('messages_read', data);
        });

        this.socket.on('group_created', (data: SocketGroupCreated) => {
          this.triggerCallback('group_created', data);
        });

        this.socket.on('room_online_users', (data: SocketRoomOnlineUsers) => {
          this.triggerCallback('room_online_users', data);
        });

        this.socket.on('error', (error: any) => {
          console.error('🔴 Socket error:', error);
          this.triggerCallback('error', error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // Disconnect from socket server
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting from server');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventCallbacks.clear();
    }
  }

  // Check if connected
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Join a room
  joinRoom(roomId: string): void {
    if (this.socket) {
      this.socket.emit('join_room', { roomId });
    }
  }

  // Leave a room
  leaveRoom(roomId: string): void {
    if (this.socket) {
      this.socket.emit('leave_room', { roomId });
    }
  }

  // Send a message
  sendMessage(roomId: string, content: string, replyTo?: string): void {
    if (this.socket) {
      this.socket.emit('send_message', {
        roomId,
        content,
        replyTo
      });
    }
  }

  // Send typing indicator
  sendTyping(roomId: string, isTyping: boolean): void {
    if (this.socket) {
      this.socket.emit('typing', {
        roomId,
        isTyping
      });
    }
  }

  // Mark messages as read
  markMessagesRead(roomId: string, messageIds: string[]): void {
    if (this.socket) {
      this.socket.emit('mark_messages_read', {
        roomId,
        messageIds
      });
    }
  }

  // Create group
  createGroup(data: GroupFormData): void {
    if (this.socket) {
      this.socket.emit('create_group', {
        name: data.name,
        description: data.description,
        participantIds: data.participantIds
      });
    }
  }

  // Get online users in room
  getRoomOnlineUsers(roomId: string): void {
    if (this.socket) {
      this.socket.emit('get_room_online_users', { roomId });
    }
  }

  // Event listener management
  on(event: string, callback: SocketEventCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)?.push(callback);
  }

  off(event: string, callback?: SocketEventCallback): void {
    if (callback) {
      const callbacks = this.eventCallbacks.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    } else {
      this.eventCallbacks.delete(event);
    }
  }

  // Trigger callbacks for an event
  private triggerCallback(event: string, ...args: any[]): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in socket event callback for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Clean up all event listeners
  removeAllListeners(): void {
    this.eventCallbacks.clear();
  }
}

// Create and export a singleton instance
const socketService = new SocketService();
export default socketService;