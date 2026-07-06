<script setup lang="ts">
/**
 * 个人信息编辑页（全屏）：自助维护头像/昵称/绑定手机号，保存后回灌 auth.store 即时生效；
 * 页尾提供「退出登录」（二次确认后清空登录态回首页）。
 * 后端复用既有 PUT /auth/profile 与 POST /upload/self，本页只做表单编排。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '@/components/common/AppIcon.vue';
import { authApi } from '@/api/auth.api';
import { uploadApi } from '@/api/upload.api';
import { useToast } from '@/composables/use-toast';
import { useAuthStore } from '@/stores/auth.store';
import './ProfileEditView.responsive.css';

const router = useRouter();
const toast = useToast();
const auth = useAuthStore();

const nickname = ref('');
const phone = ref('');
const avatar = ref('');
const uploading = ref(false);
const saving = ref(false);
/** 是否展示退出登录确认弹层 */
const confirmingLogout = ref(false);

const fileInput = ref<HTMLInputElement | null>(null);

/** 表单是否有改动（无改动时禁用保存） */
const dirty = computed(() => {
  const p = auth.profile;
  if (!p) {
    return false;
  }
  return (
    nickname.value.trim() !== p.nickname ||
    phone.value.trim() !== p.phone ||
    avatar.value !== p.avatar
  );
});

/** 用当前资料填充表单 */
function fill(): void {
  const p = auth.profile;
  if (p) {
    nickname.value = p.nickname;
    phone.value = p.phone;
    avatar.value = p.avatar;
  }
}

onMounted(async () => {
  if (!auth.profile) {
    await auth.loadProfile();
  }
  fill();
});

/** 选择图片后自助上传并预览为新头像 */
async function onFileChange(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || uploading.value) {
    return;
  }
  uploading.value = true;
  try {
    const uploaded = await uploadApi.uploadSelf(file);
    avatar.value = uploaded.url;
  } finally {
    uploading.value = false;
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
}

/** 保存资料并回灌 store，侧栏/头部即时刷新 */
async function save(): Promise<void> {
  if (!dirty.value || saving.value) {
    return;
  }
  saving.value = true;
  try {
    await authApi.updateProfile({
      nickname: nickname.value.trim(),
      avatar: avatar.value,
      phone: phone.value.trim(),
    });
    await auth.loadProfile();
    fill();
    toast.show('资料已保存');
  } finally {
    saving.value = false;
  }
}

/** 确认退出：清空登录态并回首页 */
function logout(): void {
  auth.logout();
  toast.show('已退出登录');
  void router.replace({ name: 'home' });
}
</script>

<template>
  <div class="edit-page client-page">
    <header class="bar">
      <div class="bar-inner">
        <button
          class="back"
          aria-label="返回"
          @click="router.back()"
        >
          <AppIcon
            name="chevron"
            :size="20"
          />
        </button>
        <span class="name">个人信息</span>
      </div>
    </header>

    <div class="scroll">
      <section class="card form">
        <div class="row row--avatar">
          <span class="label">头像</span>
          <button
            class="avatar"
            :style="avatar ? { backgroundImage: `url(${avatar})` } : undefined"
            :disabled="uploading"
            @click="fileInput?.click()"
          >
            <AppIcon
              v-if="!avatar"
              name="user"
              :size="30"
            />
            <span class="avatar-tip">{{ uploading ? '上传中…' : '点击更换' }}</span>
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="file"
            @change="onFileChange"
          >
        </div>
        <div class="row">
          <span class="label">昵称</span>
          <input
            v-model="nickname"
            class="input"
            maxlength="32"
            placeholder="填写昵称"
          >
        </div>
        <div class="row">
          <span class="label">手机号</span>
          <input
            v-model="phone"
            class="input"
            maxlength="11"
            placeholder="绑定手机号（留空解绑）"
          >
        </div>
      </section>

      <div class="edit-actions">
        <button
          class="save"
          :disabled="!dirty || saving"
          @click="save"
        >
          {{ saving ? '保存中…' : '保存' }}
        </button>

        <button
          class="logout"
          @click="confirmingLogout = true"
        >
          退出登录
        </button>
      </div>
    </div>

    <div
      v-if="confirmingLogout"
      class="mask"
      @click.self="confirmingLogout = false"
    >
      <div class="dialog card">
        <h3 class="title">
          退出登录
        </h3>
        <p class="tip">
          确定要退出当前账号吗？
        </p>
        <div class="actions">
          <button
            class="cancel"
            @click="confirmingLogout = false"
          >
            取消
          </button>
          <button
            class="confirm"
            @click="logout"
          >
            退出
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edit-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--c-bg);
}

.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}

.bar-inner {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}

.back {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--c-text);
  transform: rotate(180deg);
}

.name {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 640px;
  width: 100%;
  margin: 0 auto;
}

.form {
  padding: 4px 14px;
}

.edit-actions {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--c-border);
}

.row:last-child {
  border-bottom: none;
}

.label {
  flex-shrink: 0;
  width: 56px;
  font-size: 14px;
  color: var(--c-text-secondary);
}

.input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--c-text);
  font-size: 14px;
}

.row--avatar {
  justify-content: flex-start;
}

.avatar {
  position: relative;
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  background: var(--c-surface-2);
  background-size: cover;
  background-position: center;
  border: 1px solid var(--c-accent-dim);
  color: var(--c-text-muted);
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
}

.avatar-tip {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  font-size: 10px;
  padding: 2px 0;
  color: var(--c-text);
  background: color-mix(in srgb, var(--c-bg) 70%, transparent);
}

.file {
  display: none;
}

.save {
  padding: 12px;
  font-size: 15px;
  font-weight: 800;
  font-style: italic;
  color: var(--c-bg);
  background: var(--c-accent);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.save:disabled {
  opacity: 0.5;
}

.logout {
  padding: 12px;
  font-size: 15px;
  font-weight: 700;
  color: var(--c-danger);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.mask {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 55%);
  z-index: 30;
}

.dialog {
  width: min(320px, calc(100vw - 48px));
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.title {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.tip {
  font-size: 13px;
  color: var(--c-text-secondary);
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.cancel {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: var(--c-surface-2);
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
}

.confirm {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  color: var(--c-bg);
  background: var(--c-danger);
  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
}
</style>
