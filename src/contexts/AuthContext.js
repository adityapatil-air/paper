import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockAPI } from '../data/mockData';
import { supabase, isSupabaseConfigured } from '../config/supabase';

const AuthContext = createContext();

// True when a backend JWT's `exp` claim is in the past (or the token can't be read).
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch (e) {
    return true;
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const safeStorageGet = (key) => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  };

  const safeStorageSet = (key, value) => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(key, value);
    } catch (e) {
      return;
    }
  };

  const safeStorageRemove = (key) => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.removeItem(key);
    } catch (e) {
      return;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const setUserFromSession = (session) => {
      if (!isMounted) return;
      if (session?.user) {
        const mappedUser = {
          id: session.user.id,
          email: session.user.email,
          name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email,
          role: 'author'
        };
        setUser(mappedUser);
        safeStorageSet('user', JSON.stringify(mappedUser));
      } else {
        setUser(null);
        safeStorageRemove('user');
      }
    };

    const init = async () => {
      let storedUser = safeStorageGet('user');
      const storedToken = safeStorageGet('authToken');

      // An expired backend session is signed out up front instead of showing a user
      // whose every request is rejected.
      if (storedUser && storedToken && isTokenExpired(storedToken)) {
        safeStorageRemove('user');
        safeStorageRemove('authToken');
        storedUser = null;
      }

      if (!isSupabaseConfigured) {
        if (storedUser && isMounted) {
          setUser(JSON.parse(storedUser));
        }
        if (isMounted) setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      // StrictMode runs this effect twice; the first run is cleaned up before getSession
      // resolves. Its late result must not touch state or storage, or a refresh signs the
      // user out.
      if (!isMounted) return;

      if (!error && data?.session) {
        setUserFromSession(data.session);
      } else if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
        safeStorageRemove('user');
      }

      setLoading(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // If you're logged in via backend mockAPI (stored in localStorage), Supabase can still
        // emit a null session on refresh; don't wipe the local session in that case.
        if (session?.user) {
          setUserFromSession(session);
          return;
        }

        const storedUser = safeStorageGet('user');
        if (!storedUser) {
          setUserFromSession(session);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    try {
      // Simulate API call
      const response = await mockAPI.login(email, password);
      if (response.success) {
        setUser(response.user);
        safeStorageSet('user', JSON.stringify(response.user));
        if (response.token) safeStorageSet('authToken', response.token);
        return { success: true, user: response.user };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const register = async (userData) => {
    try {
      // Simulate API call
      const response = await mockAPI.register(userData);
      if (response.success) {
        setUser(response.user);
        safeStorageSet('user', JSON.stringify(response.user));
        if (response.token) safeStorageSet('authToken', response.token);
        return { success: true, user: response.user };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    safeStorageRemove('user');
    safeStorageRemove('authToken');
    if (isSupabaseConfigured) {
      supabase.auth.signOut();
    }
  };

  const loginWithGoogle = async () => {
    const redirectTo =
      process.env.REACT_APP_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : undefined);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo
      }
    });
    if (error) throw error;
  };

  const value = {
    user,
    login,
    loginWithGoogle,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

