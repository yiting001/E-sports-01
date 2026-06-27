<script setup lang="ts">
import type { ChatMessage, ServiceQueueItemView } from '@app/contracts';
import { MessageType, SYSTEM_SENDER_ID } from '@app/contracts';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { createImSocket } from '@/composables/use-im-socket';
import { imApi } from '@/api/im.api';
import { useAuthStore } from '@/stores/auth.store';
import { sanitizeHtml } from '@/utils/sanitize-html';

const auth = useAuthStore();
const im = createImSocket();

const queue = ref<ServiceQueueItemView[]>([]);
const activeId = ref<string | null>(null);
const activeTitle = ref('');
const messages = ref<ChatMessage[]>([]);
const draft = ref('');
const listRef = ref<HTMLElement | null>(null);

async function scrollToBottom(): Promise<void> {
  await nextTick();
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight;
  }
}

async function loadQueue(): Promise<void> {
  queue.value = await imApi.serviceQueue();
}

async function claim(item: ServiceQueueItemView): Promise<void> {
  const view = await imApi.claimService(item.conversationId);
  queue.value = queue.value.filter(
    (q) => q.conversationId !== item.conversationId,
  );
  activeId.value = view.id;
  activeTitle.value = view.title;
  messages.value = await im.join(view.id);
  await scrollToBottom();
}

function send(): void {
  if (!activeId.value || !draft.value) {
    return;
  }
  im.send({
    conversationId: activeId.value,
    type: MessageType.Text,
    content: draft.value,
  });
  draft.value = '';
}

async function close(): Promise<void> {
  if (!activeId.value) {
    return;
  }
  await ElMessageBox.confirm('确认结束该客服会话？', '结束会话', {
    type: 'warning',
  });
  await imApi.closeService(activeId.value);
  ElMessage.success('会话已结束');
  activeId.value = null;
  messages.value = [];
}

function isSelf(message: ChatMessage): boolean {
  return message.senderId === auth.profile?.id;
}

function isSystem(message: ChatMessage): boolean {
  return message.senderId === SYSTEM_SENDER_ID;
}

onMounted(async () => {
  im.connect();
  im.onError((error) => ElMessage.error(error.message));
  im.watchService();
  im.onServiceQueued((item) => {
    if (!queue.value.some((q) => q.conversationId === item.conversationId)) {
      queue.value.unshift(item);
    }
  });
  im.onReceive((message) => {
    if (message.conversationId === activeId.value) {
      messages.value.push(message);
      void scrollToBottom();
    }
  });
  await loadQueue();
});

onBeforeUnmount(() => im.disconnect());
</script>

<template>
  <div class="console">
    <aside class="queue">
      <header class="queue-head">
        待接入队列
        <el-tag
          size="small"
          type="warning"
        >
          {{ queue.length }}
        </el-tag>
      </header>
      <el-scrollbar class="queue-list">
        <div
          v-for="q in queue"
          :key="q.conversationId"
          class="queue-item"
        >
          <div class="visitor">
            {{ q.visitorName }}
          </div>
          <div class="subject">
            {{ q.subject || '咨询' }}
          </div>
          <el-button
            type="primary"
            size="small"
            @click="claim(q)"
          >
            认领
          </el-button>
        </div>
        <el-empty
          v-if="queue.length === 0"
          description="暂无等待访客"
        />
      </el-scrollbar>
    </aside>

    <section class="panel">
      <template v-if="activeId">
        <header class="panel-head">
          <span class="head-title">{{ activeTitle }}</span>
          <el-button
            type="danger"
            size="small"
            @click="close"
          >
            结束会话
          </el-button>
        </header>
        <div
          ref="listRef"
          class="messages"
        >
          <div
            v-for="m in messages"
            :key="m.id"
          >
            <!-- 系统消息（如客服欢迎语）为富文本，渲染前已 DOMPurify 净化 -->
            <!-- eslint-disable vue/no-v-html -->
            <div
              v-if="isSystem(m)"
              class="system"
              v-html="sanitizeHtml(m.content)"
            />
            <!-- eslint-enable vue/no-v-html -->
            <div
              v-else
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
          </div>
          <el-empty
            v-if="messages.length === 0"
            description="暂无消息"
          />
        </div>
        <div class="composer">
          <el-input
            v-model="draft"
            placeholder="输入回复内容"
            @keyup.enter="send"
          />
          <el-button
            type="primary"
            @click="send"
          >
            发送
          </el-button>
        </div>
      </template>
      <el-empty
        v-else
        description="从队列认领访客开始接待"
        class="placeholder"
      />
    </section>
  </div>
</template>

<style scoped>
.console {
  display: flex;
  height: calc(100vh - 140px);
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}
.queue {
  width: 260px;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
}
.queue-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  font-weight: 600;
  border-bottom: 1px solid #ebeef5;
}
.queue-list {
  flex: 1;
}
.queue-item {
  padding: 10px 12px;
  border-bottom: 1px solid #f5f7fa;
}
.visitor {
  font-weight: 600;
}
.subject {
  font-size: 12px;
  color: #909399;
  margin: 4px 0 8px;
}
.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
}
.head-title {
  font-weight: 600;
}
.messages {
  flex: 1;
  overflow-y: auto;
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
.system {
  text-align: center;
  font-size: 12px;
  color: #909399;
  margin: 8px 0;
}
.composer {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #ebeef5;
}
.placeholder {
  margin: auto;
}
</style>
