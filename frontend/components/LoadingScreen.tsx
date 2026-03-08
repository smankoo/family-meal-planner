import React from 'react';
import { ChefHat, Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading your meal planner...'
}) => {
  return (
    <div className="loading-screen">
      <div className="loading-screen-content">
        <div className="loading-screen-logo">
          <ChefHat size={24} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="loading-screen-spinner-container">
          <Loader2 size={24} className="animate-spin text-primary-400" />
          <p className="text-body font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
