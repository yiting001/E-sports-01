import assert from 'node:assert/strict';
import test from 'node:test';
import { ORDER_NOTIFY_PAYLOAD_KEYS, type OrderNotifyPayload } from '@app/contracts';
import {
  buildTemplateData,
  parseOrderFieldMapping,
} from '../../src/modules/notify/application/order-field-mapping';

const PAYLOAD: OrderNotifyPayload = {
  title: '接单大厅有新订单',
  orderNo: 'O123456',
  product: '三角洲陪玩',
  amount: '128.00元',
  time: '2026-08-01 12:30',
  remark: '请及时登录平台查看处理',
};

test('字段映射只保留合法逻辑字段，脏值安静丢弃', () => {
  const mapping = parseOrderFieldMapping({
    character_string1: 'orderNo',
    thing2: 'product',
    thing3: 'notAField',
    thing4: 123,
  });
  assert.deepEqual(mapping, { character_string1: 'orderNo', thing2: 'product' });
});

test('非对象映射配置返回空映射', () => {
  assert.deepEqual(parseOrderFieldMapping(null), {});
  assert.deepEqual(parseOrderFieldMapping('bad'), {});
  assert.deepEqual(parseOrderFieldMapping(['orderNo']), {});
});

test('模板数据按映射装配为微信 data 结构', () => {
  const data = buildTemplateData(
    { character_string1: 'orderNo', amount5: 'amount' },
    PAYLOAD,
  );
  assert.deepEqual(data, {
    character_string1: { value: 'O123456' },
    amount5: { value: '128.00元' },
  });
});

test('全部逻辑字段均可映射', () => {
  const mapping = parseOrderFieldMapping(
    Object.fromEntries(ORDER_NOTIFY_PAYLOAD_KEYS.map((key) => [`f_${key}`, key])),
  );
  const data = buildTemplateData(mapping, PAYLOAD);
  for (const key of ORDER_NOTIFY_PAYLOAD_KEYS) {
    assert.equal(data[`f_${key}`].value, PAYLOAD[key]);
  }
});
