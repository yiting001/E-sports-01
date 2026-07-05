<script setup lang="ts">
/**
 * 商品详情预览弹窗：按商品 id 拉取公开详情（封面/价格/分类/销量/富文本详情）。
 * 商品已下架或删除时接口返回 404，展示占位提示（订单中的商品名/封面为下单快照，不受影响）。
 */
import { computed, ref, watch } from 'vue';
import { fenToYuan, type ProductPublicView } from '@app/contracts';
import { commerceApi } from '@/api/commerce.api';
import { sanitizeHtml } from '@/utils/sanitize-html';

const props = defineProps<{
  /** 要预览的商品 id，为空时不加载 */
  productId: string;
}>();

const visible = defineModel<boolean>({ required: true });

const product = ref<ProductPublicView | null>(null);
const loading = ref(false);
const missing = ref(false);

const safeDescription = computed(() =>
  product.value ? sanitizeHtml(product.value.description) : '',
);

async function load(): Promise<void> {
  product.value = null;
  missing.value = false;
  if (!props.productId) {
    return;
  }
  loading.value = true;
  try {
    product.value = await commerceApi.publicProductDetail(props.productId);
  } catch {
    missing.value = true;
  } finally {
    loading.value = false;
  }
}

watch(visible, (open) => {
  if (open) {
    void load();
  }
});
</script>

<template>
  <el-dialog
    v-model="visible"
    title="商品详情"
    width="520px"
  >
    <div
      v-loading="loading"
      class="preview-body"
    >
      <el-empty
        v-if="missing"
        description="商品不存在或已下架（订单中保留的是下单时的商品快照）"
      />
      <template v-else-if="product">
        <img
          v-if="product.cover"
          :src="product.cover"
          class="preview-cover"
          alt=""
        >
        <h3 class="preview-title">
          {{ product.title }}
        </h3>
        <div class="preview-meta">
          <span class="preview-price">¥{{ fenToYuan(product.priceFen) }}</span>
          <span
            v-if="product.originPriceFen > product.priceFen"
            class="preview-origin"
          >¥{{ fenToYuan(product.originPriceFen) }}</span>
          <el-tag size="small">
            {{ product.categoryName }}
          </el-tag>
          <span class="preview-sold">已售 {{ product.sold }}</span>
        </div>
        <!-- 富文本已经 sanitizeHtml 净化 -->
        <!-- eslint-disable vue/no-v-html -->
        <div
          v-if="safeDescription"
          class="preview-desc"
          v-html="safeDescription"
        />
        <!-- eslint-enable vue/no-v-html -->
      </template>
    </div>
  </el-dialog>
</template>

<style scoped>
.preview-body {
  min-height: 120px;
}

.preview-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}

.preview-title {
  margin: 12px 0 8px;
  font-size: 16px;
}

.preview-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-price {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-color-danger);
}

.preview-origin {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-decoration: line-through;
}

.preview-sold {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.preview-desc {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}

.preview-desc :deep(img),
.preview-desc :deep(video) {
  max-width: 100%;
}
</style>
