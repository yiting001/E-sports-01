export const JQF_WALLET_OPEN_PORT = Symbol('JQF_WALLET_OPEN_PORT');

/** 开户请求（身份证明文仅在本次调用内存中短暂存在，禁止落库/落日志） */
export interface JqfWalletOpenRequest {
  mchOrderNo: string;
  idcardNo: string;
  idcardName: string;
  telphone: string;
}

export interface JqfWalletOpenResult {
  walletId: string;
  channelState: number;
  errMsg: string;
}

/** 计全付钱包渠道端口：开户与按 walletId 查询渠道状态 */
export interface JqfWalletOpenPort {
  /** 计全付凭证是否已在配置中心就绪；未配置时调用方应跳过开户 */
  isConfigured(): Promise<boolean>;
  openWallet(request: JqfWalletOpenRequest): Promise<JqfWalletOpenResult>;
  queryWallet(walletId: string): Promise<JqfWalletOpenResult>;
}
