import type { MenuView } from '@app/contracts';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { menuApi } from '@/api/menu.api';

/**
 * 菜单状态。
 * 菜单由后端按当前用户权限下发（单一数据源），前端据此渲染侧边菜单并注册动态路由。
 * 角色未授予某菜单权限时该菜单不下发，对应路由也不会注册，从而无法访问。
 */
export const useMenuStore = defineStore('menu', () => {
  const menus = ref<MenuView[]>([]);
  const loaded = ref(false);

  async function load(): Promise<MenuView[]> {
    const data = await menuApi.mine();
    menus.value = data;
    loaded.value = true;
    return data;
  }

  function reset(): void {
    menus.value = [];
    loaded.value = false;
  }

  return { menus, loaded, load, reset };
});
