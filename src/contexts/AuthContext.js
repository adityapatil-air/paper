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
    // storage unavailable (private mode): the session lasts for this tab only
  }
};

const safeStorageRemove = (key) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch (e) {
    // ignore
  }
};

// The backend session (user + JWT) kept in localStorage, if it is still valid.
const readStoredSession = () => {
  const storedUser = safeStorageGet('user');
  const token = safeStorageGet('authToken');
  if (!storedUser || !token || isTokenExpired(token)) return null;
  try {
    return { user: JSON.parse(storedUser), token };
  } catch (e) {
    return null;
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

  const storeSession = (nextUser, token) => {
    setUser(nextUser);
    safeStorageSet('user', JSON.stringify(nextUser));
    if (token) safeStorageSet('authToken', token);
  };

  const clearSession = () => {
    setUser(null);
    safeStorageRemove('user');
    safeStorageRemove('authToken');
  };

  useEffect(() => {
    let isMounted = true;
    let exchanging = null;

    // A Google sign-in (Supabase session) is exchanged once for an IJEPA account and backend
    // session, so Google users can use every protected feature like password users.
    const adoptGoogleSession = async (session) => {
      const stored = readStoredSession();
      if (stored && String(stored.user?.email || '').toLowerCase() === String(session.user?.email || '').toLowerCase()) {
        if (isMounted) setUser(stored.user);
        return;
      }
      if (!exchanging) exchanging = mockAPI.googleExchange(session.access_token).finally(() => { exchanging = null; });
      const result = await exchanging;
      if (!isMounted) return;
      if (result.success) {
        storeSession(result.user, result.token);
      } else {
        clearSession();
        supabase.auth.signOut();
      }
    };

    const init = async () => {
      const stored = readStoredSession();
      if (!stored) {
        safeStorageRemove('user');
        safeStorageRemove('authToken');
      }

      if (!isSupabaseConfigured) {
        if (stored && isMounted) setUser(stored.user);
        if (isMounted) setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      // StrictMode runs this effect twice; the first run is cleaned up before getSession
      // resolves. Its late result must not touch state or storage.
      if (!isMounted) return;

      if (!error && data?.session?.user) {
        await adoptGoogleSession(data.session);
      } else if (stored) {
        setUser(stored.user);
      } else {
        setUser(null);
      }

      if (isMounted) setLoading(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // Password users have no Supabase session, so a null session must not sign them out.
      if (event === 'SIGNED_IN' && session?.user) adoptGoogleSession(session);
      // Supabase strips its token fragment from the OAuth redirect but leaves a bare "#" in the URL.
      if (typeof window !== 'undefined' && window.location.href.endsWith('#')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await mockAPI.login(email, password);
      if (response.success) {
        storeSession(response.user, response.token);
        return { success: true, user: response.user };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  // Step 1 of registration: emails a verification code. Returns { success, verifyToken, email }.
  const startRegistration = (userData) => mockAPI.registerStart(userData);

  // Step 2: checks the code, creates the account and signs in.
  const completeRegistration = async (verifyToken, code) => {
    const response = await mockAPI.registerVerify(verifyToken, code);
    if (response.success) {
      storeSession(response.user, response.token);
      return { success: true, user: response.user };
    }
    return { success: false, error: response.error, code: response.code };
  };

  const logout = () => {
    clearSession();
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
    startRegistration,
    completeRegistration,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
