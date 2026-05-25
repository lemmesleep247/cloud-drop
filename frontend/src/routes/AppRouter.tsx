import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../components/User/Login';
import Register from '../components/User/Register';
import Dashboard from '../components/User/Dashboard';
import FileUploader from '../components/FileUploader';
import axios from 'axios';
import Loading from '../components/Loading';

const AppRouter = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Use state for authentication status instead of deriving it from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to validate token
  const validateToken = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        setIsAuthenticated(true);
      } else {
        handleLogout();
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      handleLogout();
    } finally {
      setIsLoading(false);
    }
  };

  // Check token validity on mount
  useEffect(() => {
    validateToken();

    // Periodic validation (every 5 minutes)
    const intervalId = setInterval(() => {
      validateToken();
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  const handleLogin = (token: string) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true); // Update state instead of just setting localStorage
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  // Show loading screen while verifying token
  if (isLoading) {
    return <Loading message="Verifying your session..." />;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/register" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Register />
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/upload" 
          element={
            isAuthenticated ? <FileUploader onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="*" 
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </Router>
  );
};

export default AppRouter;
