import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface TechPulseLogoProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function TechPulseLogo({
  width = 200,
  height = 60,
  color = '#3B82F6'
}: TechPulseLogoProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 60" fill="none">
      {/* Pulse/Heartbeat line */}
      <Path
        d="M10 30 L40 30 L50 10 L60 50 L70 30 L85 30 L95 10 L105 50 L115 30 L145 30 L155 10 L165 50 L175 30 L190 30"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
