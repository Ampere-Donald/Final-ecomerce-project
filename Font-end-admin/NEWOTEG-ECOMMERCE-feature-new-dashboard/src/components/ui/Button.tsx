import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
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
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const variantClass: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-opacity-90 shadow-md shadow-primary/20',
  secondary:
    'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200',
  danger:
    'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/20',
  success:
    'bg-emerald-700 text-white hover:bg-emerald-800 shadow-md shadow-emerald-700/20',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100',
};

const sizeClass: Record<Size, string> = {
  // min-h-44px uniquement en dessous de md : garantit une zone tactile confortable
  // sur téléphone/tablette sans alourdir la densité des tableaux desktop.
  sm: 'min-h-10 text-xs px-3 py-1.5 max-md:min-h-11',
  md: 'min-h-11 text-sm px-4 py-2',
  lg: 'min-h-12 text-base px-6 py-3',
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
