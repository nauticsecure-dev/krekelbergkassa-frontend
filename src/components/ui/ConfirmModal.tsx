'use client';

import * as React from 'react';
import { AlertTriangle, type LucideIcon } from 'lucide-react';
import {
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

type ConfirmVariant = 'danger' | 'primary' | 'secondary';

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (inputValue?: string) => void | Promise<void>;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: LucideIcon;
  loading?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  inputMinLength?: number;
  inputRequiredMessage?: string;
}

const iconTones: Record<ConfirmVariant, string> = {
  danger: 'bg-rose-50 text-rose-600',
  primary: 'bg-marine-50 text-marine-600',
  secondary: 'bg-sand-100 text-navy-600',
};

const confirmVariants: Record<ConfirmVariant, 'danger' | 'primary' | 'secondary'> = {
  danger: 'danger',
  primary: 'primary',
  secondary: 'secondary',
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  icon: Icon = AlertTriangle,
  loading = false,
  inputLabel,
  inputPlaceholder,
  inputValue = '',
  onInputChange,
  inputMinLength,
  inputRequiredMessage,
}: ConfirmModalProps) {
  const [inputError, setInputError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) setInputError(null);
  }, [open]);

  const handleConfirm = async () => {
    if (inputLabel && inputMinLength && inputValue.trim().length < inputMinLength) {
      setInputError(inputRequiredMessage ?? `Min. ${inputMinLength} characters`);
      return;
    }
    setInputError(null);
    await onConfirm(inputLabel ? inputValue.trim() : undefined);
  };

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <AdminModalHeader title={title} subtitle={inputLabel ? message : undefined} />
      <AdminModalBody>
        <div className="flex items-start gap-4">
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              iconTones[variant]
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          {inputLabel ? (
            <div className="min-w-0 flex-1">
              <Input
                label={inputLabel}
                placeholder={inputPlaceholder}
                value={inputValue}
                onChange={(e) => {
                  onInputChange?.(e.target.value);
                  if (inputError) setInputError(null);
                }}
                error={inputError ?? undefined}
                autoFocus
              />
            </div>
          ) : message ? (
            <p className="pt-2 text-sm leading-relaxed text-navy-600">{message}</p>
          ) : null}
        </div>
      </AdminModalBody>
      <AdminModalFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel ?? 'Cancel'}
        </Button>
        <Button
          type="button"
          variant={confirmVariants[variant]}
          onClick={() => void handleConfirm()}
          disabled={loading}
        >
          {loading ? '…' : confirmLabel ?? 'Confirm'}
        </Button>
      </AdminModalFooter>
    </Modal>
  );
}
