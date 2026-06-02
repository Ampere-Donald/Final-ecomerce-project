import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const baseClass =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed';

const variantClass: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-opacity-90 shadow-md shadow-primary/20',
  secondary:
    'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200',
  danger:
    'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/20',
};

const sizeClass: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-6 py-3',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) => (
  <button
    {...rest}
    disabled={disabled || loading}
    className={`${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
  >
    {loading ? <Loader2 size={size === 'lg' ? 18 : 14} className="animate-spin" /> : icon}
    {children}
  </button>
);
