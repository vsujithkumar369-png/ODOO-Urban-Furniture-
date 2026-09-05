import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('uf-user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('uf-token') || null);

  const login = useCallback((tok, userData) => {
    setToken(tok);
    setUser(userData);
    localStorage.setItem('uf-token', tok);
    localStorage.setItem('uf-user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('uf-token');
    localStorage.removeItem('uf-user');
  }, []);

  const isAdmin      = user?.role === 'admin';
  const isAccountant = user?.role === 'accountant' || user?.role === 'admin';
  const isContact    = user?.role === 'contact';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, isAccountant, isContact }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
