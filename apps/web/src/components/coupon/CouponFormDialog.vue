<script setup lang="ts">
/**
 * 优惠券编辑抽屉：券名/优惠方式/面值/门槛/库存/限领/有效期/上架开关/发放方式。
 * 公开领取进 C 端领券中心；定向发放仅限分发人专属链接领取。
 * 满减面值按元输入（内部以分存储），折扣按折数输入（内部以万分比存储）。
 */
import { computed } from 'vue';
import {
  COUPON_LIMITS,
  CouponAudience,
  CouponType,
  type UpsertCouponPayload,
} from '@app/contracts';

const visible = defineModel<boolean>({ required: true });
const form = defineModel<UpsertCouponPayload>('form', { required: true });

defineProps<{ isEdit: boolean; submitting: boolean }>();
const emit = defineEmits<{ submit: [] }>();

/** 满减金额（元）双向换算：contracts 层以分存储 */
const valueYuan = computed({
  get: () => form.value.value / 100,
  set: (yuan: number) => {
    form.value = { ...form.value, value: Math.round(yuan * 100) };
  },
});

/** 折扣（折）双向换算：contracts 层以万分比存储（9.5 折 = 9500） */
const valueZhe = computed({
  get: () => form.value.value / 1000,
  set: (zhe: number) => {
    form.value = { ...form.value, value: Math.round(zhe * 1000) };
  },
});

/** 门槛金额（元）双向换算 */
const thresholdYuan = computed({
  get: () => form.value.thresholdFen / 100,
  set: (yuan: number) => {
    form.value = { ...form.value, thresholdFen: Math.round(yuan * 100) };
  },
});

/** 有效期区间双向换算（el-date-picker 区间 → validFrom/validTo） */
const validRange = computed({
  get: () =>
    form.value.validFrom && form.value.validTo
      ? [form.value.validFrom, form.value.validTo]
      : [],
  set: (range: string[]) => {
    form.value = {
      ...form.value,
      validFrom: range?.[0] ?? '',
      validTo: range?.[1] ?? '',
    };
  },
});

/** 切换优惠方式时重置面值，避免语义串用 */
function onTypeChange(): void {
  form.value = { ...form.value, value: 0 };
}
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="isEdit ? '编辑优惠券' : '新建优惠券'"
    size="560px"
    class="admin-drawer coupon-form-drawer"
    destroy-on-close
  >
    <el-form
      class="coupon-form"
      label-width="96px"
    >
      <el-form-item label="券名">
        <el-input
          v-model="form.title"
          :maxlength="COUPON_LIMITS.titleMax"
          show-word-limit
          placeholder="如：新人立减券"
        />
      </el-form-item>
      <el-form-item label="发放方式">
        <el-radio-group v-model="form.audience">
          <el-radio :value="CouponAudience.Public">
            公开领取
          </el-radio>
          <el-radio :value="CouponAudience.Directed">
            定向发放
          </el-radio>
        </el-radio-group>
        <div class="coupon-form__hint">
          定向发放不进领券中心，保存后在列表「分发」中指派分发人
        </div>
      </el-form-item>
      <el-form-item label="优惠方式">
        <el-radio-group
          v-model="form.type"
          @change="onTypeChange"
        >
          <el-radio :value="CouponType.Fixed">
            满减
          </el-radio>
          <el-radio :value="CouponType.Percent">
            折扣
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item
        v-if="form.type === CouponType.Fixed"
        label="减免金额"
      >
        <div class="coupon-form__inline">
          <el-input-number
            v-model="valueYuan"
            :min="0.01"
            :precision="2"
            controls-position="right"
          />
          <span class="coupon-form__hint">元</span>
        </div>
      </el-form-item>
      <el-form-item
        v-else
        label="折扣"
      >
        <div class="coupon-form__inline">
          <el-input-number
            v-model="valueZhe"
            :min="0.1"
            :max="9.9"
            :precision="1"
            controls-position="right"
          />
          <span class="coupon-form__hint">折（如 9.5 = 九五折）</span>
        </div>
      </el-form-item>
      <el-form-item label="使用门槛">
        <div class="coupon-form__inline">
          <el-input-number
            v-model="thresholdYuan"
            :min="0"
            :precision="2"
            controls-position="right"
          />
          <span class="coupon-form__hint">元，0 = 无门槛</span>
        </div>
      </el-form-item>
      <el-form-item label="发行总量">
        <div class="coupon-form__inline">
          <el-input-number
            v-model="form.totalCount"
            :min="1"
            :max="COUPON_LIMITS.totalCountMax"
            controls-position="right"
          />
          <span class="coupon-form__hint">张</span>
        </div>
      </el-form-item>
      <el-form-item label="单人限领">
        <div class="coupon-form__inline">
          <el-input-number
            v-model="form.perUserLimit"
            :min="1"
            :max="COUPON_LIMITS.perUserLimitMax"
            controls-position="right"
          />
          <span class="coupon-form__hint">张</span>
        </div>
      </el-form-item>
      <el-form-item label="有效期">
        <el-date-picker
          v-model="validRange"
          class="coupon-form__range"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="YYYY-MM-DDTHH:mm:ssZ"
        />
      </el-form-item>
      <el-form-item label="上架">
        <el-switch v-model="form.enabled" />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="admin-drawer__footer">
        <el-button @click="visible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="emit('submit')"
        >
          保存
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.coupon-form {
  max-width: 100%;
}

.coupon-form__range {
  width: 100%;
}

.coupon-form__inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.coupon-form__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
