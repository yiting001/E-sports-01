<script setup lang="ts">
/**
 * 活动编辑抽屉：标题/封面上传/起止时间/排序/启用开关 + 富文本详情。
 * 新建与编辑复用同一表单，由父组件通过 isEdit 区分标题。
 */
import { computed } from 'vue';
import { ACTIVITY_LIMITS, type UpsertActivityPayload } from '@app/contracts';
import ImageUploader from '@/components/common/ImageUploader.vue';
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
  <el-drawer
    v-model="visible"
    :title="isEdit ? '编辑活动' : '发布活动'"
    size="680px"
    class="admin-drawer activity-form-drawer"
    destroy-on-close
  >
    <el-form
      class="activity-form"
      label-width="88px"
    >
      <el-form-item label="标题">
        <el-input
          v-model="form.title"
          :maxlength="ACTIVITY_LIMITS.titleMax"
          show-word-limit
          placeholder="活动标题"
        />
      </el-form-item>
      <el-form-item label="封面图">
        <div class="activity-form__cover">
          <image-uploader
            v-model="form.cover"
            :show-url="false"
          />
          <span class="activity-form__hint">上传活动封面，列表与 C 端详情将复用这张图</span>
        </div>
      </el-form-item>
      <el-form-item label="活动时间">
        <el-date-picker
          v-model="timeRange"
          class="activity-form__range"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="YYYY-MM-DDTHH:mm:ssZ"
        />
      </el-form-item>
      <el-form-item label="排序">
        <div class="activity-form__inline">
          <el-input-number
            v-model="form.sort"
            :min="0"
            controls-position="right"
          />
          <span class="activity-form__hint">数值越小越靠前</span>
        </div>
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
.activity-form {
  max-width: 100%;
}

.activity-form__range {
  width: 100%;
}

.activity-form__inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.activity-form__cover {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-form__cover :deep(.image-uploader__trigger) {
  width: 220px;
  height: 124px;
  border-radius: 4px;
}

.activity-form__cover :deep(.image-uploader__preview) {
  object-fit: cover;
}

.activity-form__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
