import { ConfigItemView } from '@app/contracts';
import { ConfigItem } from '../domain/config-item.entity';

/** 敏感配置的脱敏占位符 */
const SECRET_MASK = '******';

/**
 * 将配置实体转换为对外视图。
 * 敏感项不回显原值，避免密钥泄露到前端列表。
 */
export function toConfigView(item: ConfigItem): ConfigItemView {
  return {
    key: item.key,
    value: item.secret && item.value !== '' ? SECRET_MASK : item.value,
    type: item.type,
    group: item.group,
    remark: item.remark,
    secret: item.secret,
  };
}
