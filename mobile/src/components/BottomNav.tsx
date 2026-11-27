import React from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { Language, Screen } from "../types";
import { C } from "../theme/colors";
import { getCopy } from "../theme/i18n";

function NavIcon({
  tab,
  active,
}: {
  tab: "home" | "kundli" | "chat" | "tarot";
  active: boolean;
}) {
  const color = active ? C.gold : C.secondary;
  const strokeWidth = active ? 2 : 1.7;

  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      {tab === "home" && (
        <Path
          d="M4 10.5L12 4L20 10.5V19.5C20 20.1 19.6 20.5 19 20.5H14.5V14.5H9.5V20.5H5C4.4 20.5 4 20.1 4 19.5V10.5Z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={active ? "rgba(243, 197, 86, 0.16)" : "none"}
        />
      )}
      {tab === "kundli" && (
        <>
          <Path
            d="M12 3L21 12L12 21L3 12L12 3Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            fill={active ? "rgba(243, 197, 86, 0.16)" : "none"}
          />
          <Path
            d="M12 3V21 M3 12H21"
            stroke={color}
            strokeWidth={1.3}
            strokeOpacity={0.75}
          />
        </>
      )}
      {tab === "chat" && (
        <Path
          d="M12 3L14.2 9.8L21 12L14.2 14.2L12 21L9.8 14.2L3 12L9.8 9.8L12 3Z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          fill={active ? "rgba(243, 197, 86, 0.2)" : "none"}
        />
      )}
      {tab === "tarot" && (
        <>
          <Rect
            x="6"
            y="3.5"
            width="12"
            height="17"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
            fill={active ? "rgba(243, 197, 86, 0.16)" : "none"}
          />
          <Path
            d="M12 8.5L13 11L15.5 12L13 13L12 15.5L11 13L8.5 12L11 11L12 8.5Z"
            stroke={color}
            strokeWidth={1.3}
            strokeLinejoin="round"
            fill="none"
          />
        </>
      )}
    </Svg>
  );
}

export function BottomNav({
  active,
  go,
  visible = true,
  language = "English",
}: {
  active: Screen;
  go: (x: Screen) => void;
  visible?: boolean;
  language?: Language;
}) {
  if (!visible) return null;
  const t = getCopy(language);

  const items: { label: string; value: "home" | "kundli" | "chat" | "tarot" }[] = [
    { label: t.nav.home, value: "home" },
    { label: t.nav.kundli, value: "kundli" },
    { label: t.nav.chat, value: "chat" },
    { label: t.nav.tarot, value: "tarot" },
  ];

  return (
    <View
      pointerEvents="box-none"
      style={{
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 4,
        backgroundColor: "transparent",
      }}
    >
      <View
        style={{
          height: 58,
          flexDirection: "row",
          borderRadius: 29,
          backgroundColor: "rgba(18, 16, 28, 0.88)",
          borderWidth: 1,
          borderColor: "rgba(243, 197, 86, 0.3)",
          paddingHorizontal: 8,
          alignItems: "center",
          ...({ backdropFilter: "blur(16px)" } as object),
        }}
      >
        {items.map((item) => {
          const isSelected =
            active === item.value ||
            (active === "live" && item.value === "chat");

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isSelected }}
              key={item.value}
              onPress={() => go(item.value)}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isSelected
                  ? "rgba(243, 197, 86, 0.14)"
                  : "transparent",
                gap: 2,
              }}
            >
              <NavIcon tab={item.value} active={isSelected} />
              <Text
                style={{
                  fontSize: 10.5,
                  color: isSelected ? C.gold : C.secondary,
                  fontWeight: isSelected ? "700" : "500",
                  letterSpacing: 0.3,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
