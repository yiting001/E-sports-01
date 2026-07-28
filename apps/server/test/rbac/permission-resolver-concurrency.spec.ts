import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_TENANT_ID } from '@app/contracts';
import { PermissionResolver } from '../../src/modules/rbac/application/permission-resolver.service';
import { SUPER_ADMIN_ROLE } from '../../src/modules/rbac/domain/rbac.constants';
import { Role } from '../../src/modules/rbac/domain/role.entity';
import type { RoleRepository } from '../../src/modules/rbac/domain/role-repository.interface';
import { User, UserStatus } from '../../src/modules/rbac/domain/user.entity';
import type { UserRepository } from '../../src/modules/rbac/domain/user-repository.interface';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: () => resolvePromise?.(),
  };
}

test('并发中的旧鉴权结果不能在撤权后复活', async () => {
  const adminRole = Object.assign(new Role(), {
    id: 'role-admin',
    tenantId: DEFAULT_TENANT_ID,
    code: SUPER_ADMIN_ROLE,
    permissions: [],
  });
  let status = UserStatus.Enabled;
  let roles = [adminRole];
  const userRepo: Pick<UserRepository, 'findById'> = {
    findById: async () =>
      Object.assign(new User(), {
        id: 'user-admin',
        tenantId: DEFAULT_TENANT_ID,
        username: 'admin',
        status,
        roles: [...roles],
      }),
  };

  const lookupStarted = deferred();
  const releaseFirstLookup = deferred();
  let roleLookupCount = 0;
  const roleRepo: Pick<RoleRepository, 'findByIds'> = {
    findByIds: async () => {
      roleLookupCount += 1;
      if (roleLookupCount === 1) {
        lookupStarted.resolve();
        await releaseFirstLookup.promise;
        return [adminRole];
      }
      return roles;
    },
  };

  const resolver = new PermissionResolver(userRepo, roleRepo);

  const staleResolve = resolver.resolve('user-admin');
  await lookupStarted.promise;
  status = UserStatus.Disabled;
  roles = [];
  await resolver.invalidate('user-admin');
  releaseFirstLookup.resolve();
  await staleResolve;

  const current = await resolver.resolve('user-admin');
  assert.equal(current.enabled, false);
  assert.equal(current.isSuper, false);
});
