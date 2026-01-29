import React, { useState } from 'react';
import { X, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup' | 'reset';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'reset') {
      if (!email) return;

      setLoading(true);
      try {
        await resetPassword(email);
        showToast('Password reset email sent! Check your inbox.', 'success');
        switchMode('signin');
      } catch (error: any) {
        console.error('Password reset error:', error);
        showToast(error.message || 'Failed to send reset email', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) return;

    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        showToast('Welcome back!', 'success');
        onClose();
      } else if (mode === 'signup') {
        await signUpWithEmail(email, password, name);
        showToast('Account created successfully!', 'success');
        onClose();
      }
    } catch (error: any) {
      console.error('Email auth error:', error);
      showToast(error.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setShowPassword(false);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
          <h2 className="text-xl font-semibold text-zinc-900">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* OAuth Coming Soon Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>Coming Soon:</strong> Sign in with Apple and Google will be available in the next update.
            </p>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} autoComplete="off" className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-colors"
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  required
                  className="w-full px-4 py-3 pl-11 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-colors"
                  placeholder="Enter your email"
                />
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                    required
                    className="w-full px-4 py-3 pr-11 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-colors"
                    placeholder="Enter your password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || (mode !== 'reset' && !password)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'reset' && 'Send Reset Email'}
                </>
              )}
            </button>
          </form>

          {/* Mode Switching */}
          <div className="text-center space-y-2">
            {mode === 'signin' && (
              <>
                <button
                  onClick={() => switchMode('signup')}
                  className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Don't have an account? <span className="font-medium">Sign up</span>
                </button>
                <br />
                <button
                  onClick={() => switchMode('reset')}
                  className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Forgot your password?
                </button>
              </>
            )}

            {mode === 'signup' && (
              <button
                onClick={() => switchMode('signin')}
                className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Already have an account? <span className="font-medium">Sign in</span>
              </button>
            )}

            {mode === 'reset' && (
              <button
                onClick={() => switchMode('signin')}
                className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Back to <span className="font-medium">Sign in</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
