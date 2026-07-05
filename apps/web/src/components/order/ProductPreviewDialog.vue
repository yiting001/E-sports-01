<script setup lang="ts">
/**
 * 商品详情预览抽屉：按商品 id 拉取公开详情（封面/价格/分类/销量/富文本详情）。
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
  <el-drawer
    v-model="visible"
    title="商品详情"
    size="560px"
    class="admin-drawer product-preview-drawer"
    destroy-on-close
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
        <section class="preview-summary">
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
        </section>
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
    <template #footer>
      <div class="admin-drawer__footer">
        <el-button @click="visible = false">
          关闭
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.preview-body {
  min-height: 160px;
}

.preview-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 240px;
  object-fit: cover;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  display: block;
}

.preview-summary {
  padding: 14px 0 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.preview-title {
  margin: 0 0 10px;
  font-size: 16px;
  line-height: 1.5;
}

.preview-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
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
  margin-top: 16px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
  word-break: break-word;
}

.preview-desc :deep(img),
.preview-desc :deep(video) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 10px 0;
  border-radius: 4px;
  object-fit: contain;
}

@media (max-width: 640px) {
  .preview-cover {
    max-height: 200px;
  }
}
</style>
