import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigItem } from '../domain/config-item.entity';
import { ConfigRepository } from '../domain/config-repository.interface';

/** 配置仓储的 TypeORM 实现 */
@Injectable()
export class TypeormConfigRepository implements ConfigRepository {
  constructor(
    @InjectRepository(ConfigItem)
    private readonly repo: Repository<ConfigItem>,
  ) {}

  findByKey(key: string): Promise<ConfigItem | null> {
    return this.repo.findOne({ where: { key } });
  }

  findAll(): Promise<ConfigItem[]> {
    return this.repo.find({ order: { group: 'ASC', key: 'ASC' } });
  }

  findByGroup(group: string): Promise<ConfigItem[]> {
    return this.repo.find({ where: { group: group as ConfigItem['group'] }, order: { key: 'ASC' } });
  }

  async upsert(item: Partial<ConfigItem> & { key: string }): Promise<ConfigItem> {
    const existing = await this.findByKey(item.key);
    const merged = this.repo.merge(existing ?? this.repo.create(), item);
    return this.repo.save(merged);
  }

  async createMissing(items: Array<Partial<ConfigItem> & { key: string }>): Promise<number> {
    const existing = await this.repo.find({ select: { key: true } });
    const existingKeys = new Set(existing.map((it) => it.key));
    const toCreate = items.filter((it) => !existingKeys.has(it.key));
    if (toCreate.length === 0) {
      return 0;
    }
    await this.repo.save(toCreate.map((it) => this.repo.create(it)));
    return toCreate.length;
  }

  async remove(key: string): Promise<void> {
    await this.repo.delete({ key });
  }
}
