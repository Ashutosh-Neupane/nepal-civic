import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDateTime } from '@/lib/dateUtils';
import { Icon } from '@/components/common/Icon';
import { Button } from '@/components/common/Button';
import type { Complaint } from '@/types';

export function SubmissionSuccessScreen() {
  const { t, pick, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const complaint = location.state?.complaint as Complaint | undefined;

  const referenceId = complaint?.referenceId || 'CC-5102';

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 max-w-md mx-auto text-center animate-fade-in">
      {/* Animated Check Emblem */}
      <div className="w-24 h-24 rounded-full bg-emerald-100 border-4 border-emerald-500 text-emerald-600 flex items-center justify-center mb-6 shadow-xl animate-success-pop">
        <Icon name="check_circle" size={54} filled />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-on-surface mb-2 animate-slide-up stagger-1">
        {t('grievanceRegistered')}
      </h1>
      <p className="text-sm sm:text-base text-on-surface-variant max-w-xs mb-8 animate-slide-up stagger-2">
        {t('successSubtitle')}
      </p>

      {/* Reference Card */}
      <div className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 mb-8 shadow-card text-left animate-slide-up stagger-3 hover-lift">
        <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3 mb-3">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            {t('trackingId')}
          </span>
          <span className="font-mono font-bold text-xl sm:text-2xl text-primary">{referenceId}</span>
        </div>

        <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
          <div className="flex justify-between">
            <span className="text-on-surface-variant font-medium">{t('categorySummary')}:</span>
            <span className="font-bold text-on-surface capitalize">{complaint?.category ? t(complaint.category) : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant font-medium">{t('assignedAuthority')}:</span>
            <span className="font-bold text-on-surface">{complaint
              ? `${pick(complaint.jurisdictionName, complaint.jurisdictionNameNe)}${complaint.wardNo ? pick(`, Ward ${complaint.wardNo}`, `, वडा नं. ${complaint.wardNo}`) : ''}`
              : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant font-medium">{t('targetSla')}:</span>
            <span className="font-bold text-primary">{complaint?.slaDueAt ? formatDateTime(complaint.slaDueAt, language) : '—'}</span>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="w-full flex flex-col gap-3 animate-slide-up stagger-4">
        <Button
          variant="primary"
          size="lg"
          className="w-full shadow-md font-bold"
          onClick={() => navigate(`/citizen/complaint/${complaint?.id || 'complaint-001'}`)}
          iconRight="visibility"
        >
          {t('trackGrievanceLive')}
        </Button>
        <Link to="/citizen" className="w-full">
          <Button variant="outline" size="lg" className="w-full font-bold">
            {t('backToHome')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
