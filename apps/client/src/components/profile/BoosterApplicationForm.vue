<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  BOOSTER_LIMITS,
  BOOSTER_SERVICE_REGIONS,
  BoosterContactType,
  BoosterGender,
  type BoosterServiceRegion,
  type BoosterServiceRegionOption,
} from '@app/contracts';
import BoosterMaterialUploader from './BoosterMaterialUploader.vue';
import type { BoosterApplicationFormModel } from './booster-application-form';

const props = withDefaults(
  defineProps<{
    modelValue: BoosterApplicationFormModel;
    disabled?: boolean;
    readonly?: boolean;
    /** 接单区服选项（后台可配）；未传时回退契约默认两个区服 */
    regionOptions?: readonly BoosterServiceRegionOption[];
  }>(),
  { disabled: false, readonly: false, regionOptions: () => BOOSTER_SERVICE_REGIONS },
);

const emit = defineEmits<{
  'update:modelValue': [value: BoosterApplicationFormModel];
  'uploading-change': [value: boolean];
}>();

const genderOptions = [
  { value: BoosterGender.Male, label: '男' },
  { value: BoosterGender.Female, label: '女' },
] as const;

const contactOptions = [
  { value: BoosterContactType.Phone, label: '手机号' },
  { value: BoosterContactType.Wechat, label: '微信' },
  { value: BoosterContactType.QQ, label: 'QQ' },
] as const;

const readonlyMaterialFailed = ref(false);

watch(
  () => props.modelValue.materialImage,
  () => {
    readonlyMaterialFailed.value = false;
  },
);

function update(patch: Partial<BoosterApplicationFormModel>): void {
  emit('update:modelValue', { ...props.modelValue, ...patch });
}

const applicantName = computed({
  get: () => props.modelValue.applicantName,
  set: (value: string) => update({ applicantName: value }),
});

const intro = computed({
  get: () => props.modelValue.intro,
  set: (value: string) => update({ intro: value }),
});

const contactValue = computed({
  get: () => props.modelValue.contactValue,
  set: (value: string) => update({ contactValue: value }),
});

const materialImage = computed({
  get: () => props.modelValue.materialImage,
  set: (value: string) => update({ materialImage: value }),
});

const invitationCode = computed({
  get: () => props.modelValue.invitationCode,
  set: (value: string) => update({ invitationCode: value }),
});

const introCount = computed(() => props.modelValue.intro.length);
const introTooShort = computed(
  () =>
    props.modelValue.intro.trim().length > 0 &&
    props.modelValue.intro.trim().length < BOOSTER_LIMITS.introMin,
);

const genderLabel = computed(
  () => genderOptions.find((item) => item.value === props.modelValue.gender)?.label ?? '未填写',
);
const contactLabel = computed(
  () =>
    contactOptions.find((item) => item.value === props.modelValue.contactType)?.label ?? '未填写',
);
const regionLabels = computed(() =>
  props.modelValue.serviceRegions.map(
    (value) => props.regionOptions.find((item) => item.value === value)?.label ?? value,
  ),
);

const contactPlaceholder = computed(() => {
  switch (props.modelValue.contactType) {
    case BoosterContactType.Phone:
      return '请输入手机号';
    case BoosterContactType.Wechat:
      return '请输入微信号';
    case BoosterContactType.QQ:
      return '请输入 QQ 号';
    default:
      return '请先选择联系方式';
  }
});

const contactInputMode = computed<'text' | 'tel' | 'numeric'>(() => {
  if (props.modelValue.contactType === BoosterContactType.Phone) {
    return 'tel';
  }
  if (props.modelValue.contactType === BoosterContactType.QQ) {
    return 'numeric';
  }
  return 'text';
});

function selectGender(value: BoosterGender): void {
  update({ gender: value });
}

function toggleRegion(value: BoosterServiceRegion): void {
  const selected = props.modelValue.serviceRegions.includes(value);
  const serviceRegions = selected
    ? props.modelValue.serviceRegions.filter((item) => item !== value)
    : [...props.modelValue.serviceRegions, value];
  update({ serviceRegions });
}

function selectContactType(value: BoosterContactType): void {
  if (props.modelValue.contactType === value) {
    return;
  }
  update({ contactType: value, contactValue: '' });
}
</script>

<template>
  <section
    class="application card"
    :class="{ 'application--readonly': readonly }"
  >
    <h2 class="title">
      {{ readonly ? '入驻信息' : '入驻信息填写' }}
    </h2>

    <dl
      v-if="readonly"
      class="readonly-list"
    >
      <div class="readonly-row">
        <dt>姓名</dt>
        <dd>{{ modelValue.applicantName || '未填写' }}</dd>
      </div>
      <div class="readonly-row">
        <dt>性别</dt>
        <dd>{{ genderLabel }}</dd>
      </div>
      <div class="readonly-row readonly-row--stack">
        <dt>接单区服</dt>
        <dd class="readonly-tags">
          <span
            v-for="label in regionLabels"
            :key="label"
            class="readonly-tag"
          >
            {{ label }}
          </span>
          <span v-if="!regionLabels.length">未填写</span>
        </dd>
      </div>
      <div class="readonly-row readonly-row--stack">
        <dt>个人简介</dt>
        <dd class="readonly-copy">
          {{ modelValue.intro || '未填写' }}
        </dd>
      </div>
      <div class="readonly-row">
        <dt>联系方式</dt>
        <dd>{{ contactLabel }} · {{ modelValue.contactValue || '未填写' }}</dd>
      </div>
      <div class="readonly-row readonly-row--stack">
        <dt>其他材料</dt>
        <dd>
          <img
            v-if="modelValue.materialImage && !readonlyMaterialFailed"
            :src="modelValue.materialImage"
            class="readonly-image"
            alt="其他材料"
            @error="readonlyMaterialFailed = true"
          >
          <span v-else>{{ readonlyMaterialFailed ? '图片暂时无法显示' : '未上传' }}</span>
        </dd>
      </div>
      <div class="readonly-row">
        <dt>邀请码</dt>
        <dd>{{ modelValue.invitationCode || '未填写' }}</dd>
      </div>
    </dl>

    <div
      v-else
      class="fields"
    >
      <label class="field">
        <span class="field-label">姓名</span>
        <input
          v-model="applicantName"
          class="control"
          type="text"
          autocomplete="name"
          :maxlength="BOOSTER_LIMITS.applicantNameMax"
          :disabled="disabled"
          placeholder="请填写姓名"
        >
      </label>

      <fieldset class="field">
        <legend class="field-label">
          性别
        </legend>
        <div class="segments segments--two">
          <button
            v-for="item in genderOptions"
            :key="item.value"
            type="button"
            class="segment"
            :class="{ active: modelValue.gender === item.value }"
            :aria-pressed="modelValue.gender === item.value"
            :disabled="disabled"
            @click="selectGender(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
      </fieldset>

      <fieldset class="field">
        <legend class="field-label">
          接单区服
        </legend>
        <span class="field-hint">至少选择一项</span>
        <div class="segments segments--regions">
          <button
            v-for="item in regionOptions"
            :key="item.value"
            type="button"
            class="segment"
            :class="{ active: modelValue.serviceRegions.includes(item.value) }"
            :aria-pressed="modelValue.serviceRegions.includes(item.value)"
            :disabled="disabled"
            @click="toggleRegion(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
      </fieldset>

      <label class="field">
        <span class="field-label">个人简介</span>
        <span class="textarea-wrap">
          <textarea
            v-model="intro"
            class="control textarea"
            :maxlength="BOOSTER_LIMITS.introMax"
            :disabled="disabled"
            rows="5"
            :placeholder="`不少于 ${BOOSTER_LIMITS.introMin} 个字`"
          />
          <span
            class="counter"
            :class="{ invalid: introTooShort }"
          >
            {{ introCount }}/{{ BOOSTER_LIMITS.introMax }}
          </span>
        </span>
      </label>

      <fieldset class="field">
        <legend class="field-label">
          联系方式
        </legend>
        <div class="segments segments--three">
          <button
            v-for="item in contactOptions"
            :key="item.value"
            type="button"
            class="segment"
            :class="{ active: modelValue.contactType === item.value }"
            :aria-pressed="modelValue.contactType === item.value"
            :disabled="disabled"
            @click="selectContactType(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
        <input
          v-model="contactValue"
          class="control"
          type="text"
          :inputmode="contactInputMode"
          :maxlength="BOOSTER_LIMITS.contactValueMax"
          :disabled="disabled || !modelValue.contactType"
          :placeholder="contactPlaceholder"
        >
      </fieldset>

      <div class="field">
        <span class="field-label">其他材料 <small>选填</small></span>
        <BoosterMaterialUploader
          v-model="materialImage"
          :disabled="disabled"
          @uploading-change="emit('uploading-change', $event)"
        />
      </div>

      <label class="field">
        <span class="field-label">邀请码 <small>选填</small></span>
        <input
          v-model="invitationCode"
          class="control"
          type="text"
          autocomplete="off"
          :maxlength="BOOSTER_LIMITS.invitationCodeMax"
          :disabled="disabled"
          placeholder="请输入邀请码"
        >
      </label>
    </div>
  </section>
</template>

<style scoped src="./BoosterApplicationForm.css"></style>
