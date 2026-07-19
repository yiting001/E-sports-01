import type { BoosterServiceRegion } from '@app/contracts';
import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  BOOSTER_DIRECTORY_QUERY,
  BoosterDirectoryQuery,
  BoosterDirectoryRecord,
} from '../domain/booster-directory.query';
import { BoosterDepositGuard } from './booster-deposit.service';
import { resolveBoosterDisplayName } from './booster-public.mapper';
import { BoosterRealnameGuard } from './booster-realname.service';

export interface SelectedBoosterSnapshot {
  userId: string;
  displayName: string;
}

export interface BoosterAvailability {
  selectable: boolean;
  unavailableReason: string;
}

/** 订单指定打手的统一校验口，不改变订单状态或直接指派。 */
@Injectable()
export class BoosterSelectionService {
  constructor(
    @Inject(BOOSTER_DIRECTORY_QUERY)
    private readonly directory: BoosterDirectoryQuery,
    private readonly realname: BoosterRealnameGuard,
    private readonly deposit: BoosterDepositGuard,
  ) {}

  async assertSelectable(
    ownerId: string,
    requestedUserId: string,
    serviceRegion: BoosterServiceRegion,
    tenantId?: string,
  ): Promise<SelectedBoosterSnapshot> {
    const record = await this.getDirectoryRecord(requestedUserId, tenantId);
    if (!record.acceptingOrders) {
      throw new BadRequestException('打手当前未上线');
    }
    if (!record.serviceRegions.includes(serviceRegion)) {
      throw new BadRequestException('指定打手不支持当前游戏区服');
    }
    await this.assertRecordAssignable(ownerId, record);
    return {
      userId: record.userId,
      displayName: resolveBoosterDisplayName(record),
    };
  }

  /** 历史空区服订单仍需复核目录、本人、实名和押金，只跳过区服匹配。 */
  async assertAssignable(
    ownerId: string,
    requestedUserId: string,
    tenantId?: string,
  ): Promise<SelectedBoosterSnapshot> {
    const record = await this.getDirectoryRecord(requestedUserId, tenantId);
    await this.assertRecordAssignable(ownerId, record);
    return {
      userId: record.userId,
      displayName: resolveBoosterDisplayName(record),
    };
  }

  async availabilityFor(
    ownerId: string,
    record: BoosterDirectoryRecord,
  ): Promise<BoosterAvailability> {
    if (!record.acceptingOrders) {
      return { selectable: false, unavailableReason: '打手当前未上线' };
    }
    if (ownerId === record.userId) {
      return { selectable: false, unavailableReason: '不能选择自己为接单打手' };
    }
    if (!record.serviceRegions.length) {
      return { selectable: false, unavailableReason: '打手暂未配置接单区服' };
    }
    try {
      await this.realname.assertApproved(record.userId);
      await this.deposit.assertPaid(record.userId);
      return { selectable: true, unavailableReason: '' };
    } catch (error) {
      if (!(error instanceof ForbiddenException)) {
        throw error;
      }
      return {
        selectable: false,
        unavailableReason: error.message,
      };
    }
  }

  private async getDirectoryRecord(
    requestedUserId: string,
    tenantId?: string,
  ): Promise<BoosterDirectoryRecord> {
    const record = await this.directory.findByUserId(requestedUserId, tenantId);
    if (!record) {
      throw new BadRequestException('指定打手不存在或当前不可接单');
    }
    return record;
  }

  private async assertRecordAssignable(
    ownerId: string,
    record: BoosterDirectoryRecord,
  ): Promise<void> {
    const availability = await this.availabilityFor(ownerId, record);
    if (!availability.selectable) {
      throw new BadRequestException(availability.unavailableReason);
    }
  }
}
