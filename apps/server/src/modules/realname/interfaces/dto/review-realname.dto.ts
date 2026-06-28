import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { ReviewRealnamePayload } from '@app/contracts';

/** 审核实名认证入参 */
export class ReviewRealnameDto implements ReviewRealnamePayload {
  @IsBoolean()
  approve!: boolean;

  /** 驳回理由（approve=false 时必填，由用例兜底校验） */
  @IsOptional()
  @IsString()
  @Length(1, 255)
  rejectReason?: string;
}
