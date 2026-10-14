import { http } from './http';

/** 邀请接口：登录时填码绑定邀请关系（奖惩规则由后台配置） */
export const inviteApi = {
  /** 填码绑定邀请关系（仅首登自动注册后可绑） */
  bind(code: string): Promise<void> {
    return http.post('/invite/bind', { code });
  },
};
