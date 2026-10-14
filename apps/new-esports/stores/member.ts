import { readonly, ref } from 'vue';
import { memberApi } from '@/api/member.api';
import type { MemberMineView } from '@/types/member';

/**
 * 当前登录用户的会员概览，供个人页头部等级徽标与会员卡共享。
 * 请求 silent（失败由卡片展示占位），并用修订号丢弃过期响应，避免换号后旧数据写回。
 */

const mineRef = ref<MemberMineView | null>(null);
const loadingRef = ref(false);
let revision = 0;

async function refresh(): Promise<void> {
  const requestRevision = ++revision;
  loadingRef.value = true;
  try {
    const result = await memberApi.mine();
    if (requestRevision === revision) {
      mineRef.value = result;
    }
  } catch {
    if (requestRevision === revision) {
      mineRef.value = null;
    }
  } finally {
    if (requestRevision === revision) {
      loadingRef.value = false;
    }
  }
}

/** 登出或换号时废弃在途响应 */
function reset(): void {
  revision += 1;
  mineRef.value = null;
  loadingRef.value = false;
}

export const member = {
  mine: readonly(mineRef),
  loading: readonly(loadingRef),
  refresh,
  reset,
};
