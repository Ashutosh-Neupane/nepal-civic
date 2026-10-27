import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getComplaintById,
  submitComplaintFeedback,
  reopenComplaint,
  confirmComplaintResolution,
} from '@/lib/complaintService';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { ComplaintJourney } from '@/components/common/ComplaintJourney';
import { BeforeAfterEvidence } from '@/components/common/BeforeAfterEvidence';
import { GovernmentActionChain } from '@/components/common/GovernmentActionChain';
import { SLACard } from '@/components/common/SLACard';
import { CitizenConfirmationBanner } from '@/components/common/CitizenConfirmationBanner';
import { Modal } from '@/components/common/Modal';
import { Icon } from '@/components/common/Icon';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { getDepartmentForCategory } from '@/lib/departmentService';
import type { Complaint } from '@/types';

export function ComplaintDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, pick } = useLanguage();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [starRating, setStarRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Reopen modal state
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [submittingReopen, setSubmittingReopen] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      if (!id) return;
      setLoading(true);
      const data = await getComplaintById(id);
      setComplaint(data);
      setLoading(false);
    }
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <LoadingState />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen bg-surface p-4 flex flex-col justify-center max-w-md mx-auto">
        <ErrorState
          title={t('caseNotFound')}
          description={t('caseNotFoundDesc')}
          onRetry={() => navigate('/citizen/my-complaints')}
        />
      </div>
    );
  }

  const isCitizenOwner = user?.uid === complaint.citizenId;
  const isAwaitingConfirmation = complaint.status === 'resolved' && isCitizenOwner;

  const handleCitizenConfirm = async () => {
    if (!complaint || !user?.uid) return;
    setIsConfirming(true);
    try {
      const updated = await confirmComplaintResolution(complaint.id, {
        uid: user.uid,
        fullName: user.fullName || 'Citizen',
      });
      setComplaint(updated);
    } catch (err: any) {
      alert(err?.message || 'Failed to confirm resolution.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!complaint || !user?.uid) {
      alert('You must be signed in to submit feedback.');
      return;
    }
    setSubmittingFeedback(true);
    try {
      const updated = await submitComplaintFeedback(
        complaint.id,
        starRating,
        feedbackComment,
        { uid: user.uid, fullName: user.fullName || 'Citizen' }
      );
      setComplaint(updated);
      setShowFeedbackModal(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleReopenSubmit = async () => {
    if (!complaint || !reopenReason.trim() || !user?.uid) {
      alert('Please specify why the resolution was unsatisfactory.');
      return;
    }
    setSubmittingReopen(true);
    try {
      const updated = await reopenComplaint(
        complaint.id,
        reopenReason,
        { uid: user.uid, fullName: user.fullName || 'Citizen' }
      );
      setComplaint(updated);
      setShowReopenModal(false);
      setReopenReason('');
    } catch (err: any) {
      alert(err?.message || 'Failed to reopen complaint.');
    } finally {
      setSubmittingReopen(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface max-w-lg mx-auto pb-safe flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-xl shadow-header px-4 pt-safe border-b border-outline-variant/60">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <Icon name="arrow_back" size={22} />
            </button>
            <div>
              <span className="font-mono text-sm font-bold text-primary block leading-none">
                {complaint.referenceId}
              </span>
              <span className="text-xs text-on-surface-variant">{t('liveCaseTracker')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={complaint.status} />
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 px-4 py-5 flex flex-col gap-5 pb-24">
        {/* 1. CITIZEN RESOLUTION CONFIRMATION BANNER (If Status == Resolved) */}
        {isAwaitingConfirmation && (
          <CitizenConfirmationBanner
            onConfirm={handleCitizenConfirm}
            onReject={() => setShowReopenModal(true)}
            isConfirming={isConfirming}
          />
        )}

        {/* 2. SLA COUNTDOWN & STATUS CARD */}
        {complaint.status !== 'closed' && (
          <SLACard
            createdAt={complaint.createdAt}
            priority={complaint.priority}
            escalationLevel={complaint.escalationLevel}
            slaDueAt={complaint.slaDueAt}
          />
        )}

        {/* 3. CASE TITLE & CORE DETAILS */}
        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 flex flex-col gap-3 shadow-card">
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-primary capitalize">
            <div className="flex items-center gap-1.5">
              <Icon name="category" size={16} />
              <span>{complaint.category} Department</span>
            </div>
            <PriorityBadge priority={complaint.priority} />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-on-surface break-words leading-snug">
            {complaint.title}
          </h2>

          <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
            {complaint.description}
          </p>

          {/* Location, Department & Authority details */}
          <div className="border-t border-outline-variant/60 pt-3.5 flex flex-col gap-2.5 text-xs sm:text-sm text-on-surface-variant">
            <div className="flex items-center gap-2">
              <Icon name="location_on" size={18} className="text-primary shrink-0" />
              <span className="font-semibold text-on-surface text-sm">
                {complaint.location.address || `${complaint.wardLabel}, ${complaint.jurisdictionName} (${complaint.districtName})`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Icon name="domain" size={18} className="text-primary shrink-0" />
              <span>
                Responsible Department:{' '}
                <strong className="text-on-surface font-bold text-sm">
                  {getDepartmentForCategory(complaint.category).name}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Icon name="badge" size={18} className="text-secondary shrink-0" />
              <span>
                Assigned Field Personnel:{' '}
                <strong className="text-on-surface font-bold text-sm">
                  {complaint.assignedToName || pick('Not yet assigned', 'अझै जिम्मा लगाइएको छैन')}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* 4. LIVE COMPLAINT JOURNEY (5 Milestones) */}
        <ComplaintJourney complaint={complaint} />

        {/* 5. BEFORE / AFTER RESOLUTION EVIDENCE */}
        <BeforeAfterEvidence
          beforePhotos={complaint.photoUrls}
          afterPhotos={complaint.resolutionPhotoUrls}
        />

        {/* 6. GOVERNMENT ACTION CHAIN */}
        <GovernmentActionChain complaint={complaint} />

        {/* 7. CITIZEN FEEDBACK SUMMARY (If Rated) */}
        {complaint.citizenRating && (
          <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Icon
                    key={star}
                    name="star"
                    size={22}
                    className={star <= (complaint.citizenRating || 0) ? 'text-amber-500' : 'text-slate-300'}
                    filled={star <= (complaint.citizenRating || 0)}
                  />
                ))}
              </div>
              <span className="text-xs sm:text-sm font-bold text-emerald-800">Verified Citizen Feedback</span>
            </div>
            {complaint.citizenFeedback && (
              <p className="text-sm italic text-emerald-900 bg-white/60 p-3.5 rounded-xl border border-emerald-200">
                "{complaint.citizenFeedback}"
              </p>
            )}
          </div>
        )}

        {/* 8. CITIZEN ACTIONS: Rate Resolution or Reopen */}
        {(complaint.status === 'resolved' || complaint.status === 'closed') && isCitizenOwner && (
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {!complaint.citizenRating && complaint.status === 'closed' && (
              <Button
                variant="primary"
                size="md"
                className="w-full shadow font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setShowFeedbackModal(true)}
                icon="rate_review"
              >
                {t('rateResolution')}
              </Button>
            )}
            {complaint.status === 'closed' && (
              <Button
                variant="outline"
                size="md"
                className="w-full text-rose-700 border-rose-300 hover:bg-rose-50 font-bold"
                onClick={() => setShowReopenModal(true)}
                icon="replay"
              >
                {t('reopenCase')}
              </Button>
            )}
          </div>
        )}
      </main>

      {/* FEEDBACK MODAL (Portaled & Centered) */}
      {showFeedbackModal && (
        <Modal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          maxWidth="sm"
          footer={
            <div className="flex items-center gap-2 w-full">
              <Button variant="outline" size="md" className="flex-1 font-bold" onClick={() => setShowFeedbackModal(false)}>
                {t('back')}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1 shadow font-bold"
                onClick={handleFeedbackSubmit}
                isLoading={submittingFeedback}
              >
                {t('submitFeedback')}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 animate-success-pop">
                <Icon name="sentiment_very_satisfied" size={28} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-on-surface">{t('rateResolution')}</h3>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1">How satisfied are you with the municipal redressal?</p>
            </div>

            {/* Stars */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStarRating(star as any)}
                  className="p-1 text-amber-500 hover:scale-125 transition-transform"
                >
                  <Icon name="star" size={34} filled={star <= starRating} />
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={feedbackComment}
              onChange={e => setFeedbackComment(e.target.value)}
              placeholder="Add your comments or suggestions..."
              className="w-full p-3.5 rounded-xl border border-outline-variant text-sm font-medium text-on-surface bg-surface-container-lowest focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </Modal>
      )}

      {/* REOPEN MODAL (Portaled & Centered) */}
      {showReopenModal && (
        <Modal
          isOpen={showReopenModal}
          onClose={() => setShowReopenModal(false)}
          maxWidth="sm"
          footer={
            <div className="flex items-center gap-2 w-full">
              <Button variant="outline" size="md" className="flex-1 font-bold" onClick={() => setShowReopenModal(false)}>
                {t('back')}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white shadow font-bold"
                onClick={handleReopenSubmit}
                isLoading={submittingReopen}
                disabled={!reopenReason.trim()}
              >
                {t('reopenCase')}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center mx-auto mb-2">
                <Icon name="warning" size={28} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-on-surface">{t('reopenCase')}</h3>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
                State why the issue is still not resolved. Your case will be re-assigned to the field officer with high priority.
              </p>
            </div>

            <textarea
              rows={4}
              value={reopenReason}
              onChange={e => setReopenReason(e.target.value)}
              placeholder="e.g. The leak was only temporarily patched and water is leaking again..."
              className="w-full p-3.5 rounded-xl border border-outline-variant text-sm font-medium text-on-surface bg-surface-container-lowest focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
