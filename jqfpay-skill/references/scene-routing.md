# 支付方式路由表

计全付支持的支付方式决策树和参数路由。

---

## 支付方式总览

| wayCode | 支付方式 | 分类 | channelExtra | 指引文档 |
|---------|----------|------|-------------|----------|
| AUTO_BAR | 聚合条码(商家扫用户) | 聚合支付 | authCode | guide/263 |
| QR_CASHIER | 聚合扫码(用户扫商家) | 聚合支付 | payDataType, entryPageType | guide/264 |
| WEB_CASHIER | WEB收银台 | 聚合支付 | - | guide/267 |
| TG_PAY | 托管支付 | 聚合支付 | userPayType, invokeType | guide/402 |
| WX_BAR | 微信条码 | 微信 | authCode | - |
| WX_JSAPI | 微信公众号 | 微信 | openid | - |
| WX_LITE | 微信小程序 | 微信 | openid | - |
| WX_APP | 微信APP | 微信 | - | - |
| WX_H5 | 微信H5 | 微信 | - | - |
| WX_NATIVE | 微信扫码 | 微信 | payDataType(可选) | - |
| ALI_BAR | 支付宝条码 | 支付宝 | authCode | - |
| ALI_JSAPI | 支付宝生活号 | 支付宝 | buyerUserId | - |
| ALI_LITE | 支付宝小程序 | 支付宝 | buyerUserId | - |
| ALI_APP | 支付宝APP | 支付宝 | - | - |
| ALI_WAP | 支付宝WAP | 支付宝 | payDataType(可选) | - |
| ALI_PC | 支付宝PC网站 | 支付宝 | payDataType(可选) | - |
| ALI_QR | 支付宝二维码 | 支付宝 | payDataType(可选) | - |
| ALI_OC | 支付宝订单码 | 支付宝 | - | - |
| ALI_PREJSAPI | 支付宝预授权生活号 | 支付宝 | - | - |
| ALI_PREBAR | 支付宝预授权条码 | 支付宝 | - | - |
| ALI_PREQR | 支付宝预授权二维码 | 支付宝 | - | - |
| YSF_BAR | 云闪付条码 | 云闪付 | authCode | - |
| YSF_JSAPI | 云闪付JSAPI | 云闪付 | - | - |
| AUTO_POS | 智能POS | 其他 | - | guide/269 |
| DCEP_BAR | 数字人民币条码 | 其他 | - | - |
| DCEP_QR | 数字人民币二维码 | 其他 | - | - |
| BANK_B2C | 网银B2C | 银行 | - | - |
| BANK_B2B | 网银B2B | 银行 | - | guide/396 |
| BANK_QUICK | 快捷支付收银台 | 银行 | userType, userNo | guide/395 |
| BANK_AGREE | 快捷支付(协议) | 银行 | - | api/387 |
| BANK_TRANSFERCASHIER | 银行卡转账收银台 | 银行 | - | guide/397 |
| BANK_TRANSFER | 银行卡转账 | 银行 | - | guide/397 |

---

## 场景决策树

### 1. 线下场景（有物理设备）

```
是否有扫码设备（扫码枪/POS）？
├── 有扫码枪 → AUTO_BAR（聚合条码，商家扫用户付款码）
│   channelExtra: {"authCode": "用户付款码值"}
│   支持微信/支付宝/云闪付自动识别
│
├── 有智能POS → AUTO_POS（智能POS支付）
│
└── 无设备（只有码牌/打印二维码）
    ├── 用户扫码付款 → QR_CASHIER（聚合扫码，用户扫商家）
    │   channelExtra: {"payDataType": "codeImgUrl"}
    │   生成聚合码，支持微信/支付宝/云闪付扫码
    │
    └── 需要WEB收银台 → WEB_CASHIER（PC/H5收银台）
```

### 2. 线上场景（网站/APP/小程序）

```
用户的支付环境是什么？
├── 微信公众号内 → WX_JSAPI
│   channelExtra: {"openid": "用户openid"}
│   特约商户需额外传 subAppId
│
├── 微信小程序 → WX_LITE
│   channelExtra: {"openid": "用户openid"}
│   特约商户需额外传 subAppId
│
├── 微信外的APP → WX_APP（微信支付）
│
├── 微信外的H5 → WX_H5（微信H5支付）
│
├── 支付宝生活号 → ALI_JSAPI
│   channelExtra: {"buyerUserId": "支付宝用户ID"}
│
├── 支付宝小程序 → ALI_LITE
│   channelExtra: {"buyerUserId": "支付宝用户ID"}
│
├── 支付宝APP → ALI_APP
│
├── PC网站（支付宝）→ ALI_PC
│   channelExtra: {"payDataType": "form"} 或 {"payDataType": "payUrl"}
│
├── H5页面（支付宝）→ ALI_WAP
│   channelExtra: {"payDataType": "form"} 或 {"payDataType": "payUrl"}
│
├── 需要生成二维码 → WX_NATIVE（微信）/ ALI_QR（支付宝）
│   channelExtra: {"payDataType": "codeUrl"} 或 {"payDataType": "codeImgUrl"}
│
├── 托管支付（APP/H5跳小程序）→ TG_PAY
│   channelExtra: {"userPayType": "wx/zfb", "invokeType": "app2lite/h52lite/..."}
│
└── 银行相关
    ├── 网银支付 → BANK_B2C（个人）/ BANK_B2B（企业）
    ├── 快捷支付 → BANK_QUICK（收银台）/ BANK_AGREE（协议）
    └── 银行卡转账 → BANK_TRANSFER / BANK_TRANSFERCASHIER
```

### 3. 预授权场景

```
需要预授权（押金/冻结金额）？
├── 支付宝 → ALI_PREBAR（条码）/ ALI_PREQR（二维码）/ ALI_PREJSAPI（生活号）
└── 暂不支持微信预授权
```

---

## channelExtra 参数详细说明

### AUTO_BAR / ALI_BAR / WX_BAR / YSF_BAR（条码支付）

```json
{"authCode": "13920933111042"}
```
- authCode：用户的付款码值（微信/支付宝/云闪付）
- 可选 subAppId：特约商户的公众号/小程序 AppId

### WX_JSAPI / WX_LITE（微信公众号/小程序）

```json
{"openid": "o6BcIwvSiRpfS8e_UyfQNrYuk2LI"}
```
- openid：微信用户的 OpenID
- 特约商户额外传 subAppId

### ALI_JSAPI / ALI_LITE（支付宝生活号/小程序）

```json
{"buyerUserId": "2088702585070844"}
```
- buyerUserId：支付宝用户 ID（不支持 openid 方式）

### QR_CASHIER（聚合扫码）

```json
{"entryPageType": "lite", "payDataType": "codeImgUrl"}
```
- entryPageType：扫码进入页面类型，h5（默认）或 lite（小程序）
- payDataType：返回数据类型，codeUrl（默认）或 codeImgUrl

### WX_NATIVE / ALI_QR（二维码）

```json
{"payDataType": "codeImgUrl"}
```
- payDataType：codeUrl（二维码地址，默认）或 codeImgUrl（二维码图片地址）

### ALI_WAP（支付宝WAP）

```json
{"payDataType": "form"}
```
- payDataType：payUrl（默认，支付链接）、form（跳转表单）或 codeImgUrl（二维码图片）

### ALI_PC（支付宝PC）

```json
{"payDataType": "form"}
```
- payDataType：payUrl（默认）或 form（跳转表单）

### BANK_QUICK（快捷支付）

```json
{
  "userType": "PHONE",
  "userNo": "18611727422"
}
```
- userType：IMEI/MAC/USER_ID/EMAIL/PHONE/ID_CARD
- userNo：用户标识（首次支付后再次传相同值可快捷绑卡）

### TG_PAY（托管支付）

```json
{"userPayType": "wx", "invokeType": "app2lite"}
```
- userPayType：wx（微信）/ zfb（支付宝）
- invokeType：
  - app2lite：SDK调起小程序（wx/zfb）
  - h52lite：H5跳小程序（wx/zfb）
  - h52jsapi：H5跳支付宝内浏览器支付（zfb）
  - h52qr：H5跳支付宝当面付（zfb）
  - lite2lite：小程序跳小程序（wx/zfb）

---

## 澄清对话模板

当用户描述模糊时，按以下方式引导：

| 用户描述 | 推荐wayCode | 确认问题 |
|----------|-------------|----------|
| "我要扫码支付" | 需确认方向 | "是商家扫用户的付款码(AUTO_BAR)，还是用户扫商家的二维码(QR_CASHIER)？" |
| "微信支付" | 需确认场景 | "用户在什么环境？公众号(WX_JSAPI)、小程序(WX_LITE)、APP(WX_APP)、H5(WX_H5)？" |
| "支付宝支付" | 需确认场景 | "用户在什么环境？生活号(ALI_JSAPI)、小程序(ALI_LITE)、APP(ALI_APP)、PC(ALI_PC)、H5(ALI_WAP)？" |
| "APP支付" | 需确认通道 | "使用微信支付(WX_APP)还是支付宝(ALI_APP)？或者需要托管支付(TG_PAY)？" |
| "我要收款" | 需确认场景 | "在线下门店(AUTO_BAR/QR_CASHIER)还是线上(WX_JSAPI/ALI_APP等)？" |
| "预授权/押金" | ALI_PRE* | "预授权目前支持支付宝，需要条码(ALI_PREBAR)、二维码(ALI_PREQR)还是生活号(ALI_PREJSAPI)？" |
| "银行卡支付" | 需确认类型 | "网银(BANK_B2C/B2B)、快捷支付(BANK_QUICK)、协议支付(BANK_AGREE)还是银行卡转账(BANK_TRANSFER)？" |

---

## payDataType 返回值说明

| payDataType | 含义 | 适用wayCode |
|-------------|------|-------------|
| payurl | 跳转链接 | QR_CASHIER, ALI_WAP, ALI_PC, TG_PAY |
| form | 自动跳转表单 | ALI_WAP, ALI_PC |
| wxapp | 微信支付参数 | WX_JSAPI, WX_LITE, WX_APP |
| aliapp | 支付宝APP参数 | ALI_APP |
| ysfapp | 云闪付APP参数 | YSF_JSAPI |
| codeUrl | 二维码地址 | WX_NATIVE, ALI_QR, QR_CASHIER |
| codeImgUrl | 二维码图片地址 | WX_NATIVE, ALI_QR, QR_CASHIER |
| payargs | 字符串参数 | - |
| none | 空支付参数 | AUTO_BAR（条码支付直接完成） |
