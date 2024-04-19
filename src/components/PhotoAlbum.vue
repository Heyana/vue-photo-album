<script setup lang="ts" generic="T extends Photo = Photo">
import ColumnsLayout from '@/components/layouts/ColumnsLayout.vue'
import MasonryLayout from '@/components/layouts/MasonryLayout.vue'
import RowsLayout from '@/components/layouts/RowsLayout.vue'
import PhotoRenderer from '@/components/renderers/PhotoRenderer.vue'
import useContainerWidth from '@/composables/useContainerWidth'
import {
  ColumnsLayoutOptions,
  LayoutOptions, LayoutPhotoSlotContext, Photo, PhotoAlbumEmits, PhotoAlbumProps, RowsLayoutOptions
} from '@/types'
import {
  LayoutTypes
} from '@/types'
import {
  resolveResponsiveParameter,
  unwrapParameter
} from '@/utils/responsives'
import { fnDebounce } from 'js-funcs'
import { ComponentPublicInstance, computed, CSSProperties, ref, toRefs, watch } from 'vue'



const [Rows, Columns, Masonry] = LayoutTypes

const props = defineProps<PhotoAlbumProps<T>>()

const {
  layout,
  targetRowHeight,
  rowConstraints,
  columns,
  spacing,
  padding,
  sizes,
  breakpoints,
  defaultContainerWidth,
  containerRenderer,
  rowRenderer,
  columnRenderer,
  photoRenderer,
  loadingRenderer,
  gap,
} = toRefs(props)

const preload = props.preload || [1, 1]
const photos = ref(props.photos)
const nextPhotos = ref([] as T[])
const emit = defineEmits<PhotoAlbumEmits<T>>()

const loading = ref(false)
function resolveLayoutOptions<T extends Photo>({
  layout,
  containerWidth,
  targetRowHeight,
  rowConstraints,
  columns,
  spacing,
  padding,
  sizes
}: Omit<PhotoAlbumProps<T>, 'photos'> & {
  containerWidth: number
}) {
  const commonOptions = {
    layout,
    containerWidth,
    spacing: resolveResponsiveParameter(
      spacing,
      containerWidth,
      [20, 15, 10, 5]
    ),
    padding: resolveResponsiveParameter(
      padding,
      containerWidth,
      [0, 0, 0, 0, 0]
    ),
    sizes
  }

  const rowsOptions = {
    targetRowHeight: resolveResponsiveParameter(
      targetRowHeight,
      containerWidth,
      [(w) => w / 5, (w) => w / 4, (w) => w / 3, (w) => w / 2]
    ),
    rowConstraints: unwrapParameter(rowConstraints, containerWidth)
  }

  const columnsOptions = {
    columns: resolveResponsiveParameter(
      columns,
      containerWidth,
      [5, 4, 3, 2],
      1
    )
  }

  switch (layout) {
    case Rows: {
      return Object.assign(commonOptions, rowsOptions, {
        layout: Rows
      }) satisfies RowsLayoutOptions
    }
    case Columns:
    case Masonry: {
      return Object.assign({}, commonOptions, columnsOptions, {
        layout: layout === Columns ? Columns : Masonry
      }) satisfies ColumnsLayoutOptions
    }
    default:
      return undefined
  }
}

const containerRef = ref<HTMLElement | ComponentPublicInstance>()


const { containerWidth } = useContainerWidth(
  containerRef,
  breakpoints.value,
  defaultContainerWidth.value
)
const layoutOptions = ref<ReturnType<typeof resolveLayoutOptions<T>>>()

const isUnknownLayout = computed(() => {
  return layout.value === undefined || !LayoutTypes.includes(layout.value)
})

const className = computed(() => [
  'photo-album',
  `photo-album-${isUnknownLayout.value ? 'unknown' : layout.value}`
])

const isRowsLayoutOptions = (
  options?: LayoutOptions
): options is RowsLayoutOptions => {
  return options?.layout === Rows
}


const style = computed<CSSProperties>(() => {
  let limitedWidth = undefined
  if (layout.value === Rows && isRowsLayoutOptions(layoutOptions.value)) {
    const { padding, spacing, rowConstraints, targetRowHeight } =
      layoutOptions.value satisfies RowsLayoutOptions
    const singleRowMaxHeight = rowConstraints?.singleRowMaxHeight
    if (singleRowMaxHeight !== undefined) {
      // NOTE: https://github.com/igordanchenko/react-photo-album/issues/121#issuecomment-1684405422
      // "singleRowMaxHeight" must be greater than "targetRowHeight" when both are defined.
      const maxHeight =
        targetRowHeight !== undefined
          ? Math.max(singleRowMaxHeight, targetRowHeight)
          : singleRowMaxHeight
      const photoLen = photos.value.length
      const initWidth = padding * photoLen * 2 + spacing * (photoLen - 1)
      limitedWidth = Math.floor(
        photos.value.reduce((acc, photo) => {
          return acc + (photo.width / photo.height) * maxHeight - padding * 2
        }, initWidth)
      )
    }
  }

  const maxWidth =
    limitedWidth !== undefined && limitedWidth > 0
      ? `${limitedWidth}px`
      : undefined
  return {
    display: 'flex',
    flexDirection: layout.value === 'rows' ? 'column' : 'row',
    flexWrap: 'nowrap',
    position: 'relative',
    justifyContent: 'space-between',
    maxWidth,
    width: "100%",
    height: ((rootLayout.value.height || 0) + 30) + 'px'
  }
})

const containerComponent = computed(() => {
  return {
    is: containerRenderer.value ?? 'div',
    props: {
      photos: photos.value,
      layoutOptions: layoutOptions.value
    }
  }
})
const loadingComponent = computed(() => {
  return {
    is: loadingRenderer.value ?? 'div',
    props: {
      photos: photos.value,
      layoutOptions: layoutOptions.value
    }
  }
})
const rootLayout = ref({
  height: 0,
  tops: [{
    top: 0,
  }]
})


const pageManeger = {
  next: async () => {
    loading.value = true
    const value = await props.next?.()
    if (value) {
      nextPhotos.value = value as any[]
    }
    loading.value = false
  },

}
const rootLayoutChange = fnDebounce((obj: any) => {
  rootLayout.value = obj
}, 16)

const layoutComponent = computed(() => {
  if (isUnknownLayout.value) {
    return undefined
  }
  switch (layout.value) {
    case Rows:
      return {
        is: RowsLayout,
        props: {
          rootLayout,
          photos: photos.value,
          rootLayoutChange,
          pageManeger,
          preload,
          nextPhotos: nextPhotos.value,
          layoutOptions: layoutOptions.value as RowsLayoutOptions,
          gap: gap.value,
          rowRenderer: rowRenderer.value
        }
      }
    case Columns:
      return {
        is: ColumnsLayout,
        props: {

          photos: photos.value,
          layoutOptions: layoutOptions.value as ColumnsLayoutOptions,
          columnRenderer: columnRenderer.value
        } as any
      }
    case Masonry:
      return {
        is: MasonryLayout,
        props: {
          rootLayoutChange,
          pageManeger,
          preload,
          nextPhotos: nextPhotos.value,
          photos: photos.value,
          layoutOptions: layoutOptions.value as ColumnsLayoutOptions,
          columnRenderer: columnRenderer.value
        }
      }
    default:
      return undefined
  }
})

const handlePhotoClick = (
  event: MouseEvent,
  // LayoutPhotoSlotContext<T>

  ctx: any | LayoutPhotoSlotContext<T>
) => {
  const photo = ctx.photo
  const index = ctx.layout.index
  emit('click', { event, photo, index })
}

watch(
  [
    containerWidth,
    layout,
    targetRowHeight,
    rowConstraints,
    columns,
    spacing,
    padding,
    sizes,
    containerRenderer,
    rowRenderer,
    columnRenderer,
    photoRenderer,
    loadingRenderer

  ],
  ([
    containerWidthValue,
    layoutValue,
    targetRowHeightValue,
    rowConstraintsValue,
    columnsValue,
    spacingValue,
    paddingValue,
    sizesValue
  ]) => {
    layoutOptions.value = resolveLayoutOptions<T>({
      containerWidth: containerWidthValue ?? 0,
      layout: layoutValue,
      targetRowHeight: targetRowHeightValue,
      rowConstraints: rowConstraintsValue,
      columns: columnsValue,
      spacing: spacingValue,
      padding: paddingValue,
      sizes: sizesValue
    })
  },
  {
    immediate: true
  }
)
const outStyle: CSSProperties =
{
  overflowY: "auto",
  position: "relative",
  width: '100%',
  overflowX: 'hidden',
  padding: "0 10px"
}
const loadingStyle: CSSProperties =
{
  position: "absolute",
  bottom: "0",
  zIndex: "100",
  height: "30px",
  width: "100%",
  color: "#000",
  display: "flex",
  alignItems: "center",
  flexDirection: "column",
}
</script>

<template>
  <!-- container -->
  <div class="photo-album-box" :style="outStyle">
    <component :is="containerComponent.is" :class="className" :style="style" v-bind="containerComponent.props"
      ref="containerRef">
      <!-- layout -->
      <div v-if="isUnknownLayout">Unknown Layout</div>
      <template v-else>
        <component v-if="layoutComponent" :is="layoutComponent.is" v-bind="layoutComponent.props">
          <!-- photo -->
          <template #default="slotContext">
            <PhotoRenderer v-bind="slotContext" :renderer="photoRenderer" :clickable="$props.onClick !== undefined"
              @click="handlePhotoClick($event, slotContext)" />
          </template>
        </component>
      </template>

      <div v-show="loading" :style="loadingStyle" class='photo-album-loading'>
        <component v-if="loadingRenderer" :is="loadingComponent.is" v-bind="loadingComponent.props">
        </component>
        <div v-else>加载中</div>
      </div>
    </component>
  </div>

</template>
