import React, { useState } from 'react';
import { Users, Copy, Check, X, Shield } from 'lucide-react';

interface FamilyInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteUrl: string;
  onCreateInvite: () => Promise<void>;
  isCreatingInvite: boolean;
}

const FamilyInviteModal: React.FC<FamilyInviteModalProps> = ({
  isOpen,
  onClose,
  inviteUrl,
  onCreateInvite,
  isCreatingInvite
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
      {/* Backdrop - lighter, more sophisticated */}
      <div
        className="modal-backdrop animate-fade-in"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="modal-container animate-modal-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shadow-sm">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <h2 className="heading-card">Invite Family</h2>
                <p className="text-xs text-zinc-500">Share your meal plan</p>
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
          <div className="modal-content space-y-5">
            {!inviteUrl ? (
              <>
                {/* Pre-invite state */}
                <p className="text-body">
                  Create an invite link to collaborate on meal planning with your family. Everyone can view and edit together in real-time.
                </p>

                {/* Feature highlight */}
                <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-xl">
                  <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users size={16} className="text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-800">Real-time collaboration</p>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      Changes sync instantly for all family members.
                    </p>
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
                      Creating...
                    </span>
                  ) : (
                    'Create Invite Link'
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Post-invite state - compact and balanced */}
                <div className="bg-zinc-50 rounded-xl p-4 space-y-4">
                  <p className="text-sm text-zinc-600">
                    Share this link with family members to collaborate together.
                  </p>

                  {/* URL input row */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteUrl}
                      className="text-sm text-zinc-700 font-mono bg-white border border-zinc-200 rounded-lg px-3 py-2.5 flex-1 min-w-0 outline-none focus:ring-2 focus:ring-zinc-900/10 cursor-text select-all"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={handleCopy}
                      className={`flex-shrink-0 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        copied
                          ? 'bg-green-600 text-white'
                          : 'bg-zinc-900 text-white hover:bg-zinc-800'
                      }`}
                    >
                      {copied ? (
                        <span className="flex items-center gap-1.5">
                          <Check size={16} />
                          Copied
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Copy size={16} />
                          Copy
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Privacy note */}
                  <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                    <Shield size={12} className="flex-shrink-0" />
                    Anyone with this link can join. Share only with trusted people.
                  </p>
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
