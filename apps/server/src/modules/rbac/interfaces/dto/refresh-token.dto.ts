import { IsString } from 'class-validator';

/** 刷新令牌入参 */
export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}
