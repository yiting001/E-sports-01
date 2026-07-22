import type { MemberMineView } from '@app/contracts';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { memberApi } from '@/api/member.api';

/** 当前登录用户的会员概览，供个人页头部与会员卡共享。 */
export const useMemberStore = defineStore('member', () => {
  const mine = ref<MemberMineView | null>(null);
  const loading = ref(false);
  const loadError = ref(false);
  let revision = 0;

  async function refresh(): Promise<void> {
    const requestRevision = ++revision;
    loading.value = true;
    loadError.value = false;
    try {
      const result = await memberApi.mine();
      if (requestRevision === revision) {
        mine.value = result;
      }
    } catch {
      if (requestRevision === revision) {
        loadError.value = true;
      }
    } finally {
      if (requestRevision === revision) {
        loading.value = false;
      }
    }
  }

  /** 登出或换号时废弃在途响应，避免旧账号等级写回新会话。 */
  function reset(): void {
    revision += 1;
    mine.value = null;
    loading.value = false;
    loadError.value = false;
  }

  return { mine, loading, loadError, refresh, reset };
});
