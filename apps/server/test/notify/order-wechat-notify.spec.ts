import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONFIG_KEYS,
  NotifyWechatChannel,
  type OrderNotifyPayload,
} from '@app/contracts';
import { OrderWechatNotifyService } from '../../src/modules/notify/application/order-wechat-notify.service';
import type { ConfigService } from '../../src/modules/config/application/config.service';
import type {
  WechatBindingRepository,
} from '../../src/modules/notify/domain/wechat-binding-repository.interface';
import type {
  WechatNotifyPort,
  WechatOrderNotification,
} from '../../src/modules/notify/domain/wechat-notify-port.interface';
import { WechatBindingEntity } from '../../src/modules/notify/domain/wechat-binding.entity';

const PAYLOAD: OrderNotifyPayload = {
  title: '接单大厅有新订单',
  orderNo: 'O123456',
  product: '三角洲陪玩',
  amount: '128.00元',
  time: '2026-08-01 12:30',
  remark: '请及时查看',
};

function createBinding(userId: string, channel: NotifyWechatChannel): WechatBindingEntity {
  return Object.assign(new WechatBindingEntity(), {
    userId,
    channel,
    openid: `openid-${userId}-${channel}`,
    createdAt: new Date(),
  });
}

interface PortOptions {
  configured?: boolean;
  failOpenids?: string[];
}

function createPort(
  channel: NotifyWechatChannel,
  sent: WechatOrderNotification[],
  options: PortOptions = {},
): WechatNotifyPort {
  return {
    channel,
    isConfigured: async () => options.configured !== false,
    sendOrderNotification: async (notification) => {
      if (options.failOpenids?.includes(notification.openid)) {
        throw new Error('send failed');
      }
      sent.push(notification);
    },
    exchangeOpenid: async () => 'unused',
  };
}

function createConfig(values: Record<string, boolean>): ConfigService {
  return {
    getBoolean: async (key: string, fallback: boolean) => values[key] ?? fallback,
  } as unknown as ConfigService;
}

function createBindings(records: WechatBindingEntity[]): WechatBindingRepository {
  return {
    findByUser: async () => records,
    findByUsers: async (userIds, channel) =>
      records.filter((r) => userIds.includes(r.userId) && r.channel === channel),
    upsert: async () => records[0],
    removeByUserChannel: async () => undefined,
  };
}

test('总开关关闭时不发送任何通知', async () => {
  const sent: WechatOrderNotification[] = [];
  const service = new OrderWechatNotifyService(
    [createPort(NotifyWechatChannel.Mini, sent)],
    createBindings([createBinding('u1', NotifyWechatChannel.Mini)]),
    createConfig({ [CONFIG_KEYS.notify.wechatEnabled]: false }),
  );
  await service.notifyUsers(['u1'], PAYLOAD);
  assert.equal(sent.length, 0);
});

test('已配置渠道向绑定用户逐个发送', async () => {
  const sent: WechatOrderNotification[] = [];
  const service = new OrderWechatNotifyService(
    [
      createPort(NotifyWechatChannel.Mini, sent),
      createPort(NotifyWechatChannel.Official, sent),
    ],
    createBindings([
      createBinding('u1', NotifyWechatChannel.Mini),
      createBinding('u1', NotifyWechatChannel.Official),
      createBinding('u2', NotifyWechatChannel.Mini),
    ]),
    createConfig({ [CONFIG_KEYS.notify.wechatEnabled]: true }),
  );
  await service.notifyUsers(['u1', 'u2'], PAYLOAD);
  assert.equal(sent.length, 3);
  assert.ok(sent.every((item) => item.payload.orderNo === 'O123456'));
});

test('未配置渠道被跳过，不查询绑定', async () => {
  const sent: WechatOrderNotification[] = [];
  let queried = 0;
  const bindings = createBindings([createBinding('u1', NotifyWechatChannel.Mini)]);
  const originalFind = bindings.findByUsers.bind(bindings);
  bindings.findByUsers = async (userIds, channel) => {
    queried += 1;
    return originalFind(userIds, channel);
  };
  const service = new OrderWechatNotifyService(
    [createPort(NotifyWechatChannel.Mini, sent, { configured: false })],
    bindings,
    createConfig({ [CONFIG_KEYS.notify.wechatEnabled]: true }),
  );
  await service.notifyUsers(['u1'], PAYLOAD);
  assert.equal(sent.length, 0);
  assert.equal(queried, 0);
});

test('单个收件人失败不影响其他收件人', async () => {
  const sent: WechatOrderNotification[] = [];
  const service = new OrderWechatNotifyService(
    [
      createPort(NotifyWechatChannel.Mini, sent, {
        failOpenids: ['openid-u1-mini'],
      }),
    ],
    createBindings([
      createBinding('u1', NotifyWechatChannel.Mini),
      createBinding('u2', NotifyWechatChannel.Mini),
    ]),
    createConfig({ [CONFIG_KEYS.notify.wechatEnabled]: true }),
  );
  await service.notifyUsers(['u1', 'u2'], PAYLOAD);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].openid, 'openid-u2-mini');
});

test('空收件人列表不读取配置直接返回', async () => {
  const sent: WechatOrderNotification[] = [];
  let configReads = 0;
  const config = {
    getBoolean: async () => {
      configReads += 1;
      return true;
    },
  } as unknown as ConfigService;
  const service = new OrderWechatNotifyService(
    [createPort(NotifyWechatChannel.Mini, sent)],
    createBindings([]),
    config,
  );
  await service.notifyUsers([], PAYLOAD);
  assert.equal(sent.length, 0);
  assert.equal(configReads, 0);
});
