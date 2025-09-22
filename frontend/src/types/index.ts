// User types
export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  avatarUrl: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Room types
export interface Room {
  _id: string;
  name?: string;
  description?: string;
  type: 'private' | 'group' | 'public';
  participants: RoomParticipant[];
  creator: string | User;
  isActive: boolean;
  lastActivity: string;
  avatar?: string;
  settings: RoomSettings;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomParticipant {
  user: User;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
}

export interface RoomSettings {
  allowInvites: boolean;
  isPublic: boolean;
  maxParticipants: number;
}

// Message types
export interface Message {
  _id: string;
  content: string;
  sender: User;
  room: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  isEdited: boolean;
  editedAt?: string;
  readBy: MessageRead[];
  replyTo?: Message;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRead {
  user: string;
  readAt: string;
}

// Authentication types
export interface AuthUser {
  user: User;
  token: string;
}

export interface LoginRequest {
  identifier: string; // email or username
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// Socket event types
export interface SocketMessage {
  message: Message;
}

export interface SocketUserStatus {
  userId: string;
  status: 'online' | 'offline' | 'away';
  timestamp: string;
}

export interface SocketUserTyping {
  roomId: string;
  user: User;
  isTyping: boolean;
  timestamp: string;
}

export interface SocketRoomJoined {
  roomId: string;
  messages: Message[];
}

export interface SocketUserJoinedRoom {
  roomId: string;
  user: User;
  timestamp: string;
}

export interface SocketUserLeftRoom {
  roomId: string;
  user: User;
  timestamp: string;
}

export interface SocketMessagesRead {
  roomId: string;
  messageIds: string[];
  readBy: User;
  timestamp: string;
}

export interface SocketGroupCreated {
  room: Room;
}

export interface SocketAuthenticated {
  user: User;
  rooms: Room[];
}

export interface SocketRoomOnlineUsers {
  roomId: string;
  onlineUsers: User[];
}

// UI state types
export interface ChatState {
  currentRoom?: Room;
  rooms: Room[];
  messages: Record<string, Message[]>;
  onlineUsers: User[];
  typingUsers: Record<string, User[]>;
  isConnected: boolean;
  isLoading: boolean;
  error?: string;
}

export interface AuthState {
  user?: User;
  token?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
}

// Form types
export interface MessageFormData {
  content: string;
  replyTo?: string;
}

export interface GroupFormData {
  name: string;
  description?: string;
  participantIds: string[];
}

export interface ProfileFormData {
  username: string;
  avatar?: string;
}

// API response types
export interface ApiResponse<T> {
  message: string;
  data?: T;
  errors?: string[];
}

export interface UsersResponse {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    hasMore: boolean;
  };
}

export interface UserStatsResponse {
  stats: {
    totalRooms: number;
    privateRooms: number;
    groupRooms: number;
    memberSince: string;
    lastSeen: string;
    status: string;
  };
}

// Utility types
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
}

// Component prop types
export interface MessageItemProps {
  message: Message;
  currentUser: User;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
}

export interface RoomListItemProps {
  room: Room;
  isActive: boolean;
  unreadCount: number;
  onClick: (room: Room) => void;
}

export interface UserListItemProps {
  user: User;
  onClick?: (user: User) => void;
  showStatus?: boolean;
}

export interface TypingIndicatorProps {
  users: User[];
}

// Route types
export interface RouteParams {
  roomId?: string;
  userId?: string;
}

// Theme types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: string;
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}