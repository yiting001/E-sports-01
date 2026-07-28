import {
  ConfigGroup,
  ConfigValueType,
  type ConfigItemView,
} from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { buildConfigSaveForm } from './config-access';
import type { ConfigFormModel } from './config-ui';

const original: ConfigItemView = {
  key: 'system.appName',
  value: '原名称',
  type: ConfigValueType.String,
  group: ConfigGroup.System,
  remark: '网站名称',
  secret: false,
};

describe('配置编辑权限边界', () => {
  it('租户管理员提交时只能改变值，元数据使用服务端目录原值', () => {
    const tampered: ConfigFormModel = {
      key: 'sms.aliyun.accessKeySecret',
      value: '租户名称',
      type: ConfigValueType.Json,
      group: ConfigGroup.Sms,
      remark: '篡改备注',
      secret: true,
    };

    expect(buildConfigSaveForm(tampered, original, false)).toEqual({
      ...original,
      value: '租户名称',
    });
  });

  it('租户管理员不能通过新增状态构造配置', () => {
    expect(() => buildConfigSaveForm({ ...original }, null, false)).toThrow(
      '租户管理员不能新增配置'
    );
  });
});
