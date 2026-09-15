import { StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';

type Point = [number, number];

type Geometry = {
  circles: Array<[cx: number, cy: number, r: number]>;
  /** Polylines on a 24pt grid. A single point draws a dot. */
  paths: Point[][];
};

export type GlyphName = 'success' | 'error' | 'warning' | 'info' | 'close';

// Lucide icons (circle-check, circle-x, triangle-alert, info, x) with a 2pt
// round stroke. Keep in sync with ToastGlyphView.kt.
const GEOMETRY: Record<GlyphName, Geometry> = {
  success: {
    circles: [[12, 12, 10]],
    paths: [
      [
        [9, 12],
        [11, 14],
        [15, 10],
      ],
    ],
  },
  error: {
    circles: [[12, 12, 10]],
    paths: [
      [
        [15, 9],
        [9, 15],
      ],
      [
        [9, 9],
        [15, 15],
      ],
    ],
  },
  warning: {
    circles: [],
    paths: [
      [
        [12, 2.6],
        [13.73, 4],
        [21.73, 18],
        [22.36, 20.25],
        [20, 21],
        [4, 21],
        [1.64, 20.25],
        [2.27, 18],
        [10.27, 4],
        [12, 2.6],
      ],
      [
        [12, 9],
        [12, 13],
      ],
      [[12, 17]],
    ],
  },
  info: {
    circles: [[12, 12, 10]],
    paths: [
      [
        [12, 16],
        [12, 12],
      ],
      [[12, 8]],
    ],
  },
  close: {
    circles: [],
    paths: [
      [
        [18, 6],
        [6, 18],
      ],
      [
        [6, 6],
        [18, 18],
      ],
    ],
  },
};

function segmentStyle(
  [x1, y1]: Point,
  [x2, y2]: Point,
  scale: number,
  stroke: number,
  color: string
): ViewStyle {
  const dx = (x2 - x1) * scale;
  const dy = (y2 - y1) * scale;
  // Round caps are drawn by extending the bar by half a stroke on each end.
  const length = Math.hypot(dx, dy) + stroke;

  return {
    position: 'absolute',
    left: ((x1 + x2) / 2) * scale - length / 2,
    top: ((y1 + y2) / 2) * scale - stroke / 2,
    width: length,
    height: stroke,
    borderRadius: stroke / 2,
    backgroundColor: color,
    transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
  };
}

export function Glyph({
  name,
  size,
  color,
}: {
  name: GlyphName;
  size: number;
  color: string;
}) {
  const scale = size / 24;
  const stroke = 2 * scale;
  const { circles, paths } = GEOMETRY[name];

  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      {circles.map(([cx, cy, r], index) => {
        const diameter = 2 * r * scale + stroke;
        return (
          <View
            key={`circle-${index}`}
            style={[
              styles.absolute,
              {
                left: cx * scale - diameter / 2,
                top: cy * scale - diameter / 2,
                width: diameter,
                height: diameter,
                borderRadius: diameter / 2,
                borderWidth: stroke,
                borderColor: color,
              },
            ]}
          />
        );
      })}
      {paths.flatMap((points, pathIndex) =>
        points.length === 1
          ? [
              <View
                key={`dot-${pathIndex}`}
                style={segmentStyle(
                  points[0]!,
                  points[0]!,
                  scale,
                  stroke,
                  color
                )}
              />,
            ]
          : points
              .slice(1)
              .map((point, index) => (
                <View
                  key={`segment-${pathIndex}-${index}`}
                  style={segmentStyle(
                    points[index]!,
                    point,
                    scale,
                    stroke,
                    color
                  )}
                />
              ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
  },
});
