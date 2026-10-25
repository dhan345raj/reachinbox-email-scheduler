import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthContextType, UserResponse } from '../types';
import { authApi, TOKEN_KEY } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token') || localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState<boolean>(true);

  // Validate session on mount or when token changes
  const validateSession = useCallback(async () => {
    const storedToken = localStorage.getItem('token') || localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.getMe();
      if (response.success && response.data) {
        setUser(response.data);
      } else if ((response as any)?.email) {
        setUser(response as any);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  const login = async (credential: string) => {
    try {
      setLoading(true);
      const response = await authApi.loginGoogle(credential);
      if (response.success && response.data) {
        const { token: newToken, user: newUser } = response.data;
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);
        toast.success(`Welcome back, ${newUser.name || newUser.email}!`);
      } else if ((response as any)?.token && (response as any)?.user) {
        const { token: newToken, user: newUser } = response as any;
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);
        toast.success(`Welcome back, ${newUser.name || newUser.email}!`);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        'Authentication failed. Please try again.';
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout().catch(() => {
        // Ignore logout network errors to ensure local cleanup
      });
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getMe();
      if (response.success && response.data) {
        setUser(response.data);
      } else if ((response as any)?.email) {
        setUser(response as any);
      }
    } catch {
      // Ignore background refresh failure
    }
  };

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
