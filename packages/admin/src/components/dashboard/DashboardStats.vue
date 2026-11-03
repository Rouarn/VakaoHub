<template>
  <section class="stat-grid">
    <article
      v-for="(card, index) in cards"
      :key="card.label"
      class="stat-card"
      :class="{ featured: index === 0 }"
    >
      <div class="stat-top">
        <span class="hud">{{ card.hud }}</span>
        <span class="stat-index">{{ String(index + 1).padStart(2, '0') }}</span>
      </div>
      <strong>{{ card.value }}</strong>
      <span>{{ card.label }}</span>
    </article>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  cards: Array<{ label: string; value: string | number; hud: string }>;
}>();
</script>
