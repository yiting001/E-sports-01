import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  JQF_WALLET_ACCOUNT_REPOSITORY,
  JqfWalletAccountRepository,
} from '../domain/jqf-wallet-account-repository.interface';
import {
  JQF_WALLET_CHANNEL_STATE,
  JQF_WALLET_SETTLED_STATES,
  JqfWalletAccountEntity,
} from '../domain/jqf-wallet-account.entity';
import {
  JQF_WALLET_OPEN_PORT,
  JqfWalletOpenPort,
} from '../domain/jqf-wallet-open-port.interface';
import { buildOrderNo } from './order-no.util';

/** 开户所需实名要素（身份证明文仅在本次调用内存中短暂存在，绝不落库/落日志） */
export interface OpenJqfWalletInput {
  userId: string;
  realName: string;
  idCardNo: string;
  phone: string;
}

/**
 * 计全付钱包开户服务。
 * 幂等：每用户每租户至多一条开户记录（mchOrderNo 为渠道幂等单号），
 * 渠道状态为开户成功/待审核/待激活时不再重复发起；计全付未配置时静默跳过；
 * 任何失败只记录状态与原因供重试，绝不向调用方抛错——
 * 开户是实名审核的附带动作，不允许反向阻断审核流程。
 */
@Injectable()
export class JqfWalletService {
  private readonly logger = new Logger(JqfWalletService.name);

  constructor(
    @Inject(JQF_WALLET_ACCOUNT_REPOSITORY)
    private readonly repo: JqfWalletAccountRepository,
    @Inject(JQF_WALLET_OPEN_PORT)
    private readonly channel: JqfWalletOpenPort,
  ) {}

  async openForUser(input: OpenJqfWalletInput): Promise<void> {
    try {
      await this.doOpen(input);
    } catch (error) {
      this.logger.warn(
        `计全付钱包开户异常（userId=${input.userId}）：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async doOpen(input: OpenJqfWalletInput): Promise<void> {
    const existing = await this.repo.findByUser(input.userId);
    if (existing && JQF_WALLET_SETTLED_STATES.includes(existing.channelState)) {
      return;
    }
    if (!(await this.channel.isConfigured())) {
      this.logger.log(`计全付未配置，跳过钱包开户（userId=${input.userId}）`);
      return;
    }
    const record = existing ?? this.newRecord(input.userId);
    if (!input.phone) {
      record.errMsg = '用户未绑定手机号，无法开户';
      record.syncedAt = new Date();
      await this.repo.save(record);
      return;
    }
    try {
      const result = await this.channel.openWallet({
        mchOrderNo: record.mchOrderNo,
        idcardNo: input.idCardNo,
        idcardName: input.realName,
        telphone: input.phone,
      });
      record.walletId = result.walletId;
      record.channelState = result.channelState;
      record.errMsg = result.errMsg.slice(0, 255);
    } catch (error) {
      record.errMsg = (error instanceof Error ? error.message : String(error)).slice(0, 255);
    }
    record.syncedAt = new Date();
    await this.repo.save(record);
  }

  private newRecord(userId: string): JqfWalletAccountEntity {
    const record = new JqfWalletAccountEntity();
    record.userId = userId;
    record.mchOrderNo = buildOrderNo('JQFW');
    record.walletId = '';
    record.channelState = JQF_WALLET_CHANNEL_STATE.notOpened;
    record.errMsg = '';
    return record;
  }
}
