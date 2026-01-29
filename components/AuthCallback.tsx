import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../config/supabase';
import { ChefHat, Loader2, Lock } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const type = searchParams.get('type');

    // Handle password recovery
    if (type === 'recovery') {
      setIsRecovery(true);
      return;
    }

    // Handle regular OAuth callbacks
    if (!loading) {
      if (user) {
        showToast('Successfully signed in!', 'success');
        navigate('/');
      } else {
        navigate('/');
      }
    }
  }, [navigate, user, loading, searchParams, showToast]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword, // pragma: allowlist secret
      });

      if (error) throw error;

      showToast('Password updated successfully!', 'success');
      navigate('/');
    } catch (error: any) {
      console.error('Password update error:', error);
      showToast(error.message || 'Failed to update password', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Show password reset form for recovery
  if (isRecovery) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
              <Lock size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-semibold text-zinc-900">Reset Password</h2>
            <p className="text-sm text-zinc-600">Enter your new password below</p>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-zinc-700 mb-2">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-colors"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-zinc-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-colors"
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={updating || !newPassword || !confirmPassword}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show loading state for regular callbacks
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
