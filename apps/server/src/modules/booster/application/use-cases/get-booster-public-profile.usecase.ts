import { BoosterPublicView } from '@app/contracts';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  BOOSTER_DIRECTORY_QUERY,
  BoosterDirectoryQuery,
} from '../../domain/booster-directory.query';
import { BoosterPolicyService } from '../booster-policy.service';
import { toBoosterPublicView } from '../booster-public.mapper';
import { BoosterSelectionService } from '../booster-selection.service';

@Injectable()
export class GetBoosterPublicProfileUseCase {
  constructor(
    @Inject(BOOSTER_DIRECTORY_QUERY)
    private readonly directory: BoosterDirectoryQuery,
    private readonly policy: BoosterPolicyService,
    private readonly selection: BoosterSelectionService,
  ) {}

  async execute(viewerId: string, userId: string): Promise<BoosterPublicView> {
    const record = await this.directory.findByUserId(userId);
    if (!record) {
      throw new NotFoundException('打手主页不存在');
    }
    const tiers = await this.policy.getLevelTiers();
    const availability = await this.selection.availabilityFor(viewerId, record);
    return toBoosterPublicView(record, tiers, availability);
  }
}
