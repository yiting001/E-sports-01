import type {
  BoosterDepositPolicy,
  BoosterLevelTier,
  BoosterServiceRegionOption,
  BoosterStatus,
  BoosterView,
  PaginatedResult,
  ReviewBoosterPayload,
  UpdateBoosterPayload,
} from "@app/contracts";
import { http, type RequestOptions } from "./http";

/** 打手入驻接口：管理端审核列表 / 审核 / 资料编辑 / 等级档位 / 押金退还 */
export const boosterApi = {
  /** 分页查询入驻申请，可按状态、名称或注册手机号过滤 */
  list(
    page: number,
    pageSize: number,
    status?: BoosterStatus,
    keyword?: string,
    options: RequestOptions = {}
  ): Promise<PaginatedResult<BoosterView>> {
    return http.get("/booster", {
      params: { page, pageSize, status, keyword },
      ...options,
    });
  },
  /** 审核（通过即授予 booster 角色 / 驳回） */
  review(id: string, payload: ReviewBoosterPayload): Promise<BoosterView> {
    return http.post(`/booster/${id}/review`, payload);
  },
  /** 编辑打手资料（仅更新传入字段） */
  update(id: string, payload: UpdateBoosterPayload): Promise<BoosterView> {
    return http.put(`/booster/${id}`, payload);
  },
  /** 上传并立即保存指定打手的试听语音（服务端校验 MIME 与文件头） */
  uploadVoice(id: string, file: File): Promise<BoosterView> {
    const form = new FormData();
    form.append("file", file);
    return http.put(`/booster/${id}/voice`, form);
  },
  /** 清空指定打手的试听语音 */
  clearVoice(id: string): Promise<BoosterView> {
    return http.delete(`/booster/${id}/voice`);
  },
  /** 查询等级档位 */
  getLevels(): Promise<BoosterLevelTier[]> {
    return http.get("/booster/levels");
  },
  /** 保存等级档位（booster:level:set） */
  setLevels(tiers: BoosterLevelTier[]): Promise<BoosterLevelTier[]> {
    return http.put("/booster/levels", { tiers });
  },
  /** 查询押金交付策略（最低/最高交付额） */
  getDepositPolicy(): Promise<BoosterDepositPolicy> {
    return http.get("/booster/deposit/policy");
  },
  /** 保存押金交付策略（booster:deposit:policy:set） */
  setDepositPolicy(
    policy: BoosterDepositPolicy
  ): Promise<BoosterDepositPolicy> {
    return http.put("/booster/deposit/policy", policy);
  },
  /** 退还押金（booster:deposit:refund，全额退回打手钱包余额） */
  refundDeposit(id: string): Promise<BoosterView> {
    return http.post(`/booster/${id}/deposit/refund`);
  },
  /** 查询接单区服选项 */
  getRegions(): Promise<BoosterServiceRegionOption[]> {
    return http.get("/booster/regions");
  },
  /** 保存接单区服选项（booster:region:set） */
  setRegions(
    options: BoosterServiceRegionOption[]
  ): Promise<BoosterServiceRegionOption[]> {
    return http.put("/booster/regions", { options });
  },
};
