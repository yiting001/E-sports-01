import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { ReviewBoosterPayload } from '@app/contracts';

/** 审核打手入驻申请入参 */
export class ReviewBoosterDto implements ReviewBoosterPayload {
  @IsBoolean()
  approve!: boolean;

  /** 驳回理由（approve=false 时必填，由用例兜底校验） */
  @IsOptional()
  @IsString()
  @Length(1, 255)
  rejectReason?: string;
}
