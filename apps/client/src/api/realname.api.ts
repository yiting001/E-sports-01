import type {
  RealnameMineView,
  RealnameView,
  SubmitRealnamePayload,
} from '@app/contracts';
import { http } from './http';

/** C 端实名认证接口：用户自助查看状态 / 提交（重提）认证，审核在管理端完成 */
export const realnameApi = {
  /** 当前用户实名概览（是否需实名 + 当前状态/脱敏记录） */
  mine(): Promise<RealnameMineView> {
    return http.get('/realname/mine');
  },
  /** 提交/重提实名认证 */
  submit(payload: SubmitRealnamePayload): Promise<RealnameView> {
    return http.post('/realname', payload);
  },
};
