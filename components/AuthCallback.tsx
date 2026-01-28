import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChefHat, Loader2 } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // This component is for OAuth callbacks (Google, Apple, etc.)
    // Since we're currently using email-based auth, redirect to home
    // In the future, this will handle OAuth provider callbacks

    if (!loading) {
      if (user) {
        // User is authenticated, redirect to app
        navigate('/');
      } else {
        // No user found, redirect to home
        navigate('/');
      }
    }
  }, [navigate, user, loading]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg">
          <ChefHat size={24} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="space-y-2">
          <Loader2 size={24} className="animate-spin text-zinc-400 mx-auto" />
          <p className="text-zinc-600 font-medium">Completing sign in...</p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
