<script setup lang="ts" generic="T extends Photo = Photo">
import { Photo, RowRendererProps, RowRendererMetadata } from '@/types'
import type { CSSProperties } from 'vue'
import { computed } from 'vue'

const props = defineProps<RowRendererProps>()

const className = 'photo-album__row'

const style = computed<CSSProperties>(() => {
  const display = "flex"
  const flexFlow = 'row nowrap'
  const alignItems = 'start'
  const justifyContent = 'space-between'
  // const gap = (props.gap?.x || 0) + 'px'
  const marginBottom =
    props.rowsCount !== undefined && props.rowIndex < props.rowsCount - 1
      ? `${props.layoutOptions.spacing}px`
      : undefined

  return { display, flexFlow, alignItems, justifyContent, marginBottom, position: "absolute", top: (props.data?.top || 0) + 'px', left: 0, width: "100%", boxSizing: "border-box", overflow: "hidden" }
})

const rowWrapper = computed(() => props.renderer ?? 'div')


const metadata = computed<RowRendererMetadata>(() => {
  return {
    layoutOptions: props.layoutOptions,
    rowData: props.rowData,
    rowIndex: props.rowIndex,
    rowsCount: props.rowsCount
  }
})
</script>

<template>
  <component :is="rowWrapper" :class="className" :style="style" v-bind="metadata">
    <slot />
  </component>
</template>
