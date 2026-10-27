import { Icon } from './Icon';
import { AnimatedNumber } from './AnimatedNumber';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: string;
  variant?: 'default' | 'critical' | 'warning' | 'success';
  badge?: string;
  animate?: boolean;
  className?: string;
}

const variantClasses = {
  default: {
    card: 'bg-surface-container-lowest border border-outline-variant/60',
    icon: 'bg-primary/10 text-primary',
    value: 'text-on-surface',
    label: 'text-on-surface-variant',
  },
  critical: {
    card: 'bg-red-50 border border-red-200',
    icon: 'bg-red-100 text-red-700',
    value: 'text-red-800',
    label: 'text-red-700',
  },
  warning: {
    card: 'bg-amber-50 border border-amber-200',
    icon: 'bg-amber-100 text-amber-800',
    value: 'text-amber-900',
    label: 'text-amber-800',
  },
  success: {
    card: 'bg-surface-container-lowest border border-emerald-200/60',
    icon: 'bg-[#E6F4EA] text-[#137333]',
    value: 'text-on-surface',
    label: 'text-on-surface-variant',
  },
};

export function KPICard({ label, value, icon, variant = 'default', badge, animate, className = '' }: KPICardProps) {
  const v = variantClasses[variant];
  return (
    <div
      className={`
        ${v.card} rounded-2xl p-6 shadow-card flex flex-col justify-between
        transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover
        ${className}
      `}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-200 ${v.icon}`}>
          <Icon name={icon} size={20} />
        </div>
        {badge && (
          <span
            className={`${
              variant === 'critical'
                ? 'bg-error text-on-error'
                : 'bg-on-tertiary-container text-tertiary-container'
            } text-xs px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1 shadow-sm`}
          >
            {animate && <span className="w-1.5 h-1.5 rounded-full bg-on-error animate-pulse-subtle" />}
            {badge}
          </span>
        )}
      </div>
      <div>
        <div className={`text-3xl sm:text-4xl font-bold ${v.value} tracking-tight`}>
          <AnimatedNumber value={value} />
        </div>
        <div className={`text-sm font-semibold tracking-wide mt-1.5 ${v.label}`}>
          {label}
        </div>
      </div>
    </div>
  );
}
