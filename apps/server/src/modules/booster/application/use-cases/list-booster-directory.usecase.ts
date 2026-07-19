import {
  BoosterPublicView,
  PaginatedResult,
} from '@app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import {
  BOOSTER_DIRECTORY_QUERY,
  BoosterDirectoryFilter,
  BoosterDirectoryQuery,
} from '../../domain/booster-directory.query';
import { BoosterPolicyService } from '../booster-policy.service';
import { toBoosterPublicView } from '../booster-public.mapper';
import { BoosterSelectionService } from '../booster-selection.service';

@Injectable()
export class ListBoosterDirectoryUseCase {
  constructor(
    @Inject(BOOSTER_DIRECTORY_QUERY)
    private readonly directory: BoosterDirectoryQuery,
    private readonly policy: BoosterPolicyService,
    private readonly selection: BoosterSelectionService,
  ) {}

  async execute(
    viewerId: string,
    page: number,
    pageSize: number,
    skip: number,
    filter: BoosterDirectoryFilter,
  ): Promise<PaginatedResult<BoosterPublicView>> {
    const [[rows, total], tiers] = await Promise.all([
      this.directory.paginate(skip, pageSize, filter),
      this.policy.getLevelTiers(),
    ]);
    const availability = await Promise.all(
      rows.map((row) => this.selection.availabilityFor(viewerId, row)),
    );
    return {
      list: rows.map((row, index) =>
        toBoosterPublicView(row, tiers, availability[index]),
      ),
      total,
      page,
      pageSize,
    };
  }
}
