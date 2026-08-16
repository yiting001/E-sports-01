import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile as UploadedFileParam,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WechatPayCertUploadResult } from '@app/contracts';
import { PERMS } from '../../rbac/domain/permission-codes';
import { Permissions } from '../../rbac/interfaces/auth/permissions.decorator';
import { UploadWechatPayCertUseCase } from '../application/use-cases/upload-wechat-pay-cert.usecase';
import { UploadWechatPayCertDto } from './dto/upload-wechat-pay-cert.dto';

/**
 * 路由：上传微信支付证书文件并解析入库（POST /config/wechat-pay-cert）。
 * multipart/form-data：file=PEM/P12 文件，usage=用途，password=P12 口令（选填）。
 * 证书只在内存中解析后写入配置中心敏感项，不作为静态资源存储。
 */
@Controller('config')
export class UploadWechatPayCertController {
  constructor(private readonly useCase: UploadWechatPayCertUseCase) {}

  @Post('wechat-pay-cert')
  @Permissions(PERMS.config.save)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFileParam() file: Express.Multer.File | undefined,
    @Body() dto: UploadWechatPayCertDto,
  ): Promise<WechatPayCertUploadResult> {
    if (!file) {
      throw new BadRequestException('请通过 file 字段上传证书文件');
    }
    return this.useCase.execute(dto.usage, file.buffer, dto.password ?? '');
  }
}
