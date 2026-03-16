import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPortal } from "./components/LoginPortal";
import { StudentDashboard } from "./components/StudentDashboard";
import { FacultyDashboard } from "./components/FacultyDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { LecturerPortal } from "./components/LecturerPortal";
import { NoticesProvider } from "./context/NoticesContext";
import { ProfilePhotoProvider } from "./context/ProfilePhotoContext";
import { Toaster } from "./components/ui/sonner";
import { authAPI } from "./api";
import { appStorage } from "./utils/storage";

export default function App() {
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [isBootstrapping, setIsBootstrapping] = React.useState(true);

  React.useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const user = await authAPI.me();
        setCurrentUser(user);
        appStorage.setItem("current_user", JSON.stringify(user));
      } catch {
        setCurrentUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrapSession();
  }, []);

  const handleLogin = (role: string) => {
    const storedUser = appStorage.getItem("current_user");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {
        setCurrentUser(null);
      }
    }

    const targetPath =
      role === "student"
        ? "/student"
        : role === "lecturer"
          ? "/faculty"
          : role === "admin"
            ? "/admin"
            : "/login";

    window.history.pushState({}, "", targetPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleLogout = () => {
    authAPI.logout();
    setCurrentUser(null);
    window.history.pushState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  
  if (isBootstrapping) {
    return null;
  }

  return (
    <BrowserRouter>
      <ProfilePhotoProvider>
        <NoticesProvider>
          <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              currentUser ? (
                currentUser.role === 'student' ? <Navigate to="/student" replace /> :
                currentUser.role === 'lecturer' ? <Navigate to="/faculty" replace /> :
                currentUser.role === 'admin' ? <Navigate to="/admin" replace /> :
                <LoginPortal onLogin={handleLogin} />
              ) : (
                <LoginPortal onLogin={handleLogin} />
              )
            } 
          />

          {/* Protected Routes */}
          <Route 
            path="/student/*" 
            element={
              !currentUser ? (
                <Navigate to="/login" replace />
              ) : currentUser.role !== 'student' ? (
                <Navigate to="/login" replace />
              ) : (
                <StudentDashboard onLogout={handleLogout} />
              )
            } 
          />

          <Route 
            path="/faculty/*" 
            element={
              !currentUser ? (
                <Navigate to="/login" replace />
              ) : currentUser.role !== 'lecturer' ? (
                <Navigate to="/login" replace />
              ) : (
                <FacultyDashboard onLogout={handleLogout} />
              )
            } 
          />

          <Route 
            path="/admin/*" 
            element={
              !currentUser ? (
                <Navigate to="/login" replace />
              ) : currentUser.role !== 'admin' ? (
                <Navigate to="/login" replace />
              ) : (
                <AdminDashboard onLogout={handleLogout} />
              )
            } 
          />

          {/* Lecturer Portal - Special route */}
          <Route 
            path="/lecturer-portal/*" 
            element={<LecturerPortal onLogout={handleLogout} />} 
          />

          {/* Default redirect */}
          <Route 
            path="/" 
            element={<Navigate to="/login" replace />} 
          />

          {/* Catch all - redirect to login */}
          <Route 
            path="*" 
            element={<Navigate to="/login" replace />} 
          />
        </Routes>
        <Toaster />
      </NoticesProvider>
      </ProfilePhotoProvider>
    </BrowserRouter>
  );
}

