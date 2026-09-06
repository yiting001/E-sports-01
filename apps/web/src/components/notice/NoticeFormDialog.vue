<script setup lang="ts">
/**
 * 通知编辑弹窗：标题 + 排序 + 启用开关 + 弹窗公告开关 + 火焰特效开关 + 富文本详情。
 * 新建与编辑复用同一表单，由父组件通过 isEdit 区分标题。
 */
import { NOTICE_LIMITS, type UpsertNoticePayload } from '@app/contracts';
import RichTextEditor from '@/components/common/RichTextEditor.vue';

const visible = defineModel<boolean>({ required: true });
const form = defineModel<UpsertNoticePayload>('form', { required: true });

defineProps<{ isEdit: boolean; submitting: boolean }>();
const emit = defineEmits<{ submit: [] }>();
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑通知' : '新建通知'"
    width="640px"
    destroy-on-close
  >
    <el-form label-width="72px">
      <el-form-item label="标题">
        <el-input
          v-model="form.title"
          :maxlength="NOTICE_LIMITS.titleMax"
          show-word-limit
          placeholder="公告条滚动展示的标题"
        />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number
          v-model="form.sort"
          :min="0"
          controls-position="right"
        />
        <span class="notice-form__hint">数值越小越靠前</span>
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="form.enabled" />
      </el-form-item>
      <el-form-item label="弹窗公告">
        <el-switch v-model="form.popup" />
        <span class="notice-form__hint">C 端首次进入弹窗展示最新一条弹窗公告</span>
      </el-form-item>
      <el-form-item label="火焰特效">
        <el-switch
          v-model="form.popupFlame"
          :disabled="!form.popup"
        />
        <span class="notice-form__hint">弹窗公告边框火焰特效，关闭后为普通弹窗</span>
      </el-form-item>
      <el-form-item label="详情">
        <rich-text-editor
          v-model="form.content"
          placeholder="通知详情（支持图片/视频）…"
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
.notice-form__hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
