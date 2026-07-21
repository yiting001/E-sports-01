<script setup lang="ts">
import {
  FEEDBACK_TYPE_TEXT,
  FeedbackStatus,
  FeedbackType,
  PERMS,
  type FeedbackView,
} from '@app/contracts';
import { ChatLineSquare, EditPen, Money, Refresh, Search } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';

defineProps<{
  list: FeedbackView[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  statusFilter?: FeedbackStatus;
  typeFilter?: FeedbackType;
  statusOptions: Array<{ label: string; value?: FeedbackStatus }>;
  typeOptions: Array<{ label: string; value?: FeedbackType }>;
  statusMeta: Record<FeedbackStatus, { text: string; type: 'warning' | 'success' }>;
  formatDate: (value: string) => string;
}>();

const emit = defineEmits<{
  'update:statusFilter': [value?: FeedbackStatus];
  'update:typeFilter': [value?: FeedbackType];
  filter: [];
  refresh: [];
  handle: [row: FeedbackView];
  penalty: [row: FeedbackView];
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();

function hasPenaltyContext(row: FeedbackView): boolean {
  return (
    row.type === FeedbackType.Booster &&
    Boolean(row.orderId && row.orderNo && row.boosterUserId && row.boosterName)
  );
}
</script>

<template>
  <app-panel
    title="反馈受理"
    eyebrow="Feedback Queue"
  >
    <template #actions>
      <div class="admin-actions">
        <el-select
          :model-value="typeFilter"
          class="feedback-filter"
          placeholder="按类型筛选"
          :prefix-icon="Search"
          @update:model-value="emit('update:typeFilter', $event as FeedbackType | undefined)"
          @change="emit('filter')"
        >
          <el-option
            v-for="opt in typeOptions"
            :key="opt.value ?? 'all'"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-select
          :model-value="statusFilter"
          class="feedback-filter"
          placeholder="按状态筛选"
          :prefix-icon="Search"
          @update:model-value="emit('update:statusFilter', $event as FeedbackStatus | undefined)"
          @change="emit('filter')"
        >
          <el-option
            v-for="opt in statusOptions"
            :key="opt.value ?? 'all'"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-button
          :icon="Refresh"
          @click="emit('refresh')"
        >
          刷新
        </el-button>
      </div>
    </template>

    <app-data-table
      :data="list"
      :loading="loading"
      :min-width="1260"
      table-class="feedback-table"
      empty-text="暂无反馈"
    >
      <el-table-column
        label="提交用户"
        min-width="170"
      >
        <template #default="{ row }">
          <div class="feedback-user">
            <span class="feedback-user__avatar">
              <el-icon><ChatLineSquare /></el-icon>
            </span>
            <div>
              <strong>{{ row.nickname || row.username }}</strong>
              <small>{{ row.username }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="类型"
        width="110"
      >
        <template #default="{ row }">
          <el-tag
            round
            effect="plain"
          >
            {{ FEEDBACK_TYPE_TEXT[row.type as FeedbackType] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="关联订单"
        min-width="160"
      >
        <template #default="{ row }">
          <span class="feedback-related__primary">{{ row.orderNo || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="被投诉对象"
        min-width="180"
      >
        <template #default="{ row }">
          <div class="feedback-related">
            <span class="feedback-related__primary">
              {{ row.boosterName || row.target || '-' }}
            </span>
            <small v-if="row.boosterUserId">{{ row.boosterUserId }}</small>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="反馈内容"
        min-width="240"
      >
        <template #default="{ row }">
          <span class="feedback-content">{{ row.content }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="处理回复"
        min-width="200"
      >
        <template #default="{ row }">
          <span
            v-if="row.replyContent"
            class="feedback-content"
          >{{ row.replyContent }}</span>
          <span
            v-else
            class="feedback-muted"
          >-</span>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="100"
      >
        <template #default="{ row }">
          <el-tag
            round
            effect="light"
            :type="statusMeta[row.status as FeedbackStatus].type"
          >
            {{ statusMeta[row.status as FeedbackStatus].text }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="提交时间"
        width="150"
      >
        <template #default="{ row }">
          <span class="feedback-muted">{{ formatDate(row.createdAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="180"
      >
        <template #default="{ row }">
          <div class="feedback-row-actions">
            <el-tag
              v-if="row.penaltyId"
              type="danger"
              effect="light"
              round
            >
              已扣款
            </el-tag>
            <el-button
              v-else-if="row.status === FeedbackStatus.Pending && hasPenaltyContext(row)"
              v-permission="[PERMS.feedback.handle, PERMS.finance.penaltyCreate]"
              link
              type="danger"
              :icon="Money"
              @click="emit('penalty', row)"
            >
              扣款
            </el-button>
            <el-button
              v-if="row.status === FeedbackStatus.Pending && !row.penaltyId"
              v-permission="PERMS.feedback.handle"
              link
              type="primary"
              :icon="EditPen"
              @click="emit('handle', row)"
            >
              处理
            </el-button>
            <span
              v-if="row.status !== FeedbackStatus.Pending && !row.penaltyId"
              class="feedback-muted"
            >
              已完成
            </span>
          </div>
        </template>
      </el-table-column>
    </app-data-table>

    <div class="admin-pager">
      <span class="feedback-pager__summary">共 {{ total }} 条反馈</span>
      <el-pagination
        class="feedback-pagination"
        layout="total, sizes, prev, pager, next"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[...PAGE_SIZE_OPTIONS]"
        @size-change="(value: number) => emit('update:pageSize', value)"
        @current-change="(value: number) => emit('update:page', value)"
      />
    </div>
  </app-panel>
</template>
