import { inject, injectable } from 'inversify';
import { appIds } from '../../registry/service-identifiers';
import type {
  AppConfig,
  DistrictAttributes,
  IGeoRepository,
  JurisdictionAttributes,
  Models,
  ProvinceAttributes
} from '../../types';

const LOCAL_LEVEL_ATTRIBUTES = [
  'id', 'name', 'nameNe', 'localLevelType', 'wardCount', 'website', 'provinceId', 'districtId',
];

@injectable()
export class GeoRepository implements IGeoRepository {

  models: Models;
  config: AppConfig;

  constructor(
    @inject(appIds.Models) models: Models,
    @inject(appIds.AppConfig) config: AppConfig,
  ) {
    this.models = models;
    this.config = config;
  }

  async findProvinces(): Promise<ProvinceAttributes[]> {
    const { Province } = this.models;
    return await Province.findAll({ order: [['id', 'ASC']] }) as unknown as ProvinceAttributes[];
  }

  async findProvince(id: number): Promise<ProvinceAttributes | null> {
    const { Province } = this.models;
    return await Province.findByPk(id) as unknown as ProvinceAttributes | null;
  }

  async findDistricts(provinceId?: number): Promise<DistrictAttributes[]> {
    const { District } = this.models;
    const where = provinceId ? { provinceId } : {};
    return await District.findAll({ where, order: [['name', 'ASC']] }) as unknown as DistrictAttributes[];
  }

  async findDistrict(id: number): Promise<DistrictAttributes | null> {
    const { District } = this.models;
    return await District.findByPk(id) as unknown as DistrictAttributes | null;
  }

  async findLocalLevels(districtId: number): Promise<JurisdictionAttributes[]> {
    const { Jurisdiction } = this.models;
    return await Jurisdiction.findAll({
      where: { districtId },
      attributes: LOCAL_LEVEL_ATTRIBUTES,
      order: [['name', 'ASC']],
    }) as unknown as JurisdictionAttributes[];
  }

  async findLocalLevel(id: string): Promise<JurisdictionAttributes | null> {
    const { Jurisdiction } = this.models;
    return await Jurisdiction.findByPk(id, {
      attributes: LOCAL_LEVEL_ATTRIBUTES,
    }) as unknown as JurisdictionAttributes | null;
  }

}
