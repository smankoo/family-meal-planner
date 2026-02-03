import React, { useState } from 'react';
import { Share2, Copy, Check, X, Users } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  onShare: () => Promise<void>;
  isSharing: boolean;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
  onShare,
  isSharing
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    await onShare();
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
                <Share2 size={20} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900">Share Meal Plan</h2>
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
            {!shareUrl ? (
              <>
                <p className="text-zinc-600 leading-relaxed">
                  Create a shareable link for this meal plan. Anyone with the link can view and edit it together in real-time.
                </p>

                <div className="bg-zinc-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-700">
                    <Users size={16} />
                    <span className="font-medium">Collaborative editing</span>
                  </div>
                  <p className="text-sm text-zinc-600">
                    Changes made by anyone will be reflected for all members instantly.
                  </p>
                </div>

                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="w-full bg-zinc-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSharing ? 'Creating Link...' : 'Create Share Link'}
                </button>
              </>
            ) : (
              <>
                <p className="text-zinc-600 leading-relaxed">
                  Share this link with others to collaborate on this meal plan together.
                </p>

                {/* Share URL */}
                <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-sm text-zinc-700 font-mono truncate flex-1">
                      {shareUrl}
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
                    <span className="font-semibold">Note:</span> Anyone with this link can view and edit this plan. Only share with people you trust.
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

export default ShareModal;
