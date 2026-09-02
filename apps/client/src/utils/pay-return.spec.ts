import { describe, expect, it } from 'vitest';
import {
  ORDER_PAY_RETURN_PATH,
  buildClientPayReturnUrl,
  isPayReturnVisit,
  readPayReturnRef,
  stripPayReturnQuery,
} from './pay-return';

describe('buildClientPayReturnUrl', () => {
  it('以当前站点 + hash 路由拼出目标页地址（订单详情占位符 / 充值来源页）', () => {
    expect(
      buildClientPayReturnUrl(ORDER_PAY_RETURN_PATH, {
        origin: 'https://m.example.test',
        pathname: '/',
      }),
    ).toBe('https://m.example.test/#/orders/{payRef}');
    expect(
      buildClientPayReturnUrl('/wallet', {
        origin: 'https://m.example.test',
        pathname: '/client/',
      }),
    ).toBe('https://m.example.test/client/#/wallet');
  });
});

describe('isPayReturnVisit', () => {
  it('仅在渠道追加 returnPageAction 时视为支付回跳', () => {
    expect(isPayReturnVisit({ returnPageAction: 'SUCCESS_PAGE' })).toBe(true);
    expect(isPayReturnVisit({ returnPageAction: 'CANCEL_PAGE', payRef: 'R1' })).toBe(true);
    expect(isPayReturnVisit({})).toBe(false);
    expect(isPayReturnVisit({ returnPageAction: '' })).toBe(false);
  });
});

describe('readPayReturnRef', () => {
  it('从 hash 路由 query 读取充值单号，重复参数取首个', () => {
    expect(readPayReturnRef({ payRef: 'R20260722000000123456' }, '')).toBe(
      'R20260722000000123456',
    );
    expect(readPayReturnRef({ payRef: ['R1', 'R2'] }, '')).toBe('R1');
  });

  it('兼容参数被拼在 # 之前的情形（location.search），缺失时返回 null', () => {
    expect(readPayReturnRef({}, '?payRef=R1&returnPageAction=SUCCESS_PAGE')).toBe('R1');
    expect(readPayReturnRef({}, '')).toBeNull();
    expect(readPayReturnRef({ payRef: '' }, '')).toBeNull();
  });
});

describe('stripPayReturnQuery', () => {
  it('去掉 payRef/returnPageAction，保留页面自身 query', () => {
    expect(
      stripPayReturnQuery({ payRef: 'R1', returnPageAction: 'SUCCESS_PAGE', tab: 'all' }),
    ).toEqual({ tab: 'all' });
  });
});
