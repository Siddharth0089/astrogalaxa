import React from "react";
import { Pressable, Text } from "react-native";
import { C } from "../theme/colors";
import { s } from "../theme/styles";

export function Button({
  label,
  onPress,
  disabled = false,
  variant = "gold",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "gold" | "glass";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={[
        s.button,
        variant === "gold" ? s.gold : s.glass,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={[s.buttonText, variant === "gold" && { color: C.onGold }]}>
        {label}
      </Text>
    </Pressable>
  );
}
