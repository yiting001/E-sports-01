<script setup lang="ts">
/**
 * 活动编辑弹窗：标题/封面图 URL/起止时间/排序/启用开关 + 富文本详情。
 * 新建与编辑复用同一表单，由父组件通过 isEdit 区分标题。
 */
import { computed } from 'vue';
import { ACTIVITY_LIMITS, type UpsertActivityPayload } from '@app/contracts';
import RichTextEditor from '@/components/common/RichTextEditor.vue';

const visible = defineModel<boolean>({ required: true });
const form = defineModel<UpsertActivityPayload>('form', { required: true });

defineProps<{ isEdit: boolean; submitting: boolean }>();
const emit = defineEmits<{ submit: [] }>();

/** 活动起止区间双向换算（el-date-picker 区间 → startAt/endAt） */
const timeRange = computed({
  get: () =>
    form.value.startAt && form.value.endAt
      ? [form.value.startAt, form.value.endAt]
      : [],
  set: (range: string[]) => {
    form.value = {
      ...form.value,
      startAt: range?.[0] ?? '',
      endAt: range?.[1] ?? '',
    };
  },
});
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑活动' : '发布活动'"
    width="640px"
    destroy-on-close
  >
    <el-form label-width="72px">
      <el-form-item label="标题">
        <el-input
          v-model="form.title"
          :maxlength="ACTIVITY_LIMITS.titleMax"
          show-word-limit
          placeholder="活动标题"
        />
      </el-form-item>
      <el-form-item label="封面图">
        <el-input
          v-model="form.cover"
          :maxlength="ACTIVITY_LIMITS.coverMax"
          placeholder="封面图 URL（可留空）"
        />
      </el-form-item>
      <el-form-item label="活动时间">
        <el-date-picker
          v-model="timeRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="YYYY-MM-DDTHH:mm:ssZ"
        />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number
          v-model="form.sort"
          :min="0"
          controls-position="right"
        />
        <span class="activity-form__hint">数值越小越靠前</span>
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="form.enabled" />
      </el-form-item>
      <el-form-item label="详情">
        <rich-text-editor
          v-model="form.content"
          placeholder="活动详情（支持图片/视频）…"
        />
      </el-form-item>
    </el-form>
    <template #footer>
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
    </template>
  </el-dialog>
</template>

<style scoped>
.activity-form__hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
