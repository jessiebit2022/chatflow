import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  AuthUser, 
  LoginRequest, 
  RegisterRequest, 
  User, 
  UsersResponse, 
  Room,
  UserStatsResponse
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 seconds
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('chatflow_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, clear local storage and redirect to login
          localStorage.removeItem('chatflow_token');
          localStorage.removeItem('chatflow_user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication endpoints
  async register(data: RegisterRequest): Promise<AuthUser> {
    const response = await this.api.post<AuthUser>('/auth/register', data);
    return response.data;
  }

  async login(data: LoginRequest): Promise<AuthUser> {
    const response = await this.api.post<AuthUser>('/auth/login', data);
    return response.data;
  }

  async verifyToken(): Promise<{ user: User }> {
    const response = await this.api.get<{ user: User }>('/auth/verify');
    return response.data;
  }

  async logout(): Promise<{ message: string }> {
    const response = await this.api.post<{ message: string }>('/auth/logout');
    return response.data;
  }

  async updateProfile(data: { username?: string; avatar?: string }): Promise<{ user: User }> {
    const response = await this.api.put<{ user: User }>('/auth/profile', data);
    return response.data;
  }

  async updateStatus(status: 'online' | 'offline' | 'away'): Promise<{ user: User }> {
    const response = await this.api.patch<{ user: User }>('/auth/status', { status });
    return response.data;
  }

  // User endpoints
  async getUsers(params: {
    search?: string;
    status?: 'online' | 'offline' | 'away';
    limit?: number;
    page?: number;
  } = {}): Promise<UsersResponse> {
    const response = await this.api.get<UsersResponse>('/users', { params });
    return response.data;
  }

  async getUserById(id: string): Promise<{ user: User }> {
    const response = await this.api.get<{ user: User }>(`/users/${id}`);
    return response.data;
  }

  async getOnlineUsers(): Promise<{ onlineUsers: User[] }> {
    const response = await this.api.get<{ onlineUsers: User[] }>('/users/status/online');
    return response.data;
  }

  async searchUsers(query: string, limit: number = 10): Promise<{ users: User[] }> {
    const response = await this.api.get<{ users: User[] }>(`/users/search/${encodeURIComponent(query)}`, {
      params: { limit }
    });
    return response.data;
  }

  async getUserRooms(userId: string): Promise<{ rooms: Room[] }> {
    const response = await this.api.get<{ rooms: Room[] }>(`/users/${userId}/rooms`);
    return response.data;
  }

  async createPrivateRoom(userId: string): Promise<{ room: Room }> {
    const response = await this.api.post<{ room: Room }>(`/users/${userId}/private-room`);
    return response.data;
  }

  async getUserStats(userId: string): Promise<UserStatsResponse> {
    const response = await this.api.get<UserStatsResponse>(`/users/${userId}/stats`);
    return response.data;
  }

  // Utility methods
  setAuthToken(token: string): void {
    localStorage.setItem('chatflow_token', token);
  }

  clearAuthToken(): void {
    localStorage.removeItem('chatflow_token');
    localStorage.removeItem('chatflow_user');
  }

  getAuthToken(): string | null {
    return localStorage.getItem('chatflow_token');
  }

  // Health check
  async healthCheck(): Promise<{ message: string; timestamp: string }> {
    const response = await this.api.get<{ message: string; timestamp: string }>('/health');
    return response.data;
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;