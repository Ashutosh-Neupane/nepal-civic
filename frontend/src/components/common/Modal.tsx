import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/common/Icon';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  containerClassName?: string;
  bodyClassName?: string;
  headerRight?: ReactNode;
}

const MAX_WIDTH_CLASSES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'lg',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  containerClassName = '',
  bodyClassName = '',
  headerRight,
}: ModalProps) {
  // Lock body scroll on mount
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Prevent content layout jump if scrollbar disappears
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  // Handle ESC keyboard key
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const maxWidthClass = MAX_WIDTH_CLASSES[maxWidth] || 'max-w-lg';

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fade-in touch-pan-y"
      style={{ overscrollBehavior: 'contain' }}
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`bg-surface w-full ${maxWidthClass} rounded-3xl shadow-2xl border border-outline-variant flex flex-col animate-modal-in max-h-[90vh] md:max-h-[85vh] overflow-hidden ${containerClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (optional if title / subtitle or close button provided) */}
        {(title || subtitle || icon || showCloseButton || headerRight) && (
          <div className="flex items-center justify-between border-b border-outline-variant/60 px-6 py-4.5 sm:px-7 sm:py-5 flex-shrink-0 bg-surface-container-lowest/80">
            <div className="min-w-0 flex-1 pr-3 flex items-center gap-3">
              {icon && (
                <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center flex-shrink-0 shadow-xs">
                  {icon}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {subtitle && <div className="text-xs sm:text-sm text-primary font-bold mb-0.5">{subtitle}</div>}
                {title && (
                  <h3 id="modal-title" className="text-lg sm:text-xl font-bold text-on-surface truncate">
                    {title}
                  </h3>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {headerRight}
              {showCloseButton && (
                <button
                  type="button"
                  aria-label="Close dialog"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                >
                  <Icon name="close" size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Body Content */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto px-6 py-5 sm:px-7 sm:py-6 sidebar-scroll ${bodyClassName}`}
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehaviorY: 'contain',
          }}
        >
          {children}
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div className="border-t border-outline-variant/60 px-6 py-4 sm:px-7 sm:py-4.5 flex items-center justify-end gap-3 flex-shrink-0 bg-surface-container-lowest/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
