import React, { useState } from 'react';
import { Users, Copy, Check, X, Heart } from 'lucide-react';

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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-3xl shadow-modal max-w-md w-full p-6 pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900">Invite to Family</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-zinc-600" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {!inviteUrl ? (
              <>
                <p className="text-zinc-600 leading-relaxed">
                  Create an invite link to add family members to your meal plan. Everyone with the link can view and edit together in real-time.
                </p>

                <div className="bg-zinc-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-700">
                    <Heart size={16} className="text-rose-500" />
                    <span className="font-medium">Family collaboration</span>
                  </div>
                  <p className="text-sm text-zinc-600">
                    Changes made by any family member will be reflected for everyone instantly.
                  </p>
                </div>

                <button
                  onClick={handleCreateInvite}
                  disabled={isCreatingInvite}
                  className="w-full bg-zinc-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingInvite ? 'Creating Invite...' : 'Create Invite Link'}
                </button>
              </>
            ) : (
              <>
                <p className="text-zinc-600 leading-relaxed">
                  Share this link with family members to collaborate on meal planning together.
                </p>

                {/* Invite URL */}
                <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-sm text-zinc-700 font-mono truncate flex-1">
                      {inviteUrl}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="flex-shrink-0 w-9 h-9 rounded-lg bg-white hover:bg-zinc-100 flex items-center justify-center transition-colors shadow-sm"
                      aria-label="Copy link"
                    >
                      {copied ? (
                        <Check size={18} className="text-green-600" />
                      ) : (
                        <Copy size={18} className="text-zinc-600" />
                      )}
                    </button>
                  </div>

                  {copied && (
                    <p className="text-sm text-green-600 font-medium animate-fade-in">
                      Link copied to clipboard!
                    </p>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-900">
                    <span className="font-semibold">Note:</span> Anyone with this link can join your family plan. Only share with people you trust.
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="w-full bg-zinc-100 text-zinc-900 px-6 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition-colors"
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
