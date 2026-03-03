/**
 * Programmatic volleyball court: two squares, net in middle, attack line at 1/3 from net.
 * Portrait: width = W, height = 2W. Scales to any device.
 */

import React from 'react';
import Svg, { Rect, Line } from 'react-native-svg';

interface CourtSvgProps {
  width: number;
  /** Height = 2 * width for two squares */
  height?: number;
  /** Court surface color */
  courtColor?: string;
  /** Net and line color */
  lineColor?: string;
  lineWidth?: number;
}

export function CourtSvg({
  width,
  height = width * 2,
  courtColor = '#2d5016',
  lineColor = '#fff',
  lineWidth = 2,
}: CourtSvgProps) {
  const W = width;
  const H = height;
  const half = H / 2;

  const netY = half;
  const attackAwayY = half - W / 3;
  const attackHomeY = half + W / 3;

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ backgroundColor: courtColor }}>
      <Rect x={0} y={0} width={W} height={half} fill={courtColor} />
      <Rect x={0} y={half} width={W} height={half} fill={courtColor} />
      <Line x1={0} y1={netY} x2={W} y2={netY} stroke={lineColor} strokeWidth={lineWidth} strokeDasharray="6,4" />
      <Line x1={0} y1={attackAwayY} x2={W} y2={attackAwayY} stroke={lineColor} strokeWidth={lineWidth} />
      <Line x1={0} y1={attackHomeY} x2={W} y2={attackHomeY} stroke={lineColor} strokeWidth={lineWidth} />
    </Svg>
  );
}
