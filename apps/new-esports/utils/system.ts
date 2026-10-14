/**
 * 系统尺寸工具（自定义导航页使用）。
 * 启用 navigationStyle: custom 后页面从屏幕顶部开始渲染：
 * - 小程序端需避开状态栏与右上角胶囊按钮，顶部安全区取「状态栏高度 + 44px」；
 * - H5/App 端没有状态栏，给一段常规留白即可。
 */
export function getCustomNavTopInsetPx(): number {
  try {
    const info = uni.getSystemInfoSync();
    const statusBarHeight = typeof info.statusBarHeight === 'number' ? info.statusBarHeight : 0;
    return statusBarHeight > 0 ? statusBarHeight + 44 : 24;
  } catch {
    return 24;
  }
}
