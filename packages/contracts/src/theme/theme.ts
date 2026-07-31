/**
 * 主题特效（Canvas UI 背景特效）共享契约。
 * 管理端按租户勾选启用的特效（可多选同时启用），C 端按租户编码拉取后包裹全站布局渲染。
 * 特效基于 Chrome html-in-canvas API，内容在不支持时自动降级；WebGL2 不可用时关闭特效。
 */

/** 可启用的 Canvas UI 背景特效 */
export enum ThemeEffect {
  /** 云雾漂浮：雾气掠过页面，光标拨开云层 */
  Clouds = 'clouds',
  /** 底部火焰：火花、烟雾与热浪从页面底部升起 */
  Blaze = 'blaze',
  /** 激光扫描：视口底部激光束，滚动时新内容从光束后打印进入 */
  Laser = 'laser',
  /** 3D 瓷砖：页面化为 3D 瓷砖网格，光标掀起波纹 */
  Grid = 'grid',
  /** 冰霜融化：冰层覆盖页面，光标划过时融化并随时间重新冻结 */
  Frost = 'frost',
}

/** 特效选项（管理端勾选列表用） */
export const THEME_EFFECT_OPTIONS: ReadonlyArray<{
  value: ThemeEffect;
  label: string;
  description: string;
}> = [
  {
    value: ThemeEffect.Clouds,
    label: '云雾漂浮',
    description: '雾气缓慢掠过页面并模糊其覆盖内容，移动光标可拨开云层',
  },
  {
    value: ThemeEffect.Blaze,
    label: '底部火焰',
    description: '页面底部燃起火焰，火花、烟雾与热浪向上升腾',
  },
  {
    value: ThemeEffect.Laser,
    label: '激光扫描',
    description: '视口底部驻留激光束，滚动时新内容从光束后灼热打印进入',
  },
  {
    value: ThemeEffect.Grid,
    label: '3D 瓷砖波纹',
    description: '页面化为 3D 瓷砖网格，光标划过掀起放大波纹',
  },
  {
    value: ThemeEffect.Frost,
    label: '冰霜融化',
    description: '冰层覆盖页面，光标划过时融化并留下轨迹，随后逐渐重新冻结',
  },
];

/** 主题特效配置视图（管理端与 C 端公开接口共用） */
export interface ThemeEffectsView {
  /** 已启用的特效（可同时启用多个；空数组表示不启用任何特效） */
  effects: ThemeEffect[];
}

/** 更新主题特效配置入参（整量覆盖） */
export interface UpdateThemeEffectsPayload {
  effects: ThemeEffect[];
}

/** 过滤非法值并去重，保证任意来源的特效列表安全可用 */
export function sanitizeThemeEffects(value: unknown): ThemeEffect[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const known = new Set<string>(Object.values(ThemeEffect));
  const result: ThemeEffect[] = [];
  for (const item of value) {
    if (typeof item === 'string' && known.has(item) && !result.includes(item as ThemeEffect)) {
      result.push(item as ThemeEffect);
    }
  }
  return result;
}
