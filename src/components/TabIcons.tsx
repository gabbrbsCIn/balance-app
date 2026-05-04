import React from 'react';
import { View, StyleSheet } from 'react-native';

interface IconProps {
  color: string;
  size?: number;
}

export function HomeIcon({ color, size = 22 }: IconProps) {
  const s = size * 0.65;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* Roof triangle via border trick */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: s / 2 + 2,
          borderRightWidth: s / 2 + 2,
          borderBottomWidth: s * 0.45,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          marginBottom: -1,
        }}
      />
      {/* Body */}
      <View
        style={{
          width: s * 0.72,
          height: s * 0.52,
          backgroundColor: color,
          borderTopLeftRadius: 1,
          borderTopRightRadius: 1,
        }}
      />
    </View>
  );
}

export function ListIcon({ color, size = 22 }: IconProps) {
  const bar = { height: 2, borderRadius: 1, backgroundColor: color, marginBottom: 5 };
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', gap: 4 }}>
      <View style={[bar, { width: size }]} />
      <View style={[bar, { width: size }]} />
      <View style={[bar, { width: size * 0.65 }]} />
    </View>
  );
}

export function ChartIcon({ color, size = 22 }: IconProps) {
  const maxH = size * 0.75;
  const w = Math.round(size * 0.22);
  const r = 2;
  return (
    <View
      style={{
        width: size,
        height: size,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingBottom: 1,
      }}
    >
      <View style={{ width: w, height: maxH * 0.5, backgroundColor: color, borderRadius: r }} />
      <View style={{ width: w, height: maxH * 0.8, backgroundColor: color, borderRadius: r }} />
      <View style={{ width: w, height: maxH, backgroundColor: color, borderRadius: r }} />
    </View>
  );
}
