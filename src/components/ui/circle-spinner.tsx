import React from 'react'

interface CircleSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const CircleSpinner: React.FC<CircleSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }

  return (
    <div className={`circle-spinner ${sizeClasses[size]} ${className}`}>
      <style jsx>{`
        .circle-spinner {
          border: 2px solid #e5e7eb;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: circle-spin 1s linear infinite;
        }

        @keyframes circle-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default CircleSpinner
