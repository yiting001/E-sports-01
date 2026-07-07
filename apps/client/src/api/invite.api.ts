import type { MyInviteView } from '@app/contracts';
import { http } from './http';

/** 邀请接口：我的邀请（码/奖励说明/记录）与填码绑定 */
export const inviteApi = {
  /** 我的邀请 */
  mine(): Promise<MyInviteView> {
    return http.get('/invite/mine');
  },
  /** 填码绑定邀请关系 */
  bind(code: string): Promise<void> {
    return http.post('/invite/bind', { code });
  },
};
