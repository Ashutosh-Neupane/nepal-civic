import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEvidenceUrls } from '@/hooks/useEvidenceUrls';

interface BeforeAfterEvidenceProps {
  beforePhotos: string[];
  afterPhotos?: string[];
  title?: string;
}

export function BeforeAfterEvidence({ beforePhotos = [], afterPhotos = [], title }: BeforeAfterEvidenceProps) {
  const { pick } = useLanguage();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  // Photos are stored as private keys; resolve them to signed links for display.
  const resolved = useEvidenceUrls([...beforePhotos, ...afterPhotos]);

  // Lock and cleanly restore body scroll
  useEffect(() => {
    if (!selectedPhoto) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [selectedPhoto]);

  const hasBefore = beforePhotos.length > 0;
  const hasAfter = afterPhotos && afterPhotos.length > 0;

  return (
    <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-card flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shadow-xs">
            <Icon name="compare" size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-on-surface">
              {title || pick('Before and after photos', 'पहिले र पछिका फोटो')}
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {pick('Photos from the citizen and from the office after the work', 'नागरिकले पठाएका र काम सकिएपछि कार्यालयले राखेका फोटो')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
            {beforePhotos.length} {pick('before', 'पहिले')} • {afterPhotos.length} {pick('after', 'पछि')}
          </span>
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* BEFORE: Citizen Reported Evidence */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              {pick('Before: from the citizen', 'पहिले: नागरिकबाट')}
            </span>
            <span className="text-xs text-on-surface-variant font-mono font-medium">
              {beforePhotos.length} image{beforePhotos.length === 1 ? '' : 's'}
            </span>
          </div>

          {hasBefore ? (
            <div className="grid grid-cols-2 gap-2.5">
              {beforePhotos.map(key => resolved[key]).filter(Boolean).map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPhoto(url)}
                  className="group relative aspect-video rounded-2xl overflow-hidden border border-outline-variant bg-surface-container cursor-pointer hover:shadow-md transition-all duration-200"
                >
                  <img
                    src={url}
                    alt={`Reported defect photo ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100">
                      <Icon name="zoom_in" size={18} />
                    </div>
                  </div>
                  <span className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-md bg-black/70 text-white text-xs font-bold uppercase backdrop-blur-xs">
                    {pick('Before', 'पहिले')} #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-dashed border-outline-variant bg-surface-container/30 flex flex-col items-center justify-center text-center gap-1.5 min-h-[140px]">
              <Icon name="image_not_supported" size={28} className="text-on-surface-variant/60" />
              <p className="text-xs font-semibold text-on-surface-variant">{pick('No photos attached', 'फोटो संलग्न छैन')}</p>
            </div>
          )}
        </div>

        {/* AFTER: Official Resolution Evidence */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              {pick('After: from the office', 'पछि: कार्यालयबाट')}
            </span>
            <span className="text-xs text-on-surface-variant font-mono font-medium">
              {afterPhotos.length} image{afterPhotos.length === 1 ? '' : 's'}
            </span>
          </div>

          {hasAfter ? (
            <div className="grid grid-cols-2 gap-2.5">
              {afterPhotos.map(key => resolved[key]).filter(Boolean).map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPhoto(url)}
                  className="group relative aspect-video rounded-2xl overflow-hidden border border-emerald-300 bg-emerald-50/50 cursor-pointer hover:shadow-md transition-all duration-200"
                >
                  <img
                    src={url}
                    alt={`Resolution proof photo ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-emerald-950/0 group-hover:bg-emerald-950/30 transition-colors flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-900/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100">
                      <Icon name="zoom_in" size={18} />
                    </div>
                  </div>
                  <span className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-md bg-emerald-800/90 text-white text-xs font-bold uppercase backdrop-blur-xs">
                    {pick('After', 'पछि')} #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-dashed border-outline-variant bg-surface-container/30 flex flex-col items-center justify-center text-center gap-1.5 min-h-[140px]">
              <Icon name="hide_image" size={28} className="text-on-surface-variant/60" />
              <p className="text-xs sm:text-sm font-bold text-on-surface-variant">{pick('No photos yet', 'अहिलेसम्म फोटो छैन')}</p>
              <span className="text-xs text-on-surface-variant/70">
                {pick('The officer adds these when the work is done', 'काम सकिएपछि अधिकृतले राख्नुहुन्छ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Enlarge Image Modal (Portaled to document.body) */}
      {selectedPhoto && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fade-in touch-pan-y"
          style={{ overscrollBehavior: 'contain' }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[88vh] md:max-h-[85vh] bg-surface rounded-3xl overflow-hidden shadow-2xl border border-outline-variant animate-modal-in flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
              <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                <Icon name="image" size={18} className="text-primary" /> {pick('Photo', 'फोटो')}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="p-3 bg-black flex items-center justify-center overflow-auto max-h-[70vh]">
              <img
                src={selectedPhoto}
                alt="Enlarged grievance evidence"
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between text-xs text-on-surface-variant">
              <span />
              <a
                href={selectedPhoto}
                target="_blank"
                rel="noreferrer"
                className="text-primary font-bold hover:underline flex items-center gap-1"
              >
                {pick('Open original', 'मूल फोटो खोल्नुहोस्')} <Icon name="open_in_new" size={14} />
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
