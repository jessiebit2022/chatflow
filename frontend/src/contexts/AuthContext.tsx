import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, User, LoginRequest, RegisterRequest } from '../types';
import apiService from '../services/api';
import socketService from '../services/socket';

// Initial state
const initialState: AuthState = {
  user: undefined,
  token: undefined,
  isAuthenticated: false,
  isLoading: true,
  error: undefined,
};

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'CLEAR_ERROR' };

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: undefined,
      };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      };

    case 'AUTH_ERROR':
      return {
        ...state,
        user: undefined,
        token: undefined,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };

    case 'LOGOUT':
      return {
        ...state,
        user: undefined,
        token: undefined,
        isAuthenticated: false,
        isLoading: false,
        error: undefined,
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: undefined,
      };

    default:
      return state;
  }
};

// Context type
interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { username?: string; avatar?: string }) => Promise<void>;
  updateStatus: (status: 'online' | 'offline' | 'away') => Promise<void>;
  clearError: () => void;
  verifyToken: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = apiService.getAuthToken();
      const userString = localStorage.getItem('chatflow_user');

      if (token && userString) {
        try {
          dispatch({ type: 'AUTH_START' });
          
          // Verify token is still valid
          const response = await apiService.verifyToken();
          
          // Update localStorage with fresh user data
          localStorage.setItem('chatflow_user', JSON.stringify(response.user));
          
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: {
              user: response.user,
              token,
            },
          });

          // Connect to socket
          try {
            await socketService.connect(token);
          } catch (socketError) {
            console.error('Socket connection failed:', socketError);
            // Don't fail auth if socket connection fails
          }
          
        } catch (error) {
          console.error('Token verification failed:', error);
          // Clear invalid token
          apiService.clearAuthToken();
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });

      const response = await apiService.login(credentials);

      // Store token and user in localStorage
      apiService.setAuthToken(response.token);
      localStorage.setItem('chatflow_user', JSON.stringify(response.user));

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          token: response.token,
        },
      });

      // Connect to socket
      try {
        await socketService.connect(response.token);
      } catch (socketError) {
        console.error('Socket connection failed after login:', socketError);
        // Don't fail auth if socket connection fails
      }

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  // Register function
  const register = async (userData: RegisterRequest): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });

      const response = await apiService.register(userData);

      // Store token and user in localStorage
      apiService.setAuthToken(response.token);
      localStorage.setItem('chatflow_user', JSON.stringify(response.user));

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          token: response.token,
        },
      });

      // Connect to socket
      try {
        await socketService.connect(response.token);
      } catch (socketError) {
        console.error('Socket connection failed after registration:', socketError);
        // Don't fail auth if socket connection fails
      }

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Call logout endpoint if authenticated
      if (state.isAuthenticated) {
        try {
          await apiService.logout();
        } catch (error) {
          console.error('Logout API call failed:', error);
          // Continue with logout even if API call fails
        }
      }

      // Disconnect socket
      socketService.disconnect();

      // Clear localStorage
      apiService.clearAuthToken();

      dispatch({ type: 'LOGOUT' });

    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if there's an error
      socketService.disconnect();
      apiService.clearAuthToken();
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Update profile function
  const updateProfile = async (data: { username?: string; avatar?: string }): Promise<void> => {
    try {
      const response = await apiService.updateProfile(data);
      
      // Update localStorage
      localStorage.setItem('chatflow_user', JSON.stringify(response.user));
      
      dispatch({ type: 'UPDATE_USER', payload: response.user });
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Profile update failed';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  // Update status function
  const updateStatus = async (status: 'online' | 'offline' | 'away'): Promise<void> => {
    try {
      const response = await apiService.updateStatus(status);
      
      // Update localStorage
      localStorage.setItem('chatflow_user', JSON.stringify(response.user));
      
      dispatch({ type: 'UPDATE_USER', payload: response.user });
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Status update failed';
      console.error('Status update error:', errorMessage);
      // Don't dispatch error for status update failures as they're not critical
    }
  };

  // Verify token function
  const verifyToken = async (): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response = await apiService.verifyToken();
      const token = apiService.getAuthToken();
      
      if (!token) {
        throw new Error('No token found');
      }
      
      // Update localStorage
      localStorage.setItem('chatflow_user', JSON.stringify(response.user));
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          token,
        },
      });
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Token verification failed';
      apiService.clearAuthToken();
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  // Clear error function
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: AuthContextType = {
    state,
    login,
    register,
    logout,
    updateProfile,
    updateStatus,
    clearError,
    verifyToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};