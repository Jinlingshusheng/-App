import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * 「星辰中队」星夜标题区：藏蓝底 + 星座点线意象 + 主标题/副标题。
 */
export function StarryHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const h = 168;

  // 星座点位（相对坐标，按 width 缩放）
  const pts = [
    { x: 0.12, y: 0.36 },
    { x: 0.26, y: 0.2 },
    { x: 0.42, y: 0.34 },
    { x: 0.58, y: 0.16 },
    { x: 0.74, y: 0.32 },
    { x: 0.88, y: 0.18 },
    { x: 0.94, y: 0.5 },
    { x: 0.16, y: 0.66 },
    { x: 0.5, y: 0.62 },
  ];
  const lines = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [3, 7], [7, 8], [8, 2], [8, 5],
  ];

  return (
    <View
      style={{
        backgroundColor: '#1e3a5f',
        paddingTop: Math.max(insets.top, 12) + 14,
        height: h + insets.top,
        overflow: 'hidden',
      }}
    >
      <Svg width="100%" height={h} style={{ position: 'absolute', left: 0, bottom: 0 }}>
        {lines.map(([a, b], i) => (
          <Line
            key={`l${i}`}
            x1={pts[a].x * width}
            y1={pts[a].y * h}
            x2={pts[b].x * width}
            y2={pts[b].y * h}
            stroke="rgba(214,166,49,0.30)"
            strokeWidth={1}
          />
        ))}
        {pts.map((p, i) => (
          <Circle
            key={`d${i}`}
            cx={p.x * width}
            cy={p.y * h}
            r={i % 3 === 0 ? 3 : 2}
            fill="#d6a631"
            opacity={0.85}
          />
        ))}
      </Svg>

      <View className="px-5">
        <View className="flex-row items-center gap-2">
          <Text className="text-gold text-[13px] tracking-[0.2em] font-medium">★ 星辰中队</Text>
        </View>
        <Text className="mt-1 text-white text-[30px] font-bold tracking-wide leading-tight">
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-[#cfd8e8] text-[14px]">{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}