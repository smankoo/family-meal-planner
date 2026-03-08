import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import LoadingScreen from './LoadingScreen';
import { ChefHat } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Show loading spinner while checking auth state
  if (loading) {
    return <LoadingScreen />;
  }

  // Show auth modal if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: 'var(--surface-bg)' }}>
        {/* Welcome Screen */}
        <div className="text-center space-y-8 max-w-md mx-auto">
          {/* Logo */}
          <div className="space-y-4">
            <div className="w-20 h-20 bg-primary-900 rounded-2xl flex items-center justify-center shadow-xl mx-auto">
              <ChefHat size={32} className="text-white dark:text-primary-50" strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-primary-900">Meal Planner</h1>
              <p className="text-primary-500 text-lg">
                Your AI-powered family meal planning assistant
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary-900 rounded-full mt-2 flex-shrink-0" />
              <p className="text-primary-600">
                <span className="font-medium">Smart meal planning</span> tailored to your family's preferences
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary-900 rounded-full mt-2 flex-shrink-0" />
              <p className="text-primary-600">
                <span className="font-medium">Automated prep strategies</span> to save you time
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary-900 rounded-full mt-2 flex-shrink-0" />
              <p className="text-primary-600">
                <span className="font-medium">Smart grocery lists</span> organized by category
              </p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => setShowAuthModal(true)}
            className="btn-primary w-full px-8 py-4 text-lg shadow-lg"
          >
            Get Started
          </button>

          {/* Privacy Note */}
          <p className="text-xs text-primary-400 leading-relaxed">
            Your meal plans and preferences are securely stored and never shared.
            Sign in to sync across all your devices.
          </p>
        </div>

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
