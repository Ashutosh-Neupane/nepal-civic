import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconRight?: string;
  isLoading?: boolean;
  children?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container shadow-sm hover:shadow-md',
  secondary: 'bg-transparent border border-primary text-primary hover:bg-primary/5',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
  danger: 'bg-error text-on-error hover:bg-error/90 shadow-sm hover:shadow-md',
  outline: 'bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs sm:text-[13px] font-semibold',
  md: 'h-11 px-5 text-sm font-semibold',
  lg: 'h-12.5 px-6 text-base font-semibold',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  isLoading,
  children,
  fullWidth,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        active:scale-[0.98] active:brightness-95 hover:-translate-y-0.5
        disabled:opacity-50 disabled:pointer-events-none disabled:transform-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Icon name="progress_activity" className="animate-spin" />
      ) : icon ? (
        <Icon name={icon} size={18} className="transition-transform group-hover:scale-110" />
      ) : null}
      {children}
      {iconRight && <Icon name={iconRight} size={18} />}
    </button>
  );
}
