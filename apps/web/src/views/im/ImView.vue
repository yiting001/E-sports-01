<script setup lang="ts">
import type { ChatMessage } from '@app/contracts';
import { MessageType } from '@app/contracts';
import { nextTick, onBeforeUnmount, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createImSocket } from '@/composables/use-im-socket';
import { useAuthStore } from '@/stores/auth.store';

const auth = useAuthStore();
const im = createImSocket();

const conversationId = ref('room-demo');
const joined = ref(false);
const messages = ref<ChatMessage[]>([]);
const draft = ref('');
const draftType = ref<MessageType>(MessageType.Text);
const listRef = ref<HTMLElement | null>(null);

const typeOptions = [
  { label: '文字', value: MessageType.Text },
  { label: '图片', value: MessageType.Image },
  { label: '视频', value: MessageType.Video },
];

async function scrollToBottom(): Promise<void> {
  await nextTick();
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight;
  }
}

async function connect(): Promise<void> {
  if (!conversationId.value) {
    ElMessage.warning('请输入会话 ID');
    return;
  }
  im.connect();
  im.onReceive((message) => {
    messages.value.push(message);
    void scrollToBottom();
  });
  im.onError((error) => ElMessage.error(error.message));
  messages.value = await im.join(conversationId.value);
  joined.value = true;
  await scrollToBottom();
}

function send(): void {
  if (!draft.value) {
    ElMessage.warning('请输入消息内容或媒体地址');
    return;
  }
  im.send({ conversationId: conversationId.value, type: draftType.value, content: draft.value });
  draft.value = '';
}

function isSelf(message: ChatMessage): boolean {
  return message.senderId === auth.profile?.id;
}

onBeforeUnmount(() => im.disconnect());
</script>

<template>
  <el-card>
    <div class="join-bar">
      <el-input
        v-model="conversationId"
        placeholder="会话 ID"
        :disabled="joined"
        class="cid"
      />
      <el-button
        type="primary"
        :disabled="joined"
        @click="connect"
      >
        进入会话
      </el-button>
      <el-tag
        v-if="joined"
        type="success"
      >
        已连接
      </el-tag>
    </div>

    <div
      ref="listRef"
      class="messages"
    >
      <div
        v-for="m in messages"
        :key="m.id"
        class="message"
        :class="{ self: isSelf(m) }"
      >
        <div class="meta">
          {{ m.senderId.slice(0, 8) }} · {{ m.type }}
        </div>
        <div
          v-if="m.type === MessageType.Text"
          class="bubble"
        >
          {{ m.content }}
        </div>
        <img
          v-else-if="m.type === MessageType.Image"
          :src="m.content"
          class="media"
          alt="image"
        >
        <video
          v-else
          :src="m.content"
          controls
          class="media"
        />
      </div>
      <el-empty
        v-if="joined && messages.length === 0"
        description="暂无消息"
      />
    </div>

    <div
      v-if="joined"
      class="composer"
    >
      <el-select
        v-model="draftType"
        class="type"
      >
        <el-option
          v-for="opt in typeOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
      <el-input
        v-model="draft"
        :placeholder="draftType === MessageType.Text ? '输入文字消息' : '输入媒体资源 URL'"
        @keyup.enter="send"
      />
      <el-button
        type="primary"
        @click="send"
      >
        发送
      </el-button>
    </div>
  </el-card>
</template>

<style scoped>
.join-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.cid {
  width: 240px;
}
.messages {
  height: 420px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px;
}
.message {
  margin-bottom: 12px;
}
.message.self {
  text-align: right;
}
.meta {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}
.bubble {
  display: inline-block;
  padding: 8px 12px;
  background: #ecf5ff;
  border-radius: 6px;
}
.media {
  max-width: 240px;
  border-radius: 6px;
}
.composer {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.type {
  width: 110px;
  flex: none;
}
</style>
