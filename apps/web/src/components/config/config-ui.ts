import { ConfigGroup, ConfigValueType } from '@app/contracts';

export interface ConfigFormModel {
  key: string;
  value: string;
  type: ConfigValueType;
  group: ConfigGroup;
  remark: string;
  secret: boolean;
}

export const CONFIG_TYPE_META: Record<ConfigValueType, { label: string; tone: string }> = {
  [ConfigValueType.Boolean]: { label: '布尔', tone: 'boolean' },
  [ConfigValueType.Json]: { label: 'JSON', tone: 'json' },
  [ConfigValueType.Number]: { label: '数值', tone: 'number' },
  [ConfigValueType.RichText]: { label: '富文本', tone: 'richtext' },
  [ConfigValueType.String]: { label: '文本', tone: 'string' },
};

export const CONFIG_GROUP_META: Record<ConfigGroup, { label: string }> = {
  [ConfigGroup.Auth]: { label: '认证' },
  [ConfigGroup.Im]: { label: '沟通' },
  [ConfigGroup.Observability]: { label: '观测' },
  [ConfigGroup.Sms]: { label: '短信' },
  [ConfigGroup.System]: { label: '系统' },
  [ConfigGroup.Upload]: { label: '上传' },
};
