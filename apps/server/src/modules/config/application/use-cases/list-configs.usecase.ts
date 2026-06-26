import { Inject, Injectable } from '@nestjs/common';
import { ConfigItemView } from '@app/contracts';
import {
  CONFIG_REPOSITORY,
  ConfigRepository,
} from '../../domain/config-repository.interface';
import { toConfigView } from '../config.mapper';

/** 用例：查询配置列表（可按分组过滤） */
@Injectable()
export class ListConfigsUseCase {
  constructor(@Inject(CONFIG_REPOSITORY) private readonly repository: ConfigRepository) {}

  async execute(group?: string): Promise<ConfigItemView[]> {
    const items = group
      ? await this.repository.findByGroup(group)
      : await this.repository.findAll();
    return items.map(toConfigView);
  }
}
