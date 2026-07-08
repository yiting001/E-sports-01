<script setup lang="ts">
/**
 * 商品营销工具弹窗：
 * 1. 编辑已售数量（走商品更新接口，需 commerce:product:update 权限）；
 * 2. 添加自定义评论（昵称/头像自设，需 review:admin:marketing 权限）。
 */
import { reactive, ref, watch } from 'vue';
import { PERMS, REVIEW_LIMITS, type ProductView } from '@app/contracts';
import { ElMessage } from 'element-plus';
import ImageUploader from '@/components/common/ImageUploader.vue';
import { commerceApi } from '@/api/commerce.api';
import { reviewApi } from '@/api/review.api';

const props = defineProps<{
  modelValue: boolean;
  product: ProductView | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  /** 销量保存成功后通知父组件刷新列表 */
  saved: [];
}>();

const sold = ref(0);
const soldSaving = ref(false);

const review = reactive({
  reviewerName: '',
  avatar: '',
  rating: REVIEW_LIMITS.ratingMax,
  content: '',
});
const reviewSaving = ref(false);

watch(
  () => props.modelValue,
  (visible) => {
    if (visible && props.product) {
      sold.value = props.product.sold;
      Object.assign(review, {
        reviewerName: '',
        avatar: '',
        rating: REVIEW_LIMITS.ratingMax,
        content: '',
      });
    }
  },
);

async function saveSold(): Promise<void> {
  if (!props.product) {
    return;
  }
  soldSaving.value = true;
  try {
    await commerceApi.updateProduct(props.product.id, { sold: sold.value });
    ElMessage.success('销量已更新');
    emit('saved');
  } finally {
    soldSaving.value = false;
  }
}

async function submitReview(): Promise<void> {
  if (!props.product) {
    return;
  }
  if (!review.reviewerName.trim()) {
    ElMessage.warning('请填写评论昵称');
    return;
  }
  if (!review.content.trim()) {
    ElMessage.warning('请填写评论内容');
    return;
  }
  reviewSaving.value = true;
  try {
    await reviewApi.createMarketing({
      productId: props.product.id,
      reviewerName: review.reviewerName.trim(),
      avatar: review.avatar,
      rating: review.rating,
      content: review.content.trim(),
    });
    ElMessage.success('评论已添加');
    Object.assign(review, {
      reviewerName: '',
      avatar: '',
      rating: REVIEW_LIMITS.ratingMax,
      content: '',
    });
  } finally {
    reviewSaving.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="`营销工具 · ${product?.title ?? ''}`"
    width="560px"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <section
      v-permission="PERMS.product.update"
      class="marketing-section"
    >
      <h4>编辑销量</h4>
      <div class="marketing-row">
        <el-input-number
          v-model="sold"
          :min="0"
          :step="1"
          controls-position="right"
        />
        <el-button
          type="primary"
          :loading="soldSaving"
          @click="saveSold"
        >
          保存销量
        </el-button>
      </div>
    </section>

    <section
      v-permission="PERMS.review.marketing"
      class="marketing-section"
    >
      <h4>添加评论</h4>
      <el-form label-width="72px">
        <el-form-item
          label="昵称"
          required
        >
          <el-input
            v-model="review.reviewerName"
            :maxlength="REVIEW_LIMITS.reviewerNameMax"
            show-word-limit
            placeholder="评论展示昵称"
          />
        </el-form-item>
        <el-form-item label="头像">
          <ImageUploader v-model="review.avatar" />
        </el-form-item>
        <el-form-item label="星级">
          <el-rate v-model="review.rating" />
        </el-form-item>
        <el-form-item
          label="内容"
          required
        >
          <el-input
            v-model="review.content"
            type="textarea"
            :rows="4"
            :maxlength="REVIEW_LIMITS.contentMax"
            show-word-limit
            placeholder="评论内容"
          />
        </el-form-item>
      </el-form>
      <div class="marketing-actions">
        <el-button
          type="primary"
          :loading="reviewSaving"
          @click="submitReview"
        >
          添加评论
        </el-button>
      </div>
    </section>
  </el-dialog>
</template>

<style scoped>
.marketing-section + .marketing-section {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.marketing-section h4 {
  margin: 0 0 12px;
}

.marketing-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.marketing-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
