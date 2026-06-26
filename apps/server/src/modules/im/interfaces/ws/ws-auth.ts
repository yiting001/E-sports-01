import { Socket } from 'socket.io';

/**
 * 从 socket 握手中提取访问令牌。
 * 优先 handshake.auth.token，其次 Authorization 头，统一去除 Bearer 前缀。
 */
export function extractToken(socket: Socket): string | null {
  const raw =
    pickString(socket.handshake.auth?.token) ??
    pickString(socket.handshake.headers?.authorization);
  return raw ? raw.replace(/^Bearer\s+/i, '') : null;
}

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
