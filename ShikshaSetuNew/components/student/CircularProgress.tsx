import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useAuth } from "../../src/hooks/useAuth";

interface CircularProgressProps {
  percentage: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}

export default function CircularProgress({
  percentage,
  label,
  size = 80,
  strokeWidth = 8,
  color,
  children,
}: CircularProgressProps) {
  const { theme } = useAuth();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const activeColor = color ?? theme?.colors?.secondary ?? "#D4AF37";

  return (
    <View className="items-center justify-center">
      <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
        <Svg width={size} height={size}>
          {/* Background Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme?.colors?.lightGray ?? "#E5E7EB"}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={activeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation={-90} // Start from top
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View className="absolute items-center justify-center">
          {children ? (
            children
          ) : (
            <Text className="font-poppins-bold text-lg" style={{ color: theme?.colors?.primary ?? "#0D1B2A" }}>{percentage}%</Text>
          )}
        </View>
      </View>
      {!!label && (
        <Text className="font-inter-medium text-[11px] text-gray-500 mt-2 text-center">{label}</Text>
      )}
    </View>
  );
}

