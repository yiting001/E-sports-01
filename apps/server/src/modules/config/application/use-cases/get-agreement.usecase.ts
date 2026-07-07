import { Injectable } from '@nestjs/common';
import { AgreementView, CONFIG_KEYS } from '@app/contracts';
import { ConfigService } from '../config.service';

/** 用例：读取用户协议正文（富文本，公开可访问） */
@Injectable()
export class GetAgreementUseCase {
  constructor(private readonly config: ConfigService) {}

  async execute(): Promise<AgreementView> {
    const contentHtml = await this.config.getString(
      CONFIG_KEYS.auth.userAgreement,
      '',
    );
    return { contentHtml };
  }
}
