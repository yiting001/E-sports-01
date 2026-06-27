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
import { USER_REPOSITORY } from './domain/user-repository.interface';
import { ROLE_REPOSITORY } from './domain/role-repository.interface';
import { PERMISSION_REPOSITORY } from './domain/permission-repository.interface';

import { TypeormUserRepository } from './infrastructure/user.repository';
import { TypeormRoleRepository } from './infrastructure/role.repository';
import { TypeormPermissionRepository } from './infrastructure/permission.repository';
import { PasswordService } from './infrastructure/password.service';
import { RbacSeeder } from './infrastructure/rbac.seeder';

import { TokenService } from './application/token.service';
import { PermissionResolver } from './application/permission-resolver.service';
import { UserDirectory } from './application/user-directory.service';
import { LoginUseCase } from './application/use-cases/login.usecase';
import { SmsLoginUseCase } from './application/use-cases/sms-login.usecase';
import { SendLoginSmsCodeUseCase } from './application/use-cases/send-login-sms-code.usecase';
import { RegisterUseCase } from './application/use-cases/register.usecase';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.usecase';
import { GetProfileUseCase } from './application/use-cases/get-profile.usecase';
import { ListUsersUseCase } from './application/use-cases/list-users.usecase';
import { CreateUserUseCase } from './application/use-cases/create-user.usecase';
import { UpdateUserUseCase } from './application/use-cases/update-user.usecase';
import { RemoveUserUseCase } from './application/use-cases/remove-user.usecase';
import { AssignUserRolesUseCase } from './application/use-cases/assign-user-roles.usecase';
import { ListRolesUseCase } from './application/use-cases/list-roles.usecase';
import { CreateRoleUseCase } from './application/use-cases/create-role.usecase';
import { UpdateRoleUseCase } from './application/use-cases/update-role.usecase';
import { RemoveRoleUseCase } from './application/use-cases/remove-role.usecase';
import { AssignRolePermissionsUseCase } from './application/use-cases/assign-role-permissions.usecase';
import { ListPermissionsUseCase } from './application/use-cases/list-permissions.usecase';
import { GetMyMenusUseCase } from './application/use-cases/get-my-menus.usecase';
import { CreatePermissionUseCase } from './application/use-cases/create-permission.usecase';
import { UpdatePermissionUseCase } from './application/use-cases/update-permission.usecase';
import { RemovePermissionUseCase } from './application/use-cases/remove-permission.usecase';

import { JwtStrategy } from './interfaces/auth/jwt.strategy';
import { JwtAuthGuard } from './interfaces/auth/jwt-auth.guard';
import { PermissionsGuard } from './interfaces/auth/permissions.guard';

import { AuthLoginController } from './interfaces/controllers/auth.login.controller';
import { AuthSmsCodeController } from './interfaces/controllers/auth.sms-code.controller';
import { AuthSmsLoginController } from './interfaces/controllers/auth.sms-login.controller';
import { AuthRegisterController } from './interfaces/controllers/auth.register.controller';
import { AuthRefreshController } from './interfaces/controllers/auth.refresh.controller';
import { AuthProfileController } from './interfaces/controllers/auth.profile.controller';
import { UserListController } from './interfaces/controllers/user.list.controller';
import { UserCreateController } from './interfaces/controllers/user.create.controller';
import { UserUpdateController } from './interfaces/controllers/user.update.controller';
import { UserRemoveController } from './interfaces/controllers/user.remove.controller';
import { UserAssignRolesController } from './interfaces/controllers/user.assign-roles.controller';
import { RoleListController } from './interfaces/controllers/role.list.controller';
import { RoleCreateController } from './interfaces/controllers/role.create.controller';
import { RoleUpdateController } from './interfaces/controllers/role.update.controller';
import { RoleRemoveController } from './interfaces/controllers/role.remove.controller';
import { RoleAssignPermissionsController } from './interfaces/controllers/role.assign-permissions.controller';
import { PermissionListController } from './interfaces/controllers/permission.list.controller';
import { PermissionCreateController } from './interfaces/controllers/permission.create.controller';
import { PermissionUpdateController } from './interfaces/controllers/permission.update.controller';
import { PermissionRemoveController } from './interfaces/controllers/permission.remove.controller';
import { MenuMineController } from './interfaces/controllers/menu.mine.controller';

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
    TypeOrmModule.forFeature([User, Role, Permission]),
  ],
  controllers: [
    AuthLoginController,
    AuthSmsCodeController,
    AuthSmsLoginController,
    AuthRegisterController,
    AuthRefreshController,
    AuthProfileController,
    UserListController,
    UserCreateController,
    UserUpdateController,
    UserRemoveController,
    UserAssignRolesController,
    RoleListController,
    RoleCreateController,
    RoleUpdateController,
    RoleRemoveController,
    RoleAssignPermissionsController,
    PermissionListController,
    PermissionCreateController,
    PermissionUpdateController,
    PermissionRemoveController,
    MenuMineController,
  ],
  providers: [
    { provide: USER_REPOSITORY, useClass: TypeormUserRepository },
    { provide: ROLE_REPOSITORY, useClass: TypeormRoleRepository },
    { provide: PERMISSION_REPOSITORY, useClass: TypeormPermissionRepository },
    PasswordService,
    TokenService,
    PermissionResolver,
    UserDirectory,
    JwtStrategy,
    RbacSeeder,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    LoginUseCase,
    SmsLoginUseCase,
    SendLoginSmsCodeUseCase,
    RegisterUseCase,
    RefreshTokenUseCase,
    GetProfileUseCase,
    ListUsersUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    RemoveUserUseCase,
    AssignUserRolesUseCase,
    ListRolesUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    RemoveRoleUseCase,
    AssignRolePermissionsUseCase,
    ListPermissionsUseCase,
    CreatePermissionUseCase,
    UpdatePermissionUseCase,
    RemovePermissionUseCase,
    GetMyMenusUseCase,
  ],
  exports: [TokenService, PermissionResolver, UserDirectory],
})
export class RbacModule {}
