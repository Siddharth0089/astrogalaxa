import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { C } from "../theme/colors";

export function Galaxy({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const canvasWidth = Math.min(width, 480);
  const nativeDriver = Platform.OS !== "web";

  // 6 asynchronous twinkle phases for organic, natural star twinkling
  const twinkle0 = useRef(new Animated.Value(0.18)).current;
  const twinkle1 = useRef(new Animated.Value(0.4)).current;
  const twinkle2 = useRef(new Animated.Value(0.12)).current;
  const twinkle3 = useRef(new Animated.Value(0.3)).current;
  const twinkle4 = useRef(new Animated.Value(0.15)).current;
  const twinkle5 = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animConfigs = [
      { val: twinkle0, min: 0.15, max: 0.95, duration: 2200 },
      { val: twinkle1, min: 0.35, max: 1.0, duration: 3100 },
      { val: twinkle2, min: 0.1, max: 0.85, duration: 1800 },
      { val: twinkle3, min: 0.25, max: 0.9, duration: 4000 },
      { val: twinkle4, min: 0.12, max: 0.75, duration: 2600 },
      { val: twinkle5, min: 0.3, max: 1.0, duration: 3400 },
    ];

    const loops = animConfigs.map(({ val, min, max, duration }) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: max,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: nativeDriver,
          }),
          Animated.timing(val, {
            toValue: min,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: nativeDriver,
          }),
        ])
      )
    );

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [twinkle0, twinkle1, twinkle2, twinkle3, twinkle4, twinkle5, nativeDriver]);

  const twinkleMap = useMemo(
    () => [twinkle0, twinkle1, twinkle2, twinkle3, twinkle4, twinkle5],
    [twinkle0, twinkle1, twinkle2, twinkle3, twinkle4, twinkle5]
  );

  // Deterministic starfield generation: 85 scattered twinkling stars
  const stars = useMemo(() => {
    const list = [];
    const count = 85;
    for (let i = 0; i < count; i++) {
      const xRatio = (((i * 53 + 17) % 997) / 997);
      const yRatio = (((i * 89 + 43) % 991) / 991);
      const sizeMod = i % 12;
      const size =
        sizeMod === 0 ? 2.8 : sizeMod < 3 ? 2.0 : sizeMod < 7 ? 1.4 : 0.9;
      const color =
        i % 9 === 0
          ? "#FDE68A" // warm gold
          : i % 7 === 0
          ? "#BAE6FD" // celestial cyan
          : "#FFFFFF"; // diamond white
      const phase = i % 6;
      list.push({ id: i, xRatio, yRatio, size, color, phase });
    }
    return list;
  }, []);

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
      {/* Deep Space Background with luminous central galactic core */}
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
      >
        <Defs>
          {/* Central Galactic Core Glow - softer, lighter cosmic center */}
          <RadialGradient id="galacticCore" cx="50%" cy="45%" r="60%">
            <Stop offset="0%" stopColor="#3730A3" stopOpacity="0.45" />
            <Stop offset="25%" stopColor="#1E1B4B" stopOpacity="0.32" />
            <Stop offset="60%" stopColor="#0B0F19" stopOpacity="0.16" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
          {/* Secondary celestial starlight haze in the center */}
          <RadialGradient id="starlightHaze" cx="50%" cy="42%" r="35%">
            <Stop offset="0%" stopColor="#4F46E5" stopOpacity="0.22" />
            <Stop offset="60%" stopColor="#1E1B4B" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="#000000" />
        <Rect width="100%" height="100%" fill="url(#galacticCore)" />
        <Rect width="100%" height="100%" fill="url(#starlightHaze)" />
      </Svg>

      {/* Twinkling Galaxy Stars Layer */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {stars.map((s) => (
          <Animated.View
            key={s.id}
            style={[
              styles.star,
              {
                left: s.xRatio * canvasWidth,
                top: s.yRatio * height,
                width: s.size,
                height: s.size,
                borderRadius: s.size / 2,
                backgroundColor: s.color,
                opacity: twinkleMap[s.phase],
                shadowColor: s.size >= 2 ? s.color : undefined,
                shadowRadius: s.size >= 2 ? 4 : 0,
                shadowOpacity: s.size >= 2 ? 0.9 : 0,
              },
            ]}
          />
        ))}
      </View>

      {/* Screen Content Layer */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  star: {
    position: "absolute",
  },
});
