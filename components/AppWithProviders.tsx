import React from 'react';
import App from '../App';
import { ToastProvider } from '../contexts/ToastContext';
import ToastContainer from './Toast';
import ErrorBoundary from './ErrorBoundary';

const AppWithProviders: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <App />
        <ToastContainer />
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default AppWithProviders;
