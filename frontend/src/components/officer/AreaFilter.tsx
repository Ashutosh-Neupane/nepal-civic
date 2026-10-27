import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDistricts, getLocalLevels, getProvinces, getWardNumbers, unitName } from '@/lib/jurisdictionService';
import { ROLE_LEVEL, isOfficer } from '@/lib/statusService';
import type { GovernmentLevel } from '@/types';

/** A narrower area inside the officer's own; empty means the whole area. */
export interface AreaSelection {
  provinceId?: number;
  districtId?: number;
  jurisdictionId?: string;
  wardNo?: number;
}

/** The signed-in officer's level, from the token scope or the role. */
export function useOfficerLevel(): GovernmentLevel | 'national' {
  const { user } = useAuth();
  if (user?.scope?.level) return user.scope.level;
  return user && isOfficer(user.role) ? ROLE_LEVEL[user.role] : 'ward';
}

interface AreaFilterProps {
  value: AreaSelection;
  onChange: (value: AreaSelection) => void;
  className?: string;
}

const SELECT_CLASS =
  'h-10 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30';

/** One dropdown for the level directly below the officer (wards for a Palika officer, and so on). */
export function AreaFilter({ value, onChange, className = '' }: AreaFilterProps) {
  const { user } = useAuth();
  const { pick, language } = useLanguage();
  const level = useOfficerLevel();
  const territory = user?.territory || {};

  if (level === 'national') {
    return (
      <select className={`${SELECT_CLASS} ${className}`} value={value.provinceId ?? ''} aria-label={pick('Province', 'प्रदेश')}
        onChange={(e) => onChange(e.target.value ? { provinceId: Number(e.target.value) } : {})}>
        <option value="">{pick('All provinces', 'सबै प्रदेश')}</option>
        {getProvinces().map((p) => <option key={p.id} value={p.id}>{unitName(p, language)}</option>)}
      </select>
    );
  }
  if (level === 'province') {
    return (
      <select className={`${SELECT_CLASS} ${className}`} value={value.districtId ?? ''} aria-label={pick('District', 'जिल्ला')}
        onChange={(e) => onChange(e.target.value ? { districtId: Number(e.target.value) } : {})}>
        <option value="">{pick('All districts', 'सबै जिल्ला')}</option>
        {getDistricts(territory.provinceId).map((d) => <option key={d.id} value={d.id}>{unitName(d, language)}</option>)}
      </select>
    );
  }
  if (level === 'district') {
    return (
      <select className={`${SELECT_CLASS} ${className}`} value={value.jurisdictionId ?? ''} aria-label={pick('Palika', 'पालिका')}
        onChange={(e) => onChange(e.target.value ? { jurisdictionId: e.target.value } : {})}>
        <option value="">{pick('All Palikas', 'सबै पालिका')}</option>
        {getLocalLevels(territory.districtId).map((l) => <option key={l.id} value={l.id}>{unitName(l, language)}</option>)}
      </select>
    );
  }
  if (level === 'palika') {
    return (
      <select className={`${SELECT_CLASS} ${className}`} value={value.wardNo ?? ''} aria-label={pick('Ward', 'वडा')}
        onChange={(e) => onChange(e.target.value ? { wardNo: Number(e.target.value) } : {})}>
        <option value="">{pick('All wards', 'सबै वडा')}</option>
        {getWardNumbers(territory.jurisdictionId).map((w) => (
          <option key={w} value={w}>{pick(`Ward ${w}`, `वडा नं. ${w}`)}</option>
        ))}
      </select>
    );
  }
  return null;
}
