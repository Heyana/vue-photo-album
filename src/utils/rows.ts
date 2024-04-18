import { Photo, PhotoLayout, RowConstraints, RowsLayoutOptions } from "@/types";
import round from "@/utils/round";
import ratio from "@/utils/ratio";
import findShortestPath from "@/utils/dijkstra";

function findIdeaNodeSearch({
  photos,
  targetRowHeight,
  containerWidth,
}: {
  photos: Photo[];
  targetRowHeight: number;
  containerWidth: number;
}) {
  const minRatio = photos.reduce(
    (acc, photo) => Math.min(acc, ratio(photo)),
    Number.MAX_VALUE
  );
  return round(containerWidth / targetRowHeight / minRatio) + 2;
}

function getCommonHeight(
  row: Photo[],
  containerWidth: number,
  spacing: number,
  padding: number
) {
  const rowWidth =
    containerWidth - (row.length - 1) * spacing - 2 * padding * row.length;
  const totalAspectRatio = row.reduce((acc, photo) => acc + ratio(photo), 0);
  return rowWidth / totalAspectRatio;
}

function cost(
  photos: Photo[],
  i: number,
  j: number,
  width: number,
  targetRowHeight: number,
  spacing: number,
  padding: number
) {
  const row = photos.slice(i, j);
  const commonHeight = getCommonHeight(row, width, spacing, padding);
  if (commonHeight <= 0) {
    return undefined;
  }
  return (commonHeight - targetRowHeight) ** 2 * row.length;
}

function makeGetRowNeighbors<T extends Photo = Photo>({
  photos,
  layoutOptions,
  targetRowHeight,
  limitNodeSearch,
  rowConstraints,
}: {
  photos: T[];
  layoutOptions: RowsLayoutOptions;
  targetRowHeight: number;
  limitNodeSearch: number;
  rowConstraints?: RowConstraints;
}) {
  return (node: number) => {
    const { containerWidth, spacing, padding } = layoutOptions;
    const results = new Map<number, number>();
    results.set(node, 0);
    const startOffset = rowConstraints?.minPhotos ?? 1;
    const endOffset = Math.min(
      limitNodeSearch,
      rowConstraints?.maxPhotos ?? Number.POSITIVE_INFINITY
    );
    for (let i = node + startOffset; i < photos.length + 1; i += 1) {
      if (i - node > endOffset) {
        break;
      }
      const currentCost = cost(
        photos,
        node,
        i,
        containerWidth,
        targetRowHeight,
        spacing,
        padding
      );
      if (currentCost === undefined) {
        break;
      }
      results.set(i, currentCost);
    }
    return results;
  };
}

export type RowsLayoutModel<T extends Photo = Photo> =
  | RowsLayoutModelMap<T>
  | undefined;

export type RowsLayoutModelMap<T extends Photo = Photo> = Array<{
  photos: Array<{
    photo: T;
    layout: PhotoLayout;
  }>;
  data?: {
    top: number;
    show: boolean;
  };
}>;
export default function computeRowsLayout<T extends Photo = Photo>({
  photos,
  layoutOptions,
  gap,
}: {
  photos: T[];
  layoutOptions: RowsLayoutOptions;
  gap?: {
    x?: number;
    y?: number;
  };
}): RowsLayoutModel<T> {
  let {
    spacing,
    padding,
    containerWidth,
    targetRowHeight,
    rowConstraints,
  } = layoutOptions;
  padding = (gap?.x || 0) / 2;

  const limitNodeSearch = findIdeaNodeSearch({
    photos,
    containerWidth,
    targetRowHeight,
  });

  const getNeighbors = makeGetRowNeighbors({
    photos,
    layoutOptions,
    targetRowHeight,
    limitNodeSearch,
    rowConstraints,
  });

  const path = findShortestPath(getNeighbors, 0, photos.length);
  if (path === undefined) {
    return undefined;
  }

  const layout = [];
  for (let i = 1; i < path.length; i += 1) {
    const row = photos
      .map((photo, index) => ({ photo, index }))
      .slice(path[i - 1], path[i]);
    const height = getCommonHeight(
      row.map(({ photo }) => photo),
      containerWidth,
      spacing,
      padding
    );
    layout.push({
      photos: row.map(({ photo, index }, photoIndex) => {
        const tH = height;
        const width = tH * ratio(photo);

        return {
          photo,
          layout: {
            height: tH,
            width,
            index,
            photoIndex,
            photosCount: row.length,
          },
        };
      }),
    });
  }
  return layout;
}
