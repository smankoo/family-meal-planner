import React from 'react';
import { AlertTriangle, RefreshCw, Eye } from 'lucide-react';

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
  onViewAnyway,
  isLoading = false,
  className = ''
}) => {
  const typeLabel = type === 'prep' ? 'prep plan' : 'shopping list';
  const typeTitle = type === 'prep' ? 'Prep Plan' : 'Shopping List';

  return (
    <div className={`
      relative overflow-hidden
      bg-gradient-to-r from-amber-50 to-orange-50
      border border-amber-200/60
      rounded-2xl p-6 mb-6
      shadow-sm
      ${className}
    `}>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-400" />
      </div>

      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-amber-900 mb-1">
            {typeTitle} Needs Update
          </h3>
          <p className="text-amber-800/80 text-sm leading-relaxed mb-4">
            Your meal plan has changed since this {typeLabel} was created.
            We recommend regenerating it to ensure everything stays in sync.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="
                inline-flex items-center justify-center gap-2 px-4 py-2.5
                bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400
                text-white text-sm font-medium
                rounded-xl transition-all duration-200
                shadow-sm hover:shadow-md
                disabled:cursor-not-allowed
                min-w-[140px]
              "
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Update {typeTitle}
                </>
              )}
            </button>

            {onViewAnyway && (
              <button
                onClick={onViewAnyway}
                className="
                  inline-flex items-center justify-center gap-2 px-4 py-2.5
                  bg-white hover:bg-amber-50
                  text-amber-700 text-sm font-medium
                  border border-amber-200 hover:border-amber-300
                  rounded-xl transition-all duration-200
                  shadow-sm hover:shadow-md
                "
              >
                <Eye size={16} />
                View Anyway
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvalidationBanner;
