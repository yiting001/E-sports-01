# 计全付（JQF）集成检查清单

> 开发者对接 JQF 时必须逐项确认的完整清单，覆盖全部接口类别。

---

## 1. 基础配置检查

- [ ] **API Base URL** 已正确设置：生产环境与测试环境区分明确
  ```
  Jeepay.setApiBase("https://pay.jeepay.vip/");  // 示例
  ```
- [ ] **mchNo（商户号）** 已获取并配置；代理商调用时 mchNo 传代理商号
- [ ] **appId（应用ID）** 已获取并配置；代理商调用时 appId 传代理商号
- [ ] **apiKey（签名密钥）** 已从运营管理平台获取并安全存储
- [ ] **signType** 已确认：支持 `MD5` 和 `RSA2` 两种签名方式，与平台配置一致
  - MD5：`jeepayClient.execute(request)` + `response.checkSign(apiKey)`
  - RSA2：`jeepayClient.executeByRSA2(request)` + `response.checkSignByRsa2(apiRsa2Key)`
- [ ] **agentNo（代理商号）** 如为代理商模式，已配置并在请求中传入；代理商签名使用代理商自己的 apiKey
- [ ] **SDK 版本** 确认使用 `jqf-3.8.21` 或更高版本
  ```xml
  <dependency>
      <groupId>com.jeequan</groupId>
      <artifactId>jeepay-sdk-java</artifactId>
      <version>jqf-3.8.21</version>
  </dependency>
  ```
- [ ] 传输协议为 HTTPS，字符编码 UTF-8，Content-Type 为 `application/json`

---

## 2. 签名验证检查

### 2.1 MD5 签名（默认方式）

- [ ] **参数排序**：所有非空参数按参数名 ASCII 码字典序排列（区分大小写）
- [ ] **空值排除**：参数值为空（null 或空字符串）的字段不参与签名
- [ ] **sign 字段排除**：签名时 `sign` 参数不参与计算
- [ ] **拼接规则**：`key1=value1&key2=value2...&key=apiKey`
- [ ] **结果大写**：MD5 运算后的结果转为大写
- [ ] **扩展字段兼容**：JQF 可能新增字段，验签时必须支持未知扩展字段（不能做白名单过滤）

### 2.2 RSA2 签名

- [ ] 已获取 RSA2 密钥（与 MD5 密钥不同）
- [ ] 使用 SDK 的 `executeByRSA2` 方法发送请求
- [ ] 使用 `checkSignByRsa2(apiRsa2Key)` 验证响应签名

### 2.3 通用签名规则

- [ ] **参数名区分大小写**：`mchNo` 与 `mchno` 是不同参数（JQF 特有，与部分开源实现不同）
- [ ] **channelExtra** 等嵌套 JSON 字段：参与签名时取其字符串形式，不做二次解析
- [ ] 请求和响应都做验签，不仅是请求签名

---

## 3. 支付接口检查

### 3.1 统一下单（`api/pay/unifiedOrder`）

- [ ] **wayCode** 选择正确，对应实际支付方式（共 32 种支付方式）
- [ ] **channelExtra** 参数与 wayCode 匹配：
  | wayCode 类别 | channelExtra 必填项 |
  |---|---|
  | `*_BAR`（条码类） | `authCode`（付款码） |
  | `WX_JSAPI` / `WX_LITE` | `openid` |
  | `ALI_JSAPI` / `ALI_LITE` | `buyerUserId` |
  | `ALI_WAP` / `ALI_PC` / `ALI_QR` | `payDataType`（可选） |
  | `WX_APP` / `ALI_APP` / `WX_H5` | 无必填项 |
  | `BANK_QUICK` | `userType`, `userNo` |
  | `AUTO_POS` / `AUTO_BAR` / `WEB_CASHIER` / `QR_CASHIER` | 按指引文档配置 |
- [ ] **amount 单位为分**：整数，不带小数（如 1 元 = 100）
- [ ] **currency** 固定为 `CNY`
- [ ] **mchOrderNo** 商户订单号在商户维度唯一
- [ ] **notifyUrl** 异步通知地址可被外网访问，使用 HTTPS
- [ ] **reqTime** 为 13 位毫秒时间戳
- [ ] **version** 固定为 `"1.0"`

### 3.2 支付结果处理

- [ ] 下单接口返回后，支付状态为"支付中"，需通过异步通知或主动查询确认最终状态
- [ ] **orderState** 枚举值正确处理：0-订单生成, 1-支付中, 2-支付成功, 3-支付失败, 4-已撤销, 5-已退款, 6-退款中
- [ ] 条码支付（`*_BAR`）为同步返回结果，但仍建议处理异步通知做兜底

### 3.3 订单查询与关闭

- [ ] 主动查询接口 `api/pay/query` 可通过 `mchOrderNo` 或 `payOrderId` 查询
- [ ] 关闭订单 `api/pay/close` 仅对未支付订单有效
- [ ] 查询 OpenID 接口 `api/pay/queryOpenIdByBarcode` 用于条码支付场景获取渠道用户 ID

---

## 4. 异步通知检查

### 4.1 通用通知规则

- [ ] 所有通知均为 POST 请求，Content-Type 为 `application/json` 或 `application/x-www-form-urlencoded`
- [ ] **必须验签**：收到通知后先用 apiKey/RSA2 密钥验证 sign 字段
- [ ] **幂等处理**：同一笔通知可能重复推送，业务逻辑必须幂等（用订单号去重）
- [ ] **返回 "SUCCESS"**：处理成功后响应体返回纯文本 `SUCCESS`（不返回则 JQF 会持续重推）
- [ ] 通知 URL 必须为 HTTPS，且外网可访问

### 4.2 各类通知

| 通知类型 | 文档 pageId | 关键字段 |
|---|---|---|
| 支付结果通知 | 44 | payOrderId, mchOrderNo, orderState, amount |
| 退款结果通知 | 50 | refundOrderId, mchRefundNo, state, refundAmount |
| 转账结果通知 | 47 | transferId, mchTransferNo, state, amount |
| 进件通知 | 346 | applyId, state, mchNo, ifCode, errorMsg |
| 其他异步通知 | 202 | 按具体业务场景解析 |

- [ ] 已对以上所有通知类型分别实现处理逻辑
- [ ] 进件通知的 state 有 8 种值：1-审核中, 2-进件成功, 3-驳回待修改, 4-待验证, 5-待签约, 6-签约完成, 7-等待系统预审核, 8-预审核拒绝

---

## 5. 退款接口检查

### 5.1 发起退款（`api/refund/refundOrder`）

- [ ] **mchRefundNo** 退款单号在商户维度唯一
- [ ] **refundAmount** 单位为分，不超过原订单金额
- [ ] **支持部分退款**：refundAmount 可小于原订单 amount，可多次部分退款（总额不超过原金额）
- [ ] 使用原支付订单的 `payOrderId` 或 `mchOrderNo` 关联退款
- [ ] 退款货币与原订单一致

### 5.2 退款查询

- [ ] 可通过 `mchRefundNo` 或 `refundOrderId` 查询退款状态
- [ ] 退款结果以异步通知为准（通知地址在退款请求中指定）

### 5.3 注意事项

- [ ] 退款有手续费计算逻辑，确认业务侧是否需要关注
- [ ] 部分退款后原订单状态不变（仍为支付成功），需自行累计退款金额判断是否全额退款

---

## 6. 转账接口检查

### 6.1 发起转账（`api/transferOrder`）

- [ ] 转账前建议先查询余额（`api/transfer/balance/query`），确认余额充足
- [ ] **amount 单位为分**
- [ ] **mchTransferNo** 转账单号在商户维度唯一
- [ ] **entryType** 收款账户类型设置正确
- [ ] 转账结果以异步通知为准

### 6.2 凭证相关

- [ ] 转账成功后可申请电子凭证（`api/transfer/certificate/apply`）
- [ ] 凭证查询接口 `api/transfer/certificate/query` 用于获取凭证结果
- [ ] 凭证非实时生成，需轮询或异步获取

### 6.3 资金转账支付（`api/fund/trans/pay`）

- [ ] 与普通转账接口不同，用于资金转账支付场景，参数结构有差异

---

## 7. 分账接口检查

### 7.1 前置条件

- [ ] **先绑定分账接收方**：调用 `api/division/receiver/bind` 绑定分账用户
- [ ] 可通过 `api/division/receiver/bindQuery` 查询绑定状态
- [ ] 商户进件时 `isDivision=1` 且 `divisionFeeRate` 已设置

### 7.2 订单分账

- [ ] **下单时指定 divisionMode**：
  - 0-该笔订单不分账
  - 1-支付成功后自动分账（需指定分账接收方和比例）
- [ ] 分账执行 `api/division/exec`：手动分账时使用
- [ ] 分账完成 `api/division/finish`：分账结束后调用，通知平台不再分账
- [ ] 分账查询 `api/division/query`

### 7.3 余额分账（区别于订单分账）

- [ ] 余额分账执行 `api/division/balance/exec`：从商户余额直接分账（非绑定订单）
- [ ] 余额分账查询 `api/division/balance/query`
- [ ] 渠道余额查询 `api/division/receiver/channelBalanceQuery`
- [ ] 渠道余额提现 `api/division/receiver/channelBalanceCashout`
- [ ] 提现记录查询 `api/division/receiver/cashoutRecordQuery`

### 7.4 注意事项

- [ ] 分账金额单位为分，分账比例精确到小数点后四位
- [ ] 订单分账和余额分账是两套独立流程，不能混用

---

## 8. 协议支付检查

> 协议支付（BANK_AGREE）用于快捷支付场景，需按固定流程绑定后才能支付。

### 8.1 完整流程

- [ ] **Step 1 - 预绑定**：调用 `api/pay/bankAgreePreBind`，获取预绑定信息
- [ ] **Step 2 - 确认绑定**：调用 `api/pay/bankAgreeConfirmBind`，完成银行卡协议绑定
- [ ] **Step 3 - 协议支付**：通过统一下单接口 wayCode=`BANK_AGREE` 发起支付
- [ ] **Step 4 - 短信确认**（如需）：`api/pay/bankAgreeProtocolpayConfirm` 确认支付
- [ ] **Step 5 - 重发短信**（如需）：`api/pay/bankAgreeResendPaysms` 重发验证码
- [ ] **Step 6 - 解绑**（可选）：`api/pay/bankAgreeUnBind` 解除协议绑定

### 8.2 辅助接口

- [ ] `api/pay/bankAgreeBanklistQuery` 查询支持的银行列表
- [ ] 绑定流程中涉及的短信验证码有超时机制，需提示用户及时输入
- [ ] 同一用户可绑定多张银行卡，需管理协议号与卡号的映射关系

---

## 9. 进件（商户入网）检查

> 进件接口按需对接。最小可用集合：文件上传 + 提交进件 + 状态查询/通知。

### 9.1 接口依赖

- [ ] 已确认需要对接的接口列表
- [ ] 有依赖的接口已提前对接（如提交进件依赖文件上传获取 fileId）

### 9.2 渠道识别

- [ ] **ifCode** 进件渠道选择正确：
  | ifCode | 渠道 | 渠道参数文档 |
  |--------|------|-------------|
  | shengpay / shengpay_n | 盛付通 | pageId=346 |
  | yeepay / yeepay_2 | 易宝 | pageId=366 |
  | jlpay | 嘉联 | pageId=369 |
- [ ] 渠道专属接口（活动费率、受益人、证件临期）仅在盛付通时使用

### 9.3 文件上传（`api/file/upload`）— pageId=344

- [ ] 图片先通过上传接口获取文件 ID（UUID 格式）
- [ ] 文件 ID 用于后续进件提交中的各图片字段
- [ ] 支持通过 URL 上传（fileUrl）或二进制流上传

### 9.4 提交进件（`api/mchApplyment/income`）— pageId=343

- [ ] **ifCode** 进件渠道选择正确
- [ ] **mchInfo** 商户基本信息完整
- [ ] **applymentInfo** 按渠道要求填写，注意条件必填字段
- [ ] **paywayFeeList** 费率配置完整：SINGLE（pageId=361）/ LEVEL（pageId=364）
- [ ] **areaCode** 为数组格式 `["130000", "130900", "130902"]`，包含省市区三级
- [ ] 日期格式统一为 `yyyy-MM-dd`，长期有效传 `"长期"`
- [ ] 进件驳回后可携带原 `applyId` 重新提交修改

### 9.5 状态查询（`api/mchApplyment/income/query`）— pageId=347

- [ ] state 枚举值正确处理：1=审核中, 2=进件成功, 3=驳回待修改, 4=待验证, 5=待签约, 6=签约完成, 7=等待预审核, 8=预审核拒绝
- [ ] 注意：不同渠道状态流转路径不一致

### 9.6 异步通知（ST_APPLYMENT）— pageId=351

- [ ] 必须验签
- [ ] 必须幂等（根据 applyId 去重）
- [ ] 响应 SUCCESS

### 9.7 签约（`api/mchApplyment/signUrl`）— pageId=353

- [ ] 进件成功（state=2）后调用
- [ ] 获取签约URL → 商户完成电子签约

### 9.8 签约查询（`api/mchApplyment/sign/query`）— pageId=354

- [ ] 查询签约结果

### 9.9 实名认证（`api/mchApplyment/realNameUrl`）— pageId=358

- [ ] 进件成功（state=2）后调用
- [ ] 获取认证二维码/URL → 商户扫码完成认证
- [ ] queryType：1=微信, 2=支付宝

### 9.10 微信配置（`api/mchApplyment/wxConfig`）— pageId=355

- [ ] 配置 wxPayBaseUrl（授权目录）和/或 wxMchAppId（公众号/小程序appId）

### 9.11 微信配置查询（`api/mchApplyment/wxConfig/query`）— pageId=410

- [ ] 查询已配置的微信参数

### 9.12 盛付通专属接口

> 以下接口仅在 ifCode 为 shengpay 时生效。

- [ ] 活动费率配置/查询/关闭/订单查询（pageId=413/414/415/416）
- [ ] 受益人补充查询（pageId=589）
- [ ] 证件临期查询（pageId=574）
- [ ] 证件到期通知 ST_LICENSE_EXT（pageId=372）

---

## 10. 安全红线

以下条目为硬性要求，任何一项不满足不得上线。

- [ ] **apiKey 绝不出现在日志中**：日志脱敏处理，签名计算过程中的 key 值不得打印
- [ ] **全链路 HTTPS**：API 调用、异步通知接收、文件上传全部使用 HTTPS
- [ ] **金额单位始终为分**：前端展示为元时，到 JQF 接口必须乘以 100 转为整数分；不接受小数
- [ ] **签名验证不可跳过**：所有 JQF 响应和异步通知都必须验签，不得因"测试环境"跳过
- [ ] **sign 字段不参与签名计算**：签名拼接时排除 sign 字段本身
- [ ] **幂等处理**：所有通知处理逻辑必须幂等，防止重复入账/重复退款
- [ ] **订单号唯一性**：mchOrderNo、mchRefundNo、mchTransferNo 在商户维度全局唯一
- [ ] **参数名大小写敏感**：JQF 参数名区分大小写（如 `mchNo` 不能写为 `mchno`）
- [ ] **扩展字段兼容**：验签时不能对参数做白名单过滤，必须接受 JQF 新增的未知字段
- [ ] **敏感信息加密传输**：身份证号、银行卡号等敏感字段按接口要求处理

---

## 11. 上线前必检

### 11.1 功能测试

- [ ] 所有使用的 wayCode 支付方式均已测试通过（至少覆盖 WX_JSAPI, WX_LITE, ALI_BAR, QR_CASHIER 等主力渠道）
- [ ] 支付全流程：下单 → 支付 → 异步通知 → 订单状态更新 → 查询验证
- [ ] 退款全流程：发起退款 → 退款通知 → 退款状态更新
- [ ] 退款边界：全额退款、部分退款、超过余额退款（预期失败）
- [ ] 转账功能（如使用）：余额查询 → 发起转账 → 转账通知
- [ ] 分账功能（如使用）：绑定接收方 → 下单（divisionMode=1）→ 自动/手动分账 → 完成
- [ ] 协议支付全流程（如使用）：预绑 → 确认绑定 → 支付 → 解绑
- [ ] 进件全流程（如使用）：文件上传 → 发起 → 状态轮询 → 签约 → 配置
- [ ] 钱包功能（如使用）：创建 → 绑卡 → 提现/转账
- [ ] 提现功能（如使用）：余额查询 → 创建提现 → 查询状态

### 11.2 异常与容错

- [ ] 网络超时处理：API 调用设置合理超时时间，超时后主动查询确认结果
- [ ] 签名验证失败处理：记录日志，不更新业务状态，等待重试
- [ ] 异步通知重试机制：JQF 重推时系统能正确处理（幂等）
- [ ] 并发场景：同一笔订单的支付通知和主动查询并发时，状态一致
- [ ] 大额交易验证：金额大于某个阈值时有额外确认逻辑

### 11.3 日志与监控

- [ ] 关键操作日志完整：请求参数（脱敏）、响应结果、签名验证结果
- [ ] 异步通知日志：每次通知的原始报文、验签结果、处理结果
- [ ] 异常告警：签名验证失败、订单状态异常、长时间未收到通知等触发告警
- [ ] 对账机制：定期与 JQF 进行账务对账（T+1 或实时）

### 11.4 环境确认

- [ ] 生产环境 API Base URL 已切换（非测试地址）
- [ ] 生产环境 apiKey 已替换（非测试密钥）
- [ ] notifyUrl 指向生产域名且 HTTPS 证书有效
- [ ] 服务器 IP 白名单已配置（如需）
- [ ] 数据库连接、缓存等基础设施就绪

---

## 附录：接口速查表

| 接口类别 | 核心接口 | API 路径 |
|---|---|---|
| 支付 | 统一下单 | `api/pay/unifiedOrder` |
| 支付 | 查询订单 | `api/pay/query` |
| 支付 | 关闭订单 | `api/pay/close` |
| 退款 | 发起退款 | `api/refund/refundOrder` |
| 退款 | 查询退款 | `api/refund/query` |
| 转账 | 发起转账 | `api/transferOrder` |
| 转账 | 余额查询 | `api/transfer/balance/query` |
| 分账 | 绑定接收方 | `api/division/receiver/bind` |
| 分账 | 发起分账 | `api/division/exec` |
| 分账 | 完成分账 | `api/division/finish` |
| 分账 | 余额分账 | `api/division/balance/exec` |
| 钱包 | 创建钱包 | `api/wallet/user` |
| 钱包 | 钱包提现 | `api/wallet/cashout` |
| 提现 | 余额查询 | `api/cashout/balance/query` |
| 提现 | 创建提现 | `api/cashout/order/create` |
| 发票 | 开票 | `api/invoice/open` |
| 协议支付 | 预绑定 | `api/pay/bankAgreePreBind` |
| 协议支付 | 确认绑定 | `api/pay/bankAgreeConfirmBind` |
| 协议支付 | 确认支付 | `api/pay/bankAgreeProtocolpayConfirm` |
| 协议支付 | 解绑协议 | `api/pay/bankAgreeUnBind` |
| 进件 | 文件上传 | `api/file/upload` |
| 进件 | 提交进件 | `api/mchApplyment/income` |
| 进件 | 查询进件 | `api/mchApplyment/income/query` |
| 进件 | 签约 | `api/mchApplyment/signUrl` |
| 进件 | 签约查询 | `api/mchApplyment/sign/query` |
| 进件 | 实名认证 | `api/mchApplyment/realNameUrl` |
| 进件 | 微信配置 | `api/mchApplyment/wxConfig` |
| 进件 | 微信配置查询 | `api/mchApplyment/wxConfig/query` |
| 进件 | 活动费率配置 | `api/rate/marketing/config` |
| 进件 | 活动费率查询 | `api/rate/marketing/query` |
| 进件 | 受益人补充查询 | `api/mchApplyment/merchantComplement/query` |
| 进件 | 证件临期查询 | `api/mchApplyment/licenseExpInfo/query` |

> 完整接口列表见页面索引：`references/page-index.md`
