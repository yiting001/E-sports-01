import { Inject, Injectable } from '@nestjs/common';
import {
  CONFIG_REPOSITORY,
  ConfigRepository,
} from '../../domain/config-repository.interface';
import { ConfigService } from '../config.service';

/** 用例：删除配置项并清理缓存 */
@Injectable()
export class RemoveConfigUseCase {
  constructor(
    @Inject(CONFIG_REPOSITORY) private readonly repository: ConfigRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(key: string): Promise<void> {
    await this.repository.remove(key);
    await this.configService.invalidate(key);
  }
}
