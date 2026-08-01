import { ORDER_NOTIFY_PAYLOAD_KEYS, type OrderNotifyPayload } from '@app/contracts';

/** 模板字段映射：模板字段名 → 订单通知逻辑字段名 */
export type OrderFieldMapping = Record<string, keyof OrderNotifyPayload>;

/**
 * 解析配置中心的字段映射 JSON。
 * 只保留值属于订单通知逻辑字段的条目，脏配置安静丢弃，避免把任意文本发到微信。
 */
export function parseOrderFieldMapping(raw: unknown): OrderFieldMapping {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {};
  }
  const legalKeys = new Set<string>(ORDER_NOTIFY_PAYLOAD_KEYS);
  const mapping: OrderFieldMapping = {};
  for (const [templateField, logicalField] of Object.entries(raw)) {
    if (typeof logicalField === 'string' && legalKeys.has(logicalField)) {
      mapping[templateField] = logicalField as keyof OrderNotifyPayload;
    }
  }
  return mapping;
}

/** 按映射把订单通知内容装配为微信模板 data：{ 字段名: { value } } */
export function buildTemplateData(
  mapping: OrderFieldMapping,
  payload: OrderNotifyPayload,
): Record<string, { value: string }> {
  const data: Record<string, { value: string }> = {};
  for (const [templateField, logicalField] of Object.entries(mapping)) {
    data[templateField] = { value: payload[logicalField] };
  }
  return data;
}
