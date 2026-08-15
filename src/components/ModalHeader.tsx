import React from 'react';

interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
  headerBg?: string;
}

// Header estándar para modales con fondo azul. El observer global en App.tsx
// se encarga de forzar texto blanco en el tema retro automáticamente.
export default function ModalHeader({ children, className = '', headerBg = 'bg-[#1a3a6b]' }: ModalHeaderProps) {
  return (
    <div className={`modal-dark-header ${headerBg} px-4 py-3 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}
