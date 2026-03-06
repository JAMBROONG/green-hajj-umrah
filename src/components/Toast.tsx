'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onHide: () => void;
}

export default function Toast({ message, isVisible, onHide }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onHide();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  return (
    <div className={`toast ${isVisible ? 'show' : ''}`}>
      {message}
    </div>
  );
}
