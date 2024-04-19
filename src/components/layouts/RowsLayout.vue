<script setup lang="ts" generic="T extends Photo = Photo">
import RowRenderer from '@/components/renderers/RowRenderer.vue'
import { LayoutPhotoSlotContext, Photo, RowsLayoutOptions } from '@/types'
import type { RowsLayoutModelMap } from '@/utils/rows'
import computeRowsLayout from '@/utils/rows'
import { Component, onMounted, onUpdated, reactive, ref, watch } from 'vue'
const props = defineProps<{
  photos: T[]
  rootLayout: {
    height: number
  },
  nextPhotos: T[]
  pageManeger: {
    next: () => Promise<void>
  }
  rootLayoutChange: (obj: any) => void
  layoutOptions: RowsLayoutOptions
  rowRenderer?: Component
  gap?: {
    x?: number,
    y?: number
  }
  preload: number[]
}>()

defineSlots<{
  default: (context: LayoutPhotoSlotContext<T>) => any
}>()

const tops: {
  top: number
  height: number
  show: boolean
}[] = reactive([
  {
    top: 0,
    height: 0,
    show: false
  }
])
let parentHeight = 0

const rowsLayout = ref([] as RowsLayoutModelMap<T>)
watch(() => props.nextPhotos, (mew, old) => {
  if (mew.length === old.length) return
  apply(mew)
  props.nextPhotos.length = 0
})
const photoRawDatas = ref([] as RowsLayoutModelMap<T>
)


const apply = (mew: T[]) => {
  update({
    ls: mew
  })
}
const update = (apply?: {
  ls: T[]
}) => {
  const dom = document.querySelector('.photo-album') as HTMLElement
  const parent = dom?.parentElement
  if (!parent) return

  if (apply) {
    const ls = computeRowsLayout<T>({
      photos: apply.ls,
      layoutOptions: props.layoutOptions,
      gap: props.gap
    })
    if (ls && photoRawDatas.value) {
      photoRawDatas.value = [
        ...photoRawDatas.value,
        ...ls
      ] as any[]
    }

  } else {
    photoRawDatas.value = computeRowsLayout<T>({
      photos: props.photos,
      layoutOptions: props.layoutOptions,
      gap: props.gap
    }) as any[]
  }



  photoRawDatas.value?.map((i, idx) => {
    if (tops[idx + 1]) {

    } else {
      const map = {
        top: parentHeight += (i.photos[0].layout.height || 0) + (props.gap?.y || 0),
        height: i.photos[0].layout.height || 0,
        show: false
      }
      tops[idx + 1] = map

    }

    i.data = tops[idx]



  })
  props.rootLayoutChange(
    {
      height: parentHeight,
    }
  )

  onScroll(parent, dom)
  // tops.map((i, idx) => {
  //   if (!i.show) return
  //   rowsLayout.value.push(data1.value[idx])
  // })
}
onUpdated(() => {
  if (props.photos.length === 0) return
  if (tops.length > photoRawDatas.value?.length && photoRawDatas.value.length !== 0) return
  update()

})


let nextPromise: Promise<void> | null = null
const onScroll = (parent: HTMLElement, dom: HTMLElement) => {
  const top = dom.offsetTop
  const minLimit = parent.scrollTop - top
  const maxLimit = minLimit + parent.offsetHeight
  let start = Infinity
  let end = -Infinity

  for (let i = 0; i < tops.length; i++) {
    const v = tops[i]
    const t = v.top
    const b = v.top + v.height
    // 这里的逻辑是：
    // 只要元素部分出现在容器里就算作可见，因此有三段判断:
    // 1. 元素的上边界在容器内
    // 2. 元素的下边界在容器内
    // 3. 元素覆盖了整个容器
    if (
      (t >= minLimit && t <= maxLimit) ||
      (b >= minLimit && b <= maxLimit) ||
      (t < minLimit && b > maxLimit)
    ) {
      v.show = true
      start = Math.min(i, start)
      end = Math.max(i, end)

    } else {
      v.show = false
    }
  }
  if (photoRawDatas.value?.length) {
    rowsLayout.value = photoRawDatas.value.slice(start > 0 ? start - 1 : start, end + 2)
  }

  if (maxLimit > parentHeight && !nextPromise) {
    nextPromise = props.pageManeger.next().then(() => {
      nextPromise = null
    })


  }


}
onMounted(() => {
  const dom = document.querySelector('.photo-album') as HTMLElement
  const parent = dom?.parentElement
  if (!parent) return

  parent.addEventListener('scroll', () => {
    onScroll(parent, dom)
  })

})
</script>

<template>
  <RowRenderer v-for="(row, rowIndex) in rowsLayout" :key="`row-${rowIndex}`" :layout-options="layoutOptions"
    :row-data="row.photos" :gap="props.gap" :data="row.data" :row-index="rowIndex" :rows-count="rowsLayout?.length ?? 0"
    :renderer="rowRenderer">
    <template v-for="{ photo, layout } in row.photos" :key="photo.key || photo.src">
      <slot v-bind="{ photo, layout, layoutOptions }" />
    </template>
  </RowRenderer>
</template>
