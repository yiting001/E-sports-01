import { imApi } from '@/api/im.api';
import { useAuthStore } from '@/stores/auth.store';
import { defineBadgeStore } from '@/stores/badge-store.factory';

/**
 * C 端未读消息状态。
 * 汇总我的会话未读数，供导航「消息」入口角标展示；
 * 未读数由后端按会话已读位点（lastReadAt）计算，本 store 只做求和；未登录时清零。
 */
export const useUnreadStore = defineBadgeStore('unread', async () => {
  const auth = useAuthStore();
  if (!auth.isAuthenticated) {
    return 0;
  }
  const list = await imApi.listConversations();
  return list.reduce((sum, conv) => sum + conv.unread, 0);
});
