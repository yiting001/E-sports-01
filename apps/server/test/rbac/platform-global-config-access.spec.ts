import assert from 'node:assert/strict';
import test from 'node:test';
import { BoosterDepositPolicySetController } from '../../src/modules/booster/interfaces/controllers/booster.deposit.policy.set.controller';
import { BoosterLevelsSetController } from '../../src/modules/booster/interfaces/controllers/booster.levels.set.controller';
import { InviteAdminConfigSaveController } from '../../src/modules/invite/interfaces/controllers/invite.admin.config-save.controller';
import { InviteAdminConfigGetController } from '../../src/modules/invite/interfaces/controllers/invite.admin.config-get.controller';
import { MemberLevelsSetController } from '../../src/modules/member/interfaces/controllers/member.levels.set.controller';
import { RealnamePolicyGetController } from '../../src/modules/realname/interfaces/controllers/realname.policy.get.controller';
import { RealnamePolicySetController } from '../../src/modules/realname/interfaces/controllers/realname.policy.set.controller';
import { AUTH_METADATA } from '../../src/modules/rbac/interfaces/auth/metadata';

const GLOBAL_CONFIG_WRITE_CONTROLLERS = [
  MemberLevelsSetController,
  BoosterLevelsSetController,
  BoosterDepositPolicySetController,
  RealnamePolicySetController,
  InviteAdminConfigSaveController,
] as const;

test('非租户覆盖白名单的业务配置写入口仅允许平台超级管理员访问', () => {
  for (const controller of GLOBAL_CONFIG_WRITE_CONTROLLERS) {
    assert.equal(
      Reflect.getMetadata(AUTH_METADATA.platformOnly, controller),
      true,
      `${controller.name} 缺少 @PlatformOnly()`,
    );
  }
});

test('租户管理员读取全局实名与邀请规则时不需要平台写权限', () => {
  assert.deepEqual(
    Reflect.getMetadata(AUTH_METADATA.permissions, RealnamePolicyGetController.prototype.get),
    ['realname:policy:view'],
  );
  assert.deepEqual(
    Reflect.getMetadata(AUTH_METADATA.permissions, InviteAdminConfigGetController.prototype.get),
    ['invite:config:view'],
  );
});
