import { IM_EVENTS } from '@app/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createImSocket } from './use-im-socket';

const socketMocks = vi.hoisted(() => ({
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  timeout: vi.fn(),
}));

const ioMock = vi.hoisted(() => vi.fn(() => socketMocks));

vi.mock('socket.io-client', () => ({ io: ioMock }));
vi.mock('@/api/token-storage', () => ({
  tokenStorage: { getAccess: vi.fn(() => 'access-token') },
}));

beforeEach(() => {
  ioMock.mockClear();
  socketMocks.disconnect.mockReset();
  socketMocks.emit.mockReset();
  socketMocks.on.mockReset();
  socketMocks.timeout.mockReset();
  socketMocks.timeout.mockReturnValue(socketMocks);
});

describe('createImSocket markRead', () => {
  it('未连接时不发送事件并返回失败', async () => {
    const im = createImSocket();

    await expect(im.markRead('conversation-1', 'message-1')).resolves.toBe(false);
    expect(socketMocks.emit).not.toHaveBeenCalled();
  });

  it('连接后发送共享已读事件并返回服务端确认结果', async () => {
    socketMocks.emit.mockImplementation((event, payload, callback) => {
      if (
        event === IM_EVENTS.markRead &&
        payload.conversationId === 'conversation-1' &&
        payload.messageId === 'message-1'
      ) {
        callback(null, true);
      }
    });
    const im = createImSocket();
    im.connect();

    await expect(im.markRead('conversation-1', 'message-1')).resolves.toBe(true);
    expect(socketMocks.emit).toHaveBeenCalledWith(
      IM_EVENTS.markRead,
      { conversationId: 'conversation-1', messageId: 'message-1' },
      expect.any(Function),
    );
    expect(socketMocks.timeout).toHaveBeenCalledWith(5_000);
  });

  it('服务端未在超时内确认时返回失败', async () => {
    socketMocks.emit.mockImplementation((_event, _payload, callback) => {
      callback(new Error('operation has timed out'), false);
    });
    const im = createImSocket();
    im.connect();

    await expect(im.markRead('conversation-1', 'message-1')).resolves.toBe(false);
  });

  it('转发服务端会话更新以同步订单群标题', () => {
    const handler = vi.fn();
    const im = createImSocket();
    im.connect();

    im.onConversation(handler);

    expect(socketMocks.on).toHaveBeenCalledWith(IM_EVENTS.conversation, handler);
  });
});
