'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Dialog from '@/components/Dialog';

interface DialogOptions {
  title?: string;
  message: string;
  type?: 'alert' | 'confirm' | 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextType {
  showAlert: (message: string, options?: Partial<DialogOptions>) => void;
  showConfirm: (message: string, onConfirm: () => void, options?: Partial<DialogOptions>) => void;
  showSuccess: (message: string, options?: Partial<DialogOptions>) => void;
  showError: (message: string, options?: Partial<DialogOptions>) => void;
  showWarning: (message: string, options?: Partial<DialogOptions>) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<DialogOptions & { onConfirm?: () => void }>({
    message: '',
    type: 'alert',
  });

  const showDialog = useCallback(
    (config: DialogOptions & { onConfirm?: () => void }) => {
      setDialogConfig(config);
      setIsOpen(true);
    },
    []
  );

  const showAlert = useCallback(
    (message: string, options?: Partial<DialogOptions>) => {
      showDialog({
        message,
        type: 'alert',
        ...options,
      });
    },
    [showDialog]
  );

  const showConfirm = useCallback(
    (message: string, onConfirm: () => void, options?: Partial<DialogOptions>) => {
      showDialog({
        message,
        type: 'confirm',
        onConfirm,
        confirmText: options?.confirmText || 'Ya',
        cancelText: options?.cancelText || 'Batal',
        ...options,
      });
    },
    [showDialog]
  );

  const showSuccess = useCallback(
    (message: string, options?: Partial<DialogOptions>) => {
      showDialog({
        message,
        type: 'success',
        ...options,
      });
    },
    [showDialog]
  );

  const showError = useCallback(
    (message: string, options?: Partial<DialogOptions>) => {
      showDialog({
        message,
        type: 'error',
        ...options,
      });
    },
    [showDialog]
  );

  const showWarning = useCallback(
    (message: string, options?: Partial<DialogOptions>) => {
      showDialog({
        message,
        type: 'warning',
        ...options,
      });
    },
    [showDialog]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleConfirm = useCallback(() => {
    if (dialogConfig.onConfirm) {
      dialogConfig.onConfirm();
    }
  }, [dialogConfig]);

  return (
    <DialogContext.Provider
      value={{ showAlert, showConfirm, showSuccess, showError, showWarning }}
    >
      {children}
      <Dialog
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmText={dialogConfig.confirmText}
        cancelText={dialogConfig.cancelText}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
