import React from "react";
import { Text, View } from "react-native";
import { Planet } from "../types";
import { ZodiacIcon } from "./ZodiacBadge";
import { C } from "../theme/colors";

function formatDeg(deg?: number): string {
  if (deg === undefined || deg === null || !Number.isFinite(deg)) return "";
  const whole = Math.floor(deg);
  const mins = Math.floor((deg - whole) * 60);
  return `${whole}°${String(mins).padStart(2, "0")}'`;
}

export function PlanetsTable({ planets }: { planets: Planet[] }) {
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(243, 197, 86, 0.25)",
        backgroundColor: "rgba(18, 16, 28, 0.78)",
        padding: 16,
        gap: 6,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(243, 197, 86, 0.2)",
        }}
      >
        <Text style={{ color: C.gold, fontWeight: "700", fontSize: 12, width: "30%" }}>
          PLANET
        </Text>
        <Text style={{ color: C.gold, fontWeight: "700", fontSize: 12, width: "48%" }}>
          SIGN & NAKSHATRA
        </Text>
        <Text
          style={{
            color: C.gold,
            fontWeight: "700",
            fontSize: 12,
            width: "22%",
            textAlign: "right",
          }}
        >
          HOUSE
        </Text>
      </View>

      {planets.map((p, idx) => (
        <View
          key={p.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 11,
            borderBottomWidth: idx < planets.length - 1 ? 1 : 0,
            borderBottomColor: "rgba(255, 255, 255, 0.07)",
          }}
        >
          {/* Planet Name & Retrograde Indicator */}
          <View style={{ width: "30%", flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ color: C.text, fontSize: 14, fontWeight: "600" }}>
              {p.id}
            </Text>
            {p.retrograde && (
              <View
                style={{
                  backgroundColor: "rgba(243, 197, 86, 0.16)",
                  borderWidth: 1,
                  borderColor: "rgba(243, 197, 86, 0.4)",
                  borderRadius: 6,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                }}
              >
                <Text style={{ color: C.gold, fontSize: 10, fontWeight: "700" }}>
                  R
                </Text>
              </View>
            )}
          </View>

          {/* Sign, Degree, & Nakshatra */}
          <View style={{ width: "48%", gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <ZodiacIcon sign={p.sign} size={13} color={C.gold} />
              <Text style={{ color: "#F6F1E7", fontSize: 13.5, fontWeight: "600" }}>
                {p.sign}
              </Text>
              {p.degree !== undefined && (
                <Text style={{ color: C.secondary, fontSize: 11 }}>
                  {formatDeg(p.degree)}
                </Text>
              )}
            </View>
            {!!p.nakshatra && (
              <Text style={{ color: C.muted, fontSize: 11 }}>
                {p.nakshatra}
                {p.pada ? ` · P${p.pada}` : ""}
              </Text>
            )}
          </View>

          {/* House Number */}
          <View style={{ width: "22%", alignItems: "flex-end" }}>
            {p.house != null ? (
              <View
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  borderRadius: 8,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: "#F6E7B8", fontSize: 12, fontWeight: "700" }}>
                  H{p.house}
                </Text>
              </View>
            ) : (
              <Text style={{ color: C.muted, fontSize: 12 }}>—</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
