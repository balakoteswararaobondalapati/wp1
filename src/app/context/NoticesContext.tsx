import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { noticesAPI } from '../api';
import { appStorage } from '../utils/storage';

export interface Notice {
  id: number;
  title: string;
  date: string;
  time?: string;
  preview: string;
  fullDescription: string;
  color: string;
  targetAudience?: 'students' | 'faculty' | 'all';
}

interface NoticesContextType {
  notices: Notice[];
  addNotice: (notice: Notice) => void;
  loadNotices: (userType?: 'student' | 'faculty') => void;
}

const NoticesContext = createContext<NoticesContextType | undefined>(undefined);

export function NoticesProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [userType, setUserType] = useState<'student' | 'faculty' | undefined>(undefined);

  const normalizeAudience = (raw: unknown): 'students' | 'faculty' | 'all' | undefined => {
    const value = String(raw || '').trim().toLowerCase();
    if (!value) return undefined;
    if (value === 'all' || value === 'everyone') return 'all';
    if (value === 'student' || value === 'students') return 'students';
    if (value === 'faculty' || value === 'lecturer' || value === 'staff' || value === 'teachers' || value === 'teacher') {
      return 'faculty';
    }
    return undefined;
  };

  const resolveUserType = (type?: 'student' | 'faculty') => {
    if (type) return type;
    if (userType) return userType;
    const currentUser = appStorage.getItem('current_user');
    if (currentUser) {
      try {
        const parsed = JSON.parse(currentUser);
        const role = String(parsed.role || '').toLowerCase();
        if (role === 'student') return 'student';
        if (role === 'faculty' || role === 'lecturer') return 'faculty';
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  const loadNotices = async (type?: 'student' | 'faculty') => {
    try {
      const resolvedType = resolveUserType(type);
      if (type) setUserType(type);

      const backendNotices = await noticesAPI.getAll();
      const currentUserType = resolvedType;

      const filteredNotices = (backendNotices || []).filter((notice: any) => {
        const audience = normalizeAudience(notice.targetAudience ?? notice.audience) || 'all';
        if (!currentUserType) return true;
        if (audience === 'all') return true;
        if (currentUserType === 'student' && audience === 'students') return true;
        if (currentUserType === 'faculty' && audience === 'faculty') return true;
        return false;
      });

      const transformedNotices = filteredNotices.map((notice: any) => ({
        id: notice.id,
        title: notice.title,
        date: notice.date || (notice.created_at ? new Date(notice.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }) : ''),
        time: notice.time || (notice.created_at ? new Date(notice.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }) : ''),
        preview: (notice.description || '').substring(0, 100),
        fullDescription: notice.description || '',
        color: notice.color || 'bg-blue-50 border-blue-200',
        targetAudience: normalizeAudience(notice.targetAudience ?? notice.audience) || 'all',
      }));

      setNotices(transformedNotices);
    } catch (error) {
      console.error('Failed to load notices', error);
    }
  };

  useEffect(() => {
    const currentUser = appStorage.getItem('current_user');
    if (currentUser) {
      loadNotices();
    } else {
      setNotices([]);
    }

    const handleNoticesUpdate = () => {
      const authedUser = appStorage.getItem('current_user');
      if (authedUser) {
        loadNotices();
      }
    };

    const intervalId = setInterval(() => {
      const authedUser = appStorage.getItem('current_user');
      if (authedUser) {
        loadNotices();
      }
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const authedUser = appStorage.getItem('current_user');
        if (authedUser) {
          loadNotices();
        }
      }
    };

    window.addEventListener('notices_updated', handleNoticesUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('notices_updated', handleNoticesUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [userType]);

  const addNotice = (notice: Notice) => {
    setNotices((prev) => [notice, ...prev]);
  };

  return <NoticesContext.Provider value={{ notices, addNotice, loadNotices }}>{children}</NoticesContext.Provider>;
}

export function useNotices() {
  const context = useContext(NoticesContext);
  if (context === undefined) {
    throw new Error('useNotices must be used within a NoticesProvider');
  }
  return context;
}
