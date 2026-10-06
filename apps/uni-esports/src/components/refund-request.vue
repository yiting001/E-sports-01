<template>
  <view class="card refund-editor">
    <textarea
      v-model="reason"
      class="input refund-textarea"
      :maxlength="ORDER_REFUND_LIMITS.reasonMax"
      placeholder="请填写退款原因（不少于 5 个字）"
      placeholder-class="placeholder"
      auto-height
    />
    <button
      class="btn-primary"
      @tap="submit"
    >
      提交退款申请
    </button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ORDER_REFUND_LIMITS } from '@app/contracts';

/** 订单详情页的退款申请编辑器：只负责原因输入与提交，审核流程在服务端 */
const emit = defineEmits<{
  submit: [reason: string];
}>();

const reason = ref('');

function submit(): void {
  emit('submit', reason.value.trim());
}
</script>

<style scoped>
.refund-editor {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 140rpx;
}

.refund-textarea {
  width: 100%;
  min-height: 120rpx;
  margin-bottom: 16rpx;
}

.placeholder {
  color: #67738c;
}
</style>
