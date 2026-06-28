import { Injectable } from '@nestjs/common';
import { RealnamePolicyView, SetRealnamePolicyPayload } from '@app/contracts';
import { RealnamePolicyService } from '../policy.service';

/** 用例：超管设置实名策略（覆盖写入需实名的角色集合） */
@Injectable()
export class SetRealnamePolicyUseCase {
  constructor(private readonly policy: RealnamePolicyService) {}

  async execute(payload: SetRealnamePolicyPayload): Promise<RealnamePolicyView> {
    const saved = await this.policy.setRequiredRoleCodes(
      payload.requiredRoleCodes,
    );
    return { requiredRoleCodes: saved };
  }
}
