<script setup lang="ts" generic="T extends Photo = Photo">
import {
  Component,
  CSSProperties,
  onMounted,
  ref,
  watch,
} from "vue";
import { computed } from "vue";
import { ColumnsLayoutOptions, LayoutPhotoSlotContext, Photo } from "@/types";
import computeMasonryLayout, { MasonryLayoutModelDatas, MasonryLayoutModelData } from "@/utils/masonry";
import ColumnRenderer from "@/components/renderers/ColumnRenderer.vue";
import _ from "lodash";

const props = defineProps<{
  photos: T[];
  layoutOptions: ColumnsLayoutOptions;
  columnRenderer?: Component;
  nextPhotos: T[];
  pageManeger: {
    next: () => Promise<void>;
  };
  rootLayoutChange: (obj: any) => void;
  gap: {
    x: number;
    y: number;
  };
  preload: number[]
}>();

defineSlots<{
  default: (context: LayoutPhotoSlotContext<T>) => any;
}>();

let parentHeight = 0;
let onLoadHeight = Infinity

const photoRawDatas = ref([] as MasonryLayoutModelDatas);
const renderDatas = ref([] as MasonryLayoutModelDatas);

watch(
  () => props.layoutOptions,
  () => {
    update();
    onScroll()
  }
);

const photoStyle: CSSProperties = {
  top: 0,
  position: "absolute",
}

const update = (photos?: T[], isApply?: boolean) => {

  const ls = computeMasonryLayout<T>({
    photos: photos || props.photos,
    layoutOptions: props.layoutOptions,
    oldModels: isApply ? _.cloneDeep(photoRawDatas.value) : ([] as any[]),
    gap: props.gap
  });
  if (!ls) return;

  onLoadHeight = Math.min(...ls?.map((i) => {
    parentHeight = Math.max(parentHeight, i.data.height);
    return i.data.height
  }));

  props.rootLayoutChange({
    height: parentHeight,
  });

  photoRawDatas.value = ls as any;
};

const columnsCount = computed(() => photoRawDatas.value?.length ?? 0);

watch(
  () => props.nextPhotos,
  (newData, oldData) => {
    if (newData.length === oldData.length) return;
    apply(newData);
    props.nextPhotos.length = 0;
  }
);

const apply = (photos: T[]) => {
  update(photos, true);
};

let nextPromise: Promise<void> | null = null;

const onScroll = () => {

  if (!parent || !dom) return
  const top = dom.offsetTop;
  const minLimit = parent.scrollTop - top;
  const maxLimit = minLimit + parent.offsetHeight;

  const isHas = (v: any) => {
    const t = v.top;
    const b = v.top + v.height;
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
      return true;
    } else {
      return false;
    }
  };
  if (photoRawDatas.value?.length > 0) {
    photoRawDatas.value?.map((map, idx) => {
      const data: MasonryLayoutModelData = {
        photos: [],
        data: map.data,
      };
      let start = Infinity
      let end = -Infinity


      const lastData = map.data



      // const beginIndex = lastData.layout.start ? lastData.layout.start - 10 > 0 ? lastData.layout.start - 10 : 0 : 0
      // const endIndex = lastData.layout.end ? lastData.layout.end + 10 : map.photos.length




      map.photos.map((photo, idx) => {
        const has = isHas(photo.layout);
        if (has) {
          start = Math.min(start, idx);
          end = Math.max(end, idx);
        }
      });
      const tStart = start === 0 ? start : start - props.preload[0]

      const tEnd = end + props.preload[1]


      lastData.layout.start = tStart

      lastData.layout.end = tEnd


      data.photos = map.photos.slice(tStart, tEnd);

      renderDatas.value[idx] = data
    });
  } else {
    renderDatas.value = []
    props.rootLayoutChange
      ({
        height: 0
      })
  }

  photoRawDatas.value?.map((map, idx) => {
    const data: MasonryLayoutModelData = {
      photos: [],
      data: map.data,
    };
    let start = Infinity
    let end = -Infinity


    const lastData = map.data



    // const beginIndex = lastData.layout.start ? lastData.layout.start - 10 > 0 ? lastData.layout.start - 10 : 0 : 0
    // const endIndex = lastData.layout.end ? lastData.layout.end + 10 : map.photos.length




    map.photos.map((photo, idx) => {
      const has = isHas(photo.layout);
      if (has) {
        start = Math.min(start, idx);
        end = Math.max(end, idx);
      }
    });
    const tStart = start === 0 ? start : start - props.preload[0]

    const tEnd = end + props.preload[1]


    lastData.layout.start = tStart

    lastData.layout.end = tEnd


    data.photos = map.photos.slice(tStart, tEnd);

    renderDatas.value[idx] = data
  });

  if (maxLimit > onLoadHeight && !nextPromise) {
    nextPromise = props.pageManeger.next().then(() => {
      nextPromise = null;
    });
  }
};

let dom: HTMLElement | undefined
let parent: HTMLElement | undefined
onMounted(() => {
  dom = document.querySelector(".photo-album") as HTMLElement;
  parent = dom?.parentElement as HTMLElement | undefined;
  if (!parent) return;

  parent.addEventListener("scroll", () => {
    onScroll();
  });
});
</script>

<template>
  <ColumnRenderer v-show="renderDatas.length > 0" v-for="(column, columnIndex) in renderDatas"
    :key="`masonry-column-${columnIndex}`" :layout-options="layoutOptions" :column-data="column.photos"
    :column-index="columnIndex" :columns-count="columnsCount" :renderer="columnRenderer">
    <template v-for="{ photo, layout, style } in column.photos" :key="photo.key || photo.src">
      <slot v-bind="{
    photo,
    layout,
    layoutOptions,
    style: {
      ...photoStyle,
      ...style,
    },
  }" />
    </template>
  </ColumnRenderer>
</template>
