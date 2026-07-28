import { Controller, Get } from '@nestjs/common';
import { InviteConfigView, PERMS } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { InviteConfigService } from '../../application/invite-config.service';

/** 路由：管理端读取邀请奖励配置（GET /invite/admin/config）；需 invite:config:set 权限 */
@Controller('invite')
export class InviteAdminConfigGetController {
  constructor(private readonly configService: InviteConfigService) {}

  @Get('admin/config')
  @Permissions(PERMS.invite.configView)
  get(): Promise<InviteConfigView> {
    return this.configService.get();
  }
}
