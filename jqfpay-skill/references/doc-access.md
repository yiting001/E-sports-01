# 文档访问规范

所有计全付的文档地址均为**在线动态链接**，使用以下方式获取文档内容。

---

## URL 结构说明

```
https://doc.jeequan.com/#/integrate/jqf/api/255
                         │    │    │    │    │
                         │    │    │    │    └── 页面 ID (pageId)
                         │    │    │    └── 空间编码
                         │    │    └── 整合空间标识 (integrate)
                         │    └── 空间类型
                         └── Hash 路由
```

## 空间编码对照表

| 空间编码 | 说明 | spaceUuid |
|----------|------|-----------|
| guide | 指引文档 | jqf-guide |
| product | 产品介绍 | jqf-product |
| api | API文档 | jqf-api |
| manual | 功能操作 | jqf-manual |
| issue | 常见问题 | jqf-issue |

## 文档获取脚本

```bash
#!/bin/bash

# 配置
BASE_URL="https://doc.jeequan.com"
INTEGRATE="jqf"
PAGE_ID="$1"  # 从 URL 中提取的页面 ID

# Step 1: 获取整合空间详情（可选，用于确认空间结构）
DETAIL=$(curl -sL \
  -X POST "$BASE_URL/doc-wiki/open-api/integrate/detail" \
  -d "integrate=$INTEGRATE&version=&_=$BASE_URL/&_lang=zh-CN")

# Step 2: 获取页面详情
# spaceUuid 根据文档类型选择：jqf-guide / jqf-api / jqf-issue / jqf-product / jqf-manual
SPACE_UUID="jqf-api"  # API 文档使用此值

PAGE_CONTENT=$(curl -sL \
  -X POST "$BASE_URL/doc-wiki/open-api/integrate/page/detail" \
  -d "pageId=$PAGE_ID&space=$SPACE_UUID&integrate=$INTEGRATE&version=&userUuid=&accessPassword=&_=$BASE_URL/&_lang=zh-CN")

echo "$PAGE_CONTENT"
```

## 使用示例

```bash
# 获取统一支付下单文档（pageId=39）
./fetch-doc.sh 39

# 获取查询支付订单文档（pageId=40）
./fetch-doc.sh 40

# 获取退款文档（pageId=48）
./fetch-doc.sh 48
```

## 获取所有页面列表

```bash
# 获取计全付文档空间的所有页面
curl -sL \
  -X POST "https://doc.jeequan.com/doc-wiki/open-api/integrate/detail" \
  -d "integrate=jqf&version=&_=https://doc.jeequan.com/&_lang=zh-CN"
```

## 已知的页面 ID 映射

### 基础/对接

| 接口名称 | pageId | 在线文档 |
|----------|--------|----------|
| 协议规则 | 213 | https://doc.jeequan.com/#/integrate/jqf/api/213 |
| SDK下载 | 217 | https://doc.jeequan.com/#/integrate/jqf/api/217 |
| 接口对接 | 255 | https://doc.jeequan.com/#/integrate/jqf/api/255 |

### 支付接口

| 接口名称 | pageId | 在线文档 |
|----------|--------|----------|
| 统一支付下单 | 39 | https://doc.jeequan.com/#/integrate/jqf/api/39 |
| 查询支付订单 | 40 | https://doc.jeequan.com/#/integrate/jqf/api/40 |
| 关闭订单 | 41 | https://doc.jeequan.com/#/integrate/jqf/api/41 |
| 条码查询OpenID | 42 | https://doc.jeequan.com/#/integrate/jqf/api/42 |
| 获取渠道用户ID | 43 | https://doc.jeequan.com/#/integrate/jqf/api/43 |
| 支付结果通知 | 44 | https://doc.jeequan.com/#/integrate/jqf/api/44 |

### 退款接口

| 接口名称 | pageId | 在线文档 |
|----------|--------|----------|
| 发起退款 | 48 | https://doc.jeequan.com/#/integrate/jqf/api/48 |
| 查询退款 | 49 | https://doc.jeequan.com/#/integrate/jqf/api/49 |
| 退款结果通知 | 50 | https://doc.jeequan.com/#/integrate/jqf/api/50 |

### 转账接口

| 接口名称 | pageId | 在线文档 |
|----------|--------|----------|
| 发起转账 | 45 | https://doc.jeequan.com/#/integrate/jqf/api/45 |
| 查询转账 | 46 | https://doc.jeequan.com/#/integrate/jqf/api/46 |
| 转账结果通知 | 47 | https://doc.jeequan.com/#/integrate/jqf/api/47 |
| 转账余额查询 | 51 | https://doc.jeequan.com/#/integrate/jqf/api/51 |
| 转账凭证申请 | 52 | https://doc.jeequan.com/#/integrate/jqf/api/52 |
| 转账凭证查询 | 53 | https://doc.jeequan.com/#/integrate/jqf/api/53 |
| 资金转账支付 | 54 | https://doc.jeequan.com/#/integrate/jqf/api/54 |

### 分账接口

| 接口名称 | pageId | 在线文档 |
|----------|--------|----------|
| 绑定分账用户 | 55 | https://doc.jeequan.com/#/integrate/jqf/api/55 |
| 查询分账绑定 | 56 | https://doc.jeequan.com/#/integrate/jqf/api/56 |
| 发起分账 | 57 | https://doc.jeequan.com/#/integrate/jqf/api/57 |
| 查询分账 | 58 | https://doc.jeequan.com/#/integrate/jqf/api/58 |
| 完成分账 | 59 | https://doc.jeequan.com/#/integrate/jqf/api/59 |
| 余额分账执行 | 62 | https://doc.jeequan.com/#/integrate/jqf/api/62 |
| 余额分账查询 | 63 | https://doc.jeequan.com/#/integrate/jqf/api/63 |
| 渠道余额查询 | 64 | https://doc.jeequan.com/#/integrate/jqf/api/64 |
| 渠道余额提现 | 65 | https://doc.jeequan.com/#/integrate/jqf/api/65 |
| 提现记录查询 | 66 | https://doc.jeequan.com/#/integrate/jqf/api/66 |
| 结算更新 | 214 | https://doc.jeequan.com/#/integrate/jqf/api/214 |

### 钱包接口

| 接口名称 | pageId | 在线文档 |
|----------|--------|----------|
| 创建钱包 | 67 | https://doc.jeequan.com/#/integrate/jqf/api/67 |
| 绑定银行卡 | 68 | https://doc.jeequan.com/#/integrate/jqf/api/68 |
| 查询钱包用户 | 69 | https://doc.jeequan.com/#/integrate/jqf/api/69 |
| 钱包变动明细 | 70 | https://doc.jeequan.com/#/integrate/jqf/api/70 |
| 钱包提现 | 71 | https://doc.jeequan.com/#/integrate/jqf/api/71 |
| 查询钱包提现 | 72 | https://doc.jeequan.com/#/integrate/jqf/api/72 |
| 钱包转账 | 73 | https://doc.jeequan.com/#/integrate/jqf/api/73 |
| 查询钱包转账 | 129 | https://doc.jeequan.com/#/integrate/jqf/api/129 |

### 发票接口

| 接口名称 | pageId | 在线文档 |
|----------|--------|----------|
| 开票 | 74 | https://doc.jeequan.com/#/integrate/jqf/api/74 |
| 查询发票 | 75 | https://doc.jeequan.com/#/integrate/jqf/api/75 |
| 电子发票URL | 76 | https://doc.jeequan.com/#/integrate/jqf/api/76 |

### 提现接口

| 接口名称 | pageId | 在线文档 |
|----------|--------|----------|
| 提现余额查询 | 77 | https://doc.jeequan.com/#/integrate/jqf/api/77 |
| 创建提现订单 | 78 | https://doc.jeequan.com/#/integrate/jqf/api/78 |
| 查询提现订单 | 79 | https://doc.jeequan.com/#/integrate/jqf/api/79 |

### 协议支付接口

| 接口名称 | pageId | 在线文档 |
|----------|--------|----------|
| 协议预绑定 | 131 | https://doc.jeequan.com/#/integrate/jqf/api/131 |
| 协议确认绑定 | 132 | https://doc.jeequan.com/#/integrate/jqf/api/132 |
| 协议支付确认 | 133 | https://doc.jeequan.com/#/integrate/jqf/api/133 |
| 重发支付短信 | 134 | https://doc.jeequan.com/#/integrate/jqf/api/134 |
| 解绑协议 | 135 | https://doc.jeequan.com/#/integrate/jqf/api/135 |
| 银行列表查询 | 136 | https://doc.jeequan.com/#/integrate/jqf/api/136 |

### 进件接口

| 接口名称 | pageId | 在线文档 | 说明 |
|----------|--------|----------|------|
| 商户进件 | 343 | https://doc.jeequan.com/#/integrate/jqf/api/343 | 提交进件申请 |
| 上传文件 | 344 | https://doc.jeequan.com/#/integrate/jqf/api/344 | 上传证件图片 |
| 盛付通渠道参数 | 346 | https://doc.jeequan.com/#/integrate/jqf/api/346 | 盛付通 applymentInfo + 异步通知 |
| 查询进件 | 347 | https://doc.jeequan.com/#/integrate/jqf/api/347 | 进件状态查询 |
| 代理商协议规则 | 348 | https://doc.jeequan.com/#/integrate/jqf/api/348 | 签名规则 + 渠道基础参数附录 |
| 申请单状态通知 | 351 | https://doc.jeequan.com/#/integrate/jqf/api/351 | ST_APPLYMENT 异步通知 |
| 签约信息 | 353 | https://doc.jeequan.com/#/integrate/jqf/api/353 | 获取签约URL |
| 签约状态查询 | 354 | https://doc.jeequan.com/#/integrate/jqf/api/354 | 查询签约结果 |
| 微信配置 | 355 | https://doc.jeequan.com/#/integrate/jqf/api/355 | 配置微信参数 |
| 实名查询 | 358 | https://doc.jeequan.com/#/integrate/jqf/api/358 | 获取实名认证URL |
| 费率参数示例 | 361 | https://doc.jeequan.com/#/integrate/jqf/api/361 | SINGLE 类型费率 |
| 代理商调用说明 | 362 | https://doc.jeequan.com/#/integrate/jqf/api/362 | 代理商调用方式 |
| 银联阶梯费率说明 | 364 | https://doc.jeequan.com/#/integrate/jqf/api/364 | LEVEL 类型费率 |
| 易宝渠道参数 | 366 | https://doc.jeequan.com/#/integrate/jqf/api/366 | 易宝 applymentInfo |
| 嘉联渠道参数 | 369 | https://doc.jeequan.com/#/integrate/jqf/api/369 | 嘉联 applymentInfo |
| 进件测试环境 | 370 | https://doc.jeequan.com/#/integrate/jqf/api/370 | 测试环境信息 |
| 证件到期通知 | 372 | https://doc.jeequan.com/#/integrate/jqf/api/372 | ST_LICENSE_EXT 异步通知 |
| 微信配置查询 | 410 | https://doc.jeequan.com/#/integrate/jqf/api/410 | 查询微信配置 |
| 活动费率配置 | 413 | https://doc.jeequan.com/#/integrate/jqf/api/413 | 渠道活动费率配置 |
| 活动费率查询 | 414 | https://doc.jeequan.com/#/integrate/jqf/api/414 | 渠道活动费率查询 |
| 关闭活动费率 | 415 | https://doc.jeequan.com/#/integrate/jqf/api/415 | 关闭渠道活动费率 |
| 活动费率订单查询 | 416 | https://doc.jeequan.com/#/integrate/jqf/api/416 | 活动费率订单查询 |
| 证件临期查询 | 574 | https://doc.jeequan.com/#/integrate/jqf/api/574 | 证件到期提醒（仅盛付通） |
| 受益人补充查询 | 589 | https://doc.jeequan.com/#/integrate/jqf/api/589 | 受益人信息补充（仅盛付通） |

### 其他接口

| 接口名称 | pageId | 在线文档 |
|----------|--------|----------|
| 商户信息配置 | 401 | https://doc.jeequan.com/#/integrate/jqf/api/401 |
| 异步通知(其他) | 202 | https://doc.jeequan.com/#/integrate/jqf/api/202 |

### 指引文档（space: jqf-guide）

| 文档名称 | pageId | 在线文档 |
|----------|--------|----------|
| 付款码支付 | 263 | https://doc.jeequan.com/#/integrate/jqf/guide/263 |
| 动态码支付 | 264 | https://doc.jeequan.com/#/integrate/jqf/guide/264 |
| WEB收银台 | 267 | https://doc.jeequan.com/#/integrate/jqf/guide/267 |
| 智能POS | 269 | https://doc.jeequan.com/#/integrate/jqf/guide/269 |
| 快捷支付 | 395 | https://doc.jeequan.com/#/integrate/jqf/guide/395 |
| 网银B2B | 396 | https://doc.jeequan.com/#/integrate/jqf/guide/396 |
| 银行卡转账 | 397 | https://doc.jeequan.com/#/integrate/jqf/guide/397 |
| 托管支付 | 402 | https://doc.jeequan.com/#/integrate/jqf/guide/402 |
| 支付方式与适用场景 | 407 | https://doc.jeequan.com/#/integrate/jqf/guide/407 |
| 协议支付接入 | 387 | https://doc.jeequan.com/#/integrate/jqf/api/387 |

### 常见问题（space: jqf-issue）

| 文档名称 | pageId | 在线文档 |
|----------|--------|----------|
| 常见问题 | 592 | https://doc.jeequan.com/#/integrate/jqf/issue/592 |

---

> 文档整理时间：2026-05-21
