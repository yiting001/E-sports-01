<script setup lang="ts">
/**
 * 下单页：结构化游戏账号/区服 + 自动或指定打手 + 数量/备注/优惠/支付。
 * 跨页重新挑人时通过内存草稿恢复已填内容，不把敏感账号写入本地持久化。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  FEE_RATE_BASE,
  OrderBoosterSelectionMode,
  OrderPaymentMethod,
  UserCouponStatus,
  calcCouponDeductionFen,
  calcDiscountedFen,
  fenToYuan,
  resolveProductPrice,
  type BoosterServiceRegion,
  type CreateOrderResult,
  type ProductPublicView,
  type RemarkMediaItem,
  type UserCouponView,
} from "@app/contracts";
import AppIcon from "@/components/common/AppIcon.vue";
import CheckoutPaymentMethods from "@/components/order/CheckoutPaymentMethods.vue";
import CheckoutServiceForm from "@/components/order/CheckoutServiceForm.vue";
import PayDialog from "@/components/order/PayDialog.vue";
import { authApi } from "@/api/auth.api";
import { commerceApi } from "@/api/commerce.api";
import { couponApi } from "@/api/coupon.api";
import { memberApi } from "@/api/member.api";
import { orderApi } from "@/api/order.api";
import { useToast } from "@/composables/use-toast";
import { useWechatOauth } from "@/composables/use-wechat-oauth";
import { useCheckoutDraftStore } from "@/stores/checkout-draft.store";
import {
  resolveCompatibleServiceRegion,
  resolveCheckoutServiceRegion,
} from "@/utils/checkout-state";
import { resolveMediaUrl } from "@/utils/media-url";
import {
  ORDER_PAY_RETURN_PATH,
  buildClientPayReturnUrl,
} from "@/utils/pay-return";
import "./CheckoutView.css";
import "./CheckoutView.responsive.css";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const checkout = useCheckoutDraftStore();
const wechatOauth = useWechatOauth();
const productId = String(route.params.productId);
const savedDraft = checkout.getDraft(productId);

const product = ref<ProductPublicView | null>(null);
const loading = ref(true);
const loadError = ref(false);
const gameAccountId = ref(savedDraft?.gameAccountId ?? "");
const gameTextId = ref(savedDraft?.gameTextId ?? "");
const accountInfo = ref(savedDraft?.accountInfo ?? "");
const quantity = ref(savedDraft?.quantity ?? 1);
const remark = ref(savedDraft?.remark ?? "");
const remarkMedia = ref<RemarkMediaItem[]>(savedDraft?.remarkMedia ?? []);
const provider = ref<OrderPaymentMethod>(
  savedDraft?.provider ?? OrderPaymentMethod.Alipay
);
const serviceRegion = ref<BoosterServiceRegion>(
  resolveCheckoutServiceRegion(
    checkout.selectedBooster,
    savedDraft?.serviceRegion
  )
);
const submitting = ref(false);
const payOrder = ref<CreateOrderResult | null>(null);
const completed = ref(false);
/** 当前用户微信 openid 绑定状态；null 表示尚未查询 */
const wechatBound = ref<boolean | null>(null);

const coupons = ref<UserCouponView[]>([]);
const selectedCouponId = ref(savedDraft?.selectedCouponId ?? "");
const couponListOpen = ref(false);
const discountBp = ref(FEE_RATE_BASE);

if (savedDraft && !checkout.specifiedBooster) {
  checkout.setSelectionMode(savedDraft.boosterSelectionMode);
}

const selectionMode = computed({
  get: () => checkout.boosterSelectionMode,
  set: (mode: OrderBoosterSelectionMode) => checkout.setSelectionMode(mode),
});
const selectedBooster = computed(() => checkout.selectedBooster);
const coverUrl = computed(() => resolveMediaUrl(product.value?.cover ?? ""));
const regionPrice = computed(() =>
  product.value ? resolveProductPrice(product.value, serviceRegion.value) : null
);

const memberAmountFen = computed(() =>
  regionPrice.value
    ? calcDiscountedFen(
        regionPrice.value.priceFen * quantity.value,
        discountBp.value
      )
    : 0
);
const usableCoupons = computed(() =>
  coupons.value.filter(
    (item) =>
      item.status === UserCouponStatus.Unused &&
      !item.expired &&
      calcCouponDeductionFen(
        item.type,
        item.value,
        item.thresholdFen,
        memberAmountFen.value
      ) > 0
  )
);
const selectedCoupon = computed(
  () =>
    usableCoupons.value.find((item) => item.id === selectedCouponId.value) ??
    null
);
const couponDeductionFen = computed(() => {
  const coupon = selectedCoupon.value;
  if (!coupon) {
    return 0;
  }
  const deduction = calcCouponDeductionFen(
    coupon.type,
    coupon.value,
    coupon.thresholdFen,
    memberAmountFen.value
  );
  return Math.min(Math.max(deduction, 0), memberAmountFen.value);
});
const totalFen = computed(
  () => memberAmountFen.value - couponDeductionFen.value
);
const totalYuan = computed(() => fenToYuan(totalFen.value));
const couponRowText = computed(() => {
  if (selectedCoupon.value) {
    return `-¥${fenToYuan(couponDeductionFen.value)}`;
  }
  return usableCoupons.value.length
    ? `${usableCoupons.value.length} 张可用`
    : "暂无可用";
});

function saveCurrentDraft(): void {
  checkout.saveDraft({
    productId,
    gameAccountId: gameAccountId.value,
    gameTextId: gameTextId.value,
    accountInfo: accountInfo.value,
    serviceRegion: serviceRegion.value,
    quantity: quantity.value,
    remark: remark.value,
    remarkMedia: remarkMedia.value,
    provider: provider.value,
    selectedCouponId: selectedCouponId.value,
    boosterSelectionMode: selectionMode.value,
  });
}

function pickCoupon(id: string): void {
  selectedCouponId.value = selectedCouponId.value === id ? "" : id;
  couponListOpen.value = false;
}

function openBoosterPicker(): void {
  saveCurrentDraft();
  void router.push({
    name: "booster-list",
    query: { returnTo: route.fullPath, serviceRegion: serviceRegion.value },
  });
}

function validateOrder(): boolean {
  if (!/^\d+$/.test(gameAccountId.value)) {
    toast.show("请输入正确的数字游戏 ID");
    return false;
  }
  if (
    selectionMode.value === OrderBoosterSelectionMode.Specified &&
    !checkout.specifiedBooster
  ) {
    toast.show("请先选择指定打手");
    openBoosterPicker();
    return false;
  }
  if (
    checkout.specifiedBooster &&
    !checkout.specifiedBooster.serviceRegions.includes(serviceRegion.value)
  ) {
    toast.show("所选打手不支持当前区服，请重新选择");
    openBoosterPicker();
    return false;
  }
  return true;
}

/**
 * JSAPI 支付前确保已绑定 openid：未绑定时保存草稿并跳微信授权，
 * 回跳后由 onMounted 的 code 消费逻辑完成绑定。返回是否可继续下单。
 */
async function ensureWechatBound(): Promise<boolean> {
  if (provider.value !== OrderPaymentMethod.WechatJsapi) {
    return true;
  }
  if (wechatBound.value === null) {
    try {
      wechatBound.value = (await authApi.wechatIdentity()).bound;
    } catch {
      return true;
    }
  }
  if (wechatBound.value) {
    return true;
  }
  toast.show("首次微信支付需先授权，正在跳转微信授权页");
  saveCurrentDraft();
  try {
    await wechatOauth.startAuthorize();
  } catch {
    toast.show("微信授权发起失败，请重试或改用其他支付方式");
  }
  return false;
}

/** 消费微信授权回跳的 code：绑定 openid 后可直接继续 JSAPI 支付 */
async function consumeWechatBindCode(): Promise<void> {
  const code = wechatOauth.readOauthCode();
  if (!code) {
    return;
  }
  wechatOauth.clearOauthCode();
  try {
    wechatBound.value = (await authApi.wechatBind({ code })).bound;
    if (wechatBound.value) {
      toast.show("微信授权成功，可继续提交订单");
    }
  } catch {
    // 绑定失败已由全局错误提示，下单时会再次引导授权
  }
}

async function submit(): Promise<void> {
  if (!product.value || submitting.value || !validateOrder()) {
    return;
  }
  if (!(await ensureWechatBound())) {
    return;
  }
  submitting.value = true;
  try {
    const result = await orderApi.create({
      productId: product.value.id,
      quantity: quantity.value,
      provider: provider.value,
      gameAccountId: gameAccountId.value,
      gameTextId: gameTextId.value || undefined,
      accountInfo: accountInfo.value || undefined,
      serviceRegion: serviceRegion.value,
      boosterSelectionMode: selectionMode.value,
      requestedBoosterId: checkout.specifiedBooster?.userId,
      remark: remark.value || undefined,
      remarkMedia: remarkMedia.value.length ? remarkMedia.value : undefined,
      userCouponId: selectedCoupon.value?.id || undefined,
      returnUrl: buildClientPayReturnUrl(ORDER_PAY_RETURN_PATH),
    });
    payOrder.value = result;
    if (result.paid) {
      onPaid();
    }
  } finally {
    submitting.value = false;
  }
}

function onPaid(): void {
  const orderId = payOrder.value?.orderId;
  payOrder.value = null;
  completed.value = true;
  checkout.clearOrderContext();
  toast.show("支付成功，客服将尽快为您安排服务");
  void router.replace(
    orderId
      ? { name: "order-detail", params: { id: orderId } }
      : { name: "orders" }
  );
}

async function loadCheckout(): Promise<void> {
  loading.value = true;
  loadError.value = false;
  const [detailResult, couponResult, memberResult] = await Promise.allSettled([
    commerceApi.getProduct(productId),
    couponApi.mine(),
    memberApi.mine(),
  ]);
  if (detailResult.status === "fulfilled") {
    product.value = detailResult.value;
  } else {
    product.value = null;
    loadError.value = true;
  }
  coupons.value = couponResult.status === "fulfilled" ? couponResult.value : [];
  discountBp.value =
    memberResult.status === "fulfilled"
      ? memberResult.value.discountBp
      : FEE_RATE_BASE;
  if (
    couponResult.status === "rejected" ||
    memberResult.status === "rejected"
  ) {
    toast.show("部分优惠信息加载失败，请确认价格后下单");
  }
  loading.value = false;
}

watch(
  () => checkout.selectedBooster,
  (booster) => {
    if (booster && !booster.serviceRegions.includes(serviceRegion.value)) {
      serviceRegion.value = booster.serviceRegions[0] ?? serviceRegion.value;
    }
  },
  { immediate: true }
);

watch(serviceRegion, (region) => {
  const booster = checkout.specifiedBooster;
  if (!booster) {
    return;
  }
  const compatibleRegion = resolveCompatibleServiceRegion(booster, region);
  if (compatibleRegion === region) {
    return;
  }
  if (compatibleRegion) {
    serviceRegion.value = compatibleRegion;
  }
  toast.show(
    compatibleRegion
      ? "所选打手不支持该区服，请先更换打手"
      : "所选打手暂未配置接单区服，请重新选择"
  );
});

onMounted(() => {
  void loadCheckout();
  void consumeWechatBindCode();
});

onBeforeUnmount(() => {
  if (!completed.value) {
    saveCurrentDraft();
  }
});
</script>

<template>
  <div class="checkout client-page">
    <header class="bar">
      <div class="bar-inner">
        <button
          type="button"
          class="back"
          aria-label="返回"
          @click="router.back()"
        >
          <AppIcon
            name="chevron"
            :size="20"
          />
        </button>
        <span class="name">提交订单</span>
      </div>
    </header>

    <main class="scroll">
      <section
        v-if="loading"
        class="checkout-state"
        aria-live="polite"
      >
        <span class="checkout-loader" />
        <p>订单信息加载中</p>
      </section>
      <section
        v-else-if="loadError || !product"
        class="checkout-state card"
        role="alert"
      >
        <h2>商品信息加载失败</h2>
        <p>商品可能已下架，请重新加载后再试。</p>
        <button
          type="button"
          @click="loadCheckout"
        >
          重新加载
        </button>
      </section>
      <template v-else>
        <section class="card summary">
          <div
            class="thumb"
            :class="{ 'thumb--image': coverUrl }"
            :style="
              coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined
            "
          >
            <AppIcon
              v-if="!coverUrl"
              name="gem"
              :size="26"
              class="thumb-icon"
            />
          </div>
          <div class="mid">
            <p class="title">
              {{ product.title }}
            </p>
            <p class="sub">
              {{ product.categoryName }} · 单价 ¥{{
                fenToYuan(regionPrice?.priceFen ?? 0)
              }}
            </p>
          </div>
          <span class="price">¥{{ fenToYuan((regionPrice?.priceFen ?? 0) * quantity) }}</span>
        </section>

        <CheckoutServiceForm
          v-model:game-account-id="gameAccountId"
          v-model:game-text-id="gameTextId"
          v-model:account-info="accountInfo"
          v-model:service-region="serviceRegion"
          v-model:selection-mode="selectionMode"
          v-model:quantity="quantity"
          v-model:remark="remark"
          v-model:remark-media="remarkMedia"
          :selected-booster="selectedBooster"
          @pick-booster="openBoosterPicker"
        />

        <section class="card payment-card">
          <div class="coupon-section">
            <button
              type="button"
              class="coupon-row"
              :disabled="!usableCoupons.length"
              @click="couponListOpen = !couponListOpen"
            >
              <span class="label">优惠券</span>
              <span
                class="coupon-text"
                :class="{ active: selectedCoupon }"
              >{{
                couponRowText
              }}</span>
            </button>
            <div
              v-if="couponListOpen"
              class="coupon-list"
            >
              <button
                v-for="item in usableCoupons"
                :key="item.id"
                type="button"
                class="coupon-opt"
                :class="{ picked: item.id === selectedCouponId }"
                @click="pickCoupon(item.id)"
              >
                <span class="coupon-title">{{ item.title }}</span>
                <span class="coupon-off">
                  -¥{{
                    fenToYuan(
                      calcCouponDeductionFen(
                        item.type,
                        item.value,
                        item.thresholdFen,
                        memberAmountFen
                      )
                    )
                  }}
                </span>
              </button>
            </div>
          </div>
          <CheckoutPaymentMethods
            v-model="provider"
            :amount-fen="totalFen"
          />
        </section>
      </template>
    </main>

    <footer
      v-if="product"
      class="footer"
    >
      <div class="total">
        <span class="total-label">合计</span>
        <span class="total-value">¥{{ totalYuan }}</span>
      </div>
      <button
        type="button"
        class="buy"
        :disabled="submitting"
        @click="submit"
      >
        {{ submitting ? "提交中…" : "立即下单" }}
      </button>
    </footer>

    <PayDialog
      v-if="payOrder"
      :order="payOrder"
      @paid="onPaid"
      @close="payOrder = null"
    />
  </div>
</template>
