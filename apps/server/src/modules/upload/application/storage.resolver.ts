import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CONFIG_KEYS, StorageDriver } from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';
import {
  STORAGE_PORTS,
  StoragePort,
} from '../domain/storage-driver.interface';

/**
 * 存储策略解析器。
 * 运行时读取配置中心 upload.driver，从已注册策略集合中挑选对应实现，
 * 切换存储方式只需改配置，无需重启或改代码（体现策略模式 + 配置驱动）。
 */
@Injectable()
export class StorageResolver {
  constructor(
    @Inject(STORAGE_PORTS) private readonly ports: StoragePort[],
    private readonly config: ConfigService,
  ) {}

  /** 解析当前生效的存储驱动 */
  async resolve(): Promise<StoragePort> {
    const driver = await this.config.getString(
      CONFIG_KEYS.upload.driver,
      StorageDriver.Local,
    );
    return this.pick(driver as StorageDriver);
  }

  /** 按指定驱动取实现（删除文件时复用其原始驱动） */
  pickByDriver(driver: StorageDriver): StoragePort {
    return this.pick(driver);
  }

  private pick(driver: StorageDriver): StoragePort {
    const port = this.ports.find((p) => p.driver === driver);
    if (!port) {
      throw new InternalServerErrorException(`未注册的存储驱动：${driver}`);
    }
    return port;
  }
}
