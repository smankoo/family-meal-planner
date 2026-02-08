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

  useEffect(() => {
    setAvatarError(false);
  }, [user?.id, user?.user_metadata?.avatar_url]);

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
    return name.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const displayName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const initials = getInitials(displayName);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="user-menu-trigger group"
        title={displayName}
      >
        {avatarUrl && !avatarError ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border border-primary-200 flex-shrink-0"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className="avatar-fallback w-6 h-6 md:w-7 md:h-7">
            <span className="text-[10px] md:text-xs">{initials}</span>
          </div>
        )}
        <span className="hidden md:block text-sm font-medium text-primary-700 max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown
          size={14}
          className={`hidden md:block text-primary-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-info">
            <div className="flex items-center gap-3">
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border-2 border-primary-100 flex-shrink-0"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="avatar-fallback w-10 h-10">
                  <span className="text-sm">{initials}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary-900 truncate text-sm">{displayName}</p>
                <p className="text-xs text-primary-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="py-2">
            {onOpenSettings && (
              <button
                onClick={() => { onOpenSettings(); setIsOpen(false); }}
                className="user-menu-item"
              >
                <SettingsIcon size={16} className="text-primary-400" />
                <span>Settings</span>
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="user-menu-footer">
            <div className="flex items-center justify-between text-xs">
              <span className="text-primary-500">Provider</span>
              <span className="text-primary-700 font-medium capitalize">
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
