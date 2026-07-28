import type { ConfigItemView } from '@app/contracts';
import type { ConfigFormModel } from './config-ui';

/** 平台超管可提交完整元数据；租户管理员只能用目录原值封装新的配置值。 */
export function buildConfigSaveForm(
  form: ConfigFormModel,
  original: ConfigItemView | null,
  isSuper: boolean
): ConfigFormModel {
  if (isSuper) {
    return { ...form };
  }
  if (!original) {
    throw new Error('租户管理员不能新增配置');
  }
  return {
    key: original.key,
    value: form.value,
    type: original.type,
    group: original.group,
    remark: original.remark,
    secret: original.secret,
  };
}
