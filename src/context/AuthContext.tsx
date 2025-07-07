import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AuthState, User } from '../types';
import { getCurrentUser } from '../api';

interface AuthContextType {
  auth: AuthState;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isAdmin: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>(initialState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token is valid
          const decoded = jwtDecode(token);
          const currentTime = Date.now() / 1000;
          
          if ((decoded.exp as number) < currentTime) {
            // Token expired
            localStorage.removeItem('token');
            setAuth(initialState);
          } else {
            // Token valid, get current user
            const user = await getCurrentUser();
            setAuth({
              user,
              token,
              isAuthenticated: true,
              isAdmin: user.role === 'admin',
            });
          }
        } catch (error) {
          console.error('Auth error:', error);
          localStorage.removeItem('token');
          setAuth(initialState);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    setAuth({
      user,
      token,
      isAuthenticated: true,
      isAdmin: user.role === 'admin',
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuth(initialState);
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};