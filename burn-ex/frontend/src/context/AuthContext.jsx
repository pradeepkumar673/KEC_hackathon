import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user on app start if token exists
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('burnex_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        setUser(data);
      } catch (error) {
        localStorage.removeItem('burnex_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    localStorage.setItem('burnex_token', data.token);
    setUser(data);
    return data;
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('burnex_token', data.token);
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('burnex_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
