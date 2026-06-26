import { Inject, Injectable } from '@nestjs/common';
import { ConfigItemView } from '@app/contracts';
import {
  CONFIG_REPOSITORY,
  ConfigRepository,
} from '../../domain/config-repository.interface';
import { UpsertConfigDto } from '../../interfaces/dto/upsert-config.dto';
import { ConfigService } from '../config.service';
import { toConfigView } from '../config.mapper';

/** 用例：新增或更新配置项，并使缓存失效 */
@Injectable()
export class UpsertConfigUseCase {
  constructor(
    @Inject(CONFIG_REPOSITORY) private readonly repository: ConfigRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: UpsertConfigDto): Promise<ConfigItemView> {
    const saved = await this.repository.upsert({
      key: dto.key,
      value: dto.value,
      type: dto.type,
      group: dto.group,
      remark: dto.remark ?? '',
      secret: dto.secret ?? false,
    });
    await this.configService.invalidate(saved.key);
    return toConfigView(saved);
  }
}
