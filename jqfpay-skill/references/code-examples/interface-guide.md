# 接口示例索引

计全付全部接口示例文件交叉引用表。

---

## 支付接口

| 接口 | API路径 | 在线文档 | Java | Python | PHP | HTTP |
|------|---------|----------|------|--------|-----|------|
| 统一支付下单 | api/pay/unifiedOrder | [doc/39](https://doc.jeequan.com/#/integrate/jqf/api/39) | [java/1](java/1_统一支付下单.md) | [python/1](python/1_统一支付下单.md) | [php/1](php/1_统一支付下单.md) | [http/1](http/1_统一支付下单.md) |
| 查询支付订单 | api/pay/query | [doc/40](https://doc.jeequan.com/#/integrate/jqf/api/40) | [java/2](java/2_查询订单.md) | [python/2](python/2_查询订单.md) | [php/2](php/2_查询订单.md) | [http/2](http/2_查询订单.md) |
| 关闭订单 | api/pay/close | [doc/41](https://doc.jeequan.com/#/integrate/jqf/api/41) | [java/3](java/3_关闭订单.md) | [python/3](python/3_关闭订单.md) | [php/3](php/3_关闭订单.md) | [http/3](http/3_关闭订单.md) |
| 退款 | api/refund/refundOrder | [doc/48](https://doc.jeequan.com/#/integrate/jqf/api/48) | [java/4](java/4_退款.md) | [python/4](python/4_退款.md) | [php/4](php/4_退款.md) | [http/4](http/4_退款.md) |
| 查询退款 | api/refund/query | [doc/49](https://doc.jeequan.com/#/integrate/jqf/api/49) | [java/5](java/5_查询退款.md) | [python/5](python/5_查询退款.md) | [php/5](php/5_查询退款.md) | [http/5](http/5_查询退款.md) |
| 转账 | api/transferOrder | [doc/45](https://doc.jeequan.com/#/integrate/jqf/api/45) | [java/6](java/6_转账.md) | [python/6](python/6_转账.md) | [php/6](php/6_转账.md) | [http/6](http/6_转账.md) |
| 分账 | api/division/exec | [doc/57](https://doc.jeequan.com/#/integrate/jqf/api/57) | [java/7](java/7_分账.md) | [python/7](python/7_分账.md) | [php/7](php/7_分账.md) | [http/7](http/7_分账.md) |
| 协议支付 | api/pay/bankAgree* | [doc/131](https://doc.jeequan.com/#/integrate/jqf/api/131) | [java/8](java/8_协议支付.md) | [python/8](python/8_协议支付.md) | [php/8](php/8_协议支付.md) | [http/8](http/8_协议支付.md) |
| 进件 | api/mchApplyment/* | [doc/343](https://doc.jeequan.com/#/integrate/jqf/api/343) | [java/9](java/9_进件.md) | [python/9](python/9_进件.md) | [php/9](php/9_进件.md) | [http/9](http/9_进件.md) |
| 异步通知 | - | [doc/44](https://doc.jeequan.com/#/integrate/jqf/api/44) | [java/10](java/10_异步通知.md) | [python/10](python/10_异步通知.md) | [php/10](php/10_异步通知.md) | [http/10](http/10_异步通知.md) |

---

## 钱包接口（8个）

| 接口 | API路径 | 在线文档 | Java | Python | PHP | HTTP |
|------|---------|----------|------|--------|-----|------|
| 创建钱包 | api/wallet/user | [doc/67](https://doc.jeequan.com/#/integrate/jqf/api/67) | [java/11](java/11_钱包.md) | [python/11](python/11_钱包.md) | [php/11](php/11_钱包.md) | [http/11](http/11_钱包.md) |
| 绑定银行卡 | api/wallet/bankcard/bind | [doc/68](https://doc.jeequan.com/#/integrate/jqf/api/68) | 同上 | 同上 | 同上 | 同上 |
| 查询钱包用户 | api/wallet/user/query | [doc/69](https://doc.jeequan.com/#/integrate/jqf/api/69) | 同上 | 同上 | 同上 | 同上 |
| 钱包变动明细 | api/wallet/user/changeDetails | [doc/70](https://doc.jeequan.com/#/integrate/jqf/api/70) | 同上 | 同上 | 同上 | 同上 |
| 钱包提现 | api/wallet/cashout | [doc/71](https://doc.jeequan.com/#/integrate/jqf/api/71) | 同上 | 同上 | 同上 | 同上 |
| 查询钱包提现 | api/wallet/cashout/query | [doc/72](https://doc.jeequan.com/#/integrate/jqf/api/72) | 同上 | 同上 | 同上 | 同上 |
| 钱包转账 | api/wallet/transfer | [doc/73](https://doc.jeequan.com/#/integrate/jqf/api/73) | 同上 | 同上 | 同上 | 同上 |
| 查询钱包转账 | api/wallet/transfer/query | [doc/129](https://doc.jeequan.com/#/integrate/jqf/api/129) | 同上 | 同上 | 同上 | 同上 |

---

## 发票接口（3个）

| 接口 | API路径 | 在线文档 | Java | Python | PHP | HTTP |
|------|---------|----------|------|--------|-----|------|
| 开票 | api/invoice/open | [doc/74](https://doc.jeequan.com/#/integrate/jqf/api/74) | [java/12](java/12_发票.md) | [python/12](python/12_发票.md) | [php/12](php/12_发票.md) | [http/12](http/12_发票.md) |
| 查询发票 | api/invoice/query | [doc/75](https://doc.jeequan.com/#/integrate/jqf/api/75) | 同上 | 同上 | 同上 | 同上 |
| 电子发票URL | api/invoice/elecUrl | [doc/76](https://doc.jeequan.com/#/integrate/jqf/api/76) | 同上 | 同上 | 同上 | 同上 |

---

## 提现接口（3个）

| 接口 | API路径 | 在线文档 | Java | Python | PHP | HTTP |
|------|---------|----------|------|--------|-----|------|
| 提现余额查询 | api/cashout/balance/query | [doc/77](https://doc.jeequan.com/#/integrate/jqf/api/77) | [java/13](java/13_提现.md) | [python/13](python/13_提现.md) | [php/13](php/13_提现.md) | [http/13](http/13_提现.md) |
| 创建提现订单 | api/cashout/order/create | [doc/78](https://doc.jeequan.com/#/integrate/jqf/api/78) | 同上 | 同上 | 同上 | 同上 |
| 查询提现订单 | api/cashout/order/query | [doc/79](https://doc.jeequan.com/#/integrate/jqf/api/79) | 同上 | 同上 | 同上 | 同上 |

---

## 转账扩展接口（4个）

| 接口 | API路径 | 在线文档 | Java | Python | PHP | HTTP |
|------|---------|----------|------|--------|-----|------|
| 转账余额查询 | api/transfer/balance/query | [doc/51](https://doc.jeequan.com/#/integrate/jqf/api/51) | [java/14](java/14_转账扩展.md) | [python/14](python/14_转账扩展.md) | [php/14](php/14_转账扩展.md) | [http/14](http/14_转账扩展.md) |
| 转账凭证申请 | api/transfer/certificate/apply | [doc/52](https://doc.jeequan.com/#/integrate/jqf/api/52) | 同上 | 同上 | 同上 | 同上 |
| 转账凭证查询 | api/transfer/certificate/query | [doc/53](https://doc.jeequan.com/#/integrate/jqf/api/53) | 同上 | 同上 | 同上 | 同上 |
| 资金转账支付 | api/fund/trans/pay | [doc/54](https://doc.jeequan.com/#/integrate/jqf/api/54) | 同上 | 同上 | 同上 | 同上 |

---

## 分账扩展接口（10个）

| 接口 | API路径 | 在线文档 | Java | Python | PHP | HTTP |
|------|---------|----------|------|--------|-----|------|
| 绑定分账用户 | api/division/receiver/bind | [doc/55](https://doc.jeequan.com/#/integrate/jqf/api/55) | [java/15](java/15_分账扩展.md) | [python/15](python/15_分账扩展.md) | [php/15](php/15_分账扩展.md) | [http/15](http/15_分账扩展.md) |
| 查询分账绑定 | api/division/receiver/bindQuery | [doc/56](https://doc.jeequan.com/#/integrate/jqf/api/56) | 同上 | 同上 | 同上 | 同上 |
| 查询分账 | api/division/query | [doc/58](https://doc.jeequan.com/#/integrate/jqf/api/58) | 同上 | 同上 | 同上 | 同上 |
| 完成分账 | api/division/finish | [doc/59](https://doc.jeequan.com/#/integrate/jqf/api/59) | 同上 | 同上 | 同上 | 同上 |
| 余额分账执行 | api/division/balance/exec | [doc/62](https://doc.jeequan.com/#/integrate/jqf/api/62) | 同上 | 同上 | 同上 | 同上 |
| 余额分账查询 | api/division/balance/query | [doc/63](https://doc.jeequan.com/#/integrate/jqf/api/63) | 同上 | 同上 | 同上 | 同上 |
| 渠道余额查询 | api/division/receiver/channelBalanceQuery | [doc/64](https://doc.jeequan.com/#/integrate/jqf/api/64) | 同上 | 同上 | 同上 | 同上 |
| 渠道余额提现 | api/division/receiver/channelBalanceCashout | [doc/65](https://doc.jeequan.com/#/integrate/jqf/api/65) | 同上 | 同上 | 同上 | 同上 |
| 提现记录查询 | api/division/receiver/cashoutRecordQuery | [doc/66](https://doc.jeequan.com/#/integrate/jqf/api/66) | 同上 | 同上 | 同上 | 同上 |
| 结算更新 | api/division/receiver/settle/update | [doc/214](https://doc.jeequan.com/#/integrate/jqf/api/214) | 同上 | 同上 | 同上 | 同上 |

---

## 统计

| 分类 | 示例文件 | 接口数 |
|------|---------|--------|
| 支付基础（1~10） | 10 × 4 语言 = 40 文件 | 32+ |
| 钱包（11） | 1 × 4 语言 = 4 文件 | 8 |
| 发票（12） | 1 × 4 语言 = 4 文件 | 3 |
| 提现（13） | 1 × 4 语言 = 4 文件 | 3 |
| 转账扩展（14） | 1 × 4 语言 = 4 文件 | 4 |
| 分账扩展（15） | 1 × 4 语言 = 4 文件 | 10 |
| **合计** | **15 × 4 语言 = 60 文件** | **60+** |
