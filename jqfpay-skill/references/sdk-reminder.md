# SDK 使用指南

计全付 (JQF) 支付平台 SDK 使用要点与签名机制速查。

---

## 1. Java SDK

### Maven 依赖

```xml
<dependency>
    <groupId>com.jeequan</groupId>
    <artifactId>jeepay-sdk-java</artifactId>
    <version>jqf-3.8.21</version>
</dependency>
```

版本号以 `jqf-` 为前缀，区别于开源版的 `1.x.x`。最新版本：`jqf-3.8.21`。

### 初始化与调用

```java
import com.jeequan.jeepay.Jeepay;
import com.jeequan.jeepay.JeepayClient;
import com.jeequan.jeepay.model.PayOrderCreateReqModel;
import com.jeequan.jeepay.request.PayOrderCreateRequest;
import com.jeequan.jeepay.response.PayOrderCreateResponse;

// 1. 静态配置（全局一次）
Jeepay.apiKey = "yourApiKey";           // 商户API密钥
Jeepay.mchNo = "M1234567890";           // 商户号
Jeepay.appId = "60cc09bce4b0f1c0b";     // 应用ID
Jeepay.apiBase = "https://pay.jeequan.com";  // API基础地址
// Jeepay.agentNo = "A10001";           // 代理商编号（代理商调用时必填）

// 2. 获取客户端（单例，按appId）
JeepayClient client = JeepayClient.getInstance(Jeepay.appId);

// 3. 构建请求模型
PayOrderCreateReqModel model = new PayOrderCreateReqModel();
model.setMchNo(Jeepay.mchNo);
model.setAppId(Jeepay.appId);
model.setMchOrderNo("ORDER_001");
model.setWayCode("WX_JSAPI");
model.setAmount(100);                    // 单位：分
model.setCurrency("CNY");
model.setClientIp("127.0.0.1");
model.setSubject("商品标题");
model.setBody("商品描述");
model.setNotifyUrl("https://your.server/notify");
model.setChannelExtra("{\"openid\":\"o6BcIw...\"}");

// 4. 执行请求
PayOrderCreateRequest request = new PayOrderCreateRequest();
request.setBizModel(model);

// MD5 签名方式
PayOrderCreateResponse response = client.execute(request);

// 或 RSA2 签名方式
// PayOrderCreateResponse response = client.executeByRSA2(request);

// 5. 验证响应
if (response.isSuccess(Jeepay.apiKey)) {
    // code == 0 且签名验证通过
    String payOrderId = response.get().getPayOrderId();
    // ...
}
```

### 架构模式

```
ReqModel（用 @ApiField 标注字段）
   |
   v
Request（设置 apiUri，持有 ReqModel）
   |
   v
JeepayClient.execute(request)        -- MD5 签名
JeepayClient.executeByRSA2(request)  -- RSA2 签名
   |
   v
Response（解析 JSON，持有 ResModel）
   |
   v
response.isSuccess(apiKey)   -- 验证 code + 签名
response.get()               -- 获取 ResModel
```

### 核心类说明

| 类 | 职责 |
|----|------|
| `Jeepay` | 静态配置：apiKey, mchNo, appId, apiBase, agentNo |
| `JeepayClient` | 单例客户端，execute() 和 executeByRSA2() |
| `JeepayKit` | MD5 签名工具：getSign() |
| `JeepayRSA2Kit` | RSA2 签名工具 |
| `@ApiField` | 标注参与签名/序列化的字段 |

---

## 2. Python SDK

### 安装

非 pip 包，需从 Gitee 下载本地模块。

```
仓库地址：https://gitee.com/jeequan/jeepay-sdk-python
```

将下载的模块放入项目目录，直接 import 引用。

### 初始化与调用

```python
from jeepay import AppConfig, Pay

# 1. 配置
AppConfig.set_mch_no("M1234567890")
AppConfig.set_app_id("60cc09bce4b0f1c0b")
AppConfig.set_api_key("yourApiKey")
# AppConfig.set_private("MIIEvQ...")   # RSA2 私钥（可选）

# 2. 调用接口（均为静态方法）
result = Pay.uni_order(
    mchOrderNo="ORDER_001",
    wayCode="WX_JSAPI",
    amount=100,
    currency="CNY",
    subject="商品标题",
    body="商品描述",
    clientIp="127.0.0.1",
    notifyUrl="https://your.server/notify",
    channelExtra='{"openid":"o6BcIw..."}',
)
```

### 模块清单

| 模块类 | 功能 |
|--------|------|
| `Pay` | 支付下单、查询、关闭 |
| `Transfer` | 转账 |
| `Division` | 分账 |
| `Wallet` | 钱包 |
| `Cashout` | 提现 |
| `Invoice` | 发票 |
| `Income` | 进件 |
| `AgreePay` | 协议支付 |
| `MchConfig` | 商户配置 |
| `MarketingConfigs` | 营销配置 |

所有模块使用 `**params` 关键字参数，签名由内部 `Utils` 类自动处理。

---

## 3. PHP 方式

PHP 没有正式 SDK，仅提供 Demo 代码。

```
下载地址：http://jeequan.oss-cn-beijing.aliyuncs.com/jeepay/doc/php.zip
```

PHP 项目需自行实现 HTTP 调用和签名逻辑：

```php
// 1. 组装请求参数
$params = [
    'mchNo'      => 'M1234567890',
    'appId'      => '60cc09bce4b0f1c0b',
    'mchOrderNo' => 'ORDER_001',
    'wayCode'    => 'WX_JSAPI',
    'amount'     => 100,
    'currency'   => 'CNY',
    'subject'    => '商品标题',
    'body'       => '商品描述',
    'clientIp'   => '127.0.0.1',
    'notifyUrl'  => 'https://your.server/notify',
    // ...
];

// 2. 签名（参考下方签名算法章节）
$params['sign'] = calculate_sign($params, $apiKey);

// 3. HTTP POST JSON
$response = http_post_json($apiBase . '/api/pay/unifiedOrder', json_encode($params));

// 4. 验证响应签名
$data = json_decode($response, true);
verify_sign($data, $apiKey);
```

> C# SDK 暂未实现。

---

## 4. 核心 API 路径参考

| 分类 | API 路径 | 说明 |
|------|----------|------|
| **支付** | `api/pay/unifiedOrder` | 统一下单 |
| | `api/pay/query` | 查询订单 |
| | `api/pay/close` | 关闭订单 |
| | `api/pay/queryOpenIdByBarcode` | 条码查OpenID |
| | `api/channelUserId/jump` | 获取渠道用户ID |
| **退款** | `api/refund/refundOrder` | 发起退款 |
| | `api/refund/query` | 查询退款 |
| **转账** | `api/transferOrder` | 发起转账 |
| | `api/transfer/query` | 查询转账 |
| | `api/transfer/balance/query` | 转账余额查询 |
| **分账** | `api/division/receiver/bind` | 绑定分账用户 |
| | `api/division/exec` | 发起分账 |
| | `api/division/query` | 查询分账 |
| | `api/division/finish` | 完成分账 |
| **钱包** | `api/wallet/user` | 创建钱包 |
| | `api/wallet/cashout` | 钱包提现 |
| | `api/wallet/transfer` | 钱包转账 |
| **提现** | `api/cashout/balance/query` | 提现余额查询 |
| | `api/cashout/order/create` | 创建提现订单 |
| **发票** | `api/invoice/open` | 开票 |
| **协议支付** | `api/pay/bankAgreePreBind` | 协议预绑定 |
| | `api/pay/bankAgreeConfirmBind` | 协议确认绑定 |
| | `api/pay/bankAgreeProtocolpayConfirm` | 协议支付确认 |
| **进件** | `api/mchApplyment/income` | 商户进件 |
| | `api/mchApplyment/uploadFile` | 上传文件 |

完整列表参见 api-routing.md。

---

## 5. 请求/响应机制

### 请求结构

所有 API 使用 JSON 格式 POST 请求，通用参数：

```json
{
    "mchNo": "M1234567890",
    "appId": "60cc09bce4b0f1c0b",
    "sign": "a3f2b8c...",
    "signType": "MD5",
    "timestamp": 1684652800000,
    "reqData": { ... }
}
```

- 外层参数参与签名
- `reqData` 内的业务参数也参与签名
- `sign` 字段本身不参与签名计算

### 响应结构

```json
{
    "code": 0,
    "msg": "SUCCESS",
    "sign": "e7d4f1a...",
    "signType": "MD5",
    "data": { ... }
}
```

- `code == 0` 表示请求成功
- `sign` 用于验证响应未被篡改
- 业务数据在 `data` 字段内

### Java SDK 的 Response 类

```java
PayOrderCreateResponse response = client.execute(request);

// isSuccess() 同时检查 code 和签名
response.isSuccess(apiKey);           // MD5 验签
response.isSuccessByRsa2(apiRsa2Key); // RSA2 验签

// 仅检查 code
response.getCode() == 0;

// 获取数据
response.get();                       // 返回 ResModel
```

---

## 6. isSuccess() 安全行为

**重要**：`response.isSuccess(apiKey)` 不仅检查 `code == 0`，还会验证响应签名。

```java
// isSuccess 内部逻辑（伪代码）
public boolean isSuccess(String apiKey) {
    if (getCode() != 0) return false;           // 1. 检查业务码
    if (!checkSign(apiKey)) return false;        // 2. 验证签名
    return true;
}

public boolean isSuccessByRsa2(String apiRsa2Key) {
    if (getCode() != 0) return false;
    if (!checkSignByRsa2(apiRsa2Key)) return false;
    return true;
}
```

### 常见错误

```java
// 错误：只检查 code，不验签（存在伪造响应风险）
if (response.getCode() == 0) {
    // 危险：响应可能被篡改
}

// 正确：使用 isSuccess 验签
if (response.isSuccess(Jeepay.apiKey)) {
    // 安全：code 和签名都通过
}
```

### isSuccess 返回 false 的排查链

```
isSuccess 返回 false
├── getCode() != 0
│   ├── code=1001 → 参数格式错误（检查必填字段）
│   ├── code=1002 → 签名错误（检查签名算法和密钥）
│   ├── code=1003 → 商户不存在（检查 mchNo）
│   ├── code=1004 → 应用不存在（检查 appId）
│   ├── code=2001 → 订单不存在
│   ├── code=2002 → 订单已关闭/已支付
│   └── 其他 → 查看 msg 字段
│
└── getCode() == 0 但 checkSign 失败
    ├── API 密钥不匹配（测试环境与生产环境密钥不同）
    ├── 响应被中间代理篡改
    ├── SDK 版本过低，签名算法与平台不一致
    └── 网络中间件修改了响应内容
```

---

## 7. MD5 签名算法

### 算法步骤

```
1. 提取所有非空参数（排除 sign 和 signType）
2. 按 key 的 ASCII 码升序排序（区分大小写）
3. 拼接为 key1=value1&key2=value2 格式
4. 末尾追加 &key=API密钥
5. 对整个字符串做 MD5(32位小写)
```

### 示例

```
参数：
  appId = "60cc09bce4b0f1c0b"
  mchNo = "M1234567890"
  amount = 100
  wayCode = "WX_JSAPI"

Step 1 - 按 ASCII 排序：
  amount, appId, mchNo, wayCode

Step 2 - 拼接：
  amount=100&appId=60cc09bce4b0f1c0b&mchNo=M1234567890&wayCode=WX_JSAPI

Step 3 - 追加密钥：
  amount=100&appId=60cc09bce4b0f1c0b&mchNo=M1234567890&wayCode=WX_JSAPI&key=yourApiKey

Step 4 - MD5：
  sign = md5(上述字符串) → "a3f2b8c..."
```

### Java 实现

```java
import com.jeequan.jeepay.kit.JeepayKit;

// SDK 内部方法
String sign = JeepayKit.getSign(paramsMap, apiKey);
```

### 注意事项

- **空值参数不参与签名**：value 为 null 或空字符串时跳过
- **sign 和 signType 不参与签名**：这两个字段在计算时排除
- **嵌套 JSON 参数**：reqData/channelExtra 等 JSON 字符串作为整体值参与签名
- **大小写敏感排序**：与开源版不同，JQF 使用区分大小写的 ASCII 排序

---

## 8. RSA2 签名算法

### 算法步骤

```
1. 提取所有非空参数（排除 sign 和 signType）
2. 按 key 的 ASCII 码升序排序（区分大小写）
3. 拼接为 key1=value1&key2=value2 格式
4. 使用 RSA2 私钥（SHA256WithRSA）对字符串签名
5. 签名结果 Base64 编码
```

### Java 实现

```java
import com.jeequan.jeepay.kit.JeepayRSA2Kit;

// 签名
String sign = JeepayRSA2Kit.getSign(paramsMap, privateKey);

// 验签
boolean valid = JeepayRSA2Kit.verifySign(paramsMap, publicKey, sign);
```

### 密钥要求

- 签名使用 **商户私钥**
- 验签使用 **平台公钥**（apiRsa2Key）
- 密钥格式：PKCS#8（无头尾标记的 Base64 字符串）

### 调用方式

```java
// 初始化时不需要额外设置，直接使用 executeByRSA2
JeepayClient client = JeepayClient.getInstance(Jeepay.appId);
PayOrderCreateResponse response = client.executeByRSA2(request);

// 验证响应
response.isSuccessByRsa2(apiRsa2Key);  // 使用平台公钥验签
```

### Python RSA2 配置

```python
from jeepay import AppConfig

AppConfig.set_private("MIIEvQ...")  # 设置商户 RSA2 私钥
```

---

## 9. 与开源版的差异

计全付 (JQF) 基于 Jeepay 开源版二次开发，SDK 和签名机制存在以下关键差异：

### 签名差异

| 项目 | 开源版 Jeepay | 计全付 JQF |
|------|--------------|------------|
| 签名方式 | 仅 MD5 | MD5 + RSA2 |
| 排序方式 | 不区分大小写 | 区分大小写（ASCII） |
| agentNo | 不支持 | 支持（代理商调用时必填） |
| SDK 版本号 | `1.x.x` | `jqf-x.x.xx` |
| 请求方法 | `execute()` | `execute()` + `executeByRSA2()` |
| 验签方法 | `checkSign(apiKey)` | `checkSign(apiKey)` + `checkSignByRsa2(apiRsa2Key)` |

### API 差异

| 项目 | 开源版 | JQF |
|------|--------|-----|
| API 路径 | 基本相同 | 新增：提现、发票、钱包、协议支付、进件等 |
| wayCode | 约 10 种 | 30+ 种，新增 TG_PAY、BANK_*、DCEP_* 等 |
| channelExtra | 基本相同 | 扩展了更多参数 |

### SDK 差异

| 项目 | 开源版 | JQF |
|------|--------|-----|
| Java groupId | com.jeequan | com.jeequan（相同） |
| Java artifactId | jeepay-sdk-java | jeepay-sdk-java（相同） |
| Java version | `1.x.x` | `jqf-3.8.21` |
| Python | 不提供 | 提供本地模块 |
| PHP | Demo | Demo |

### 不可混用的项目清单

- 开源版 SDK 无法调用 JQF 平台接口（签名排序不同）
- JQF SDK 无法调用开源版平台接口（签名方式不兼容）
- 两个版本的文档不可互换
- API 密钥和证书不互通

---

## 10. 签名失败连锁误诊链

签名问题是最常见的对接问题，以下列出典型误诊路径，帮助快速定位根因。

### 链 1："签名错误" 反复调整签名算法

```
现象：接口返回 code=1002 "签名错误"
开发者开始调整签名算法
├── 怀疑排序方式 → 改排序逻辑 → 仍然失败
│   ├── 实际原因：使用了开源版的 SDK（不区分大小写排序）
│   │   解决：切换到 jqf-3.8.21 版本 SDK
│   │
│   └── 实际原因：嵌套 JSON 参数内部顺序不一致
│       解决：JSON 字符串作为整体参与签名，不需要对内部排序
│
├── 怀疑密钥错误 → 重新生成密钥 → 仍然失败
│   ├── 实际原因：测试环境和生产环境使用不同密钥
│   │   解决：确认当前对接环境，使用对应密钥
│   │
│   └── 实际原因：密钥前后有空格或换行符
│       解决：trim() 密钥字符串
│
├── 怀疑编码问题 → 改为 UTF-8 → 仍然失败
│   ├── 实际原因：amount 传了字符串 "100" 而非整数 100
│   │   解决：数值类型不要加引号
│   │
│   └── 实际原因：channelExtra 中 JSON 转义后与平台解析不一致
│       解决：确保 JSON 序列化方式与平台一致
│
└── 怀疑时间戳 → 调整 timestamp → 仍然失败
    ├── 实际原因：timestamp 使用了秒而非毫秒
    │   解决：使用 13 位毫秒时间戳
    │
    └── 实际原因：空字符串参数被包含在签名中
        解决：值为空或 null 的参数不参与签名
```

### 链 2：isSuccess() 返回 false 但 code=0

```
现象：response.isSuccess(apiKey) 返回 false，但 response.getCode() == 0
开发者误以为业务逻辑出错
├── 实际原因1：传入的 apiKey 与平台不一致
│   排查：用 response.checkSign(apiKey) 单独验证
│   解决：确认 apiKey 配置正确
│
├── 实际原因2：使用 MD5 密钥验证 RSA2 响应（或反之）
│   排查：检查 signType 字段，确认响应使用的签名方式
│   解决：MD5 响应用 isSuccess(apiKey)，RSA2 响应用 isSuccessByRsa2(apiRsa2Key)
│
├── 实际原因3：网络代理或中间件修改了响应内容
│   排查：打印原始响应 JSON，与 SDK 解析后的 response 对比
│   解决：检查代理/网关配置，确保不修改响应体
│
└── 实际原因4：SDK 版本与平台签名算法不匹配
    排查：确认 SDK 版本号为 jqf-3.8.21
    解决：更新到最新 JQF SDK 版本
```

### 链 3：异步通知验签失败

```
现象：收到支付结果通知，但验签不通过
开发者怀疑通知格式错误
├── 实际原因1：通知参数被 URL 解码后验签
│   排查：确认是直接对原始 JSON body 验签，而非 form 参数
│   解决：异步通知为 JSON 格式，直接解析验签
│
├── 实际原因2：使用了开源版的验签逻辑
│   排查：检查验签排序是否区分大小写
│   解决：使用 JQF SDK 的验签方法
│
├── 实际原因3：通知中 signType 与商户配置不一致
│   排查：检查通知 JSON 中的 signType 字段
│   解决：根据通知的 signType 选择对应验签方式
│
└── 实际原因4：对通知 JSON 做了二次序列化
    排查：比较原始 body 和解析后的 JSON 字符串
    解决：从原始 body 解析参数后验签，不要重新序列化
```

### 链 4：RSA2 签名报错

```
现象：使用 executeByRSA2() 时抛出异常
开发者怀疑 RSA2 不支持
├── 实际原因1：未配置 RSA2 私钥
│   排查：检查 Jeepay.privateKey 是否已设置
│   解决：在 Jeepay 静态配置中设置商户 RSA2 私钥
│
├── 实际原因2：私钥格式错误
│   排查：确认私钥为 PKCS#8 格式，无头尾标记
│   解决：去除 "-----BEGIN PRIVATE KEY-----" 等头尾，只保留 Base64 内容
│
├── 实际原因3：密钥对与平台配置不匹配
│   排查：在计全付管理后台确认已上传对应的公钥
│   解决：重新生成密钥对，上传公钥到平台，使用私钥签名
│
└── 实际原因4：使用了平台公钥签名（应用了私钥验签）
    排查：确认签名用的是商户私钥，验签用的是平台公钥
    解决：
      - 签名：商户私钥
      - 验签（验证响应）：平台公钥 (apiRsa2Key)
```

### 链 5：代理商调用签名失败

```
现象：代理商模式调用接口返回签名错误
开发者以为是普通签名问题
├── 实际原因：未传递 agentNo 参数
│   排查：检查请求参数中是否包含 agentNo
│   解决：代理商调用时 agentNo 参与签名
│
├── 实际原因：agentNo 值错误
│   排查：确认代理商编号是否正确
│   解决：从管理后台获取正确的代理商编号
│
└── 实际原因：签名中包含了 agentNo 但排序位置不对
    排查：agentNo 按 ASCII 排序应在 appId 之后
    解决：使用 SDK 自动处理排序，不要手动排序
```

### 快速排查清单

遇到签名问题时，按以下顺序逐项检查：

```
[ ] 1. SDK 版本是否为 jqf-3.8.21（非开源版）
[ ] 2. apiKey / 私钥是否与对接环境匹配
[ ] 3. 密钥字符串是否有多余空格或换行
[ ] 4. 数值参数是否为数字类型（非字符串）
[ ] 5. 空值参数是否已排除在签名之外
[ ] 6. timestamp 是否为 13 位毫秒
[ ] 7. signType 是否与签名方法一致（MD5/RSA2）
[ ] 8. 代理商调用是否包含 agentNo
[ ] 9. channelExtra 是否为合法 JSON 字符串
[ ] 10. 响应验签使用的密钥/公钥是否正确
```

---

> 整理时间：2026-05-21
> SDK 源码位置：E:\project\jeepay-pay-sdk
> 适用版本：jqf-3.8.21
