<script setup lang="ts">
import type { ChatMessage, ServiceQueueItemView } from '@app/contracts';
import { MessageType, SYSTEM_SENDER_ID } from '@app/contracts';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  CloseBold,
  Headset,
  Promotion,
  Refresh,
  UserFilled,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { imApi } from '@/api/im.api';
import { createImSocket } from '@/composables/use-im-socket';
import { useAuthStore } from '@/stores/auth.store';
import { sanitizeHtml } from '@/utils/sanitize-html';
import {
  conversationInitial,
  formatImTime,
  messageTypeLabel,
} from '@/components/im/im-ui';
import './ServiceConsoleChat.css';
import './ServiceConsoleView.css';
import './ServiceConsoleView.responsive.css';

const auth = useAuthStore();
const im = createImSocket();

const queue = ref<ServiceQueueItemView[]>([]);
const activeId = ref<string | null>(null);
const activeTitle = ref('');
const activeVisitor = ref('');
const messages = ref<ChatMessage[]>([]);
const draft = ref('');
const listRef = ref<HTMLElement | null>(null);

const waitingCount = computed(() => queue.value.length);
const activeLabel = computed(() => activeVisitor.value || activeTitle.value || '访客');
const activeMessageCount = computed(
  () => messages.value.filter((message) => !isSystem(message)).length,
);

function waitForFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function scrollToBottom(): Promise<void> {
  await nextTick();
  await waitForFrame();
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
  activeVisitor.value = item.visitorName;
  messages.value = await im.join(view.id);
  await scrollToBottom();
}

function send(): void {
  if (!activeId.value || !draft.value.trim()) {
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
  activeTitle.value = '';
  activeVisitor.value = '';
  messages.value = [];
  draft.value = '';
}

function isSelf(message: ChatMessage): boolean {
  return message.senderId === auth.profile?.id;
}

function isSystem(message: ChatMessage): boolean {
  return message.senderId === SYSTEM_SENDER_ID;
}

function waitingText(value: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - value) / 60000));
  if (minutes < 1) {
    return '刚刚';
  }
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`;
}

function queueInitial(item: ServiceQueueItemView): string {
  return conversationInitial(item.visitorName || item.subject || '访客');
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
  <section class="admin-page service-console-page">
    <section class="service-workspace">
      <aside class="service-queue">
        <header class="service-queue__head">
          <div class="service-heading">
            <span class="service-heading__icon">
              <el-icon><Headset /></el-icon>
            </span>
            <div>
              <h2>客服接待</h2>
              <small>待接入队列</small>
            </div>
          </div>
          <el-tooltip content="刷新队列">
            <el-button
              :icon="Refresh"
              circle
              @click="loadQueue"
            />
          </el-tooltip>
        </header>

        <div class="service-queue__summary">
          <span>
            <strong>{{ waitingCount }}</strong>
            <small>待接入</small>
          </span>
          <span>
            <strong>{{ activeId ? 1 : 0 }}</strong>
            <small>接待中</small>
          </span>
        </div>

        <el-scrollbar class="service-queue__list">
          <article
            v-for="item in queue"
            :key="item.conversationId"
            class="service-ticket"
          >
            <div class="service-ticket__top">
              <span class="service-ticket__avatar">
                {{ queueInitial(item) }}
              </span>
              <div>
                <strong>{{ item.visitorName }}</strong>
                <small>{{ formatImTime(item.waitingSince) }}</small>
              </div>
            </div>
            <p>{{ item.subject || '咨询' }}</p>
            <div class="service-ticket__foot">
              <span>等待 {{ waitingText(item.waitingSince) }}</span>
              <el-button
                type="primary"
                size="small"
                @click="claim(item)"
              >
                认领
              </el-button>
            </div>
          </article>

          <div
            v-if="queue.length === 0"
            class="service-queue-empty"
          >
            <span class="service-queue-empty__icon">
              <el-icon><Headset /></el-icon>
            </span>
            <strong>暂无等待访客</strong>
            <small>新访客进入队列后会实时出现在这里</small>
            <el-button
              :icon="Refresh"
              @click="loadQueue"
            >
              刷新队列
            </el-button>
          </div>
        </el-scrollbar>
      </aside>

      <section :class="['service-panel', { 'is-empty': !activeId }]">
        <template v-if="activeId">
          <header class="service-panel__head">
            <div class="service-panel__identity">
              <span class="service-panel__avatar">
                <el-icon><UserFilled /></el-icon>
              </span>
              <div>
                <h2>{{ activeLabel }}</h2>
                <span class="service-panel__meta">
                  <span class="service-status">接待中</span>
                  <small>{{ activeMessageCount }} 条消息</small>
                  <small>{{ activeTitle || '客服会话' }}</small>
                </span>
              </div>
            </div>
            <el-button
              type="danger"
              :icon="CloseBold"
              @click="close"
            >
              结束会话
            </el-button>
          </header>

          <div class="service-message-stage">
            <div
              ref="listRef"
              class="service-messages"
            >
              <div
                v-for="message in messages"
                :key="message.id"
              >
                <!-- 系统消息可能包含富文本欢迎语，渲染前统一净化 -->
                <!-- eslint-disable vue/no-v-html -->
                <div
                  v-if="isSystem(message)"
                  class="service-system"
                  v-html="sanitizeHtml(message.content)"
                />
                <!-- eslint-enable vue/no-v-html -->
                <div
                  v-else
                  :class="['service-message', { 'is-self': isSelf(message) }]"
                >
                  <span class="service-message__avatar">
                    {{ conversationInitial(message.senderId) }}
                  </span>
                  <div class="service-message__content">
                    <div class="service-message__meta">
                      <span>{{ message.senderId.slice(0, 8) }}</span>
                      <span>{{ messageTypeLabel(message.type) }}</span>
                      <time>{{ formatImTime(message.createdAt) }}</time>
                    </div>
                    <div
                      v-if="message.type === MessageType.Text"
                      class="service-bubble"
                    >
                      {{ message.content }}
                    </div>
                    <img
                      v-else-if="message.type === MessageType.Image"
                      :src="message.content"
                      class="service-media"
                      alt="客服会话图片"
                      @load="scrollToBottom"
                    >
                    <video
                      v-else
                      :src="message.content"
                      controls
                      class="service-media"
                      @loadedmetadata="scrollToBottom"
                    />
                  </div>
                </div>
              </div>
              <el-empty
                v-if="messages.length === 0"
                :image-size="110"
                description="暂无消息"
              />
            </div>
          </div>

          <div class="service-composer">
            <div class="service-composer__box">
              <div class="service-composer__bar">
                <span>文字回复</span>
              </div>
              <el-input
                v-model="draft"
                type="textarea"
                resize="none"
                :autosize="{ minRows: 3, maxRows: 6 }"
                class="service-composer__input"
                placeholder="输入回复内容"
                @keydown.enter.exact.prevent="send"
              />
              <div class="service-composer__footer">
                <span class="service-composer__state">
                  {{ draft.trim() ? '已输入内容' : '等待输入' }}
                </span>
                <el-button
                  type="primary"
                  :icon="Promotion"
                  :disabled="!draft.trim()"
                  @click="send"
                >
                  发送
                </el-button>
              </div>
            </div>
          </div>
        </template>

        <div
          v-else
          class="service-placeholder"
        >
          <div class="service-empty-state">
            <strong>从队列认领访客开始接待</strong>
            <small>暂无接待中的会话</small>
          </div>
        </div>
      </section>
    </section>
  </section>
</template>
