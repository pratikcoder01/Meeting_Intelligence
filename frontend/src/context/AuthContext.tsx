import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { supabase } from '../utils/supabase';

interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  setError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/v1/auth/me');
      if (response.data?.success) {
        setUser(response.data.data);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        localStorage.setItem('accessToken', session.access_token);
        localStorage.setItem('refreshToken', session.refresh_token || '');
        void fetchProfile();
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        localStorage.setItem('accessToken', session.access_token);
        localStorage.setItem('refreshToken', session.refresh_token || '');
        await fetchProfile();
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      throw new Error(signInError.message);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setError(null);
    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (signUpError) {
      console.error('Supabase signUp error:', {
        message: signUpError.message,
        status: signUpError.status,
        name: signUpError.name,
      });

      // Provide actionable messages for common Supabase Auth errors
      let userMessage = signUpError.message;
      if (signUpError.status === 429) {
        userMessage = 'Too many signup attempts. Please wait a few minutes and try again.';
      } else if (signUpError.message === 'A server error has occurred') {
        userMessage = 'Supabase Auth encountered an internal error. Please try again in a few minutes, or check the Supabase Dashboard for service status.';
      }

      setError(userMessage);
      throw new Error(userMessage);
    }

    // If Supabase returns a user but no session, email confirmation is required
    if (data?.user && !data?.session) {
      setError('Please check your email to confirm your account before signing in.');
      return;
    }
  };

  const logout = async () => {
    setError(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        error,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
