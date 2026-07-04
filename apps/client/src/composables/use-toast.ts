import { readonly, ref } from 'vue';

/** 轻提示展示时长（毫秒），UI 交互约定值 */
const TOAST_DURATION_MS = 1800;

const message = ref('');
const visible = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * 组合式函数：全局轻提示。
 * UI 先行阶段所有未接入后端的交互统一用 toast 反馈，模块级单例避免重复弹层。
 */
export function useToast() {
  /** 弹出一条提示，重复调用自动重置倒计时 */
  function show(text: string) {
    message.value = text;
    visible.value = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      visible.value = false;
    }, TOAST_DURATION_MS);
  }

  return { message: readonly(message), visible: readonly(visible), show };
}
