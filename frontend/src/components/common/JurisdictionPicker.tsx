import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getDistricts,
  getLocalLevels,
  getProvinces,
  getWardNumbers,
  getLocalLevel,
  getDistrict,
  unitName,
} from '@/lib/jurisdictionService';
import type { GovernmentLevel, Territory } from '@/types';

interface JurisdictionPickerProps {
  value: Territory;
  onChange: (value: Territory) => void;
  /** The most specific level to ask for; "ward" asks for all four. */
  depth?: GovernmentLevel;
  /** Levels fixed by the officer's own area; they are shown but cannot be changed. */
  locked?: Partial<Record<GovernmentLevel, boolean>>;
  required?: boolean;
  /** Adds an "All" option to each list, for filters. */
  allowAll?: boolean;
  className?: string;
  selectClassName?: string;
}

const LEVEL_INDEX: Record<GovernmentLevel, number> = { province: 0, district: 1, palika: 2, ward: 3 };

/**
 * Province → District → Palika → Ward dropdowns. Choosing a higher level clears
 * the levels below it.
 */
export function JurisdictionPicker({
  value,
  onChange,
  depth = 'ward',
  locked = {},
  required = false,
  allowAll = false,
  className = 'grid grid-cols-1 sm:grid-cols-2 gap-3',
  selectClassName = 'w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002045]/30 disabled:bg-slate-100 disabled:text-slate-500',
}: JurisdictionPickerProps) {
  const { t, language } = useLanguage();
  const show = (level: GovernmentLevel) => LEVEL_INDEX[level] <= LEVEL_INDEX[depth];

  // Infer parents when only a lower level is set (e.g. an officer's Palika).
  const districtId = value.districtId ?? getLocalLevel(value.jurisdictionId)?.districtId;
  const provinceId = value.provinceId ?? getDistrict(districtId)?.provinceId;

  const provinces = getProvinces();
  const districts = useMemo(() => getDistricts(provinceId), [provinceId]);
  const localLevels = useMemo(() => getLocalLevels(districtId), [districtId]);
  const wards = useMemo(() => getWardNumbers(value.jurisdictionId), [value.jurisdictionId]);

  const placeholder = (key: string) => (allowAll ? `${t('allCases')}` : t(key));

  return (
    <div className={className}>
      {show('province') && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">{t('province')}</span>
          <select
            className={selectClassName}
            value={provinceId ?? ''}
            required={required}
            disabled={locked.province}
            onChange={(event) => onChange({
              provinceId: event.target.value ? Number(event.target.value) : undefined,
            })}
          >
            <option value="">{placeholder('selectProvince')}</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>{unitName(province, language)}</option>
            ))}
          </select>
        </label>
      )}

      {show('district') && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">{t('district').replace(' *', '')}</span>
          <select
            className={selectClassName}
            value={districtId ?? ''}
            required={required}
            disabled={locked.district || !provinceId}
            onChange={(event) => onChange({
              provinceId,
              districtId: event.target.value ? Number(event.target.value) : undefined,
            })}
          >
            <option value="">{placeholder('selectDistrict')}</option>
            {districts.map((district) => (
              <option key={district.id} value={district.id}>{unitName(district, language)}</option>
            ))}
          </select>
        </label>
      )}

      {show('palika') && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">{t('palika')}</span>
          <select
            className={selectClassName}
            value={value.jurisdictionId ?? ''}
            required={required}
            disabled={locked.palika || !districtId}
            onChange={(event) => onChange({
              provinceId,
              districtId,
              jurisdictionId: event.target.value || undefined,
            })}
          >
            <option value="">{placeholder('selectPalika')}</option>
            {localLevels.map((level) => (
              <option key={level.id} value={level.id}>{unitName(level, language)}</option>
            ))}
          </select>
        </label>
      )}

      {show('ward') && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">{t('ward')}</span>
          <select
            className={selectClassName}
            value={value.wardNo ?? ''}
            required={required}
            disabled={locked.ward || !value.jurisdictionId}
            onChange={(event) => onChange({
              provinceId,
              districtId,
              jurisdictionId: value.jurisdictionId,
              wardNo: event.target.value ? Number(event.target.value) : undefined,
            })}
          >
            <option value="">{placeholder('selectWard')}</option>
            {wards.map((ward) => (
              <option key={ward} value={ward}>
                {language === 'ne' ? `वडा नं. ${ward}` : `Ward ${ward}`}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
