import { FeedbackType, OrderStatus, type PaginatedResult } from '@app/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  buildSubmitFeedbackPayload,
  loadFeedbackOrderOptions,
  selectFeedbackOrderOptions,
  type FeedbackOrderSource,
} from './feedback-orders';

function order(id: string, status: OrderStatus, boosterId = `booster-${id}`): FeedbackOrderSource {
  return {
    id,
    orderNo: `O-${id}`,
    status,
    boosterId,
    boosterName: `打手-${id}`,
  };
}

function page(
  list: FeedbackOrderSource[],
  currentPage: number,
  total: number,
): PaginatedResult<FeedbackOrderSource> {
  return {
    list,
    total,
    page: currentPage,
    pageSize: 2,
  };
}

describe('selectFeedbackOrderOptions', () => {
  it('仅保留服务中或已完成且存在实际打手的订单', () => {
    const options = selectFeedbackOrderOptions([
      order('serving', OrderStatus.Serving),
      order('completed', OrderStatus.Completed),
      order('pending', OrderStatus.PendingService),
      order('missing-booster', OrderStatus.Serving, ''),
      {
        ...order('missing-name', OrderStatus.Completed),
        boosterName: '',
      },
    ]);

    expect(options).toEqual([
      {
        id: 'serving',
        orderNo: 'O-serving',
        status: OrderStatus.Serving,
        boosterUserId: 'booster-serving',
        boosterName: '打手-serving',
      },
      {
        id: 'completed',
        orderNo: 'O-completed',
        status: OrderStatus.Completed,
        boosterUserId: 'booster-completed',
        boosterName: '打手-completed',
      },
    ]);
  });

  it('按订单 id 去重，避免状态并发变化时出现重复选项', () => {
    const duplicated = order('same', OrderStatus.Serving);

    expect(selectFeedbackOrderOptions([duplicated, duplicated])).toHaveLength(1);
  });
});

describe('loadFeedbackOrderOptions', () => {
  it('加载服务中和已完成订单的全部分页', async () => {
    const loader = vi.fn(
      async (
        requestedPage: number,
        _pageSize: number,
        status: OrderStatus,
      ): Promise<PaginatedResult<FeedbackOrderSource>> => {
        if (status === OrderStatus.Serving) {
          return requestedPage === 1
            ? page([order('serving-1', status)], 1, 2)
            : page([order('serving-2', status)], 2, 2);
        }

        return page([order('completed-1', status)], 1, 1);
      },
    );

    const options = await loadFeedbackOrderOptions(loader, 2);

    expect(options.map((option) => option.id)).toEqual(['serving-1', 'serving-2', 'completed-1']);
    expect(loader).toHaveBeenCalledTimes(3);
  });
});

describe('buildSubmitFeedbackPayload', () => {
  it('投诉打手只关联订单，不把自由输入当作订单线索', () => {
    expect(
      buildSubmitFeedbackPayload(FeedbackType.Booster, 'order-id', '伪造的订单号', '投诉内容'),
    ).toEqual({
      type: FeedbackType.Booster,
      orderId: 'order-id',
      content: '投诉内容',
    });
  });

  it('投诉客服或其他反馈保留修剪后的自由对象输入', () => {
    expect(
      buildSubmitFeedbackPayload(FeedbackType.Service, '', '  客服小王  ', '投诉内容'),
    ).toEqual({
      type: FeedbackType.Service,
      target: '客服小王',
      content: '投诉内容',
    });
    expect(buildSubmitFeedbackPayload(FeedbackType.Other, '', '   ', '建议内容')).toEqual({
      type: FeedbackType.Other,
      content: '建议内容',
    });
  });
});
