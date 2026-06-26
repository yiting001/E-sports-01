import type { Directive, DirectiveBinding } from 'vue';
import { useAuthStore } from '@/stores/auth.store';

/**
 * 按钮级权限指令 v-permission。
 * 用法：v-permission="'rbac:user:create'" 或 v-permission="['a','b']"（需全部满足）。
 * 缺失权限时直接从 DOM 移除元素，避免仅靠隐藏被绕过。
 */
function resolve(binding: DirectiveBinding<string | string[]>): boolean {
  const required = binding.value;
  const codes = Array.isArray(required) ? required : [required];
  if (codes.length === 0) {
    return true;
  }
  const auth = useAuthStore();
  return codes.every((code) => auth.hasPermission(code));
}

function apply(el: HTMLElement, binding: DirectiveBinding<string | string[]>): void {
  if (!resolve(binding)) {
    el.parentElement?.removeChild(el);
  }
}

export const permissionDirective: Directive<HTMLElement, string | string[]> = {
  mounted: apply,
};
