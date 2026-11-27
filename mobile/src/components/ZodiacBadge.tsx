import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

interface ZodiacBadgeProps {
  symbol: string;
  size?: number;
  reveal?: boolean;
  pulse?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ZodiacBadge({
  symbol,
  size = 80,
  reveal = false,
  pulse = true,
  style,
}: ZodiacBadgeProps) {
  const scale = useRef(new Animated.Value(reveal ? 0 : 1)).current;
  const rotate = useRef(new Animated.Value(reveal ? 0 : 1)).current;
  const opacity = useRef(new Animated.Value(reveal ? 0 : 1)).current;
  const haloScale = useRef(new Animated.Value(1)).current;
  const haloOpacity = useRef(new Animated.Value(0.35)).current;
  const nativeDriver = Platform.OS !== "web";

  useEffect(() => {
    let loopAnimation: Animated.CompositeAnimation | null = null;

    const startPulse = () => {
      loopAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(haloScale, {
              toValue: 1.18,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: nativeDriver,
            }),
            Animated.timing(haloOpacity, {
              toValue: 0.75,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: nativeDriver,
            }),
          ]),
          Animated.parallel([
            Animated.timing(haloScale, {
              toValue: 1.0,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: nativeDriver,
            }),
            Animated.timing(haloOpacity, {
              toValue: 0.3,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: nativeDriver,
            }),
          ]),
        ])
      );
      loopAnimation.start();
    };

    if (reveal) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: nativeDriver,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4.5,
          tension: 40,
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: nativeDriver,
        }),
      ]).start(() => {
        if (pulse) {
          startPulse();
        }
      });
    } else if (pulse) {
      startPulse();
    }

    return () => {
      if (loopAnimation) {
        loopAnimation.stop();
      }
    };
  }, [reveal, pulse, nativeDriver, scale, rotate, opacity, haloScale, haloOpacity]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-120deg", "0deg"],
  });

  const fontSize = Math.round(size * 0.52);

  return (
    <View
      style={[
        {
          width: size + 20,
          height: size + 20,
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.halo,
          {
            width: size + 16,
            height: size + 16,
            borderRadius: (size + 16) / 2,
            transform: [{ scale: haloScale }],
            opacity: haloOpacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.badge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale }, { rotate: spin }],
            opacity,
          },
        ]}
      >
        <Text style={[styles.symbolText, { fontSize }]}>{symbol}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: "absolute",
    backgroundColor: "rgba(234, 179, 8, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.4)",
  },
  badge: {
    backgroundColor: "rgba(26, 23, 14, 0.9)",
    borderWidth: 1.5,
    borderColor: "rgba(246, 231, 184, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EAB308",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
  },
  symbolText: {
    color: "#F6E7B8",
    textAlign: "center",
    includeFontPadding: false,
  },
});
