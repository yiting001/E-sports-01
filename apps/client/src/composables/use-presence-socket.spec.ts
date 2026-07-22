import { IM_EVENTS } from '@app/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPresenceSocket } from './use-presence-socket';

const socketMocks = vi.hoisted(() => ({
  connected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
}));

const ioMock = vi.hoisted(() => vi.fn(() => socketMocks));
const tokenMocks = vi.hoisted(() => ({
  access: 'access-token' as string | null,
  listener: undefined as (() => void) | undefined,
  stop: vi.fn(),
}));

vi.mock('socket.io-client', () => ({ io: ioMock }));
vi.mock('@/api/token-storage', () => ({
  tokenStorage: {
    getAccess: vi.fn(() => tokenMocks.access),
    onChange: vi.fn((listener: () => void) => {
      tokenMocks.listener = listener;
      return tokenMocks.stop;
    }),
  },
}));

beforeEach(() => {
  ioMock.mockClear();
  socketMocks.connected = false;
  socketMocks.connect.mockReset();
  socketMocks.disconnect.mockReset();
  socketMocks.on.mockReset();
  tokenMocks.access = 'access-token';
  tokenMocks.listener = undefined;
  tokenMocks.stop.mockReset();
});

describe('createPresenceSocket', () => {
  it('每次建立全局连接都订阅个人未读与会话变化', () => {
    const onUnreadChanged = vi.fn();
    const onConversationChanged = vi.fn();
    const presence = createPresenceSocket({ onConversationChanged, onUnreadChanged });

    presence.connect();

    expect(socketMocks.on).toHaveBeenCalledWith(IM_EVENTS.unreadChanged, onUnreadChanged);
    expect(socketMocks.on).toHaveBeenCalledWith(
      IM_EVENTS.conversation,
      onConversationChanged,
    );
    expect(socketMocks.connect).toHaveBeenCalledTimes(1);
    presence.dispose();
  });

  it('令牌刷新重建连接后仍恢复订阅，令牌删除则只断开', () => {
    const onUnreadChanged = vi.fn();
    const presence = createPresenceSocket({ onUnreadChanged });
    presence.connect();
    ioMock.mockClear();
    socketMocks.on.mockClear();
    socketMocks.disconnect.mockClear();

    tokenMocks.access = 'renewed-access-token';
    tokenMocks.listener?.();

    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(socketMocks.disconnect).toHaveBeenCalledTimes(1);
    expect(socketMocks.on).toHaveBeenCalledWith(IM_EVENTS.unreadChanged, onUnreadChanged);

    tokenMocks.access = null;
    tokenMocks.listener?.();
    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(socketMocks.disconnect).toHaveBeenCalledTimes(2);
    presence.dispose();
  });

  it('销毁时移除令牌监听并断开连接', () => {
    const presence = createPresenceSocket();
    presence.connect();

    presence.dispose();

    expect(tokenMocks.stop).toHaveBeenCalledTimes(1);
    expect(socketMocks.disconnect).toHaveBeenCalledTimes(1);
  });
});
