import React, { useState, useEffect } from 'react';
import { X, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../config/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup' | 'reset';
type AuthStep = 'email' | 'password';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset step when mode changes
  useEffect(() => {
    setStep('email');
  }, [mode]);

  if (!isOpen) return null;

  const handleContinueWithEmail = () => {
    if (!email) return;
    setStep('password');
  };

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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // For local development, let Supabase handle the redirect
          // It will use the site_url from config.toml
          redirectTo: import.meta.env.VITE_ENVIRONMENT === 'development'
            ? undefined
            : `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      // The user will be redirected to Google's consent screen
      // After consent, they'll be redirected back to /auth/callback
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      showToast(error.message || 'Failed to sign in with Google', 'error');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setShowPassword(false);
    setStep('email');
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  const handleBackToEmail = () => {
    setStep('email');
    setPassword('');
  };

  const getTitle = () => {
    if (mode === 'reset') return 'Reset your password';
    if (mode === 'signup') return 'Create your account';
    return 'Log in or sign up';
  };

  const getSubtitle = () => {
    if (mode === 'reset') return 'Enter your email to receive a reset link';
    if (mode === 'signup') return 'Join to start planning delicious meals';
    return 'Welcome to Family Meal Planner';
  };

  return (
    <div className="modal-backdrop">
      {/* Glassmorphic backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md modal-container overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 backdrop-blur-sm" style={{ backgroundColor: 'var(--surface-glass)' }}>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-full text-primary-400 hover:text-primary-600 flex items-center justify-center transition-all"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-secondary)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="pr-8">
            <h2 className="text-2xl font-semibold text-primary-900 mb-2">
              {getTitle()}
            </h2>
            <p className="text-sm text-primary-500">
              {getSubtitle()}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 space-y-5">
          {/* Email Step */}
          {step === 'email' && (
            <form onSubmit={(e) => {
              e.preventDefault();
              if (mode === 'reset') {
                handleEmailAuth(e);
              } else {
                handleContinueWithEmail();
              }
            }} className="space-y-4 animate-fade-in-up">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-primary-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                  className="input text-base"
                  placeholder="you@example.com"
                />
              </div>

              <div className={`grid transition-all duration-300 ease-out ${email ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3.5 mt-4"
                  >
                    {loading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      mode === 'reset' ? 'Send reset link' : 'Continue'
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Divider */}
          {step === 'email' && mode !== 'reset' && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-primary-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="auth-divider-text">OR</span>
              </div>
            </div>
          )}

          {/* Google Sign-In Button */}
          {step === 'email' && mode !== 'reset' && (
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-primary-300 rounded-button font-medium text-primary-900 hover:bg-primary-50 hover:border-primary-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
              style={{ backgroundColor: 'var(--surface-primary)' }}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          )}

          {/* Password Step */}
          {step === 'password' && mode !== 'reset' && (
            <form onSubmit={handleEmailAuth} className="space-y-4 animate-fade-in-up">
              {/* Show email with edit option */}
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  Email address
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-3 bg-primary-50 border border-primary-200 rounded-input text-primary-700 text-base">
                    {email}
                  </div>
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="text-sm font-medium text-primary-600 hover:text-primary-900 transition-colors px-3 py-2"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-primary-700 mb-2">
                    Full name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="input text-base"
                    placeholder="Your name"
                  />
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-primary-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    autoFocus
                    required
                    className="input pr-11 text-base"
                    placeholder={mode === 'signup' ? 'Create a password (min. 6 characters)' : 'Enter your password'}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 transition-colors p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3.5"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  mode === 'signin' ? 'Sign in' : 'Create account'
                )}
              </button>
            </form>
          )}

          {/* Mode Switching */}
          <div className="text-center space-y-3 pt-2">
            {mode === 'signin' && step === 'email' && (
              <>
                <div className="text-sm text-primary-600">
                  Don't have an account?{' '}
                  <button
                    onClick={() => switchMode('signup')}
                    className="font-semibold text-primary-900 hover:text-accent-600 transition-colors"
                  >
                    Sign up
                  </button>
                </div>
              </>
            )}

            {mode === 'signin' && step === 'password' && (
              <button
                onClick={() => switchMode('reset')}
                className="text-sm font-medium text-primary-600 hover:text-primary-900 transition-colors"
              >
                Forgot password?
              </button>
            )}

            {mode === 'signup' && (
              <div className="text-sm text-primary-600">
                Already have an account?{' '}
                <button
                  onClick={() => switchMode('signin')}
                  className="font-semibold text-primary-900 hover:text-accent-600 transition-colors"
                >
                  Sign in
                </button>
              </div>
            )}

            {mode === 'reset' && (
              <button
                onClick={() => switchMode('signin')}
                className="text-sm font-medium text-primary-600 hover:text-primary-900 transition-colors"
              >
                ← Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
