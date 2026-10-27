// cursorrules §5: react-native-svg kullanımı — Expo Go uyumlu, Victory Native XL gerektirmez.
// Genişlik flex ile otomatik hesaplanır; sabit yükseklik 48px.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { Colors } from '@/theme';

interface SparklineChartProps {
  data: number[];
  height?: number;
  color?: string;
  width?: number;
}

function buildPoints(data: number[], width: number, height: number): string {
  if (data.length < 2) return '';
  const padding = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = width - padding * 2;
  const h = height - padding * 2;

  return data
    .map((val, i) => {
      const x = padding + (i / (data.length - 1)) * w;
      const y = padding + h - ((val - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function SparklineChart({
  data,
  height = 48,
  color,
  width = 80,
}: SparklineChartProps): React.JSX.Element | null {
  if (!data || data.length < 2) return <View style={{ height, width }} />;

  const isPositive = data[data.length - 1] >= data[0];
  const lineColor = color ?? (isPositive ? Colors.success : Colors.danger);
  const points = buildPoints(data, width, height);

  if (!points) return <View style={{ height, width }} />;

  return (
    <View style={[styles.container, { height, width }]}>
      <Svg width={width} height={height}>
        <Polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
