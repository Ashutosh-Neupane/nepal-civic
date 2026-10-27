import { Icon } from './Icon';
import { Button } from './Button';
import { useLanguage } from '@/contexts/LanguageContext';

interface CitizenConfirmationBannerProps {
  onConfirm: () => Promise<void>;
  onReject: () => void;
  isConfirming: boolean;
}

export function CitizenConfirmationBanner({
  onConfirm,
  onReject,
  isConfirming,
}: CitizenConfirmationBannerProps) {
  const { t } = useLanguage();

  return (
    <div className="rounded-3xl border-2 border-emerald-400 bg-emerald-50/90 p-5 sm:p-6 shadow-lg animate-slide-down flex flex-col gap-4">
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-success-pop">
          <Icon name="verified" size={28} />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-bold text-xs uppercase tracking-wider mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse-subtle" />
            {t('actionRequired') || 'Action Required'}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-emerald-950 leading-snug">
            {t('resolvedAwaitingConfirmation') || 'Resolved — Awaiting Citizen Confirmation'}
          </h3>
          <p className="text-sm text-emerald-900/90 leading-relaxed mt-1">
            {t('officerMarkedResolvedDesc') ||
              'The designated municipal officer reports that on-site civil works have been completed. Please review the resolution evidence below and confirm if your grievance has been resolved.'}
          </p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white/80 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <span className="text-sm font-bold text-emerald-950 uppercase tracking-wide block">
            {t('hasThisIssueBeenResolved') || 'Has this issue been resolved?'}
          </span>
          <span className="text-xs text-emerald-800 mt-0.5 block">
            {t('confirmationImpactNote') || 'Confirming will formally close the case. If the issue persists, your grievance will be reopened with high priority.'}
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onReject}
            className="flex-1 sm:flex-initial border-rose-300 text-rose-800 hover:bg-rose-50 font-bold text-xs sm:text-sm"
            icon="close"
          >
            {t('noIssueStillExists') || '✕ No, Issue Still Exists'}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onConfirm}
            isLoading={isConfirming}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
            icon="check"
          >
            {t('yesIssueResolved') || '✓ Yes, Issue Resolved'}
          </Button>
        </div>
      </div>
    </div>
  );
}
