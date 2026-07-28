import { Body, Controller, Put } from '@nestjs/common';
import { PERMS } from '@app/contracts';
import { PlatformOnly } from '../../../rbac/interfaces/auth/platform-only.decorator';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { InviteConfigService } from '../../application/invite-config.service';
import { SaveInviteConfigDto } from '../dto/save-invite-config.dto';

/** 路由：平台保存邀请奖励配置（PUT /invite/admin/config）；需 invite:config:set 权限 */
@Controller('invite')
@PlatformOnly()
export class InviteAdminConfigSaveController {
  constructor(private readonly configService: InviteConfigService) {}

  @Put('admin/config')
  @Permissions(PERMS.invite.configSet)
  save(@Body() dto: SaveInviteConfigDto): Promise<void> {
    return this.configService.save(dto);
  }
}
