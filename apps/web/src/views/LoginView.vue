<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth.store';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const mode = ref<'login' | 'register'>('login');
const loading = ref(false);
const form = reactive({ username: '', password: '', nickname: '' });

async function submit(): Promise<void> {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名与密码');
    return;
  }
  loading.value = true;
  try {
    if (mode.value === 'login') {
      await auth.login({ username: form.username, password: form.password });
    } else {
      await auth.register({
        username: form.username,
        password: form.password,
        nickname: form.nickname || undefined,
      });
    }
    const redirect = (route.query.redirect as string) || '/dashboard';
    await router.push(redirect);
  } catch {
    ElMessage.error(mode.value === 'login' ? '登录失败，请检查账号密码' : '注册失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login">
    <el-card class="card">
      <template #header>
        <div class="card-header">
          {{ mode === 'login' ? '登录' : '注册' }} · 基础设施平台
        </div>
      </template>
      <el-form
        label-width="72px"
        @submit.prevent
      >
        <el-form-item label="用户名">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-form-item
          v-if="mode === 'register'"
          label="昵称"
        >
          <el-input
            v-model="form.nickname"
            placeholder="选填"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="submit"
          >
            {{ mode === 'login' ? '登录' : '注册' }}
          </el-button>
          <el-button
            link
            @click="mode = mode === 'login' ? 'register' : 'login'"
          >
            {{ mode === 'login' ? '没有账号？去注册' : '已有账号？去登录' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f0f2f5;
}
.card {
  width: 420px;
}
.card-header {
  font-weight: 600;
}
</style>
