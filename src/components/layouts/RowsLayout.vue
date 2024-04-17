<script setup lang="ts" generic="T extends Photo = Photo">
import type { Component } from 'vue'
import { computed } from 'vue'
import { LayoutPhotoSlotContext, Photo, RowsLayoutOptions } from '@/types'
import computeRowsLayout from '@/utils/rows'
import RowRenderer from '@/components/renderers/RowRenderer.vue'

const props = defineProps<{
  photos: T[]
  rootLayout: {
    height: number
  }
  rootLayoutChange: (obj: any) => void
  layoutOptions: RowsLayoutOptions
  rowRenderer?: Component
}>()

defineSlots<{
  default: (context: LayoutPhotoSlotContext<T>) => any
}>()

const tops: {
  top: number
}[] = [
    {
      top: 0,
    }
  ]
let top = 0
const rowsLayout = computed(() => {
  const res = computeRowsLayout<T>({
    photos: props.photos,
    layoutOptions: props.layoutOptions
  })

  res?.map((i, idx) => {
    tops.push({
      top: top += i[0].layout.height || 0
    })
  })
  props.rootLayoutChange(
    {
      height: top
    }
  )

  console.log('Log-- ', res, 'res');
  return res
}
)
</script>

<template>
  <RowRenderer v-for="(row, rowIndex) in rowsLayout" :key="`row-${rowIndex}`" :layout-options="layoutOptions"
    :row-data="row" :row-index="rowIndex" :top="tops[rowIndex].top" :rows-count="rowsLayout?.length ?? 0"
    :renderer="rowRenderer">
    <template v-for="{ photo, layout } in row" :key="photo.key || photo.src">
      <slot v-bind="{ photo, layout, layoutOptions }" />
    </template>
  </RowRenderer>
</template>
