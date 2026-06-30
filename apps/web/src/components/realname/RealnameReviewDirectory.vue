<script setup lang="ts">
import {
  RealnameStatus,
  type RealnameView,
  PERMS,
} from '@app/contracts';
import { CircleCheck, Close, Refresh, Search, UserFilled } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';

defineProps<{
  list: RealnameView[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  statusFilter?: RealnameStatus;
  statusOptions: Array<{ label: string; value?: RealnameStatus }>;
  statusMeta: Record<
    RealnameStatus,
    { text: string; type: 'info' | 'warning' | 'success' | 'danger' }
  >;
  formatDate: (value: string) => string;
}>();

const emit = defineEmits<{
  'update:statusFilter': [value?: RealnameStatus];
  filter: [];
  refresh: [];
  approve: [row: RealnameView];
  reject: [row: RealnameView];
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();
</script>

<template>
  <app-panel
    title="实名审核"
    eyebrow="Review Queue"
  >
    <template #actions>
      <div class="admin-actions">
        <el-select
          :model-value="statusFilter"
          class="realname-filter"
          placeholder="按状态筛选"
          :prefix-icon="Search"
          @update:model-value="emit('update:statusFilter', $event as RealnameStatus | undefined)"
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
      :min-width="1020"
      table-class="realname-table"
      empty-text="暂无实名申请"
    >
      <el-table-column
        label="申请用户"
        min-width="190"
      >
        <template #default="{ row }">
          <div class="realname-user">
            <span class="realname-user__avatar">
              <el-icon><UserFilled /></el-icon>
            </span>
            <div>
              <strong>{{ row.nickname || row.username }}</strong>
              <small>{{ row.username }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="真实姓名"
        min-width="120"
      >
        <template #default="{ row }">
          <span class="realname-strong">{{ row.realName }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="身份证号"
        min-width="180"
      >
        <template #default="{ row }">
          <span class="realname-card-no">{{ row.idCardMasked }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="证件照"
        min-width="150"
      >
        <template #default="{ row }">
          <div class="realname-images">
            <el-image
              v-if="row.frontImage"
              :src="row.frontImage"
              :preview-src-list="[row.frontImage, row.backImage].filter(Boolean)"
              fit="cover"
              class="realname-thumb"
            />
            <el-image
              v-if="row.backImage"
              :src="row.backImage"
              :preview-src-list="[row.backImage, row.frontImage].filter(Boolean)"
              fit="cover"
              class="realname-thumb"
            />
            <span
              v-if="!row.frontImage && !row.backImage"
              class="realname-muted"
            >
              未上传
            </span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="状态"
        width="112"
      >
        <template #default="{ row }">
          <el-tag
            round
            effect="light"
            :type="statusMeta[row.status as RealnameStatus].type"
          >
            {{ statusMeta[row.status as RealnameStatus].text }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="提交时间"
        width="170"
      >
        <template #default="{ row }">
          <span class="realname-date">{{ formatDate(row.createdAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="170"
      >
        <template #default="{ row }">
          <div
            v-if="row.status === RealnameStatus.Pending"
            class="realname-actions"
          >
            <el-button
              v-permission="PERMS.realname.review"
              link
              type="success"
              :icon="CircleCheck"
              @click="emit('approve', row)"
            >
              通过
            </el-button>
            <el-button
              v-permission="PERMS.realname.review"
              link
              type="danger"
              :icon="Close"
              @click="emit('reject', row)"
            >
              驳回
            </el-button>
          </div>
          <span
            v-else
            class="realname-muted"
          >
            无需处理
          </span>
        </template>
      </el-table-column>
    </app-data-table>

    <div class="admin-pager">
      <span class="realname-pager__summary">共 {{ total }} 条申请</span>
      <el-pagination
        class="realname-pagination"
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
