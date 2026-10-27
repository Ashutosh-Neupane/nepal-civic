import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { createComplaint } from '@/lib/complaintService';
import { uploadComplaintEvidence } from '@/lib/storageService';
import { describeTerritory } from '@/lib/jurisdictionService';
import { isValidNepalCoordinate } from '@/lib/geoUtils';
import { CATEGORY_KEYS, CATEGORY_META } from '@/lib/constants';
import { LocationPickerMap } from '@/components/map/LocationPickerMap';
import { JurisdictionPicker } from '@/components/common/JurisdictionPicker';
import { Icon } from '@/components/common/Icon';
import { Button } from '@/components/common/Button';
import type { ComplaintCategory, ComplaintPriority, Territory } from '@/types';

const CATEGORY_HINTS: Record<ComplaintCategory, { en: string; ne: string }> = {
  roads: { en: 'Potholes, damaged roads, broken bridges', ne: 'खाल्डा, बिग्रिएको सडक, भत्किएको पुल' },
  water: { en: 'No supply, leaking pipes, dirty water', ne: 'पानी नआउने, पाइप चुहिने, फोहोर पानी' },
  drainage: { en: 'Blocked drains, sewage overflow', ne: 'ढल थुनिने, ढल बगेको' },
  sanitation: { en: 'Uncollected waste, open dumping', ne: 'फोहोर नउठेको, खुला ठाउँमा फोहोर' },
  electricity: { en: 'Street lights off, loose wires', ne: 'सडक बत्ती बन्द, झुन्डिएका तार' },
  parks: { en: 'Parks, open spaces, public toilets', ne: 'पार्क, खुला क्षेत्र, सार्वजनिक शौचालय' },
  public_safety: { en: 'Encroachment, stray animals, unsafe spots', ne: 'अतिक्रमण, छाडा पशु, असुरक्षित स्थान' },
  disaster_mgmt: { en: 'Landslides, floods, fallen trees', ne: 'पहिरो, बाढी, ढलेका रूख' },
  health: { en: 'Health post services, medicines, staff', ne: 'स्वास्थ्य चौकीको सेवा, औषधि, कर्मचारी' },
  education: { en: 'Community schools, buildings, teachers', ne: 'सामुदायिक विद्यालय, भवन, शिक्षक' },
  other: { en: 'Any other local government service', ne: 'स्थानीय सरकारका अन्य सेवा' },
};

const SLA_HOURS: Record<ComplaintPriority, number> = { critical: 24, high: 48, medium: 72, low: 120 };

export function ReportComplaintWizard() {
  const { user } = useAuth();
  const { t, pick, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const preselectedCategory = location.state?.preselectedCategory as ComplaintCategory | undefined;
  const initialStep = preselectedCategory ? 2 : (location.state?.step || 1);

  const [step, setStep] = useState<number>(initialStep);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [geoNotice, setGeoNotice] = useState('');

  const [category, setCategory] = useState<ComplaintCategory>(preselectedCategory || 'roads');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ComplaintPriority>('medium');
  const [landmark, setLandmark] = useState('');

  // Where the problem is; starts at the citizen's own ward, which they can change.
  const [territory, setTerritory] = useState<Territory>(user?.territory || {});
  const [tole, setTole] = useState('');
  const [address, setAddress] = useState('');
  // The map pin is optional; it is only sent once the citizen has placed it.
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Photos stay local until submit, then upload before the grievance is created.
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  const locationComplete = !!territory.jurisdictionId && !!territory.wardNo;

  const handleDetectLocation = () => {
    setIsDetectingLocation(true);
    setErrorMsg('');
    setGeoNotice('');

    if (!('geolocation' in navigator)) {
      setGeoNotice(pick('Your browser cannot share location. Place the pin on the map instead.', 'तपाईंको ब्राउजरले स्थान दिन सक्दैन। नक्सामा पिन राख्नुहोस्।'));
      setIsDetectingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        if (!isValidNepalCoordinate(lat, lng)) {
          setGeoNotice(pick('Your location appears to be outside Nepal. Place the pin on the map instead.', 'तपाईंको स्थान नेपालबाहिर देखियो। नक्सामा पिन राख्नुहोस्।'));
          setIsDetectingLocation(false);
          return;
        }
        setPin({ lat, lng });
        setGeoNotice(pick(`Location found (accuracy ±${Math.round(pos.coords.accuracy || 10)} m)`, `स्थान भेटियो (शुद्धता ±${Math.round(pos.coords.accuracy || 10)} मि.)`));

        // Best-effort street name from OpenStreetMap; the ward picker remains the source of truth.
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { 'Accept-Language': language === 'ne' ? 'ne,en' : 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data?.address || {};
            const locality = addr.neighbourhood || addr.suburb || addr.quarter || addr.road || addr.village || '';
            if (locality && !tole) setTole(locality);
            if (data?.display_name) setAddress(data.display_name);
          }
        } catch (geoErr) {
          console.warn('Reverse geocode lookup failed (non-blocking):', geoErr);
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        setIsDetectingLocation(false);
        setGeoNotice(
          err.code === 1
            ? pick('Location permission was denied. Place the pin on the map instead.', 'स्थान अनुमति दिइएन। नक्सामा पिन राख्नुहोस्।')
            : pick('Could not get your location. Place the pin on the map instead.', 'स्थान पत्ता लागेन। नक्सामा पिन राख्नुहोस्।')
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    setPendingPhotoFiles(prev => [...prev, ...newFiles]);
    setPhotoPreviewUrls(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const handleRemovePhoto = (idx: number) => {
    URL.revokeObjectURL(photoPreviewUrls[idx]);
    setPendingPhotoFiles(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (!title.trim() || !description.trim()) {
      setErrorMsg(pick('Please enter a title and description.', 'कृपया शीर्षक र विवरण लेख्नुहोस्।'));
      setStep(2);
      return;
    }
    if (!locationComplete) {
      setErrorMsg(pick('Please choose the Palika and ward where the problem is.', 'समस्या भएको पालिका र वडा छान्नुहोस्।'));
      setStep(3);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const photoKeys: string[] = [];
      for (const file of pendingPhotoFiles) {
        photoKeys.push(await uploadComplaintEvidence(file));
      }

      const addressText = [tole.trim(), landmark.trim() && `${pick('near', 'नजिक')} ${landmark.trim()}`]
        .filter(Boolean)
        .join(', ');

      const created = await createComplaint({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        jurisdictionId: territory.jurisdictionId!,
        wardNo: territory.wardNo!,
        location: pin ? { ...pin, address: address || addressText } : undefined,
        address: addressText || undefined,
        photoUrls: photoKeys,
      });

      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
      navigate('/citizen/submission-success', { state: { complaint: created }, replace: true });
    } catch (err) {
      console.error('Complaint submission error:', err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : pick('Could not submit your grievance. Check your connection and try again.', 'गुनासो पठाउन सकिएन। इन्टरनेट जाँचेर फेरि प्रयास गर्नुहोस्।')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-lg mx-auto pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl shadow-header px-4 pt-safe">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => (step > 1 ? setStep(s => s - 1) : navigate(-1))}
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all"
            >
              <Icon name="arrow_back" size={22} />
            </button>
            <span className="text-lg sm:text-xl font-bold text-on-surface">
              {t('fileAGrievance')}
            </span>
          </div>
          <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
            {t('step')} {step} {t('of')} 5
          </span>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mb-2">
          <div
            className="bg-primary h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 px-4 py-6 flex flex-col max-w-full overflow-x-hidden">
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-error-container text-error text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <Icon name="error" size={18} />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="p-1 hover:bg-error/10 rounded">
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        {/* STEP 1: Department & Category Selection */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-in fade-in">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-on-surface mb-1">
                {t('selectCategory')}
              </h2>
              <p className="text-sm text-on-surface-variant">
                {t('selectCategoryDesc')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {CATEGORY_KEYS.map(id => {
                const cat = { id, label: pick(CATEGORY_META[id].label, CATEGORY_META[id].labelNe), icon: CATEGORY_META[id].icon, desc: pick(CATEGORY_HINTS[id].en, CATEGORY_HINTS[id].ne) };
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center gap-3.5 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                        : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container text-primary'
                      }`}
                    >
                      <Icon name={cat.icon} size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-on-surface truncate">
                        {cat.label}
                      </h3>
                      <p className="text-xs sm:text-sm text-on-surface-variant truncate mt-0.5">
                        {cat.desc}
                      </p>
                    </div>
                    <Icon
                      name={isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
                      size={20}
                      className={isSelected ? 'text-primary' : 'text-on-surface-variant/40'}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Issue Details & Priority */}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-in fade-in">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-on-surface mb-1">
                {t('grievanceDetails')}
              </h2>
              <p className="text-sm text-on-surface-variant">
                {t('grievanceDetailsDesc')}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                {t('complaintTitle')} *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t('titlePlaceholder')}
                className="h-12 px-3.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm sm:text-base text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                {t('detailedDescription')} *
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('descPlaceholder')}
                className="p-3.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm sm:text-base text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm font-medium"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider">{t('urgencyPriority')}</label>
              <div className="grid grid-cols-4 gap-2">
                {(['low', 'medium', 'high', 'critical'] as ComplaintPriority[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold capitalize border transition-all ${
                      priority === p
                        ? p === 'critical'
                          ? 'bg-error text-on-error border-error shadow-sm'
                          : p === 'high'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-primary text-on-primary border-primary shadow-sm'
                        : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {t(p)}
                  </button>
                ))}
              </div>
              <span className="text-xs text-on-surface-variant">
                {pick(`The ward should respond within ${SLA_HOURS[priority]} hours, otherwise it moves up to the Palika automatically.`, `वडाले ${SLA_HOURS[priority]} घण्टाभित्र कारबाही गर्नुपर्छ, नत्र गुनासो स्वतः पालिकामा जान्छ।`)}
              </span>
            </div>
          </div>
        )}

        {/* STEP 3: Location & Interactive Map */}
        {step === 3 && (
          <div className="flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-on-surface mb-1">
                  {t('grievanceLocation')}
                </h2>
                <p className="text-sm text-on-surface-variant">
                  {t('locationDesc')}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={isDetectingLocation ? 'progress_activity' : 'my_location'}
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
              >
                {isDetectingLocation ? t('detecting') : t('detectGPS')}
              </Button>
            </div>

            {geoNotice && (
              <div className="p-3.5 rounded-xl bg-primary/10 text-primary text-xs sm:text-sm flex items-start gap-2 border border-primary/20">
                <Icon name="info" size={18} className="flex-shrink-0 mt-0.5" />
                <span>{geoNotice}</span>
              </div>
            )}

            {/* Interactive Location Picker Map */}
            <LocationPickerMap
              coordinates={pin || undefined}
              onChangeCoordinates={coords => {
                if (!isValidNepalCoordinate(coords.lat, coords.lng)) return;
                setPin(coords);
                setAddress('');
              }}
              height="210px"
              isDetecting={isDetectingLocation}
              addressLabel={address}
            />
            <p className="text-xs text-on-surface-variant -mt-2">
              {pin
                ? pick('Pin placed. Drag or tap the map to adjust it.', 'पिन राखियो। मिलाउन नक्सामा थिच्नुहोस्।')
                : pick('Optional: tap the map to mark the exact spot.', 'ऐच्छिक: ठ्याक्कै ठाउँ जनाउन नक्सामा थिच्नुहोस्।')}
            </p>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                {pick('Where is the problem?', 'समस्या कहाँ छ?')} *
              </legend>
              <JurisdictionPicker value={territory} onChange={setTerritory} required />
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider">{t('areaStreet')}</label>
              <input
                type="text"
                value={tole}
                onChange={e => setTole(e.target.value)}
                placeholder={t('areaPlaceholder')}
                className="h-12 px-3.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm sm:text-base text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider">{t('landmark')}</label>
              <input
                type="text"
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                placeholder={t('landmarkPlaceholder')}
                className="h-12 px-3.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm sm:text-base text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm font-medium"
              />
            </div>
          </div>
        )}

        {/* STEP 4: Evidence Photos */}
        {step === 4 && (
          <div className="flex flex-col gap-4 animate-in fade-in">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-on-surface mb-1">
                {t('uploadPhotos')}
              </h2>
              <p className="text-sm text-on-surface-variant">
                {t('uploadPhotosDesc')}
              </p>
            </div>

            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary/40 rounded-2xl bg-surface-container-lowest hover:bg-surface-container cursor-pointer transition-colors text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoAdd}
                className="sr-only"
              />
              <div className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center mb-3 shadow">
                <Icon name="add_a_photo" size={26} />
              </div>
              <span className="text-sm sm:text-base font-bold text-primary mb-1">
                {t('addPhoto')}
              </span>
              <span className="text-xs sm:text-sm text-on-surface-variant">
                {pick('JPG or PNG, up to 25 MB each', 'JPG वा PNG, प्रत्येक २५ MB सम्म')}
              </span>
            </label>

            {/* Attached Photos Gallery — shows local previews before upload */}
            {photoPreviewUrls.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-xs sm:text-sm font-semibold text-on-surface">
                  {t('photosAdded')} ({photoPreviewUrls.length})
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {photoPreviewUrls.map((src, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden border border-outline-variant h-28 group shadow-sm">
                      <img src={src} alt="Evidence preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-error text-on-error flex items-center justify-center shadow opacity-90 hover:opacity-100 transition-opacity"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Review & Submit */}
        {step === 5 && (
          <div className="flex flex-col gap-4 animate-in fade-in max-w-full overflow-hidden">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-on-surface mb-1">
                {t('reviewSubmit')}
              </h2>
              <p className="text-sm text-on-surface-variant">
                {t('reviewDesc')}
              </p>
            </div>

            {/* Review Card with robust Word-Wrapping */}
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4.5 flex flex-col gap-3 shadow-sm max-w-full overflow-hidden break-words">
              <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t('categorySummary')}</span>
                <span className="text-xs sm:text-sm font-bold text-primary capitalize flex items-center gap-1">
                  <Icon name="category" size={16} /> {pick(CATEGORY_META[category].label, CATEGORY_META[category].labelNe)}
                </span>
              </div>

              <div className="max-w-full overflow-hidden">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t('complaintTitle')}</span>
                <p className="text-sm sm:text-base font-bold text-on-surface mt-0.5 break-words break-all [overflow-wrap:anywhere] whitespace-pre-wrap max-w-full">
                  {title}
                </p>
              </div>

              <div className="max-w-full overflow-hidden">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t('detailedDescription')}</span>
                <p className="text-sm text-on-surface-variant mt-0.5 break-words break-all [overflow-wrap:anywhere] whitespace-pre-wrap max-w-full leading-relaxed">
                  {description}
                </p>
              </div>

              <div className="border-t border-outline-variant/60 pt-2.5 flex flex-col gap-1.5 text-xs sm:text-sm max-w-full overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant font-medium">{t('locationSummary')}:</span>
                  <span className="font-semibold text-on-surface text-right truncate max-w-[60%]">
                    {[tole, describeTerritory(territory, language)].filter(Boolean).join(', ')}
                  </span>
                </div>
                {pin && (
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-medium">{pick('Map pin', 'नक्सा पिन')}:</span>
                    <span className="font-mono text-primary font-bold text-xs sm:text-sm">
                      {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm border-t border-outline-variant/60 pt-2.5">
                <span className="text-on-surface-variant font-medium">{t('prioritySummary')}</span>
                <span className={`font-bold uppercase ${
                  priority === 'critical' ? 'text-error' : priority === 'high' ? 'text-amber-600' : 'text-primary'
                }`}>
                  {t(priority)}
                </span>
              </div>

              {photoPreviewUrls.length > 0 && (
                <div className="border-t border-outline-variant/60 pt-2.5 flex items-center gap-2">
                  <Icon name="photo_library" size={16} className="text-primary" />
                  <span className="text-xs sm:text-sm font-medium text-on-surface-variant">{photoPreviewUrls.length} {t('photosAdded')}</span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-surface-container text-xs sm:text-sm text-on-surface-variant flex items-start gap-2 border border-outline-variant/60">
              <Icon name="verified_user" size={18} className="text-primary flex-shrink-0 mt-0.5" />
              <span>
                {pick(
                  'After you submit, you get a tracking number (for example LG307-1042). You will be notified by SMS and in the app whenever the status changes.',
                  'पठाएपछि तपाईंले ट्र्याकिङ नम्बर (जस्तै LG307-1042) पाउनुहुन्छ। स्थिति बदलिँदा SMS र एपमार्फत जानकारी पाउनुहुन्छ।'
                )}
              </span>
            </div>
          </div>
        )}

        {/* Bottom Action Buttons */}
        <div className="pt-6 flex items-center gap-3 mt-4">
          {step > 1 && (
            <Button
              variant="outline"
              size="lg"
              className="flex-1 font-bold"
              onClick={() => setStep(s => s - 1)}
              disabled={submitting}
            >
              {t('back')}
            </Button>
          )}

          {step < 5 ? (
            <Button
              variant="primary"
              size="lg"
              className="flex-1 shadow-sm font-bold"
              onClick={() => {
                if (step === 2 && (!title.trim() || !description.trim())) {
                  setErrorMsg(pick('Please enter a title and description.', 'कृपया शीर्षक र विवरण लेख्नुहोस्।'));
                  return;
                }
                if (step === 3 && !locationComplete) {
                  setErrorMsg(pick('Please choose the Palika and ward where the problem is.', 'समस्या भएको पालिका र वडा छान्नुहोस्।'));
                  return;
                }
                setErrorMsg('');
                setStep(s => s + 1);
              }}
              iconRight="arrow_forward"
            >
              {t('continue')}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="flex-1 shadow-md font-bold"
              onClick={handleSubmit}
              isLoading={submitting}
              disabled={submitting}
              iconRight="check_circle"
            >
              {submitting ? t('submitting') : t('submitGrievance')}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
