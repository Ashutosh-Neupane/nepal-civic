import { localizeDigits } from './dateUtils';
import { DISTRICTS, LOCAL_LEVELS, PROVINCES } from '@/data/nepal';
import type { DistrictInfo, LocalLevelInfo, ProvinceInfo } from '@/data/nepal';
import type { GovernmentLevel, LocalLevelType, Territory } from '@/types';

export type { DistrictInfo, LocalLevelInfo, ProvinceInfo };

const provinceById = new Map(PROVINCES.map((province) => [province.id, province]));
const districtById = new Map(DISTRICTS.map((district) => [district.id, district]));
const localLevelById = new Map(LOCAL_LEVELS.map((level) => [level.id, level]));

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

export const LOCAL_LEVEL_TYPE_LABELS: Record<LocalLevelType, { en: string; ne: string }> = {
  metropolitan: { en: 'Metropolitan City', ne: 'महानगरपालिका' },
  sub_metropolitan: { en: 'Sub-Metropolitan City', ne: 'उपमहानगरपालिका' },
  municipality: { en: 'Municipality', ne: 'नगरपालिका' },
  rural_municipality: { en: 'Rural Municipality', ne: 'गाउँपालिका' },
};

export function getProvinces(): ProvinceInfo[] {
  return PROVINCES;
}

export function getProvince(id?: number | null): ProvinceInfo | undefined {
  return id ? provinceById.get(Number(id)) : undefined;
}

export function getDistricts(provinceId?: number | null): DistrictInfo[] {
  const list = provinceId ? DISTRICTS.filter((district) => district.provinceId === Number(provinceId)) : DISTRICTS;
  return [...list].sort(byName);
}

export function getDistrict(id?: number | null): DistrictInfo | undefined {
  return id ? districtById.get(Number(id)) : undefined;
}

export function getLocalLevels(districtId?: number | null): LocalLevelInfo[] {
  if (!districtId) return [];
  return LOCAL_LEVELS.filter((level) => level.districtId === Number(districtId)).sort(byName);
}

export function getLocalLevel(id?: string | null): LocalLevelInfo | undefined {
  return id ? localLevelById.get(id) : undefined;
}

export function getWardNumbers(jurisdictionId?: string | null): number[] {
  const level = getLocalLevel(jurisdictionId);
  return level ? Array.from({ length: level.wardCount }, (_, index) => index + 1) : [];
}

/** Display name in the chosen language. */
export function unitName(unit: { name: string; nameNe: string } | undefined, language: string): string {
  if (!unit) return '';
  return language === 'ne' ? unit.nameNe : unit.name;
}

/** Fills in names and parent ids for a territory from whatever ids it has. */
export function completeTerritory(territory: Territory): Territory {
  const localLevel = getLocalLevel(territory.jurisdictionId);
  const districtId = localLevel?.districtId ?? territory.districtId;
  const district = getDistrict(districtId);
  const provinceId = district?.provinceId ?? territory.provinceId;
  const province = getProvince(provinceId);
  return {
    provinceId: province?.id,
    provinceName: province?.name,
    districtId: district?.id,
    districtName: district?.name,
    jurisdictionId: localLevel?.id,
    jurisdictionName: localLevel?.name,
    wardNo: localLevel ? territory.wardNo : undefined,
  };
}

/** "Ward 10, Kathmandu Metropolitan City, Kathmandu" */
export function describeTerritory(territory: Territory, language = 'en'): string {
  const full = completeTerritory(territory);
  const parts: string[] = [];
  if (full.wardNo) parts.push(language === 'ne' ? `वडा नं. ${full.wardNo}` : `Ward ${full.wardNo}`);
  if (full.jurisdictionId) parts.push(unitName(getLocalLevel(full.jurisdictionId), language));
  if (full.districtId) parts.push(unitName(getDistrict(full.districtId), language));
  if (!full.districtId && full.provinceId) parts.push(unitName(getProvince(full.provinceId), language));
  return parts.join(', ');
}

/** Each level of a territory as a display name; empty strings for levels it doesn't reach. */
export function territoryNames(territory: Territory | undefined, language = 'en') {
  const full = completeTerritory(territory || {});
  return {
    province: unitName(getProvince(full.provinceId), language),
    district: unitName(getDistrict(full.districtId), language),
    palika: unitName(getLocalLevel(full.jurisdictionId), language),
    ward: full.wardNo ? (language === 'ne' ? `वडा नं. ${full.wardNo}` : `Ward ${full.wardNo}`) : '',
  };
}

/** Display name of a statistics unit (a province, district, Palika or ward id). */
export function unitDisplayName(level: GovernmentLevel | null, unitId: string, language = 'en'): string {
  const ne = language === 'ne';
  switch (level) {
    case 'province': return unitName(getProvince(Number(unitId)), language) || (ne ? `प्रदेश ${unitId}` : `Province ${unitId}`);
    case 'district': return unitName(getDistrict(Number(unitId)), language) || unitId;
    case 'palika': return unitName(getLocalLevel(unitId), language) || unitId;
    case 'ward': return ne ? `वडा नं. ${localizeDigits(unitId, 'ne')}` : `Ward ${unitId}`;
    default: return unitId;
  }
}
