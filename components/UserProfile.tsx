import React, { useState } from 'react';
import { User, LogOut, Edit3, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface UserProfileProps {
  className?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ className = '' }) => {
  const { user, signOut, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({ name: editName.trim() });
      setIsEditing(false);
      showToast('Profile updated successfully', 'success');
    } catch (error: any) {
      console.error('Profile update error:', error);
      showToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(user?.name || '');
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast('Signed out successfully', 'success');
    } catch (error: any) {
      console.error('Sign out error:', error);
      showToast(error.message || 'Failed to sign out', 'error');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user.name || 'User';
  const initials = getInitials(displayName);

  return (
    <div className={`card ${className}`}>
      <div className="flex items-start justify-between mb-6">
        <h3 className="heading-card">Account</h3>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>

      <div className="space-y-4">
        {/* Avatar and Basic Info */}
        <div className="flex items-center gap-4">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={displayName}
              className="w-16 h-16 rounded-full object-cover border-2 border-primary-100"
            />
          ) : (
            <div className="w-16 h-16 bg-primary-900 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">{initials}</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isEditing ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input flex-1 px-3 py-1.5 text-sm"
                    placeholder="Enter your name"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={loading}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <h4 className="font-semibold text-primary-900 truncate">{displayName}</h4>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded transition-colors"
                  >
                    <Edit3 size={12} />
                  </button>
                </>
              )}
            </div>
            <p className="text-sm text-primary-600 truncate">{user.email}</p>
          </div>
        </div>

        {/* Account Details */}
        <div className="pt-4 border-t border-primary-100 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-primary-600">Provider</span>
            <span className="text-primary-900 font-medium capitalize">{user.provider}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-primary-600">Member since</span>
            <span className="text-primary-900 font-medium">
              {new Date(user.created_at).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-primary-600">Account status</span>
            <span className={`font-medium ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-primary-600">Email verified</span>
            <span className={`font-medium ${user.email_verified ? 'text-green-600' : 'text-amber-600'}`}>
              {user.email_verified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="pt-4 border-t border-primary-100">
          <p className="text-xs text-primary-500 leading-relaxed">
            Your data is encrypted and stored securely. We never share your personal information
            or meal plans with third parties.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
