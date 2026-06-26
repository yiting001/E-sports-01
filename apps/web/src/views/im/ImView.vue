<script setup lang="ts">
import type {
  ChatMessage,
  ConversationDetailView,
  ConversationView,
  UserView,
} from '@app/contracts';
import {
  ConversationType,
  MessageType,
  PERMS,
  SYSTEM_SENDER_ID,
} from '@app/contracts';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { createImSocket } from '@/composables/use-im-socket';
import { imApi } from '@/api/im.api';
import { userApi } from '@/api/user.api';
import { useAuthStore } from '@/stores/auth.store';

const auth = useAuthStore();
const im = createImSocket();

const conversations = ref<ConversationView[]>([]);
const activeId = ref<string | null>(null);
const messages = ref<ChatMessage[]>([]);
const draft = ref('');
const draftType = ref<MessageType>(MessageType.Text);
const listRef = ref<HTMLElement | null>(null);

const users = ref<UserView[]>([]);
const groupDialog = ref(false);
const groupTitle = ref('');
const groupMembers = ref<string[]>([]);
const memberDialog = ref(false);
const detail = ref<ConversationDetailView | null>(null);
const addPicks = ref<string[]>([]);

const typeOptions = [
  { label: '文字', value: MessageType.Text },
  { label: '图片', value: MessageType.Image },
  { label: '视频', value: MessageType.Video },
];

const canManage = computed(() => auth.hasPermission(PERMS.im.conversationManage));
const canCreateGroup = computed(() =>
  auth.hasPermission(PERMS.im.conversationCreate),
);
const active = computed(() =>
  conversations.value.find((c) => c.id === activeId.value),
);
const isGroup = computed(() => active.value?.type === ConversationType.Group);

const typeLabel: Record<ConversationType, string> = {
  [ConversationType.Private]: '私聊',
  [ConversationType.Group]: '群聊',
  [ConversationType.Service]: '客服',
};

const memberCandidates = computed(() =>
  users.value.filter(
    (u) => !detail.value?.members.some((m) => m.userId === u.id),
  ),
);

async function scrollToBottom(): Promise<void> {
  await nextTick();
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight;
  }
}

function upsertConversation(view: ConversationView): void {
  const idx = conversations.value.findIndex((c) => c.id === view.id);
  if (idx >= 0) {
    conversations.value[idx] = view;
  } else {
    conversations.value.unshift(view);
  }
}

async function loadConversations(): Promise<void> {
  conversations.value = await imApi.listConversations();
}

async function selectConversation(id: string): Promise<void> {
  activeId.value = id;
  messages.value = await im.join(id);
  const item = conversations.value.find((c) => c.id === id);
  if (item) {
    item.unread = 0;
  }
  await scrollToBottom();
}

function send(): void {
  if (!activeId.value) {
    return;
  }
  if (!draft.value) {
    ElMessage.warning('请输入消息内容或媒体地址');
    return;
  }
  im.send({
    conversationId: activeId.value,
    type: draftType.value,
    content: draft.value,
  });
  draft.value = '';
}

function isSelf(message: ChatMessage): boolean {
  return message.senderId === auth.profile?.id;
}

function isSystem(message: ChatMessage): boolean {
  return message.senderId === SYSTEM_SENDER_ID;
}

async function openGroupDialog(): Promise<void> {
  if (users.value.length === 0) {
    users.value = (await userApi.list(1, 200)).list;
  }
  groupTitle.value = '';
  groupMembers.value = [];
  groupDialog.value = true;
}

async function createGroup(): Promise<void> {
  if (!groupTitle.value.trim()) {
    ElMessage.warning('请输入群名称');
    return;
  }
  const view = await imApi.createGroup({
    title: groupTitle.value.trim(),
    memberIds: groupMembers.value,
  });
  upsertConversation(view);
  groupDialog.value = false;
  await selectConversation(view.id);
}

async function startService(): Promise<void> {
  const view = await imApi.startService({ subject: '咨询' });
  upsertConversation(view);
  await selectConversation(view.id);
  ElMessage.success('已发起客服会话');
}

async function openMemberDialog(): Promise<void> {
  if (!activeId.value) {
    return;
  }
  if (users.value.length === 0) {
    users.value = (await userApi.list(1, 200)).list;
  }
  detail.value = await imApi.conversationDetail(activeId.value);
  addPicks.value = [];
  memberDialog.value = true;
}

async function addMembers(): Promise<void> {
  if (!activeId.value || addPicks.value.length === 0) {
    return;
  }
  detail.value = await imApi.addMembers(activeId.value, {
    userIds: addPicks.value,
  });
  addPicks.value = [];
  await loadConversations();
}

async function removeMember(userId: string): Promise<void> {
  if (!activeId.value) {
    return;
  }
  await imApi.removeMember(activeId.value, userId);
  detail.value = await imApi.conversationDetail(activeId.value);
  await loadConversations();
}

async function rename(): Promise<void> {
  if (!activeId.value) {
    return;
  }
  const { value } = await ElMessageBox.prompt('输入新的群名称', '群改名', {
    inputValue: active.value?.title ?? '',
  });
  const view = await imApi.rename(activeId.value, { title: value.trim() });
  upsertConversation(view);
}

async function leave(): Promise<void> {
  if (!activeId.value) {
    return;
  }
  await ElMessageBox.confirm('确认退出该会话？', '退群', { type: 'warning' });
  const id = activeId.value;
  await imApi.leave(id);
  conversations.value = conversations.value.filter((c) => c.id !== id);
  activeId.value = null;
  messages.value = [];
  memberDialog.value = false;
}

onMounted(async () => {
  im.connect();
  im.onError((error) => ElMessage.error(error.message));
  im.onReceive((message) => {
    if (message.conversationId === activeId.value) {
      messages.value.push(message);
      void scrollToBottom();
    }
    const item = conversations.value.find(
      (c) => c.id === message.conversationId,
    );
    if (item) {
      item.lastMessage = message;
      if (message.conversationId !== activeId.value) {
        item.unread += 1;
      }
    } else {
      void loadConversations();
    }
  });
  im.onConversation((view) => upsertConversation(view));
  await loadConversations();
});

onBeforeUnmount(() => im.disconnect());
</script>

<template>
  <div class="im">
    <aside class="sidebar">
      <div class="toolbar">
        <el-button
          v-if="canCreateGroup"
          type="primary"
          size="small"
          @click="openGroupDialog"
        >
          建群
        </el-button>
        <el-button
          size="small"
          @click="startService"
        >
          联系客服
        </el-button>
      </div>
      <el-scrollbar class="conv-list">
        <div
          v-for="c in conversations"
          :key="c.id"
          class="conv"
          :class="{ active: c.id === activeId }"
          @click="selectConversation(c.id)"
        >
          <div class="conv-top">
            <span class="conv-title">{{ c.title }}</span>
            <el-badge
              v-if="c.unread > 0"
              :value="c.unread"
            />
          </div>
          <div class="conv-sub">
            <el-tag
              size="small"
              effect="plain"
            >
              {{ typeLabel[c.type] }}
            </el-tag>
            <span class="preview">{{ c.lastMessage?.content ?? '' }}</span>
          </div>
        </div>
        <el-empty
          v-if="conversations.length === 0"
          description="暂无会话"
        />
      </el-scrollbar>
    </aside>

    <section class="panel">
      <template v-if="active">
        <header class="panel-head">
          <span class="head-title">{{ active.title }}</span>
          <div class="head-actions">
            <el-button
              v-if="isGroup && canManage"
              size="small"
              @click="rename"
            >
              改名
            </el-button>
            <el-button
              v-if="isGroup"
              size="small"
              @click="openMemberDialog"
            >
              成员
            </el-button>
            <el-button
              v-if="isGroup"
              size="small"
              type="danger"
              @click="leave"
            >
              退群
            </el-button>
          </div>
        </header>

        <div
          ref="listRef"
          class="messages"
        >
          <div
            v-for="m in messages"
            :key="m.id"
          >
            <div
              v-if="isSystem(m)"
              class="system"
            >
              {{ m.content }}
            </div>
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
      </template>
      <el-empty
        v-else
        description="选择左侧会话开始聊天"
        class="placeholder"
      />
    </section>

    <el-dialog
      v-model="groupDialog"
      title="创建群聊"
      width="420px"
    >
      <el-form label-width="72px">
        <el-form-item label="群名称">
          <el-input
            v-model="groupTitle"
            maxlength="128"
          />
        </el-form-item>
        <el-form-item label="成员">
          <el-select
            v-model="groupMembers"
            multiple
            filterable
            placeholder="选择成员"
            class="full"
          >
            <el-option
              v-for="u in users"
              :key="u.id"
              :label="u.nickname || u.username"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="createGroup"
        >
          创建
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="memberDialog"
      title="群成员管理"
      width="460px"
    >
      <div
        v-if="canManage"
        class="add-row"
      >
        <el-select
          v-model="addPicks"
          multiple
          filterable
          placeholder="选择要加入的成员"
          class="full"
        >
          <el-option
            v-for="u in memberCandidates"
            :key="u.id"
            :label="u.nickname || u.username"
            :value="u.id"
          />
        </el-select>
        <el-button
          type="primary"
          @click="addMembers"
        >
          加入
        </el-button>
      </div>
      <el-table
        :data="detail?.members ?? []"
        size="small"
      >
        <el-table-column
          prop="username"
          label="成员"
        />
        <el-table-column
          prop="role"
          label="角色"
          width="100"
        />
        <el-table-column
          label="操作"
          width="90"
        >
          <template #default="{ row }">
            <el-button
              v-if="canManage && row.role !== 'owner'"
              type="danger"
              size="small"
              link
              @click="removeMember(row.userId)"
            >
              移除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<style scoped>
.im {
  display: flex;
  height: calc(100vh - 140px);
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}
.sidebar {
  width: 260px;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
}
.toolbar {
  display: flex;
  gap: 8px;
  padding: 10px;
  border-bottom: 1px solid #ebeef5;
}
.conv-list {
  flex: 1;
}
.conv {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f5f7fa;
}
.conv:hover,
.conv.active {
  background: #ecf5ff;
}
.conv-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.conv-title {
  font-weight: 600;
}
.conv-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.preview {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.head-actions {
  display: flex;
  gap: 8px;
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
.type {
  width: 110px;
  flex: none;
}
.placeholder {
  margin: auto;
}
.full {
  width: 100%;
}
.add-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
</style>
