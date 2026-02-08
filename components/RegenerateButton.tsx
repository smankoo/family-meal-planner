import React from 'react';
import { RotateCcw } from 'lucide-react';

interface RegenerateButtonProps {
  onRegenerate: () => void;
  isLoading: boolean;
  disabled?: boolean;
  showText?: boolean; // New prop to control text display
}

const RegenerateButton: React.FC<RegenerateButtonProps> = ({
  onRegenerate,
  isLoading,
  disabled = false,
  showText = false
}) => {
  if (showText) {
    // Desktop version with text
    return (
      <button
        onClick={onRegenerate}
        disabled={isLoading || disabled}
        className="btn-regenerate flex items-center gap-2"
      >
        <RotateCcw size={14} /> Regenerate
      </button>
    );
  }

  // Mobile version - icon only
  return (
    <button
      onClick={onRegenerate}
      disabled={isLoading || disabled}
      className="btn-icon-sm"
      title="Regenerate"
    >
      <RotateCcw size={16} />
    </button>
  );
};

export default RegenerateButton;
