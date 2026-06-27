<script setup lang="ts">
import { AiEditor } from 'aieditor';
import 'aieditor/dist/style.css';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { uploadApi } from '@/api/upload.api';

/**
 * 富文本编辑器（封装 AiEditor）。
 * 以 HTML 字符串做 v-model；图片/视频上传复用现有 POST /upload 接口，回填返回 URL。
 */
const props = withDefaults(
  defineProps<{ modelValue: string; placeholder?: string }>(),
  { placeholder: '请输入内容…' },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const container = ref<HTMLDivElement | null>(null);
let editor: AiEditor | null = null;

/** AiEditor 上传适配器：走 uploadApi，成功返回其约定结构（errorCode=0 + data.src） */
async function uploadAdapter(file: File): Promise<Record<string, unknown>> {
  const uploaded = await uploadApi.upload(file);
  return { errorCode: 0, data: { src: uploaded.url, alt: file.name } };
}

onMounted(() => {
  if (!container.value) {
    return;
  }
  editor = new AiEditor({
    element: container.value,
    placeholder: props.placeholder,
    content: props.modelValue,
    image: { uploader: uploadAdapter },
    video: { uploader: uploadAdapter },
    onChange: (instance) => {
      const html = instance.getHtml();
      if (html !== props.modelValue) {
        emit('update:modelValue', html);
      }
    },
  });
});

watch(
  () => props.modelValue,
  (value) => {
    if (editor && value !== editor.getHtml()) {
      editor.setContent(value);
    }
  },
);

onBeforeUnmount(() => {
  editor?.destroy();
  editor = null;
});
</script>

<template>
  <div
    ref="container"
    class="rich-text-editor"
  />
</template>

<style scoped>
.rich-text-editor {
  width: 100%;
  min-height: 320px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}
</style>
