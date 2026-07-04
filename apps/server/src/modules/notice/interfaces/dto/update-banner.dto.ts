import { UpdatePortalBannerPayload } from '@app/contracts';
import { IsString, MaxLength } from 'class-validator';

/** 更新首页横幅入参校验（值为上传后的图片 URL，允许清空） */
export class UpdateBannerDto implements UpdatePortalBannerPayload {
  @IsString()
  @MaxLength(512)
  image!: string;
}
