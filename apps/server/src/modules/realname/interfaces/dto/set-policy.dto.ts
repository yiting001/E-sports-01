import { ArrayUnique, IsArray, IsString } from 'class-validator';
import { SetRealnamePolicyPayload } from '@app/contracts';

/** 设置实名策略入参（需实名的角色 code 集合） */
export class SetRealnamePolicyDto implements SetRealnamePolicyPayload {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  requiredRoleCodes!: string[];
}
