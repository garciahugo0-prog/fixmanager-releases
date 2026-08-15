import React from 'react';

interface RecargasCustomIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

export const RecargasCustomIcon: React.FC<RecargasCustomIconProps> = ({
  className = '',
  size,
  ...props
}) => {
  const widthHeight = size || '100%';
  return (
    <svg
      className={`select-none ${className}`}
      width={widthHeight}
      height={widthHeight}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Top-Left: Telcel (Blue with stylized logo lines) */}
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#00529F" />
      <path d="M6 7C6 7 10 9 12 9C14 9 18 7 18 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M7 11C7 11 10 13 12 13C14 13 17 11 17 11" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 15C9 15 11 16.5 12 16.5C13 16.5 15 15 15 15" stroke="white" strokeWidth="1.5" strokeLinecap="round" />

      {/* Top-Right: Movistar (Green M on dark/light background) */}
      <rect x="26" y="2" width="20" height="20" rx="5" fill="#E8F5E9" />
      <path
        d="M30 15.5C30.5 13.5 31.5 8.5 33.5 8.5C35.5 8.5 36 12 36 12C36 12 36.5 8.5 38.5 8.5C40.5 8.5 41.5 13.5 42 15.5"
        stroke="#4CAF50"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom-Left: AT&T (Cyan Globe with white curved lines) */}
      <rect x="2" y="26" width="20" height="20" rx="5" fill="#00A6E0" />
      <circle cx="12" cy="36" r="6.5" stroke="white" strokeWidth="2" />
      <path d="M8.5 33.5C9.5 35 11 36 12.5 36C14 36 15 35 15.5 33.5" stroke="white" strokeWidth="1" strokeLinecap="round" />
      <path d="M8.5 38.5C9.5 37 11 36 12.5 36C14 36 15 37 15.5 38.5" stroke="white" strokeWidth="1" strokeLinecap="round" />

      {/* Bottom-Right: Unefon (Yellow / Green / Red gradient/bars on dark) */}
      <rect x="26" y="26" width="20" height="20" rx="5" fill="#1A1A1A" />
      {/* Unefon dots / bars */}
      <rect x="30" y="32" width="3" height="8" rx="1.5" fill="#4CAF50" />
      <rect x="34" y="30" width="3" height="10" rx="1.5" fill="#FFEB3B" />
      <rect x="38" y="34" width="3" height="6" rx="1.5" fill="#FF5722" />
      <rect x="42" y="31" width="3" height="9" rx="1.5" fill="#E91E63" />
    </svg>
  );
};
