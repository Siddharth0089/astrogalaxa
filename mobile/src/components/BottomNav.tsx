import React from "react";
import { Pressable, Text, View } from "react-native";
import { Screen } from "../types";
import { C } from "../theme/colors";
import { s } from "../theme/styles";

export function BottomNav({
  active,
  go,
  visible = true,
}: {
  active: Screen;
  go: (x: Screen) => void;
  visible?: boolean;
}) {
  if (!visible) return null;
  return (
    <View
      style={{
        height: 76,
        flexDirection: "row",
        backgroundColor: "rgba(0,0,0,.9)",
        borderTopWidth: 1,
        borderColor: C.border,
      }}
    >
      {(
        [
          ["Home", "home", "⌂"],
          ["Kundli", "kundli", "◇"],
          ["Chat", "chat", "✧"],
          ["Tarot", "tarot", "▱"],
        ] as const
      ).map(([label, value, icon]) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={label}
          accessibilityState={{
            selected: active === value || (active === "live" && value === "chat"),
          }}
          key={value}
          onPress={() => go(value)}
          style={s.navItem}
        >
          <Text
            style={{
              color:
                active === value || (active === "live" && value === "chat")
                  ? C.gold
                  : C.secondary,
              fontSize: 22,
            }}
          >
            {icon}
          </Text>
          <Text
            style={[
              s.navText,
              (active === value || (active === "live" && value === "chat")) &&
                s.navActive,
            ]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
