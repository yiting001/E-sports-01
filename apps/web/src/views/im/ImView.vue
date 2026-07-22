<script setup lang="ts">
import type {
  ChatMessage,
  ConversationDetailView,
  ConversationView,
  UserView,
} from "@app/contracts";
import { MessageType, PERMS, SYSTEM_SENDER_ID } from "@app/contracts";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { imApi } from "@/api/im.api";
import { uploadApi } from "@/api/upload.api";
import { userApi } from "@/api/user.api";
import ImChatPanel from "@/components/im/ImChatPanel.vue";
import ImConversationList from "@/components/im/ImConversationList.vue";
import ImGroupDialog from "@/components/im/ImGroupDialog.vue";
import ImMemberDialog from "@/components/im/ImMemberDialog.vue";
import ImMessageSearchDialog from "@/components/im/ImMessageSearchDialog.vue";
import { createImSocket } from "@/composables/use-im-socket";
import { useAuthStore } from "@/stores/auth.store";
import { useMenuBadgeStore } from "@/stores/menu-badge.store";
import "./ImChatPanel.css";
import "./ImView.css";
import "./ImView.responsive.css";

const auth = useAuthStore();
const menuBadges = useMenuBadgeStore();
const route = useRoute();
const im = createImSocket();

const conversations = ref<ConversationView[]>([]);
const activeId = ref<string | null>(null);

/** 会话搜索：关键词防抖后调后端搜索接口，置空时回退到全量列表 */
const searchKeyword = ref("");
const searchResults = ref<ConversationView[] | null>(null);
const SEARCH_DEBOUNCE_MS = 300;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

/** 聊天记录搜索弹窗 */
const messageSearchDialog = ref(false);
const messages = ref<ChatMessage[]>([]);
const draft = ref("");
const uploading = ref(false);

const users = ref<UserView[]>([]);
const groupDialog = ref(false);
const groupTitle = ref("");
const groupMembers = ref<string[]>([]);
const memberDialog = ref(false);
const detail = ref<ConversationDetailView | null>(null);
const addPicks = ref<string[]>([]);

const canManage = computed(() =>
  auth.hasPermission(PERMS.im.conversationManage)
);
const canCreateGroup = computed(() =>
  auth.hasPermission(PERMS.im.conversationCreate)
);
const active = computed(() =>
  conversations.value.find((c) => c.id === activeId.value)
);

/** 左侧展示的会话：搜索中展示命中结果，否则展示全量列表 */
const displayedConversations = computed(
  () => searchResults.value ?? conversations.value
);

const memberCandidates = computed(() =>
  users.value.filter(
    (u) => !detail.value?.members.some((m) => m.userId === u.id)
  )
);

function upsertConversation(view: ConversationView): void {
  const idx = conversations.value.findIndex((c) => c.id === view.id);
  if (idx >= 0) {
    conversations.value[idx] = view;
  } else {
    conversations.value.unshift(view);
  }
  syncUnreadBadges();
}

function syncUnreadBadges(): void {
  menuBadges.syncConversationUnread(conversations.value);
}

async function loadConversations(): Promise<void> {
  conversations.value = await imApi.listConversations();
  syncUnreadBadges();
}

watch(searchKeyword, (value) => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  const keyword = value.trim();
  if (!keyword) {
    searchResults.value = null;
    return;
  }
  searchTimer = setTimeout(async () => {
    searchResults.value = await imApi.searchConversations(keyword);
  }, SEARCH_DEBOUNCE_MS);
});

async function selectConversation(id: string): Promise<void> {
  activeId.value = id;
  messages.value = await im.join(id);
  const item = conversations.value.find((c) => c.id === id);
  if (item) {
    item.unread = 0;
    syncUnreadBadges();
  }
  // 成员清单供聊天面板 @选择与引用预览解析用户名
  detail.value = await imApi.conversationDetail(id);
}

function send(extras: { mentions?: string[]; replyToId?: string }): void {
  if (!activeId.value) {
    return;
  }
  if (!draft.value.trim()) {
    ElMessage.warning("请输入消息内容");
    return;
  }
  im.send({
    conversationId: activeId.value,
    type: MessageType.Text,
    content: draft.value,
    mentions: extras.mentions,
    replyToId: extras.replyToId,
  });
  draft.value = "";
}

async function sendMedia(
  file: File,
  type: MessageType.Image | MessageType.Video
): Promise<void> {
  if (!activeId.value) {
    return;
  }
  uploading.value = true;
  try {
    const { url } = await uploadApi.upload(file);
    im.send({
      conversationId: activeId.value,
      type,
      content: url,
    });
  } finally {
    uploading.value = false;
  }
}

function isSelf(message: ChatMessage): boolean {
  return message.senderId === auth.profile?.id;
}

function isSystem(message: ChatMessage): boolean {
  return message.senderId === SYSTEM_SENDER_ID;
}

async function openGroupDialog(): Promise<void> {
  if (users.value.length === 0) {
    users.value = await userApi.listAll();
  }
  groupTitle.value = "";
  groupMembers.value = [];
  groupDialog.value = true;
}

async function createGroup(): Promise<void> {
  if (!groupTitle.value.trim()) {
    ElMessage.warning("请输入群名称");
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
  const view = await imApi.startService({ subject: "咨询" });
  upsertConversation(view);
  await selectConversation(view.id);
  ElMessage.success("已发起客服会话");
}

async function openMemberDialog(): Promise<void> {
  if (!activeId.value) {
    return;
  }
  if (users.value.length === 0) {
    users.value = await userApi.listAll();
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
  const { value } = await ElMessageBox.prompt("输入新的群名称", "群改名", {
    inputValue: active.value?.title ?? "",
  });
  const view = await imApi.rename(activeId.value, { title: value.trim() });
  upsertConversation(view);
}

async function leave(): Promise<void> {
  if (!activeId.value) {
    return;
  }
  await ElMessageBox.confirm("确认退出该会话？", "退群", { type: "warning" });
  const id = activeId.value;
  await imApi.leave(id);
  conversations.value = conversations.value.filter((c) => c.id !== id);
  syncUnreadBadges();
  activeId.value = null;
  messages.value = [];
  memberDialog.value = false;
}

async function markConversationRead(
  item: ConversationView,
  messageId: string
): Promise<void> {
  item.unread = 0;
  syncUnreadBadges();
  await im.markRead(item.id, messageId);
}

function markActiveConversationRead(): void {
  if (document.visibilityState !== "visible" || !activeId.value) {
    return;
  }
  const item = conversations.value.find((entry) => entry.id === activeId.value);
  const lastVisibleMessage = messages.value.at(-1);
  if (item?.unread && lastVisibleMessage) {
    void markConversationRead(item, lastVisibleMessage.id);
  }
}

onMounted(async () => {
  im.connect();
  im.onError((error) => ElMessage.error(error.message));
  im.onReceive((message) => {
    const isActive = message.conversationId === activeId.value;
    const isVisible = document.visibilityState === "visible";
    if (isActive) {
      messages.value.push(message);
    }
    const item = conversations.value.find(
      (c) => c.id === message.conversationId
    );
    if (item) {
      item.lastMessage = message;
      if (!isSelf(message) && (!isActive || !isVisible)) {
        item.unread += 1;
      }
      if (!isSelf(message) && isActive && isVisible) {
        void markConversationRead(item, message.id);
      } else {
        syncUnreadBadges();
      }
    } else {
      void loadConversations();
    }
  });
  im.onConversation((view) => upsertConversation(view));
  await loadConversations();
  // 外部入口（如订单详情「进入订单群」）携带 conversation 参数时自动选中该会话
  const target = route.query.conversation;
  if (
    typeof target === "string" &&
    conversations.value.some((c) => c.id === target)
  ) {
    await selectConversation(target);
  }
  document.addEventListener("visibilitychange", markActiveConversationRead);
});

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", markActiveConversationRead);
  im.disconnect();
});
</script>

<template>
  <section class="admin-page im-page">
    <section class="im-workspace">
      <im-conversation-list
        v-model:keyword="searchKeyword"
        :conversations="displayedConversations"
        :active-id="activeId"
        :can-create-group="canCreateGroup"
        @create-group="openGroupDialog"
        @start-service="startService"
        @select="selectConversation"
      />
      <im-chat-panel
        v-model:draft="draft"
        :active="active"
        :messages="messages"
        :uploading="uploading"
        :can-manage="canManage"
        :members="detail?.id === activeId ? detail.members : []"
        :self-id="auth.profile?.id ?? null"
        :is-self="isSelf"
        :is-system="isSystem"
        @send="send"
        @send-media="sendMedia"
        @rename="rename"
        @open-members="openMemberDialog"
        @leave="leave"
        @open-search="messageSearchDialog = true"
      />
    </section>
    <im-group-dialog
      v-model="groupDialog"
      v-model:title="groupTitle"
      v-model:members="groupMembers"
      :users="users"
      @submit="createGroup"
    />
    <im-message-search-dialog
      v-model="messageSearchDialog"
      :conversation-id="activeId"
    />
    <im-member-dialog
      v-model="memberDialog"
      v-model:picks="addPicks"
      :detail="detail"
      :candidates="memberCandidates"
      :can-manage="canManage"
      @add="addMembers"
      @remove="removeMember"
    />
  </section>
</template>
