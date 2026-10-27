// react-native-svg çizgi grafik — dokunmatik crosshair, gradient fill, Y ekseni etiketi yok.
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';
import { type PricePoint, type HistoryPeriod } from '@/hooks/useCurrencyHistory';
import { Colors } from '@/theme';
import { FontFamily } from '@/theme/typography';

interface LineChartProps {
  data: PricePoint[];
  height?: number;
  color?: string;
  period?: HistoryPeriod;
  onScrub?: (rate: number | null, date: string | null) => void;
}

const PAD = { top: 16, bottom: 28, left: 8, right: 8 };
const X_LABEL_COUNT = 5;
const GUIDE_COUNT = 4;

function fmtXLabel(date: string, period: HistoryPeriod): string {
  try {
    const d = new Date(date);
    if (period === '1d') {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    if (period === '1w' || period === '1m') {
      return `${d.getDate()} ${d.toLocaleString('tr-TR', { month: 'short' })}`;
    }
    return `${d.toLocaleString('tr-TR', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`;
  } catch {
    return '';
  }
}

function fmtCrosshairDate(date: string, period: HistoryPeriod): string {
  try {
    const d = new Date(date);
    if (period === '1d') {
      return `${d.getDate()} ${d.toLocaleString('tr-TR', { month: 'long' })} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return `${d.getDate()} ${d.toLocaleString('tr-TR', { month: 'long' })} ${d.getFullYear()}`;
  } catch {
    return '';
  }
}

export function LineChart({
  data,
  height = 200,
  color = Colors.accent.primary,
  period = '1w',
  onScrub,
}: LineChartProps): React.JSX.Element {
  const [containerWidth, setContainerWidth] = useState(360);
  const [crossIdx, setCrossIdx] = useState<number | null>(null);

  const hasData = data.length >= 2;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerWidth(w);
  }, []);

  const computed = useMemo(() => {
    if (!hasData) return null;
    const W = containerWidth;
    const innerW = W - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;

    const rates = data.map((p) => p.rate);
    const lo = Math.min(...rates);
    const hi = Math.max(...rates);
    const range = hi - lo || 1;

    const toX = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
    const toY = (r: number) => PAD.top + innerH - ((r - lo) / range) * innerH;

    const pts = data.map((p, i) => ({ x: toX(i), y: toY(p.rate) }));
    const linePath = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
    const bottomY = (PAD.top + innerH).toFixed(1);
    const fillPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${bottomY} L${PAD.left.toFixed(1)},${bottomY} Z`;

    const guides = Array.from({ length: GUIDE_COUNT }, (_, i) =>
      toY(lo + (range / (GUIDE_COUNT - 1)) * i),
    );

    const step = Math.floor((data.length - 1) / (X_LABEL_COUNT - 1));
    const xLabels = Array.from({ length: X_LABEL_COUNT }, (_, i) => {
      const idx = Math.min(i * step, data.length - 1);
      return { label: fmtXLabel(data[idx].date, period), x: toX(idx) };
    });

    return { linePath, fillPath, guides, xLabels, pts, innerW };
  }, [data, height, period, containerWidth, hasData]);

  function handleTouch(locationX: number) {
    if (!computed || !hasData) return;
    const fraction = Math.max(0, Math.min((locationX - PAD.left) / computed.innerW, 1));
    const idx = Math.max(0, Math.min(Math.round(fraction * (data.length - 1)), data.length - 1));
    setCrossIdx(idx);
    onScrub?.(data[idx].rate, data[idx].date);
  }

  function handleRelease() {
    setCrossIdx(null);
    onScrub?.(null, null);
  }

  if (!hasData) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Grafik verisi yok</Text>
      </View>
    );
  }

  const crossPt = crossIdx !== null && computed ? computed.pts[crossIdx] : null;
  const crossDate = crossIdx !== null ? fmtCrosshairDate(data[crossIdx].date, period) : null;

  return (
    <View style={{ height }} onLayout={handleLayout}>
      <Svg width="100%" height={height} viewBox={`0 0 ${containerWidth} ${height}`}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Yatay kılavuz çizgileri */}
        {computed?.guides.map((y, i) => (
          <Line
            key={i}
            x1={PAD.left} y1={y}
            x2={containerWidth - PAD.right} y2={y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.75}
          />
        ))}

        {/* Gradient fill */}
        {computed && <Path d={computed.fillPath} fill="url(#grad)" />}

        {/* Ana çizgi */}
        {computed && (
          <Path
            d={computed.linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Crosshair dikey çubuk + nokta */}
        {crossPt && (
          <>
            <Line
              x1={crossPt.x} y1={PAD.top}
              x2={crossPt.x} y2={height - PAD.bottom}
              stroke="rgba(255,255,255,0.28)"
              strokeWidth={1}
              strokeDasharray="4,3"
            />
            <Circle
              cx={crossPt.x} cy={crossPt.y}
              r={5}
              fill={color}
              stroke="#000000"
              strokeWidth={2}
            />
          </>
        )}
      </Svg>

      {/* X ekseni etiketleri — scrub sırasında gizlenir */}
      {crossIdx === null && computed && (
        <View style={[styles.xRow, { left: PAD.left, right: PAD.right }]}>
          {computed.xLabels.map((xl, i) => (
            <Text key={i} style={styles.xLabel} numberOfLines={1}>{xl.label}</Text>
          ))}
        </View>
      )}

      {/* Crosshair tarih etiketi */}
      {crossDate && (
        <View style={[styles.xRow, { left: PAD.left, right: PAD.right }]}>
          <Text style={styles.crossDate}>{crossDate}</Text>
        </View>
      )}

      {/* Dokunma alanı — X ekseninin üstüne kadar */}
      <View
        style={[StyleSheet.absoluteFill, { bottom: PAD.bottom }]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => handleTouch(e.nativeEvent.locationX)}
        onResponderMove={(e) => handleTouch(e.nativeEvent.locationX)}
        onResponderRelease={handleRelease}
        onResponderTerminate={handleRelease}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.text.disabled,
  },
  xRow: {
    position: 'absolute',
    bottom: 0,
    height: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xLabel: {
    flex: 1,
    fontFamily: FontFamily.inter.regular,
    fontSize: 10,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  crossDate: {
    flex: 1,
    fontFamily: FontFamily.inter.medium,
    fontSize: 11,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
