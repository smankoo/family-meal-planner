import React from 'react';
import { Crown, User as UserIcon } from 'lucide-react';

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
}

const FamilyMemberList: React.FC<FamilyMemberListProps> = ({
  members,
  currentUserId,
  compact = false,
  showRole = true,
  maxDisplay
}) => {
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

  if (compact) {
    // Compact mode: Overlapping avatars
    return (
      <div className="flex items-center">
        <div className="flex -space-x-2">
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
                {member.user?.avatar_url ? (
                  <img
                    src={member.user.avatar_url}
                    alt={displayName}
                    className="w-8 h-8 rounded-full border-2 object-cover ring-1 ring-primary-200"
                    style={{ borderColor: 'var(--surface-bg)' }}
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary-900 rounded-full border-2 flex items-center justify-center ring-1 ring-primary-200" style={{ borderColor: 'var(--surface-bg)' }}>
                    <span className="text-white font-semibold text-xs">{initials}</span>
                  </div>
                )}
                {member.role === 'owner' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center" style={{ borderColor: 'var(--surface-bg)', borderWidth: '1px' }}>
                    <Crown size={8} className="text-amber-900" />
                  </div>
                )}
              </div>
            );
          })}
          {remainingCount > 0 && (
            <div className="w-8 h-8 bg-primary-200 rounded-full border-2 flex items-center justify-center ring-1 ring-primary-200" style={{ borderColor: 'var(--surface-bg)' }}>
              <span className="text-primary-700 font-semibold text-xs">+{remainingCount}</span>
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

        return (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
          >
            <div className="relative flex-shrink-0">
              {member.user?.avatar_url ? (
                <img
                  src={member.user.avatar_url}
                  alt={displayName}
                  className="w-10 h-10 rounded-full object-cover border-2 shadow-sm"
                  style={{ borderColor: 'var(--surface-bg)' }}
                />
              ) : (
                <div className="w-10 h-10 bg-primary-900 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white font-semibold text-sm">{initials}</span>
                </div>
              )}
              {member.role === 'owner' && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center border-2 shadow-sm" style={{ borderColor: 'var(--surface-bg)' }}>
                  <Crown size={10} className="text-amber-900" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-primary-900 truncate">
                  {displayName}
                  {isCurrentUser && <span className="text-primary-500 font-normal"> (You)</span>}
                </p>
              </div>
              <p className="text-xs text-primary-600 truncate">{member.user?.email}</p>
            </div>

            {showRole && (
              <div className="flex-shrink-0">
                {member.role === 'owner' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-medium">
                    <Crown size={10} />
                    Owner
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-200 text-primary-700 rounded-md text-xs font-medium">
                    <UserIcon size={10} />
                    Member
                  </span>
                )}
              </div>
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
