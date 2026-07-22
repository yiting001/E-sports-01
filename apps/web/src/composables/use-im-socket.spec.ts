import { IM_EVENTS } from "@app/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createImSocket } from "@/composables/use-im-socket";

const socketMocks = vi.hoisted(() => ({
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
}));

const ioMock = vi.hoisted(() => vi.fn(() => socketMocks));

vi.mock("socket.io-client", () => ({ io: ioMock }));
vi.mock("@/api/token-storage", () => ({
  tokenStorage: { getAccess: vi.fn(() => "access-token") },
}));

beforeEach(() => {
  ioMock.mockClear();
  for (const mock of Object.values(socketMocks)) {
    mock.mockReset();
  }
});

describe("createImSocket markRead", () => {
  it("未连接时不发送事件并返回失败", async () => {
    const im = createImSocket();

    await expect(im.markRead("conversation-1", "message-1")).resolves.toBe(
      false
    );
    expect(socketMocks.emit).not.toHaveBeenCalled();
  });

  it("连接后发送共享已读事件并返回服务端确认结果", async () => {
    socketMocks.emit.mockImplementation((event, payload, callback) => {
      if (
        event === IM_EVENTS.markRead &&
        payload.conversationId === "conversation-1" &&
        payload.messageId === "message-1"
      ) {
        callback(true);
      }
    });
    const im = createImSocket();
    im.connect();

    await expect(im.markRead("conversation-1", "message-1")).resolves.toBe(
      true
    );
    expect(socketMocks.emit).toHaveBeenCalledWith(
      IM_EVENTS.markRead,
      { conversationId: "conversation-1", messageId: "message-1" },
      expect.any(Function)
    );
  });

  it("订阅个人未读变化事件且不读取消息正文", () => {
    const handler = vi.fn();
    const im = createImSocket();
    im.connect();

    im.onUnreadChanged(handler);

    expect(socketMocks.on).toHaveBeenCalledWith(
      IM_EVENTS.unreadChanged,
      handler
    );
  });

  it("区分队列观察与客服工作台在线接单事件", () => {
    const im = createImSocket();
    im.connect();

    im.observeService();
    im.watchService();

    expect(socketMocks.emit).toHaveBeenNthCalledWith(
      1,
      IM_EVENTS.observeService
    );
    expect(socketMocks.emit).toHaveBeenNthCalledWith(2, IM_EVENTS.watchService);
  });
});
