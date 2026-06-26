import type { AuthProfile, LoginPayload, RegisterPayload, TokenPair } from '@app/contracts';
import { http } from './http';

/** 鉴权相关接口：登录 / 注册 / 拉取当前用户档案 */
export const authApi = {
  login(payload: LoginPayload): Promise<TokenPair> {
    return http.post('/auth/login', payload);
  },
  register(payload: RegisterPayload): Promise<TokenPair> {
    return http.post('/auth/register', payload);
  },
  profile(): Promise<AuthProfile> {
    return http.get('/auth/profile');
  },
};
