import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, Ellipse, RadialGradient, Rect, Stop } from "react-native-svg";
import { C } from "../theme/colors";

export function Galaxy({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const canvasWidth = Math.min(width, 480);
  const stars = Array.from({ length: 60 }, (_, i) => ({
    x: (((i * 47) % 390) / 390) * canvasWidth,
    y: (((i * 83) % 844) / 844) * height,
    r: 0.6 + (i % 4) * 0.35,
  }));

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        maxWidth: 480,
        alignSelf: "center",
        backgroundColor: C.bg,
        overflow: "hidden",
      }}
    >
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="glowWhite">
            <Stop offset="0" stopColor="#D9D9D9" stopOpacity=".30" />
            <Stop offset="1" stopColor="#D9D9D9" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="glowBlue">
            <Stop offset="0" stopColor="#285AC8" stopOpacity=".20" />
            <Stop offset="1" stopColor="#285AC8" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="#000" />
        <Circle cx={canvasWidth * 0.15} cy={height * 0.1} r={canvasWidth * 0.65} fill="url(#glowWhite)" />
        <Circle cx={canvasWidth * 0.9} cy={height * 0.55} r={canvasWidth * 0.65} fill="url(#glowBlue)" />
        <Ellipse
          cx={canvasWidth * 0.5}
          cy={height * 0.5}
          rx={canvasWidth * 0.23}
          ry={height * 0.75}
          rotation="-35"
          origin={`${canvasWidth * 0.5}, ${height * 0.5}`}
          fill="#D9D9D9"
          opacity=".035"
        />
        {stars.map((x, i) => (
          <Circle
            key={i}
            cx={x.x}
            cy={x.y}
            r={x.r}
            fill="#F5F5F7"
            opacity={0.25 + (i % 5) / 7}
          />
        ))}
      </Svg>
      {children}
    </View>
  );
}
