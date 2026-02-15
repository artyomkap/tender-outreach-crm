'use client';

import { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';
import { User, AuthResponse } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const token = Cookies.get('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const profile = await api.get<User>('/auth/profile');
      setUser(profile);
    } catch {
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    const data = await api.post<AuthResponse>('/auth/login', { email, password });
    Cookies.set('accessToken', data.accessToken, { sameSite: 'lax' });
    Cookies.set('refreshToken', data.refreshToken, { sameSite: 'lax' });
    setUser(data.user as User);
    return data;
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone?: string,
  ) => {
    const data = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      firstName,
      lastName,
      phone,
    });
    Cookies.set('accessToken', data.accessToken, { sameSite: 'lax' });
    Cookies.set('refreshToken', data.refreshToken, { sameSite: 'lax' });
    setUser(data.user as User);
    return data;
  };

  const logout = () => {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    setUser(null);
    window.location.href = '/login';
  };

  return { user, loading, login, register, logout, refetch: fetchProfile };
}
