import { Injectable } from '@nestjs/common';
import { RealnamePolicyView } from '@app/contracts';
import { RealnamePolicyService } from '../policy.service';

/** 用例：读取实名策略（哪些角色需实名） */
@Injectable()
export class GetRealnamePolicyUseCase {
  constructor(private readonly policy: RealnamePolicyService) {}

  async execute(): Promise<RealnamePolicyView> {
    return { requiredRoleCodes: await this.policy.getRequiredRoleCodes() };
  }
}
