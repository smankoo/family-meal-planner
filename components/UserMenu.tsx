import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Settings as SettingsIcon, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface UserMenuProps {
  onOpenSettings?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onOpenSettings }) => {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Reset avatar error when user changes
  useEffect(() => {
    setAvatarError(false);
  }, [user?.id, user?.user_metadata?.avatar_url]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast('Signed out successfully', 'success');
      setIsOpen(false);
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

  const displayName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const initials = getInitials(displayName);

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-9 md:h-10 px-2 md:px-3 bg-white/60 backdrop-blur-sm shadow-sm border border-white/40 rounded-full hover:bg-white/80 transition-all group"
        title={displayName}
      >
        {/* Avatar */}
        {avatarUrl && !avatarError ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border border-zinc-200 flex-shrink-0"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className="w-6 h-6 md:w-7 md:h-7 bg-zinc-900 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-[10px] md:text-xs">{initials}</span>
          </div>
        )}

        {/* Name (hidden on mobile) */}
        <span className="hidden md:block text-sm font-medium text-zinc-700 max-w-[120px] truncate">
          {displayName}
        </span>

        {/* Chevron */}
        <ChevronDown
          size={14}
          className={`hidden md:block text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-xl shadow-modal border border-white/40 ring-1 ring-black/5 overflow-hidden animate-fade-in-up z-50">
          {/* User Info Section */}
          <div className="p-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border-2 border-zinc-100 flex-shrink-0"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">{initials}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-900 truncate text-sm">{displayName}</p>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {onOpenSettings && (
              <button
                onClick={() => {
                  onOpenSettings();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <SettingsIcon size={16} className="text-zinc-400" />
                <span>Settings</span>
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Footer Info */}
          <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Provider</span>
              <span className="text-zinc-700 font-medium capitalize">
                {user.app_metadata?.provider || 'email'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
