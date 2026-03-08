import React, { useState, useEffect } from 'react';
import { Crown, UserMinus } from 'lucide-react';

export interface FamilyMemberData {
  id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
}

interface FamilyMemberListProps {
  members: FamilyMemberData[];
  currentUserId?: string;
  compact?: boolean;
  showRole?: boolean;
  maxDisplay?: number;
  onRemoveMember?: (userId: string) => Promise<void>;
  canRemoveMembers?: boolean;
}

const FamilyMemberList: React.FC<FamilyMemberListProps> = ({
  members,
  currentUserId,
  compact = false,
  showRole = true,
  maxDisplay,
  onRemoveMember,
  canRemoveMembers = false
}) => {
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [brokenAvatars, setBrokenAvatars] = useState<Set<string>>(new Set());

  // Reset broken avatars when members change so transient failures don't stick
  useEffect(() => {
    setBrokenAvatars(new Set());
  }, [members]);

  const handleAvatarError = (memberId: string) => {
    setBrokenAvatars(prev => new Set(prev).add(memberId));
  };

  const hasValidAvatar = (member: FamilyMemberData) => {
    return member.user?.avatar_url && !brokenAvatars.has(member.id);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = (member: FamilyMemberData) => {
    if (member.user?.name) return member.user.name;
    if (member.user?.email) return member.user.email.split('@')[0];
    return 'User';
  };

  const displayMembers = maxDisplay ? members.slice(0, maxDisplay) : members;
  const remainingCount = maxDisplay && members.length > maxDisplay ? members.length - maxDisplay : 0;

  const handleRemoveMember = async (userId: string) => {
    if (!onRemoveMember) return;

    setRemovingUserId(userId);
    try {
      await onRemoveMember(userId);
    } catch (error) {
      console.error('Failed to remove member:', error);
    } finally {
      setRemovingUserId(null);
    }
  };

  const canRemove = (member: FamilyMemberData) => {
    if (!canRemoveMembers || !onRemoveMember) return false;
    if (member.user_id === currentUserId) return false; // Can't remove yourself
    if (member.role === 'owner') return false; // Can't remove owners
    return true;
  };

  if (compact) {
    // Compact mode: Overlapping avatars
    return (
      <div className="flex items-center">
        <div className="flex -space-x-1.5">
          {displayMembers.map((member) => {
            const displayName = getDisplayName(member);
            const initials = getInitials(displayName);
            const isCurrentUser = currentUserId === member.user_id;

            return (
              <div
                key={member.id}
                className="relative group"
                title={`${displayName}${isCurrentUser ? ' (You)' : ''}${member.role === 'owner' ? ' - Owner' : ''}`}
              >
                {hasValidAvatar(member) ? (
                  <img
                    src={member.user!.avatar_url!}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full border-2 object-cover ring-1 ring-primary-200"
                    style={{ borderColor: 'var(--surface-bg)' }}
                    onError={() => handleAvatarError(member.id)}
                  />
                ) : (
                  <div className="w-7 h-7 bg-primary-900 rounded-full border-2 flex items-center justify-center ring-1 ring-primary-200" style={{ borderColor: 'var(--surface-bg)' }}>
                    <span className="text-white font-semibold text-[10px]">{initials}</span>
                  </div>
                )}
                {member.role === 'owner' && (
                  <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center" style={{ borderColor: 'var(--surface-bg)', borderWidth: '1px' }}>
                    <Crown size={7} className="text-amber-900" />
                  </div>
                )}
              </div>
            );
          })}
          {remainingCount > 0 && (
            <div className="w-7 h-7 bg-primary-200 rounded-full border-2 flex items-center justify-center ring-1 ring-primary-200" style={{ borderColor: 'var(--surface-bg)' }}>
              <span className="text-primary-700 font-semibold text-[10px]">+{remainingCount}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full mode: List with details
  return (
    <div className="space-y-2">
      {displayMembers.map((member) => {
        const displayName = getDisplayName(member);
        const initials = getInitials(displayName);
        const isCurrentUser = currentUserId === member.user_id;
        const showRemoveButton = canRemove(member);
        const isRemoving = removingUserId === member.user_id;

        return (
          <div
            key={member.id}
            className="family-member-row group"
          >
            <div className="relative flex-shrink-0">
              {hasValidAvatar(member) ? (
                <img
                  src={member.user!.avatar_url!}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border-2 shadow-sm"
                  style={{ borderColor: 'var(--surface-bg)' }}
                  onError={() => handleAvatarError(member.id)}
                />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: 'var(--text-primary)' }}>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-inverted)' }}>{initials}</span>
                </div>
              )}
              {member.role === 'owner' && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center border-2 shadow-sm" style={{ borderColor: 'var(--surface-bg)' }}>
                  <Crown size={10} className="text-amber-900" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-primary-900 truncate">
                  {displayName}
                </p>
                {isCurrentUser && <span className="text-xs text-primary-500 flex-shrink-0">(You)</span>}
                {showRole && (
                  <span className="family-member-role-inline">
                    {member.role === 'owner' ? 'Owner' : 'Member'}
                  </span>
                )}
              </div>
              <p className="text-xs text-primary-600 truncate">{member.user?.email}</p>
            </div>

            {showRemoveButton && (
              <button
                onClick={() => handleRemoveMember(member.user_id)}
                disabled={isRemoving}
                className="btn-icon-sm text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 flex-shrink-0"
                title="Remove member"
                aria-label={`Remove ${displayName}`}
              >
                {isRemoving ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <UserMinus size={16} />
                )}
              </button>
            )}
          </div>
        );
      })}
      {remainingCount > 0 && (
        <div className="text-center py-2">
          <span className="text-sm text-primary-600">
            +{remainingCount} more {remainingCount === 1 ? 'member' : 'members'}
          </span>
        </div>
      )}
    </div>
  );
};

export default FamilyMemberList;
