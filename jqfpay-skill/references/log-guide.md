# 日志规范

对接计全付时的日志记录要求。

---

## 必须记录的内容

每次 API 调用和异步通知处理时，必须记录以下信息：

| 项目 | 说明 |
|------|------|
| 请求URL | API 接口地址 |
| 请求参数 | 完整请求参数（apiKey 必须脱敏） |
| 响应内容 | 完整响应数据 |
| 请求时间 | 接口调用时间 |
| 耗时 | 接口响应耗时 |
| 商户订单号 | mchOrderNo 或 payOrderId |

## Java SDK 日志示例

```java
// 下单请求日志
_log.info("支付下单请求: mchNo={}, mchOrderNo={}, wayCode={}, amount={}",
    Jeepay.mchNo, model.getMchOrderNo(), model.getWayCode(), model.getAmount());

// 下单响应日志
if (response.isSuccess(Jeepay.apiKey)) {
    _log.info("支付下单成功: payOrderId={}, mchOrderNo={}, orderState={}, payDataType={}",
        response.get().getPayOrderId(),
        response.get().getMchOrderNo(),
        response.get().getOrderState(),
        response.get().getPayDataType());
} else {
    _log.warn("支付下单失败: code={}, msg={}", response.getCode(), response.getMsg());
}

// 异步通知日志
_log.info("收到支付通知: payOrderId={}, mchOrderNo={}, state={}, amount={}",
    payOrderId, mchOrderNo, state, amount);
```

## Python SDK 日志示例

```python
import logging
logger = logging.getLogger(__name__)

# 下单日志
logger.info(f"支付下单请求: mchOrderNo={params['mchOrderNo']}, wayCode={params['wayCode']}")

# 响应日志
logger.info(f"支付下单响应: code={response.get('code')}, msg={response.get('msg')}")
```

## PHP HTTP 调用日志示例

```php
// 请求日志
error_log("支付下单请求: mchOrderNo=" . $params['mchOrderNo'] . ", wayCode=" . $params['wayCode']);

// 响应日志
error_log("支付下单响应: " . $response_body);
```

---

## 安全红线

> **apiKey 绝对不能出现在日志中**

以下信息禁止记录到日志：
- apiKey（商户密钥）
- RSA2 私钥
- 完整的签名值（仅可记录前4位）
- 用户敏感信息（身份证号、银行卡号等，如需记录必须脱敏）
