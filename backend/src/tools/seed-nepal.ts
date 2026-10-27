import crypto from 'crypto';
import type { Transaction } from 'sequelize';
import districtsEn from '../data/nepal/districts_en.json';
import districtsNe from '../data/nepal/districts_np.json';
import municipalitiesEn from '../data/nepal/municipalities_en.json';
import municipalitiesNe from '../data/nepal/municipalities_np.json';
import provincesEn from '../data/nepal/provinces_en.json';
import provincesNe from '../data/nepal/provinces_np.json';
import { GRIEVANCE_CATEGORIES, PALIKA_DEPARTMENTS, serviceIdFor } from '../core/grievances/constants';
import logger from '../logging';
import type { DatabaseEngine, LocalLevelType, Models } from '../types';

interface RawUnit {
  id: number;
  name: string;
  headquarter?: string;
  website?: string;
  province_id?: number;
  district_id?: number;
  category_id?: number;
  wards?: string;
}

// Dataset category ids: 1 Metropolitan City, 2 Sub-Metropolitan City, 3 Municipality, 4 Rural Municipality.
const LOCAL_LEVEL_TYPE: Record<number, LocalLevelType> = {
  1: 'metropolitan',
  2: 'sub_metropolitan',
  3: 'municipality',
  4: 'rural_municipality',
};

const LOCAL_LEVEL_SUFFIX: Record<LocalLevelType, { en: string; ne: string }> = {
  metropolitan: { en: 'Metropolitan City', ne: 'महानगरपालिका' },
  sub_metropolitan: { en: 'Sub-Metropolitan City', ne: 'उपमहानगरपालिका' },
  municipality: { en: 'Municipality', ne: 'नगरपालिका' },
  rural_municipality: { en: 'Rural Municipality', ne: 'गाउँपालिका' },
};

// Official Nepali province names where the dataset differs (Bagmati was named बागमती in 2020).
const PROVINCE_NAME_NE_FIXES: Record<number, string> = {
  3: 'बागमती प्रदेश',
};

// Official English spellings where the dataset differs.
const DISTRICT_NAME_FIXES: Record<number, string> = {
  8: 'Panchthar',
  44: 'Parbat',
  74: 'Achham',
};

/** Fix vowel signs typed as two characters (ा + े) instead of the single sign (ो). */
export function normalizeDevanagari(value: string): string {
  return value.replace(/ाे/g, 'ो').replace(/ाै/g, 'ौ').normalize('NFC');
}

/** Converts Devanagari digits to ASCII digits. */
function toAsciiDigits(value: string): string {
  return value.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966));
}

export function localLevelId(datasetId: number): string {
  return `lg-${datasetId}`;
}

function byId(units: RawUnit[]): Map<number, RawUnit> {
  return new Map(units.map((unit) => [unit.id, unit]));
}

export interface SeedSummary {
  provinces: number;
  districts: number;
  localLevels: number;
  wards: number;
  departments: number;
  services: number;
}

/**
 * Loads Nepal's provinces, districts and 753 local levels (as Jurisdictions), and gives
 * each local level the standard departments and grievance categories. Safe to run again:
 * existing rows are updated and per-Palika settings changed by staff are kept.
 */
export async function seedNepal(database: DatabaseEngine, options: { withServices?: boolean } = {}): Promise<SeedSummary> {
  const { withServices = true } = options;
  const models = database.models as unknown as Models;
  const { Province, District, Jurisdiction, Department, Service } = models;
  const provincesNeById = byId(provincesNe as RawUnit[]);
  const districtsNeById = byId(districtsNe as RawUnit[]);
  const municipalitiesNeById = byId(municipalitiesNe as RawUnit[]);
  const summary: SeedSummary = { provinces: 0, districts: 0, localLevels: 0, wards: 0, departments: 0, services: 0 };

  await database.transaction(async (transaction: Transaction) => {
    for (const province of provincesEn as RawUnit[]) {
      const ne = provincesNeById.get(province.id);
      await Province.upsert({
        id: province.id,
        name: province.name,
        nameNe: PROVINCE_NAME_NE_FIXES[province.id] ?? normalizeDevanagari(ne?.name ?? province.name),
        headquarter: province.headquarter,
        headquarterNe: ne?.headquarter ? normalizeDevanagari(ne.headquarter) : undefined,
      }, { transaction });
      summary.provinces++;
    }

    for (const district of districtsEn as RawUnit[]) {
      const ne = districtsNeById.get(district.id);
      await District.upsert({
        id: district.id,
        provinceId: district.province_id,
        name: DISTRICT_NAME_FIXES[district.id] ?? district.name,
        nameNe: normalizeDevanagari(ne?.name ?? district.name),
        headquarter: district.headquarter,
        headquarterNe: ne?.headquarter ? normalizeDevanagari(ne.headquarter) : undefined,
      }, { transaction });
      summary.districts++;
    }
    const districtProvince = new Map((districtsEn as RawUnit[]).map((d) => [d.id, d.province_id as number]));

    const existingDepartments = new Map(
      (await Department.findAll({ attributes: ['id', 'jurisdictionId', 'name'], transaction }))
        .map((row) => [`${row.get('jurisdictionId')}|${row.get('name')}`, row.get('id') as string])
    );
    const existingServices = new Set(
      (await Service.findAll({ attributes: ['id'], transaction })).map((row) => row.get('id') as string)
    );
    const existingJurisdictions = new Set(
      (await Jurisdiction.findAll({ attributes: ['id'], transaction })).map((row) => row.get('id') as string)
    );
    const newDepartments: Record<string, unknown>[] = [];
    const newServices: Record<string, unknown>[] = [];

    for (const municipality of municipalitiesEn as RawUnit[]) {
      const ne = municipalitiesNeById.get(municipality.id);
      const type = LOCAL_LEVEL_TYPE[municipality.category_id as number];
      const id = localLevelId(municipality.id);
      const wardCount = Number(toAsciiDigits(String(municipality.wards)));
      const suffix = LOCAL_LEVEL_SUFFIX[type];
      const data = {
        name: `${municipality.name} ${suffix.en}`,
        nameNe: `${normalizeDevanagari(ne?.name ?? municipality.name)} ${suffix.ne}`,
        localLevelType: type,
        wardCount,
        website: municipality.website || undefined,
        districtId: municipality.district_id,
        provinceId: districtProvince.get(municipality.district_id as number),
        country: 'Nepal',
      };
      if (existingJurisdictions.has(id)) {
        await Jurisdiction.update(data, { where: { id }, transaction });
      } else {
        await Jurisdiction.create({
          id,
          ...data,
          usageContext: '311',
          preferredBroadcastChannel: 'sms',
          workflowEnabled: true,
        }, { transaction });
      }
      summary.localLevels++;
      summary.wards += wardCount;

      if (!withServices) { continue; }
      const departmentIds: Record<string, string> = {};
      for (const department of PALIKA_DEPARTMENTS) {
        const name = `${department.nameNe} (${department.name})`;
        let departmentId = existingDepartments.get(`${id}|${name}`);
        if (!departmentId) {
          departmentId = crypto.randomUUID();
          newDepartments.push({ id: departmentId, jurisdictionId: id, name });
        }
        departmentIds[department.key] = departmentId;
      }
      for (const category of GRIEVANCE_CATEGORIES) {
        const serviceId = serviceIdFor(id, category.key);
        if (existingServices.has(serviceId)) { continue; }
        newServices.push({
          id: serviceId,
          jurisdictionId: id,
          name: `${category.nameNe} (${category.name})`,
          group: category.group,
          description: category.name,
          tags: [category.key],
          defaultDepartmentId: departmentIds[category.departmentKey],
        });
      }
    }

    await Department.bulkCreate(newDepartments, { transaction });
    await Service.bulkCreate(newServices, { transaction });
    summary.departments = newDepartments.length;
    summary.services = newServices.length;
  });

  logger.info(`Seeded Nepal federal structure: ${JSON.stringify(summary)}`);
  return summary;
}
