import React, { useState } from 'react';
import { Users, Copy, Check, X, Zap } from 'lucide-react';
import FamilyMemberList, { FamilyMemberData } from './FamilyMemberList';

interface FamilyInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteUrl: string;
  onCreateInvite: () => Promise<void>;
  isCreatingInvite: boolean;
  members?: FamilyMemberData[];
  currentUserId?: string;
  onRemoveMember?: (userId: string) => Promise<void>;
  canRemoveMembers?: boolean;
}

const FamilyInviteModal: React.FC<FamilyInviteModalProps> = ({
  isOpen,
  onClose,
  inviteUrl,
  onCreateInvite,
  isCreatingInvite,
  members = [],
  currentUserId,
  onRemoveMember,
  canRemoveMembers = false
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCreateInvite = async () => {
    await onCreateInvite();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop animate-fade-in z-[100]"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="modal-container animate-modal-in z-[101]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-900 to-primary-700 rounded-2xl flex items-center justify-center shadow-sm">
                <Users size={22} className="text-white" />
              </div>
              <div>
                <h2 className="heading-card">Invite to Family</h2>
                <p className="text-xs text-primary-500">Collaborate on meal planning</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn-icon"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="modal-content space-y-6">
            {!inviteUrl ? (
              <>
                {/* Pre-invite state */}
                <div className="space-y-4">
                  <p className="text-body text-center">
                    Invite family members to plan meals together. Everyone can view, edit, and collaborate in real-time.
                  </p>

                  {/* What they'll get */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-primary-50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: 'var(--surface-primary)' }}>
                        <Users size={16} className="text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary-900">Shared meal plans</p>
                        <p className="text-xs text-primary-600 mt-0.5">
                          View and edit the same meal calendar
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-primary-50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: 'var(--surface-primary)' }}>
                        <Zap size={16} className="text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary-900">Real-time updates</p>
                        <p className="text-xs text-primary-600 mt-0.5">
                          Changes sync instantly across all devices
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateInvite}
                  disabled={isCreatingInvite}
                  className="btn-primary w-full"
                >
                  {isCreatingInvite ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating invite link...
                    </span>
                  ) : (
                    'Create Invite Link'
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Post-invite state */}
                <div className="space-y-5">
                  {/* Current Members */}
                  {members.length > 0 && (
                    <div className="space-y-3">
                      <label className="label-section">Family Members ({members.length})</label>
                      <FamilyMemberList
                        members={members}
                        currentUserId={currentUserId}
                        showRole={true}
                        onRemoveMember={onRemoveMember}
                        canRemoveMembers={canRemoveMembers}
                      />
                    </div>
                  )}

                  {/* Link section */}
                  <div className="space-y-3">
                    <label className="label-section">Invite Link</label>
                    <div className="space-y-2">
                      <textarea
                        readOnly
                        value={inviteUrl}
                        rows={2}
                        className="w-full text-sm text-primary-700 font-mono bg-primary-50 border border-primary-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary-900/10 cursor-text select-all resize-none"
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      />
                      <button
                        onClick={handleCopy}
                        className={`w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                          copied
                            ? 'bg-green-600 text-white shadow-sm'
                            : 'bg-primary-900 text-white hover:bg-primary-800 shadow-sm hover:shadow-md'
                        }`}
                      >
                        {copied ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <Check size={16} />
                            Copied to Clipboard
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1.5">
                            <Copy size={16} />
                            Copy Link
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Subtle privacy note */}
                    <p className="text-xs text-primary-500">
                      Anyone with this link can join your family.
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="btn-secondary w-full"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default FamilyInviteModal;
