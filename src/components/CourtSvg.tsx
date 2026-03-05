/**
 * Programmatic volleyball court: two squares, net in middle, attack line at 1/3 from net.
 * Border 20% of width, baby blue. Portrait: width = W, height = 2W. Scales to any device.
 */

import React from 'react';
import Svg, { Rect, Line } from 'react-native-svg';

const BORDER_PERCENT = 0.2;
const BORDER_COLOR = '#89CFF0'; // baby blue

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
  courtColor = '#d4b896',
  lineColor = '#fff',
  lineWidth = 2,
}: CourtSvgProps) {
  const W = width;
  const H = height;
  const border = W * BORDER_PERCENT;
  const totalW = W + 2 * border;
  const totalH = H + 2 * border;
  const half = H / 2;

  const netY = border + half;
  const attackAwayY = border + half - W / 3;
  const attackHomeY = border + half + W / 3;

  const courtStrokeWidth = 2;
  return (
    <Svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`} style={{ backgroundColor: BORDER_COLOR }}>
      <Rect x={0} y={0} width={totalW} height={totalH} fill={BORDER_COLOR} />
      <Rect x={border} y={border} width={W} height={half} fill={courtColor} stroke="#fff" strokeWidth={courtStrokeWidth} />
      <Rect x={border} y={border + half} width={W} height={half} fill={courtColor} stroke="#fff" strokeWidth={courtStrokeWidth} />
      <Line x1={border} y1={netY} x2={border + W} y2={netY} stroke={lineColor} strokeWidth={lineWidth} strokeDasharray="6,4" />
      <Line x1={border} y1={attackAwayY} x2={border + W} y2={attackAwayY} stroke={lineColor} strokeWidth={lineWidth} />
      <Line x1={border} y1={attackHomeY} x2={border + W} y2={attackHomeY} stroke={lineColor} strokeWidth={lineWidth} />
    </Svg>
  );
}

export const COURT_BORDER_PERCENT = BORDER_PERCENT;
