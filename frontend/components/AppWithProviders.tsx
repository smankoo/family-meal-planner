import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from '../App';
import { ToastProvider } from '../contexts/ToastContext';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import ToastContainer from './Toast';
import ErrorBoundary from './ErrorBoundary';
import ProtectedRoute from './ProtectedRoute';
import AuthCallback from './AuthCallback';

const AppWithProviders: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <AuthProvider>
            <ToastProvider>
              <Routes>
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/*" element={
                  <ProtectedRoute>
                    <App />
                  </ProtectedRoute>
                } />
              </Routes>
              <ToastContainer />
            </ToastProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default AppWithProviders;
