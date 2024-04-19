import { ColumnsLayoutOptions, Photo, PhotoLayout } from "@/types";
import ratio from "@/utils/ratio";
import { CSSProperties } from "vue";

export type MasonryLayoutModel<T extends Photo = Photo> =
  | Array<{
      photos: Array<{
        photo: T;
        layout: PhotoLayout;
        style?: CSSProperties;
      }>;
      data: {
        height: number;
        layout: {
          tops: number[];
          start?: number;
          end?: number;
        };
      };
    }>
  | undefined;

export type MasonryLayoutModelDatas = Array<MasonryLayoutModelData>;
export type MasonryLayoutModelData<T extends Photo = Photo> = {
  photos: Array<{
    photo: T;
    layout: PhotoLayout;
    style?: CSSProperties;
  }>;
  data: {
    height: number;
    layout: {
      tops: number[];
      start?: number;

      end?: number;
    };
  };
};
export type ComputeMasonryLayoutProps<T extends Photo = Photo> = {
  photos: T[];
  layoutOptions: ColumnsLayoutOptions;
  oldModels?: {
    photos: {
      photo: T;
      index: number;
    }[];
    data: {
      height: number;
      layout: {
        tops: number[];
        start?: number;
        end?: number;
      };
    };
  }[];
};

export default function computeMasonryLayout<T extends Photo = Photo>(
  props: ComputeMasonryLayoutProps<T>
): MasonryLayoutModel<T> {
  const { photos, layoutOptions, oldModels } = props;
  const { containerWidth, spacing, padding, columns } = layoutOptions;

  const columnWidth =
    (containerWidth - spacing * (columns - 1) - 2 * padding * columns) /
    columns;

  if (columnWidth <= 0) {
    return columns > 1
      ? computeMasonryLayout({
          ...props,
          layoutOptions: { ...layoutOptions, columns: columns - 1 },
        })
      : undefined;
  }

  const columnsCurrentTopPositions = Array.from({ length: columns }, () => 0);

  const columnsModel = oldModels || [];
  columnsModel.map((i, idx) => {
    columnsCurrentTopPositions[idx] = i.data.height;
  });

  photos.map((photo, index) => {
    // find the shortest column index
    const shortestColumnIndex = columnsCurrentTopPositions.reduce(
      (currentShortestColumn, item, itemIndex) => {
        return item < columnsCurrentTopPositions[currentShortestColumn] - 1
          ? itemIndex
          : currentShortestColumn;
      },
      0
    );
    // update top position by the shortest column index
    columnsCurrentTopPositions[shortestColumnIndex] +=
      columnWidth / ratio(photo) + spacing + 2 * padding;
    // place a photo into the shortest column
    let columnData = columnsModel[shortestColumnIndex];
    if (!columnData) {
      columnsModel[shortestColumnIndex] = columnData = {
        photos: [],
        data: {
          height: 0,
          layout: {
            tops: [0],
          },
        },
      };
    }
    columnData.data.height = columnsCurrentTopPositions[shortestColumnIndex];
    columnData.data.layout.tops.push(
      columnsCurrentTopPositions[shortestColumnIndex]
    );

    columnData.photos.push({
      photo,
      index,
    });
  });
  Array.from({ length: columns }, () => []);

  return columnsModel.map((column) => {
    return {
      photos: column.photos.map(({ photo, index }, photoIndex) => {
        const top = column.data.layout.tops[photoIndex];
        const layout = {
          width: columnWidth,
          height: columnWidth / ratio(photo),
          photosCount: column.photos.length,
          index,
          photoIndex,
          top,
        };
        const style = {
          top: top + "px",
        };
        return { photo, layout, style };
      }),
      data: column.data,
    };
  });
}
