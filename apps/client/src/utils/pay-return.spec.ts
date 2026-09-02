import { describe, expect, it } from 'vitest';
import { PayReturnKind, PayReturnPageAction } from '@app/contracts';
import { buildClientPayReturnUrl, parsePayReturnParams } from './pay-return';

describe('buildClientPayReturnUrl', () => {
  it('以当前站点 + hash 路由拼出落地页地址', () => {
    expect(
      buildClientPayReturnUrl({ origin: 'https://m.example.test', pathname: '/' }),
    ).toBe('https://m.example.test/#/pay/return');
    expect(
      buildClientPayReturnUrl({ origin: 'https://m.example.test', pathname: '/client/' }),
    ).toBe('https://m.example.test/client/#/pay/return');
  });
});

describe('parsePayReturnParams', () => {
  it('从 hash 路由 query 读取服务端追加的业务标识与渠道回传动作', () => {
    expect(
      parsePayReturnParams(
        {
          payKind: 'recharge',
          payRef: 'R20260722000000123456',
          returnPageAction: 'SUCCESS_PAGE',
          mchOrderNo: 'R20260722000000123456',
        },
        '',
      ),
    ).toEqual({
      kind: PayReturnKind.Recharge,
      ref: 'R20260722000000123456',
      action: PayReturnPageAction.Success,
    });
  });

  it('兼容参数被拼在 # 之前的情形（location.search）', () => {
    expect(
      parsePayReturnParams({}, '?payKind=order&payRef=order-1&returnPageAction=CANCEL_PAGE'),
    ).toEqual({
      kind: PayReturnKind.Order,
      ref: 'order-1',
      action: PayReturnPageAction.Cancel,
    });
  });

  it('重复参数取首个值，未知动作视为需查单确认', () => {
    expect(
      parsePayReturnParams(
        { payKind: ['recharge', 'order'], payRef: ['R1', 'R2'], returnPageAction: 'OTHER' },
        '',
      ),
    ).toEqual({ kind: PayReturnKind.Recharge, ref: 'R1', action: null });
  });

  it('缺少业务标识或类型非法时返回 null', () => {
    expect(parsePayReturnParams({}, '')).toBeNull();
    expect(parsePayReturnParams({ payKind: 'recharge' }, '')).toBeNull();
    expect(parsePayReturnParams({ payKind: 'unknown', payRef: 'R1' }, '')).toBeNull();
    expect(parsePayReturnParams({ payKind: 'order', payRef: '' }, '')).toBeNull();
  });
});
