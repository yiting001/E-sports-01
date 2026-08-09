import assert from 'node:assert/strict';
import test from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { ListUsersUseCase } from '../../src/modules/rbac/application/use-cases/list-users.usecase';
import { ResetUserPasswordUseCase } from '../../src/modules/rbac/application/use-cases/reset-user-password.usecase';
import { User, UserStatus } from '../../src/modules/rbac/domain/user.entity';
import type {
  UserListFilters,
  UserRepository,
} from '../../src/modules/rbac/domain/user-repository.interface';
import type { PasswordService } from '../../src/modules/rbac/infrastructure/password.service';
import type { PermissionResolver } from '../../src/modules/rbac/application/permission-resolver.service';
import type { TenantResolver } from '../../src/modules/rbac/application/tenant-resolver.service';

class MemoryUserRepository implements UserRepository {
  lastPaginateFilters: UserListFilters | undefined;
  private readonly users = new Map<string, User>();

  constructor(initial: User[] = []) {
    for (const user of initial) {
      this.users.set(user.id, user);
    }
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  findByIds(ids: string[]): Promise<User[]> {
    return Promise.resolve(ids.flatMap((id) => this.users.get(id) ?? []));
  }

  findByUsernameWithPassword(): Promise<User | null> {
    return Promise.resolve(null);
  }

  findByAccountWithPassword(): Promise<User | null> {
    return Promise.resolve(null);
  }

  findByPhone(): Promise<User | null> {
    return Promise.resolve(null);
  }

  existsByUsername(): Promise<boolean> {
    return Promise.resolve(false);
  }

  existsByPhone(): Promise<boolean> {
    return Promise.resolve(false);
  }

  paginate(skip: number, take: number, filters?: UserListFilters): Promise<[User[], number]> {
    this.lastPaginateFilters = filters;
    const rows = [...this.users.values()].slice(skip, skip + take);
    return Promise.resolve([rows, this.users.size]);
  }

  paginateByRole(): Promise<[User[], number]> {
    return Promise.resolve([[], 0]);
  }

  create(data: Partial<User>): User {
    return Object.assign(new User(), data);
  }

  save(user: User): Promise<User> {
    this.users.set(user.id, user);
    return Promise.resolve(user);
  }

  remove(id: string): Promise<void> {
    this.users.delete(id);
    return Promise.resolve();
  }
}

function makeUser(id: string): User {
  return Object.assign(new User(), {
    id,
    tenantId: 'tenant-a',
    username: `user-${id}`,
    nickname: '',
    avatar: '',
    phone: '',
    status: UserStatus.Enabled,
    passwordHash: 'old-hash',
    roles: [],
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}

test('用户列表用例将筛选条件传给仓储并回填租户编码', async () => {
  const repository = new MemoryUserRepository([makeUser('user-a')]);
  const tenants = {
    codeMap: (ids: string[]) => Promise.resolve(new Map(ids.map((id) => [id, 'tenant-code']))),
  } as TenantResolver;
  const useCase = new ListUsersUseCase(repository, tenants);

  const result = await useCase.execute(1, 20, 0, {
    keyword: 'alice',
    status: UserStatus.Enabled,
    roleId: 'role-a',
  });

  assert.deepEqual(repository.lastPaginateFilters, {
    keyword: 'alice',
    status: UserStatus.Enabled,
    roleId: 'role-a',
  });
  assert.equal(result.total, 1);
  assert.equal(result.list[0]?.tenantCode, 'tenant-code');
});

test('重置用户密码会哈希保存并失效权限缓存', async () => {
  const user = makeUser('user-a');
  const repository = new MemoryUserRepository([user]);
  const password = {
    hash: (plain: string) => Promise.resolve(`hashed:${plain}`),
    compare: () => Promise.resolve(false),
  } as PasswordService;
  const invalidated: string[] = [];
  const permissions = {
    invalidate: (id: string) => {
      invalidated.push(id);
      return Promise.resolve();
    },
  } as unknown as PermissionResolver;
  const useCase = new ResetUserPasswordUseCase(repository, password, permissions);

  await useCase.execute(user.id, 'new-password');

  assert.equal((await repository.findById(user.id))?.passwordHash, 'hashed:new-password');
  assert.deepEqual(invalidated, [user.id]);
});

test('重置不存在用户密码时返回业务 404', async () => {
  const useCase = new ResetUserPasswordUseCase(
    new MemoryUserRepository(),
    {
      hash: () => Promise.resolve('unused'),
      compare: () => Promise.resolve(false),
    } as PasswordService,
    { invalidate: () => Promise.resolve() } as unknown as PermissionResolver,
  );

  await assert.rejects(useCase.execute('missing-user', 'new-password'), NotFoundException);
});
