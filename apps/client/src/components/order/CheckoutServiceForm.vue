<script setup lang="ts">
import {
  BOOSTER_SERVICE_REGIONS,
  ORDER_LIMITS,
  OrderBoosterSelectionMode,
  type BoosterPublicView,
  type BoosterServiceRegion,
  type RemarkMediaItem,
} from '@app/contracts';
import SelectedBoosterNotice from '@/components/booster/SelectedBoosterNotice.vue';
import RemarkMediaUploader from './RemarkMediaUploader.vue';

const props = defineProps<{ selectedBooster: BoosterPublicView | null }>();
const emit = defineEmits<{ pickBooster: [] }>();

const gameAccountId = defineModel<string>('gameAccountId', { required: true });
const gameTextId = defineModel<string>('gameTextId', { required: true });
const accountInfo = defineModel<string>('accountInfo', { required: true });
const serviceRegion = defineModel<BoosterServiceRegion>('serviceRegion', { required: true });
const selectionMode = defineModel<OrderBoosterSelectionMode>('selectionMode', { required: true });
const quantity = defineModel<number>('quantity', { required: true });
const remark = defineModel<string>('remark', { required: true });
const remarkMedia = defineModel<RemarkMediaItem[]>('remarkMedia', { required: true });

const MODES = [
  { value: OrderBoosterSelectionMode.Auto, label: '自动安排' },
  { value: OrderBoosterSelectionMode.Specified, label: '指定打手' },
] as const;

function updateAccountId(event: Event): void {
  const input = event.target as HTMLInputElement;
  const normalized = input.value
    .replace(/\D/g, '')
    .slice(0, ORDER_LIMITS.gameAccountIdMax);
  input.value = normalized;
  gameAccountId.value = normalized;
}

function selectMode(mode: OrderBoosterSelectionMode): void {
  selectionMode.value = mode;
  if (mode === OrderBoosterSelectionMode.Specified && !props.selectedBooster) {
    emit('pickBooster');
  }
}

function changeQuantity(delta: number): void {
  const next = quantity.value + delta;
  if (next >= ORDER_LIMITS.quantityMin && next <= ORDER_LIMITS.quantityMax) {
    quantity.value = next;
  }
}
</script>

<template>
  <section class="checkout-service-form card">
    <div class="field">
      <label for="game-account-id">数字游戏 ID <span>必填</span></label>
      <input
        id="game-account-id"
        :value="gameAccountId"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        :maxlength="ORDER_LIMITS.gameAccountIdMax"
        placeholder="请输入数字游戏 ID"
        autocomplete="off"
        @input="updateAccountId"
      >
    </div>

    <div class="field">
      <span class="field-label">游戏区服</span>
      <div class="option-grid option-grid--regions">
        <button
          v-for="region in BOOSTER_SERVICE_REGIONS"
          :key="region.value"
          type="button"
          :class="{ active: serviceRegion === region.value }"
          :aria-pressed="serviceRegion === region.value"
          @click="serviceRegion = region.value"
        >
          {{ region.label.replace('三角洲 - ', '') }}
        </button>
      </div>
    </div>

    <div class="field">
      <label for="game-text-id">文字游戏 ID <small>选填</small></label>
      <input
        id="game-text-id"
        v-model.trim="gameTextId"
        type="text"
        :maxlength="ORDER_LIMITS.gameTextIdMax"
        placeholder="请输入文字游戏 ID"
        autocomplete="off"
      >
    </div>

    <div class="field">
      <label for="account-info">其他账号信息 <small>选填，仅接单打手可见</small></label>
      <textarea
        id="account-info"
        v-model.trim="accountInfo"
        :maxlength="ORDER_LIMITS.accountInfoMax"
        placeholder="需要补充的游戏账号或登录说明"
        autocomplete="off"
      />
    </div>

    <div class="field booster-field">
      <span class="field-label">接单打手</span>
      <div class="option-grid">
        <button
          v-for="mode in MODES"
          :key="mode.value"
          type="button"
          :class="{ active: selectionMode === mode.value }"
          :aria-pressed="selectionMode === mode.value"
          @click="selectMode(mode.value)"
        >
          {{ mode.label }}
        </button>
      </div>
      <p class="booster-policy">
        指定后仅由该打手履约，支付成功后由客服确认接单。
      </p>
      <SelectedBoosterNotice
        v-if="selectionMode === OrderBoosterSelectionMode.Specified && selectedBooster"
        :service-region="serviceRegion"
      />
      <button
        v-else-if="selectionMode === OrderBoosterSelectionMode.Specified"
        type="button"
        class="pick-booster"
        @click="emit('pickBooster')"
      >
        选择一位打手
      </button>
    </div>

    <div class="quantity-row">
      <span class="field-label">下单数量</span>
      <div class="stepper">
        <button
          type="button"
          :disabled="quantity <= ORDER_LIMITS.quantityMin"
          aria-label="减少数量"
          @click="changeQuantity(-1)"
        >
          −
        </button>
        <span>{{ quantity }}</span>
        <button
          type="button"
          :disabled="quantity >= ORDER_LIMITS.quantityMax"
          aria-label="增加数量"
          @click="changeQuantity(1)"
        >
          ＋
        </button>
      </div>
    </div>

    <div class="field">
      <label for="order-remark">下单备注 <small>选填</small></label>
      <textarea
        id="order-remark"
        v-model.trim="remark"
        :maxlength="ORDER_LIMITS.remarkMax"
        placeholder="开黑时间、段位或其他要求"
      />
      <RemarkMediaUploader v-model="remarkMedia" />
    </div>
  </section>
</template>

<style scoped>
.checkout-service-form {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.field label,
.field-label {
  font-size: 13px;
  font-weight: 700;
}

.field label span {
  margin-left: 5px;
  font-size: 10px;
  font-weight: 500;
  color: var(--c-accent);
}

.field label small {
  margin-left: 5px;
  font-size: 10px;
  font-weight: 500;
  color: var(--c-text-muted);
}

.field input,
.field textarea {
  width: 100%;
  padding: 10px 12px;
  color: var(--c-text);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  outline: none;
  background: var(--c-bg);
}

.field input {
  min-height: 42px;
}

.field textarea {
  min-height: 76px;
  line-height: 1.55;
  resize: vertical;
}

.field input:focus,
.field textarea:focus {
  border-color: var(--c-accent);
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.option-grid button {
  min-width: 0;
  min-height: 40px;
  padding: 7px 9px;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.option-grid button.active {
  color: var(--c-bg);
  font-weight: 800;
  border-color: var(--c-accent);
  background: var(--c-accent);
}

.pick-booster {
  min-height: 42px;
  font-size: 13px;
  font-weight: 700;
  color: var(--c-accent);
  border: 1px dashed var(--c-accent);
  border-radius: var(--radius-sm);
  background: var(--c-accent-dim);
}

.booster-policy {
  font-size: 11px;
  line-height: 1.5;
  color: var(--c-text-muted);
}

.quantity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stepper {
  display: grid;
  grid-template-columns: 34px 44px 34px;
  align-items: center;
  text-align: center;
}

.stepper button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.stepper button:disabled {
  opacity: 0.4;
}

.stepper span {
  font-family: var(--font-num);
  font-size: 15px;
  font-weight: 800;
}

@media (min-width: 768px) {
  .checkout-service-form {
    padding: 20px;
  }

  .option-grid--regions {
    max-width: 420px;
  }
}
</style>
