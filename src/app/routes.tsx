import { createBrowserRouter, Navigate } from "react-router";
import { LoginPortal } from "./components/LoginPortal";
import { StudentDashboard } from "./components/StudentDashboard";
import { FacultyDashboard } from "./components/FacultyDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { LecturerPortal } from "./components/LecturerPortal";
import { appStorage } from './';

// Helper function to check auth
function checkAuth() {
  const currentUser = appStorage.getItem('current_user');
  if (!currentUser) return null;
  
  try {
    return JSON.parse(currentUser);
  } catch {
    return null;
  }
}

const handleLogin = (role: string) => {
  window.location.href = role === 'student' ? '/student' : 
                        role === 'lecturer' ? '/faculty' : 
                        role === 'admin' ? '/admin' : '/';
};

const handleLogout = () => {
  appStorage.removeItem('current_user');
  window.location.href = '/login';
};

export const router = createBrowserRouter([
  {
    path: "/login",
    loader: () => {
      const user = checkAuth();
      if (user) {
        const role = user.role || '';
        if (role === 'student') return new Response(null, { status: 302, headers: { Location: '/student' } });
        if (role === 'lecturer' || role === 'faculty') return new Response(null, { status: 302, headers: { Location: '/faculty' } });
        if (role === 'admin') return new Response(null, { status: 302, headers: { Location: '/admin' } });
      }
      return null;
    },
    element: <LoginPortal onLogin={handleLogin} />,
  },
  {
    path: "/student/*",
    loader: () => {
      const user = checkAuth();
      if (!user || user.role !== 'student') {
        return new Response(null, { status: 302, headers: { Location: '/login' } });
      }
      return null;
    },
    element: <StudentDashboard onLogout={handleLogout} />,
  },
  {
    path: "/faculty/*",
    loader: () => {
      const user = checkAuth();
      if (!user || user.role !== 'lecturer') {
        return new Response(null, { status: 302, headers: { Location: '/login' } });
      }
      return null;
    },
    element: <FacultyDashboard onLogout={handleLogout} />,
  },
  {
    path: "/admin/*",
    loader: () => {
      const user = checkAuth();
      if (!user || user.role !== 'admin') {
        return new Response(null, { status: 302, headers: { Location: '/login' } });
      }
      return null;
    },
    element: <AdminDashboard onLogout={handleLogout} />,
  },
  {
    path: "/lecturer-portal/*",
    element: <LecturerPortal onLogout={handleLogout} />,
  },
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);

