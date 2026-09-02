import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '../config/config.module';
import { SmsModule } from '../sms/sms.module';

import { User } from './domain/user.entity';
import { Role } from './domain/role.entity';
import { Permission } from './domain/permission.entity';
import { TenantEntity } from './domain/tenant.entity';
import { USER_REPOSITORY } from './domain/user-repository.interface';
import { ROLE_REPOSITORY } from './domain/role-repository.interface';
import { PERMISSION_REPOSITORY } from './domain/permission-repository.interface';
import { TENANT_REPOSITORY } from './domain/tenant-repository.interface';
import { TENANT_PROVISIONING_TRANSACTION } from './domain/tenant-provisioning-transaction.interface';
import { WechatIdentityEntity } from './domain/wechat-identity.entity';
import { WECHAT_IDENTITY_REPOSITORY } from './domain/wechat-identity-repository.interface';
import { WECHAT_OAUTH_PORT } from './domain/wechat-oauth-port.interface';

import { TypeormUserRepository } from './infrastructure/user.repository';
import { TypeormRoleRepository } from './infrastructure/role.repository';
import { TypeormPermissionRepository } from './infrastructure/permission.repository';
import { TypeormTenantRepository } from './infrastructure/tenant.repository';
import { TypeormTenantProvisioningTransaction } from './infrastructure/tenant-provisioning.transaction';
import { PasswordService } from './infrastructure/password.service';
import { RbacSeeder } from './infrastructure/rbac.seeder';
import { TypeormWechatIdentityRepository } from './infrastructure/wechat-identity.repository';
import { WechatOauthDriver } from './infrastructure/wechat-oauth.driver';

import { TokenService } from './application/token.service';
import { PermissionResolver } from './application/permission-resolver.service';
import { PhoneMemberRegistrar } from './application/phone-member-registrar.service';
import { TenantResolver } from './application/tenant-resolver.service';
import { UserDirectory } from './application/user-directory.service';
import { RoleGranter } from './application/role-granter.service';
import { ListTenantsUseCase } from './application/use-cases/list-tenants.usecase';
import { CreateTenantUseCase } from './application/use-cases/create-tenant.usecase';
import { UpdateTenantUseCase } from './application/use-cases/update-tenant.usecase';
import { RemoveTenantUseCase } from './application/use-cases/remove-tenant.usecase';
import { LoginUseCase } from './application/use-cases/login.usecase';
import { SmsLoginUseCase } from './application/use-cases/sms-login.usecase';
import { SendLoginSmsCodeUseCase } from './application/use-cases/send-login-sms-code.usecase';
import { SendRegisterSmsCodeUseCase } from './application/use-cases/send-register-sms-code.usecase';
import { SmsRegisterUseCase } from './application/use-cases/sms-register.usecase';
import { RegisterUseCase } from './application/use-cases/register.usecase';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.usecase';
import { GetProfileUseCase } from './application/use-cases/get-profile.usecase';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.usecase';
import { ListUsersUseCase } from './application/use-cases/list-users.usecase';
import { CreateUserUseCase } from './application/use-cases/create-user.usecase';
import { UpdateUserUseCase } from './application/use-cases/update-user.usecase';
import { ResetUserPasswordUseCase } from './application/use-cases/reset-user-password.usecase';
import { RemoveUserUseCase } from './application/use-cases/remove-user.usecase';
import { AssignUserRolesUseCase } from './application/use-cases/assign-user-roles.usecase';
import { ListRolesUseCase } from './application/use-cases/list-roles.usecase';
import { CreateRoleUseCase } from './application/use-cases/create-role.usecase';
import { UpdateRoleUseCase } from './application/use-cases/update-role.usecase';
import { RemoveRoleUseCase } from './application/use-cases/remove-role.usecase';
import { RestoreRoleUseCase } from './application/use-cases/restore-role.usecase';
import { AssignRolePermissionsUseCase } from './application/use-cases/assign-role-permissions.usecase';
import { ListPermissionsUseCase } from './application/use-cases/list-permissions.usecase';
import { ListGrantablePermissionsUseCase } from './application/use-cases/list-grantable-permissions.usecase';
import { GetMyMenusUseCase } from './application/use-cases/get-my-menus.usecase';
import { CreatePermissionUseCase } from './application/use-cases/create-permission.usecase';
import { UpdatePermissionUseCase } from './application/use-cases/update-permission.usecase';
import { RemovePermissionUseCase } from './application/use-cases/remove-permission.usecase';
import { WechatLoginUseCase } from './application/use-cases/wechat-login.usecase';
import { GetWechatLoginUrlUseCase } from './application/use-cases/get-wechat-login-url.usecase';
import { BindWechatIdentityUseCase } from './application/use-cases/bind-wechat-identity.usecase';
import { WechatIdentityService } from './application/wechat-identity.service';

import { JwtStrategy } from './interfaces/auth/jwt.strategy';
import { JwtAuthGuard } from './interfaces/auth/jwt-auth.guard';
import { PermissionsGuard } from './interfaces/auth/permissions.guard';
import { TenantAccessGuard } from './interfaces/auth/tenant-access.guard';

import { AuthLoginController } from './interfaces/controllers/auth.login.controller';
import { AuthSmsCodeController } from './interfaces/controllers/auth.sms-code.controller';
import { AuthSmsLoginController } from './interfaces/controllers/auth.sms-login.controller';
import { AuthSmsRegisterCodeController } from './interfaces/controllers/auth.sms-register-code.controller';
import { AuthSmsRegisterController } from './interfaces/controllers/auth.sms-register.controller';
import { AuthRegisterController } from './interfaces/controllers/auth.register.controller';
import { AuthRefreshController } from './interfaces/controllers/auth.refresh.controller';
import { AuthProfileController } from './interfaces/controllers/auth.profile.controller';
import { AuthUpdateProfileController } from './interfaces/controllers/auth.update-profile.controller';
import { AuthWechatAuthorizeUrlController } from './interfaces/controllers/auth.wechat-authorize-url.controller';
import { AuthWechatLoginController } from './interfaces/controllers/auth.wechat-login.controller';
import { AuthWechatBindController } from './interfaces/controllers/auth.wechat-bind.controller';
import { UserListController } from './interfaces/controllers/user.list.controller';
import { UserCreateController } from './interfaces/controllers/user.create.controller';
import { UserUpdateController } from './interfaces/controllers/user.update.controller';
import { UserResetPasswordController } from './interfaces/controllers/user.reset-password.controller';
import { UserRemoveController } from './interfaces/controllers/user.remove.controller';
import { UserAssignRolesController } from './interfaces/controllers/user.assign-roles.controller';
import { RoleListController } from './interfaces/controllers/role.list.controller';
import { RoleCreateController } from './interfaces/controllers/role.create.controller';
import { RoleUpdateController } from './interfaces/controllers/role.update.controller';
import { RoleRemoveController } from './interfaces/controllers/role.remove.controller';
import { RoleRestoreController } from './interfaces/controllers/role.restore.controller';
import { RoleAssignPermissionsController } from './interfaces/controllers/role.assign-permissions.controller';
import { RoleGrantablePermissionsController } from './interfaces/controllers/role.grantable-permissions.controller';
import { PermissionListController } from './interfaces/controllers/permission.list.controller';
import { PermissionCreateController } from './interfaces/controllers/permission.create.controller';
import { PermissionUpdateController } from './interfaces/controllers/permission.update.controller';
import { PermissionRemoveController } from './interfaces/controllers/permission.remove.controller';
import { MenuMineController } from './interfaces/controllers/menu.mine.controller';
import { TenantListController } from './interfaces/controllers/tenant.list.controller';
import { TenantCreateController } from './interfaces/controllers/tenant.create.controller';
import { TenantUpdateController } from './interfaces/controllers/tenant.update.controller';
import { TenantRemoveController } from './interfaces/controllers/tenant.remove.controller';

/**
 * RBAC 模块。
 * 装配领域仓储、应用用例、鉴权守卫与一文件一路由的控制器；
 * 全局注册 JWT 鉴权 + 权限守卫，未声明 @Public 的路由默认需登录。
 */
@Module({
  imports: [
    ConfigModule,
    SmsModule,
    PassportModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([User, Role, Permission, TenantEntity, WechatIdentityEntity]),
  ],
  controllers: [
    AuthLoginController,
    AuthSmsCodeController,
    AuthSmsLoginController,
    AuthSmsRegisterCodeController,
    AuthSmsRegisterController,
    AuthRegisterController,
    AuthRefreshController,
    AuthProfileController,
    AuthUpdateProfileController,
    AuthWechatAuthorizeUrlController,
    AuthWechatLoginController,
    AuthWechatBindController,
    UserListController,
    UserCreateController,
    UserUpdateController,
    UserResetPasswordController,
    UserRemoveController,
    UserAssignRolesController,
    RoleListController,
    RoleCreateController,
    RoleUpdateController,
    RoleRemoveController,
    RoleRestoreController,
    RoleAssignPermissionsController,
    RoleGrantablePermissionsController,
    PermissionListController,
    PermissionCreateController,
    PermissionUpdateController,
    PermissionRemoveController,
    MenuMineController,
    TenantListController,
    TenantCreateController,
    TenantUpdateController,
    TenantRemoveController,
  ],
  providers: [
    { provide: USER_REPOSITORY, useClass: TypeormUserRepository },
    { provide: ROLE_REPOSITORY, useClass: TypeormRoleRepository },
    { provide: PERMISSION_REPOSITORY, useClass: TypeormPermissionRepository },
    { provide: TENANT_REPOSITORY, useClass: TypeormTenantRepository },
    { provide: WECHAT_IDENTITY_REPOSITORY, useClass: TypeormWechatIdentityRepository },
    { provide: WECHAT_OAUTH_PORT, useClass: WechatOauthDriver },
    {
      provide: TENANT_PROVISIONING_TRANSACTION,
      useClass: TypeormTenantProvisioningTransaction,
    },
    PasswordService,
    TokenService,
    PermissionResolver,
    PhoneMemberRegistrar,
    TenantResolver,
    UserDirectory,
    RoleGranter,
    JwtStrategy,
    RbacSeeder,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantAccessGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    LoginUseCase,
    SmsLoginUseCase,
    SendLoginSmsCodeUseCase,
    SendRegisterSmsCodeUseCase,
    SmsRegisterUseCase,
    RegisterUseCase,
    RefreshTokenUseCase,
    GetProfileUseCase,
    UpdateProfileUseCase,
    ListUsersUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    ResetUserPasswordUseCase,
    RemoveUserUseCase,
    AssignUserRolesUseCase,
    ListRolesUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    RemoveRoleUseCase,
    RestoreRoleUseCase,
    AssignRolePermissionsUseCase,
    ListPermissionsUseCase,
    ListGrantablePermissionsUseCase,
    CreatePermissionUseCase,
    UpdatePermissionUseCase,
    RemovePermissionUseCase,
    WechatLoginUseCase,
    GetWechatLoginUrlUseCase,
    BindWechatIdentityUseCase,
    WechatIdentityService,
    GetMyMenusUseCase,
    ListTenantsUseCase,
    CreateTenantUseCase,
    UpdateTenantUseCase,
    RemoveTenantUseCase,
  ],
  exports: [
    TokenService,
    PermissionResolver,
    TenantResolver,
    UserDirectory,
    RoleGranter,
    WechatIdentityService,
  ],
})
export class RbacModule {}
