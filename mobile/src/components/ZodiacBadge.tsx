import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

const SYMBOL_TO_SIGN: Record<string, string> = {
  "♈": "aries",
  "♉": "taurus",
  "♊": "gemini",
  "♋": "cancer",
  "♌": "leo",
  "♍": "virgo",
  "♎": "libra",
  "♏": "scorpio",
  "♐": "sagittarius",
  "♑": "capricorn",
  "♒": "aquarius",
  "♓": "pisces",
};

function resolveSignKey(sign?: string | null, symbol?: string): string {
  if (sign) {
    const clean = sign.trim().toLowerCase();
    if (clean) return clean;
  }
  if (symbol && SYMBOL_TO_SIGN[symbol]) {
    return SYMBOL_TO_SIGN[symbol];
  }
  return "star";
}

export function ZodiacIcon({
  sign,
  symbol,
  size = 24,
  color = "#F6E7B8",
}: {
  sign?: string | null;
  symbol?: string;
  size?: number;
  color?: string;
}) {
  const key = resolveSignKey(sign, symbol);
  const strokeProps = {
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none" as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {key === "aries" && (
        <Path
          d="M12 20V10 M12 10C12 6.2 9.2 4 6.5 4.2C4.3 4.4 3.5 6.4 4.5 8.2 M12 10C12 6.2 14.8 4 17.5 4.2C19.7 4.4 20.5 6.4 19.5 8.2"
          {...strokeProps}
        />
      )}
      {key === "taurus" && (
        <>
          <Circle cx="12" cy="14.5" r="4.5" {...strokeProps} />
          <Path
            d="M6.2 4.5C7 7.8 9.2 10 12 10C14.8 10 17 7.8 17.8 4.5"
            {...strokeProps}
          />
        </>
      )}
      {key === "gemini" && (
        <Path
          d="M5.5 5.2C9.5 6.8 14.5 6.8 18.5 5.2 M5.5 18.8C9.5 17.2 14.5 17.2 18.5 18.8 M9.2 6.2V17.8 M14.8 6.2V17.8"
          {...strokeProps}
        />
      )}
      {key === "cancer" && (
        <>
          <Circle cx="7.5" cy="9.2" r="2.6" {...strokeProps} />
          <Path d="M6.8 6.8C10.5 4.6 15.8 5.4 18.8 8.4" {...strokeProps} />
          <Circle cx="16.5" cy="14.8" r="2.6" {...strokeProps} />
          <Path d="M17.2 17.2C13.5 19.4 8.2 18.6 5.2 15.6" {...strokeProps} />
        </>
      )}
      {key === "leo" && (
        <>
          <Circle cx="7" cy="14.8" r="2.6" {...strokeProps} />
          <Path
            d="M8.9 13C8.5 7.5 11.4 4.5 14.5 5.3C17.2 6 17.6 9.5 16 13.2C14.8 16 15.8 18.8 18 18.8C19.6 18.8 20.3 17.4 19.8 15.8"
            {...strokeProps}
          />
        </>
      )}
      {key === "virgo" && (
        <Path
          d="M4.5 5.5V16.5 M4.5 9.2C4.5 6.2 8.2 6.2 8.2 9.2V16.5 M8.2 9.2C8.2 6.2 12 6.2 12 9.2V16.5 M12 9.2C12 6.2 15.8 6.2 15.8 9.2C15.8 13.8 13.8 17.2 11.2 19.2 M15.8 12C18.2 10.6 19.8 12.2 18.8 14.6C17.8 16.8 14.8 18.2 11.8 19"
          {...strokeProps}
        />
      )}
      {key === "libra" && (
        <Path
          d="M4 18.2H20 M4 14.2H8.4A3.6 3.6 0 1 1 15.6 14.2H20"
          {...strokeProps}
        />
      )}
      {key === "scorpio" && (
        <Path
          d="M4.2 5.5V15.8 M4.2 9.2C4.2 6.2 7.8 6.2 7.8 9.2V15.8 M7.8 9.2C7.8 6.2 11.4 6.2 11.4 9.2V15.8 M11.4 9.2C11.4 6.2 15 6.2 15 9.2V15.8C15 17.6 16.2 18.5 17.8 18.5L20 16.3 M17.2 16.3H20V19.1"
          {...strokeProps}
        />
      )}
      {key === "sagittarius" && (
        <Path
          d="M5 19L19 5 M13.2 5H19V10.8 M7.8 11.5L12.5 16.2"
          {...strokeProps}
        />
      )}
      {key === "capricorn" && (
        <Path
          d="M4.8 6.2L8.8 16.8L12 9.8C13.2 7.4 15.8 7.8 16.2 10.2C16.6 12.6 15.1 14.6 13.6 16.2C12.2 17.6 12.6 19.6 14.6 19.8C16.4 20 18 18.6 17.8 16.8C17.6 15.2 15.8 14.2 14.2 15.4"
          {...strokeProps}
        />
      )}
      {key === "aquarius" && (
        <Path
          d="M3.8 9L6.5 6.5L9.2 9L12 6.5L14.8 9L17.5 6.5L20.2 9 M3.8 15.5L6.5 13L9.2 15.5L12 13L14.8 15.5L17.5 13L20.2 15.5"
          {...strokeProps}
        />
      )}
      {key === "pisces" && (
        <Path
          d="M6.2 5C9.4 9 9.4 15 6.2 19 M17.8 5C14.6 9 14.6 15 17.8 19 M4.2 12H19.8"
          {...strokeProps}
        />
      )}
      {key === "star" && (
        <Path
          d="M12 3.5L14.1 9.9L20.5 12L14.1 14.1L12 20.5L9.9 14.1L3.5 12L9.9 9.9Z"
          {...strokeProps}
        />
      )}
    </Svg>
  );
}

interface ZodiacBadgeProps {
  sign?: string | null;
  symbol?: string;
  size?: number;
  reveal?: boolean;
  pulse?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ZodiacBadge({
  sign,
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
              toValue: 1.16,
              duration: 1800,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: nativeDriver,
            }),
            Animated.timing(haloOpacity, {
              toValue: 0.72,
              duration: 1800,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: nativeDriver,
            }),
          ]),
          Animated.parallel([
            Animated.timing(haloScale, {
              toValue: 1.0,
              duration: 1800,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: nativeDriver,
            }),
            Animated.timing(haloOpacity, {
              toValue: 0.28,
              duration: 1800,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: nativeDriver,
            }),
          ]),
        ]),
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
          friction: 5,
          tension: 42,
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 750,
          easing: Easing.out(Easing.back(1.4)),
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
    outputRange: ["-90deg", "0deg"],
  });

  const glyphSize = Math.round(size * 0.44);

  return (
    <View
      style={[
        {
          width: size + 24,
          height: size + 24,
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
            width: size + 18,
            height: size + 18,
            borderRadius: (size + 18) / 2,
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
        {/* Sacred Astrolabe Vector Geometry */}
        <Svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          style={StyleSheet.absoluteFill}
        >
          <Circle
            cx="50"
            cy="50"
            r="44"
            stroke="rgba(243, 197, 86, 0.35)"
            strokeWidth="1"
            strokeDasharray="2 4.5"
            fill="none"
          />
          <Circle
            cx="50"
            cy="50"
            r="35"
            stroke="rgba(243, 197, 86, 0.22)"
            strokeWidth="0.9"
            fill="rgba(243, 197, 86, 0.04)"
          />
          {/* Cardinal celestial starlight ticks */}
          <Line x1="50" y1="3" x2="50" y2="9" stroke="#F3C556" strokeWidth="1.2" />
          <Line x1="50" y1="91" x2="50" y2="97" stroke="#F3C556" strokeWidth="1.2" />
          <Line x1="3" y1="50" x2="9" y2="50" stroke="#F3C556" strokeWidth="1.2" />
          <Line x1="91" y1="50" x2="97" y2="50" stroke="#F3C556" strokeWidth="1.2" />
        </Svg>
        <ZodiacIcon sign={sign} symbol={symbol} size={glyphSize} color="#F6E7B8" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: "absolute",
    backgroundColor: "rgba(243, 197, 86, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(243, 197, 86, 0.38)",
  },
  badge: {
    backgroundColor: "rgba(18, 16, 12, 0.92)",
    borderWidth: 1.5,
    borderColor: "rgba(243, 197, 86, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#F3C556",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
});
