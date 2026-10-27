import { Icon } from './Icon';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-20 h-20 rounded-full bg-error-container flex items-center justify-center mb-6">
        <Icon name="error_outline" className="text-error" size={36} />
      </div>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{title}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mb-6">{description}</p>
      {onRetry && (
        <Button variant="outline" icon="refresh" onClick={onRetry}>Try Again</Button>
      )}
    </div>
  );
}
