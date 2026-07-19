<script setup lang="ts">
/** 商品封面主副标语组成的独立介绍卡，放在主图之后展示。 */
defineProps<{
  title: string;
  subtitle: string;
}>();
</script>

<template>
  <section
    class="product-intro card"
    aria-label="商品介绍"
  >
    <h2
      v-if="title"
      class="product-intro__title"
    >
      {{ title }}
    </h2>
    <p
      v-if="subtitle"
      class="product-intro__text"
    >
      {{ subtitle }}
    </p>
  </section>
</template>

<style scoped>
.product-intro {
  padding: 16px;
}

.product-intro__title {
  padding-left: 9px;
  font-size: 16px;
  line-height: 1.4;
  font-weight: 800;
  letter-spacing: 0;
  color: var(--c-text);
  border-left: 3px solid var(--c-neon);
}

.product-intro__text {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--c-text-secondary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
