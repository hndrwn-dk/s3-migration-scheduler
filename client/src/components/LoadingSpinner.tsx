import React from 'react';
import classNames from 'classnames';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  text, 
  className 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={classNames('flex flex-col items-center justify-center', className)}>
      <div
        className={classNames(
          'animate-spin rounded-full border-b-2 border-blue-600',
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="mt-3 text-sm text-gray-600 text-center">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;