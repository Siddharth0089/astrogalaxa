import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

export function Button({
  label,
  onPress,
  disabled = false,
  busy = false,
  variant = "gold",
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: "gold" | "glass";
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        variant === "gold" ? styles.gold : styles.glass,
        (disabled || busy) && styles.disabled,
        pressed && !disabled && !busy && styles.pressed,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator
          size="small"
          color={variant === "gold" ? "#18140B" : "#F6E7B8"}
        />
      ) : (
        <Text style={variant === "gold" ? styles.goldText : styles.glassText}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
  },
  gold: {
    backgroundColor: "#F3C556",
    borderColor: "rgba(255, 240, 185, 0.45)",
    shadowColor: "#EAB308",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  glass: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  goldText: {
    color: "#18140B",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.4,
  },
  glassText: {
    color: "#F6E7B8",
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.55,
  },
});
