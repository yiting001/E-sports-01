<script setup lang="ts">
import type { CategoryView, ServiceAgentOption } from '@app/contracts';
import { CircleCheckFilled, Headset } from '@element-plus/icons-vue';
import ImageUploader from '@/components/common/ImageUploader.vue';
import RichTextEditor from '@/components/common/RichTextEditor.vue';
import type { ProductFormModel } from '@/components/commerce/commerce-ui.types';

const props = defineProps<{
  modelValue: boolean;
  form: ProductFormModel;
  isEdit: boolean;
  categories: CategoryView[];
  agentOptions: ServiceAgentOption[];
  agentLoading: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: ProductFormModel];
  submit: [];
  searchAgents: [keyword: string];
}>();

function updateForm(patch: Partial<ProductFormModel>): void {
  emit('update:form', { ...props.form, ...patch });
}

function agentLabel(agent: ServiceAgentOption): string {
  return `${agent.nickname || agent.username}（${agent.username}）`;
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    :title="isEdit ? '编辑商品' : '新建商品'"
    size="760px"
    class="admin-drawer commerce-drawer product-drawer"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div class="commerce-drawer__intro">
      <el-icon>
        <Headset v-if="form.serviceAgentId" />
        <CircleCheckFilled v-else />
      </el-icon>
      <span>{{ form.serviceAgentId ? '该商品已指定负责客服，用户咨询会优先关联到对应人员。' : '新建商品默认为下架状态，保存后可在列表中上架。' }}</span>
    </div>

    <el-form
      label-position="top"
      class="commerce-form"
    >
      <section class="commerce-form__section">
        <h3>基础信息</h3>
        <div class="commerce-form__grid">
          <el-form-item
            label="分类"
            required
          >
            <el-select
              :model-value="form.categoryId"
              placeholder="选择分类"
              @update:model-value="(value: string) => updateForm({ categoryId: value })"
            >
              <el-option
                v-for="category in categories"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number
              :model-value="form.sort"
              :min="0"
              controls-position="right"
              @update:model-value="(value: number | undefined) => updateForm({ sort: value ?? 0 })"
            />
          </el-form-item>
        </div>
        <el-form-item
          label="商品名"
          required
        >
          <el-input
            :model-value="form.title"
            maxlength="128"
            show-word-limit
            placeholder="请输入商品名"
            @update:model-value="(value: string) => updateForm({ title: value })"
          />
        </el-form-item>
      </section>

      <section class="commerce-form__section">
        <h3>封面展示</h3>
        <el-form-item
          label="封面主标语"
          required
        >
          <el-input
            :model-value="form.coverTitle"
            maxlength="128"
            show-word-limit
            placeholder="用于商品卡片主标题"
            @update:model-value="(value: string) => updateForm({ coverTitle: value })"
          />
        </el-form-item>
        <el-form-item label="封面副标语">
          <el-input
            :model-value="form.coverSub"
            maxlength="128"
            show-word-limit
            placeholder="用于商品卡片辅助说明"
            @update:model-value="(value: string) => updateForm({ coverSub: value })"
          />
        </el-form-item>
        <el-form-item label="封面图片">
          <ImageUploader
            :model-value="form.cover"
            @update:model-value="(value: string) => updateForm({ cover: value })"
          />
        </el-form-item>
      </section>

      <section class="commerce-form__section">
        <h3>价格与承接</h3>
        <div class="commerce-form__grid">
          <el-form-item label="现价">
            <el-input-number
              :model-value="form.priceYuan"
              :min="0"
              :precision="2"
              :step="1"
              controls-position="right"
              @update:model-value="(value: number | undefined) => updateForm({ priceYuan: value ?? 0 })"
            />
          </el-form-item>
          <el-form-item label="原价">
            <el-input-number
              :model-value="form.originPriceYuan"
              :min="0"
              :precision="2"
              :step="1"
              controls-position="right"
              @update:model-value="(value: number | undefined) => updateForm({ originPriceYuan: value ?? 0 })"
            />
          </el-form-item>
        </div>
        <el-form-item label="关联客服">
          <el-select
            :model-value="form.serviceAgentId"
            filterable
            remote
            clearable
            reserve-keyword
            placeholder="搜索用户名/昵称"
            :remote-method="(keyword: string) => emit('searchAgents', keyword)"
            :loading="agentLoading"
            @focus="emit('searchAgents', '')"
            @update:model-value="(value: string) => updateForm({ serviceAgentId: value || '' })"
          >
            <el-option
              v-for="agent in agentOptions"
              :key="agent.id"
              :label="agentLabel(agent)"
              :value="agent.id"
            />
          </el-select>
        </el-form-item>
      </section>

      <section class="commerce-form__section">
        <h3>商品详情</h3>
        <RichTextEditor
          :model-value="form.description"
          placeholder="请输入商品详情，支持图文、视频"
          @update:model-value="(value: string) => updateForm({ description: value })"
        />
      </section>
    </el-form>

    <template #footer>
      <div class="admin-drawer__footer">
        <el-button @click="emit('update:modelValue', false)">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="emit('submit')"
        >
          {{ isEdit ? '保存' : '确定创建' }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>
