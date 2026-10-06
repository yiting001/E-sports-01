/**
 * socket.io-client 的微信小程序 WebSocket 适配层。
 *
 * socket.io-client 4.x（engine.io-client 6.x）websocket 传输直接使用浏览器
 * WebSocket 构造器与事件模型；小程序运行时没有全局 WebSocket，只有
 * wx.connectSocket 返回的 SocketTask。这里在启动时注入一个以 SocketTask
 * 为底座的兼容实现（onopen/onmessage/onerror/onclose + send/close），
 * 使 socket.io-client 以 transports: ['websocket'] 正常握手与收发。
 *
 * 仅覆盖 socket.io 通信所需子集；wss 域名需在小程序后台配置 socket 合法域名。
 */

interface SocketTaskLike {
  send(options: { data: string }): void;
  close(options?: { code?: number; reason?: string }): void;
  onOpen(callback: () => void): void;
  onMessage(callback: (result: { data: unknown }) => void): void;
  onError(callback: (error: { errMsg: string }) => void): void;
  onClose(callback: (result: { code: number; reason: string }) => void): void;
}

type MessageHandler = (event: { data: unknown }) => void;
type CloseHandler = (event: { code: number; reason: string }) => void;

class WechatWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  onopen: (() => void) | null = null;
  onmessage: MessageHandler | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  onclose: CloseHandler | null = null;

  private task: SocketTaskLike | null = null;
  private readyStateValue = WechatWebSocket.CONNECTING;

  constructor(url: string, protocols?: string | string[]) {
    const protocolList = Array.isArray(protocols)
      ? protocols
      : protocols
        ? [protocols]
        : [];
    const task = uni.connectSocket({
      url,
      protocols: protocolList,
      tcpNoDelay: true,
    }) as unknown as SocketTaskLike;
    this.task = task;

    task.onOpen(() => {
      this.readyStateValue = WechatWebSocket.OPEN;
      this.onopen?.();
    });
    task.onMessage((result) => {
      this.onmessage?.({ data: result.data });
    });
    task.onError((error) => {
      this.onerror?.({ message: error?.errMsg });
    });
    task.onClose((result) => {
      this.readyStateValue = WechatWebSocket.CLOSED;
      this.onclose?.({ code: result?.code ?? 1006, reason: result?.reason ?? '' });
    });
  }

  get readyState(): number {
    return this.readyStateValue;
  }

  get binaryType(): string {
    return 'arraybuffer';
  }

  set binaryType(_value: string) {
    // SocketTask 默认以 string 收发；文本帧协议（socket.io JSON）无需设置
  }

  send(data: string): void {
    if (this.readyStateValue !== WechatWebSocket.OPEN) {
      throw new Error('WebSocket 未连接');
    }
    this.task?.send({ data: String(data) });
  }

  close(code = 1000, reason = ''): void {
    if (this.readyStateValue === WechatWebSocket.OPEN) {
      this.readyStateValue = WechatWebSocket.CLOSING;
    }
    try {
      this.task?.close({ code, reason });
    } catch {
      // 已关闭时 close 抛错可忽略
    }
  }
}

let installed = false;

/** 注入全局 WebSocket（幂等）；在 socket.io-client 首次 import 前调用 */
export function installWechatWebSocketShim(): void {
  if (installed) {
    return;
  }
  installed = true;
  const holder = globalThis as { WebSocket?: unknown };
  if (!holder.WebSocket) {
    holder.WebSocket = WechatWebSocket;
  }
}
