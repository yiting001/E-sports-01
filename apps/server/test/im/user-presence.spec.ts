import assert from 'node:assert/strict';
import test from 'node:test';
import { UserPresenceService } from '../../src/modules/im/application/user-presence.service';

test('多设备任一 socket 存活即在线，最后一个断开后离线', () => {
  const presence = new UserPresenceService();
  presence.register('socket-1', 'user-1', 'tenant-1');
  presence.register('socket-2', 'user-1', 'tenant-1');
  presence.register('socket-3', 'user-2', 'tenant-1');
  presence.register('socket-4', 'user-1', 'tenant-2');

  assert.equal(presence.isOnline('user-1', 'tenant-1'), true);
  assert.deepEqual(
    presence.onlineUserIds(['user-1', 'missing-user'], 'tenant-1'),
    new Set(['user-1']),
  );

  presence.unregister('socket-1');
  assert.equal(presence.isOnline('user-1', 'tenant-1'), true);
  presence.unregister('socket-2');
  assert.equal(presence.isOnline('user-1', 'tenant-1'), false);
  assert.equal(presence.isOnline('user-1', 'tenant-2'), true);
  assert.equal(presence.isOnline('user-2', 'tenant-1'), true);
});
