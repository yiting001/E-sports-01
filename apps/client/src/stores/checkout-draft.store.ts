import {
  OrderBoosterSelectionMode,
  OrderPaymentMethod,
  type BoosterPublicView,
  type BoosterServiceRegion,
  type RemarkMediaItem,
} from '@app/contracts';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/** 结算页跨路由暂存；账号信息仅保存在当前页面会话内，不写浏览器持久化存储。 */
export interface CheckoutDraft {
  productId: string;
  gameAccountId: string;
  gameTextId: string;
  accountInfo: string;
  serviceRegion: BoosterServiceRegion;
  quantity: number;
  remark: string;
  remarkMedia: RemarkMediaItem[];
  provider: OrderPaymentMethod;
  selectedCouponId: string;
  boosterSelectionMode: OrderBoosterSelectionMode;
}

/** 挑人意向与结算草稿，负责在「挑人 - 选商品 - 结算」跨页流程中保留状态。 */
export const useCheckoutDraftStore = defineStore('checkout-draft', () => {
  const selectedBooster = ref<BoosterPublicView | null>(null);
  const boosterSelectionMode = ref<OrderBoosterSelectionMode>(
    OrderBoosterSelectionMode.Auto,
  );
  const draft = ref<CheckoutDraft | null>(null);

  const specifiedBooster = computed(() =>
    boosterSelectionMode.value === OrderBoosterSelectionMode.Specified
      ? selectedBooster.value
      : null,
  );

  function selectBooster(booster: BoosterPublicView): void {
    selectedBooster.value = booster;
    boosterSelectionMode.value = OrderBoosterSelectionMode.Specified;
  }

  function setSelectionMode(mode: OrderBoosterSelectionMode): void {
    boosterSelectionMode.value = mode;
  }

  function saveDraft(value: CheckoutDraft): void {
    draft.value = {
      ...value,
      remarkMedia: value.remarkMedia.map((item) => ({ ...item })),
    };
  }

  function getDraft(productId: string): CheckoutDraft | null {
    if (draft.value?.productId !== productId) {
      return null;
    }
    return {
      ...draft.value,
      remarkMedia: draft.value.remarkMedia.map((item) => ({ ...item })),
    };
  }

  function clearOrderContext(): void {
    selectedBooster.value = null;
    boosterSelectionMode.value = OrderBoosterSelectionMode.Auto;
    draft.value = null;
  }

  return {
    boosterSelectionMode,
    selectedBooster,
    specifiedBooster,
    selectBooster,
    setSelectionMode,
    saveDraft,
    getDraft,
    clearOrderContext,
  };
});
