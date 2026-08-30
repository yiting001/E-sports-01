# API 路由表

计全付支付接口文档路由表。

---

## 协议与对接

| 文档名称 | 页面ID | API路径 | 文档链接 | 说明 |
|----------|--------|---------|----------|------|
| 协议规则 | 213 | - | https://doc.jeequan.com/#/integrate/jqf/api/213 | 签名方式、参数格式、通用规则 |
| SDK下载 | 217 | - | https://doc.jeequan.com/#/integrate/jqf/api/217 | Java/Python SDK，PHP Demo |
| 接口对接 | 255 | - | https://doc.jeequan.com/#/integrate/jqf/api/255 | 测试账号、联调说明 |

---

## 支付接口

| 文档名称 | 页面ID | API路径 | 文档链接 | 说明 |
|----------|--------|---------|----------|------|
| 统一支付下单 | 39 | api/pay/unifiedOrder | https://doc.jeequan.com/#/integrate/jqf/api/39 | 核心下单接口，含32种支付方式 |
| 查询支付订单 | 40 | api/pay/query | https://doc.jeequan.com/#/integrate/jqf/api/40 | 查询订单状态 |
| 关闭订单 | 41 | api/pay/close | https://doc.jeequan.com/#/integrate/jqf/api/41 | 关闭未支付订单 |
| 条码查询OpenID | 42 | api/pay/queryOpenIdByBarcode | https://doc.jeequan.com/#/integrate/jqf/api/42 | 通过条码查询微信OpenID |
| 获取渠道用户ID | 43 | api/channelUserId/jump | https://doc.jeequan.com/#/integrate/jqf/api/43 | 获取渠道用户标识 |
| 支付结果通知 | 44 | - | https://doc.jeequan.com/#/integrate/jqf/api/44 | 支付异步通知 |

---

## 退款接口

| 文档名称 | 页面ID | API路径 | 文档链接 | 说明 |
|----------|--------|---------|----------|------|
| 发起退款 | 48 | api/refund/refundOrder | https://doc.jeequan.com/#/integrate/jqf/api/48 | 退款接口 |
| 查询退款 | 49 | api/refund/query | https://doc.jeequan.com/#/integrate/jqf/api/49 | 查询退款状态 |
| 退款结果通知 | 50 | - | https://doc.jeequan.com/#/integrate/jqf/api/50 | 退款异步通知 |

---

## 转账接口

| 文档名称 | 页面ID | API路径 | 文档链接 | 说明 |
|----------|--------|---------|----------|------|
| 发起转账 | 45 | api/transferOrder | https://doc.jeequan.com/#/integrate/jqf/api/45 | 转账接口 |
| 查询转账 | 46 | api/transfer/query | https://doc.jeequan.com/#/integrate/jqf/api/46 | 查询转账状态 |
| 转账结果通知 | 47 | - | https://doc.jeequan.com/#/integrate/jqf/api/47 | 转账异步通知 |
| 转账余额查询 | 51 | api/transfer/balance/query | https://doc.jeequan.com/#/integrate/jqf/api/51 | 查询可转账余额 |
| 转账凭证申请 | 52 | api/transfer/certificate/apply | https://doc.jeequan.com/#/integrate/jqf/api/52 | 申请转账凭证 |
| 转账凭证查询 | 53 | api/transfer/certificate/query | https://doc.jeequan.com/#/integrate/jqf/api/53 | 查询转账凭证 |
| 资金转账支付 | 54 | api/fund/trans/pay | https://doc.jeequan.com/#/integrate/jqf/api/54 | 资金转账支付 |

---

## 分账接口

| 文档名称 | 页面ID | API路径 | 文档链接 | 说明 |
|----------|--------|---------|----------|------|
| 绑定分账用户 | 55 | api/division/receiver/bind | https://doc.jeequan.com/#/integrate/jqf/api/55 | 绑定分账接收方 |
| 查询分账绑定 | 56 | api/division/receiver/bindQuery | https://doc.jeequan.com/#/integrate/jqf/api/56 | 查询分账绑定 |
| 发起分账 | 57 | api/division/exec | https://doc.jeequan.com/#/integrate/jqf/api/57 | 订单分账 |
| 查询分账 | 58 | api/division/query | https://doc.jeequan.com/#/integrate/jqf/api/58 | 查询分账结果 |
| 完成分账 | 59 | api/division/finish | https://doc.jeequan.com/#/integrate/jqf/api/59 | 完成分账 |
| 余额分账执行 | 62 | api/division/balance/exec | https://doc.jeequan.com/#/integrate/jqf/api/62 | 余额分账 |
| 余额分账查询 | 63 | api/division/balance/query | https://doc.jeequan.com/#/integrate/jqf/api/63 | 查询余额分账 |
| 渠道余额查询 | 64 | api/division/receiver/channelBalanceQuery | https://doc.jeequan.com/#/integrate/jqf/api/64 | 渠道余额查询 |
| 渠道余额提现 | 65 | api/division/receiver/channelBalanceCashout | https://doc.jeequan.com/#/integrate/jqf/api/65 | 渠道余额提现 |
| 提现记录查询 | 66 | api/division/receiver/cashoutRecordQuery | https://doc.jeequan.com/#/integrate/jqf/api/66 | 提现记录查询 |
| 结算更新 | 214 | api/division/receiver/settle/update | https://doc.jeequan.com/#/integrate/jqf/api/214 | 结算信息更新 |

---

## 钱包接口

| 文档名称 | 页面ID | API路径 | 文档链接 | 说明 |
|----------|--------|---------|----------|------|
| 创建钱包 | 67 | api/wallet/user | https://doc.jeequan.com/#/integrate/jqf/api/67 | 钱包开户 |
| 绑定银行卡 | 68 | api/wallet/bankcard/bind | https://doc.jeequan.com/#/integrate/jqf/api/68 | 钱包绑定银行卡 |
| 查询钱包用户 | 69 | api/wallet/user/query | https://doc.jeequan.com/#/integrate/jqf/api/69 | 查询钱包信息 |
| 钱包变动明细 | 70 | api/wallet/user/changeDetails | https://doc.jeequan.com/#/integrate/jqf/api/70 | 钱包变动明细 |
| 钱包提现 | 71 | api/wallet/cashout | https://doc.jeequan.com/#/integrate/jqf/api/71 | 钱包提现 |
| 查询钱包提现 | 72 | api/wallet/cashout/query | https://doc.jeequan.com/#/integrate/jqf/api/72 | 查询提现状态 |
| 钱包转账 | 73 | api/wallet/transfer | https://doc.jeequan.com/#/integrate/jqf/api/73 | 钱包转账 |
| 查询钱包转账 | 129 | api/wallet/transfer/query | https://doc.jeequan.com/#/integrate/jqf/api/129 | 查询钱包转账 |

---

## 发票接口

| 文档名称 | 页面ID | API路径 | 文档链接 | 说明 |
|----------|--------|---------|----------|------|
| 开票 | 74 | api/invoice/open | https://doc.jeequan.com/#/integrate/jqf/api/74 | 开票接口 |
| 查询发票 | 75 | api/invoice/query | https://doc.jeequan.com/#/integrate/jqf/api/75 | 查询发票状态 |
| 电子发票URL | 76 | api/invoice/elecUrl | https://doc.jeequan.com/#/integrate/jqf/api/76 | 获取电子发票URL |

---

## 提现接口

| 文档名称 | 页面ID | API路径 | 文档链接 | 说明 |
|----------|--------|---------|----------|------|
| 提现余额查询 | 77 | api/cashout/balance/query | https://doc.jeequan.com/#/integrate/jqf/api/77 | 查询可提现余额 |
| 创建提现订单 | 78 | api/cashout/order/create | https://doc.jeequan.com/#/integrate/jqf/api/78 | 发起提现 |
| 查询提现订单 | 79 | api/cashout/order/query | https://doc.jeequan.com/#/integrate/jqf/api/79 | 查询提现状态 |

---

## 协议支付接口

| 文档名称 | 页面ID | API路径 | 文档链接 | 说明 |
|----------|--------|---------|----------|------|
| 协议预绑定 | 131 | api/pay/bankAgreePreBind | https://doc.jeequan.com/#/integrate/jqf/api/131 | 预绑定银行卡 |
| 协议确认绑定 | 132 | api/pay/bankAgreeConfirmBind | https://doc.jeequan.com/#/integrate/jqf/api/132 | 确认绑定 |
| 协议支付确认 | 133 | api/pay/bankAgreeProtocolpayConfirm | https://doc.jeequan.com/#/integrate/jqf/api/133 | 确认协议支付 |
| 重发支付短信 | 134 | api/pay/bankAgreeResendPaysms | https://doc.jeequan.com/#/integrate/jqf/api/134 | 重发验证码 |
| 解绑协议 | 135 | api/pay/bankAgreeUnBind | https://doc.jeequan.com/#/integrate/jqf/api/135 | 解绑协议 |
| 银行列表查询 | 136 | api/pay/bankAgreeBanklistQuery | https://doc.jeequan.com/#/integrate/jqf/api/136 | 支持的银行列表 |

---

## 进件接口

### 核心接口

| 文档名称 | 页面ID | API路径 | 文档链接 | 直接依赖 | 说明 |
|----------|--------|---------|----------|----------|------|
| 文件上传 | 344 | api/file/upload | https://doc.jeequan.com/#/integrate/jqf/api/344 | 无 | 上传证件图片获取 fileId |
| 提交进件 | 343 | api/mchApplyment/income | https://doc.jeequan.com/#/integrate/jqf/api/343 | 文件上传（获取fileId） | 提交 mchInfo + applymentInfo |
| 进件状态查询 | 347 | api/mchApplyment/income/query | https://doc.jeequan.com/#/integrate/jqf/api/347 | 无 | 主动轮询审核状态 |
| 申请单状态通知 | 351 | ST_APPLYMENT（异步） | https://doc.jeequan.com/#/integrate/jqf/api/351 | 无 | 异步通知审核结果 |
| 签约 | 353 | api/mchApplyment/signUrl | https://doc.jeequan.com/#/integrate/jqf/api/353 | 状态查询/通知（确认state=2） | 获取签约URL |
| 签约查询 | 354 | api/mchApplyment/sign/query | https://doc.jeequan.com/#/integrate/jqf/api/354 | 签约 | 查询签约结果 |
| 实名认证 | 358 | api/mchApplyment/realNameUrl | https://doc.jeequan.com/#/integrate/jqf/api/358 | 状态查询/通知（确认state=2） | 获取认证二维码/URL |
| 微信配置 | 355 | api/mchApplyment/wxConfig | https://doc.jeequan.com/#/integrate/jqf/api/355 | 无 | 配置授权目录/公众号appId |
| 微信配置查询 | 410 | api/mchApplyment/wxConfig/query | https://doc.jeequan.com/#/integrate/jqf/api/410 | 无 | 查询已配置的微信参数 |

### 渠道参数（提交进件时按渠道选择）

| 渠道 | ifCode | 页面ID | 文档链接 |
|------|--------|--------|----------|
| 盛付通 | shengpay / shengpay_n | 346 | https://doc.jeequan.com/#/integrate/jqf/api/346 |
| 易宝 | yeepay / yeepay_2 | 366 | https://doc.jeequan.com/#/integrate/jqf/api/366 |
| 嘉联 | jlpay | 369 | https://doc.jeequan.com/#/integrate/jqf/api/369 |

### 费率配置（提交进件时参考）

| 类型 | 页面ID | 文档链接 | 说明 |
|------|--------|----------|------|
| SINGLE 单笔费率 | 361 | https://doc.jeequan.com/#/integrate/jqf/api/361 | 如 0.0038 = 0.38% |
| LEVEL 银联阶梯费率 | 364 | https://doc.jeequan.com/#/integrate/jqf/api/364 | 需填写 levelList |

### 渠道专属接口（仅盛付通）

> 以下接口仅在 ifCode 为 shengpay 时生效，对接其他渠道不生效。

| 文档名称 | 页面ID | API路径 | 文档链接 | 说明 |
|----------|--------|---------|----------|------|
| 活动费率配置 | 413 | api/rate/marketing/config | https://doc.jeequan.com/#/integrate/jqf/api/413 | 渠道活动费率配置 |
| 活动费率查询 | 414 | api/rate/marketing/query | https://doc.jeequan.com/#/integrate/jqf/api/414 | 渠道活动费率查询 |
| 关闭活动费率 | 415 | api/rate/marketing/close | https://doc.jeequan.com/#/integrate/jqf/api/415 | 关闭渠道活动费率 |
| 活动费率订单查询 | 416 | api/rate/marketing/order/query | https://doc.jeequan.com/#/integrate/jqf/api/416 | 活动费率订单查询 |
| 受益人补充查询 | 589 | api/mchApplyment/merchantComplement/query | https://doc.jeequan.com/#/integrate/jqf/api/589 | 查询需补充的受益人信息 |
| 证件临期查询 | 574 | api/mchApplyment/licenseExpInfo/query | https://doc.jeequan.com/#/integrate/jqf/api/574 | 查询即将到期的证件 |
| 证件到期通知 | 372 | ST_LICENSE_EXT（异步） | https://doc.jeequan.com/#/integrate/jqf/api/372 | 证件到期异步推送 |

### 辅助文档

| 文档名称 | 页面ID | 文档链接 | 说明 |
|----------|--------|----------|------|
| 代理商协议规则 | 348 | https://doc.jeequan.com/#/integrate/jqf/api/348 | 签名规则 + 渠道基础参数附录 |
| 进件测试环境 | 370 | https://doc.jeequan.com/#/integrate/jqf/api/370 | 测试环境信息 |

### 渠道基础参数（提交进件时需要）

| 渠道 | 地区编码 | 银行编码 | MCC编码 |
|------|----------|----------|---------|
| 盛付通 | areaCode.json | shengpay-banks.xlsx | shengpay-mcc.xlsx |
| 易宝 | yeepay-areaCode.json | yeepay-banks.xlsx | yeepay-mcc.json |
| 嘉联 | areaCode.json | jlpay-banks.xlsx | jlpay-mcc-xw.json / jlpay-mcc-qy.json |

### 关键词 → 接口映射

| 用户可能的说法 | 匹配接口 | pageId |
|---------------|----------|--------|
| 文件上传 / 图片上传 / 证件上传 | 文件上传 | 344 |
| 提交进件 / 进件申请 / 商户入驻申请 | 提交进件 | 343 |
| 进件查询 / 申请状态查询 / 状态轮询 | 进件状态查询 | 347 |
| 进件通知 / 状态通知 / 异步通知 | 申请单状态通知 | 351 |
| 签约 / 电子签约 | 签约 | 353 |
| 签约查询 | 签约查询 | 354 |
| 实名认证 / 认证 / 实名 | 实名认证 | 358 |
| 微信配置 / 授权目录 / 公众号配置 | 微信配置 | 355 |
| 微信配置查询 | 微信配置查询 | 410 |
| 活动费率配置 / 营销费率 | 活动费率配置 | 413 |
| 活动费率查询 | 活动费率查询 | 414 |
| 关闭活动费率 | 关闭活动费率 | 415 |
| 活动费率订单查询 | 活动费率订单查询 | 416 |
| 受益人补充 / 受益人查询 | 受益人补充查询 | 589 |
| 证件临期 / 证件到期查询 | 证件临期查询 | 574 |
| 证件到期通知 | 证件到期通知 | 372 |

---

## 其他接口

| 文档名称 | 页面ID | API路径 | 文档链接 | 说明 |
|----------|--------|---------|----------|------|
| 商户信息配置 | 401 | api/mchInfos/configs | https://doc.jeequan.com/#/integrate/jqf/api/401 | 商户分账配置 |
| 代理商调用说明 | 362 | - | https://doc.jeequan.com/#/integrate/jqf/api/362 | 代理商调用方式 |

---

## API 调用流程

### 支付调用流程

```
1. 读取协议规则 (id: 213)
   └── 了解签名方式、参数格式

2. 下载SDK (id: 217)
   └── 获取 Java/Python SDK 或 PHP Demo

3. 调用统一支付下单接口 (id: 39)
   └── 传入 wayCode 和 channelExtra 参数

4. 接收支付结果通知 (id: 44) 或主动查询 (id: 40)
   └── 验签、处理业务逻辑
```

### 退款调用流程

```
1. 调用发起退款接口 (id: 48)
2. 接收退款结果通知 (id: 50) 或主动查询 (id: 49)
```

### 转账调用流程

```
1. 查询转账余额 (id: 51)
2. 调用发起转账接口 (id: 45)
3. 接收转账结果通知 (id: 47) 或主动查询 (id: 46)
```

### 分账调用流程

```
1. 绑定分账用户 (id: 55)
2. 下单时设置 divisionMode 或调用发起分账 (id: 57)
3. 查询分账结果 (id: 58)
4. 完成分账 (id: 59)
```

### 协议支付调用流程

```
1. 协议预绑定 (id: 131)
2. 协议确认绑定 (id: 132)
3. 协议支付确认 (id: 133)
   └── 如需重发短信 (id: 134)
4. 解绑协议 (id: 135，可选)
```

### 进件调用流程

> 进件接口按需对接，不自动串联。用户未指定具体接口时，提示最小可用集合：
> 文件上传(344) + 提交进件(343) + 状态查询(347)或异步通知(351)

```
用户指定接口 → 识别意图 → 获取在线文档 → 生成对接代码
                  ↓（如有直接依赖）
              提醒依赖 → 用户确认/跳过 → 继续对接
```

接口依赖关系：
- 提交进件(343) ← 依赖文件上传(344)获取 fileId
- 签约(353) ← 依赖状态查询/通知确认 state=2
- 实名认证(358) ← 依赖状态查询/通知确认 state=2
- 其他接口无直接依赖

---

## 文档获取方式

### 在线文档

所有文档可通过以下链接访问：

- **API文档**：https://doc.jeequan.com/#/integrate/jqf/api/{页面ID}
- **指引文档**：https://doc.jeequan.com/#/integrate/jqf/guide/{页面ID}
- **常见问题**：https://doc.jeequan.com/#/integrate/jqf/issue/{页面ID}

### 文档获取 API

```bash
curl -X POST "https://doc.jeequan.com/doc-wiki/open-api/integrate/page/detail" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "_=https://doc.jeequan.com&_lang=zh-CN&pageId={页面ID}&space=jqf-api&integrate=jqf&version=&userUuid=&accessPassword="
```

---

## 注意事项

1. **文档更新**：文档内容可能会更新，建议以在线文档为准
2. **测试环境**：测试环境信息请参考接口对接文档 (id: 255)
3. **签名方式**：支持 MD5 和 RSA2 两种签名方式
4. **计全付特性**：与开源版存在差异，本路由表仅适用于计全付平台
