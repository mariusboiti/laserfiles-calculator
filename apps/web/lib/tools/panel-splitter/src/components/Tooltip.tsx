import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className="relative inline-block">
      <span
        className="tooltip-trigger"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children || '?'}
      </span>
      {isVisible && (
        <div className="absolute z-50 w-64 p-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg -top-2 left-6 transform">
          {content}
          <div className="absolute w-2 h-2 bg-gray-800 transform rotate-45 -left-1 top-3" />
        </div>
      )}
    </span>
  );
}
