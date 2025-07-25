import React from 'react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11', // 44px default
    lg: 'w-16 h-16'
  }

  return (
    <div className={`spinner ${sizeClasses[size]} ${className}`}>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      
      <style jsx>{`
        .spinner {
          animation: spinner-y0fdc1 2s infinite ease;
          transform-style: preserve-3d;
        }

        .spinner > div {
          background-color: rgba(0,77,255,0.2);
          height: 100%;
          position: absolute;
          width: 100%;
          border: 2px solid #004dff;
        }

        .spinner div:nth-of-type(1) {
          transform: translateZ(-30px) rotateY(180deg);
        }

        .spinner div:nth-of-type(2) {
          transform: rotateY(-90deg) translateZ(30px);
        }

        .spinner div:nth-of-type(3) {
          transform: rotateY(90deg) translateZ(30px);
        }

        .spinner div:nth-of-type(4) {
          transform: rotateX(90deg) translateZ(30px);
        }

        .spinner div:nth-of-type(5) {
          transform: rotateX(-90deg) translateZ(30px);
        }

        .spinner div:nth-of-type(6) {
          transform: translateZ(30px);
        }

        @keyframes spinner-y0fdc1 {
          0% {
            transform: rotate(45deg) rotateX(-25deg) rotateY(25deg);
          }

          50% {
            transform: rotate(45deg) rotateX(-385deg) rotateY(25deg);
          }

          100% {
            transform: rotate(45deg) rotateX(-385deg) rotateY(385deg);
          }
        }
      `}</style>
    </div>
  )
}

export default Spinner
