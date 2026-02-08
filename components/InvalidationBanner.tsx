import React from 'react';
import { RefreshCw } from 'lucide-react';

interface InvalidationBannerProps {
  type: 'prep' | 'grocery';
  onRegenerate: () => void;
  onViewAnyway?: () => void;
  isLoading?: boolean;
  className?: string;
}

const InvalidationBanner: React.FC<InvalidationBannerProps> = ({
  type,
  onRegenerate,
  isLoading = false,
  className = ''
}) => {
  const typeLabel = type === 'prep' ? 'prep plan' : 'shopping list';
  const typeTitle = type === 'prep' ? 'Prep Plan' : 'Shopping List';

  return (
    <div className={`
      relative overflow-hidden
      bg-white/85 backdrop-blur-md
      border border-white/40
      rounded-2xl p-5 mb-6
      shadow-card
      transition-all duration-300
      ${className}
    `}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center border border-white/40">
            <RefreshCw size={16} className="text-zinc-500" strokeWidth={2.5} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-zinc-900 mb-1.5">
            {typeTitle} Needs Update
          </h3>
          <p className="text-sm text-zinc-600 leading-relaxed mb-4">
            Your meal plan has changed since this {typeLabel} was created. We recommend regenerating it to ensure everything stays in sync.
          </p>

          {/* Action button */}
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="btn-glass-primary"
          >
            {isLoading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                <span>Update {typeTitle}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvalidationBanner;
