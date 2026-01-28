import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiService, User, AuthResponse } from '../services/apiService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { name?: string; avatar_url?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        if (apiService.isAuthenticated()) {
          // Verify token and get user info
          const currentUser = await apiService.getCurrentUser();
          if (mounted) {
            setUser(currentUser);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Token might be invalid, clear it
        apiService.clearToken();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const authResponse = await apiService.login(email, password);
    setUser(authResponse.user);
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const authResponse = await apiService.register(email, password, name);
    setUser(authResponse.user);
  };

  const signOut = async () => {
    await apiService.logout();
    setUser(null);
  };

  const updateProfile = async (updates: { name?: string; avatar_url?: string }) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    const updatedUser = await apiService.updateUser(updates);
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
