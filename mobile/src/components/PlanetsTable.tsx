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

function dignityStyle(dignity?: Planet["dignity"]) {
  if (dignity === "Exalted")
    return {
      bg: "rgba(127, 224, 168, 0.14)",
      border: "rgba(127, 224, 168, 0.45)",
      text: "#7FE0A8",
      label: "Exalted",
    };
  if (dignity === "Own Sign")
    return {
      bg: "rgba(243, 197, 86, 0.14)",
      border: "rgba(243, 197, 86, 0.45)",
      text: C.gold,
      label: "Own Sign",
    };
  if (dignity === "Debilitated")
    return {
      bg: "rgba(255, 180, 171, 0.14)",
      border: "rgba(255, 180, 171, 0.45)",
      text: "#FFB4AB",
      label: "Debilitated",
    };
  return null;
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
        <Text style={{ color: C.gold, fontWeight: "700", fontSize: 11.5, width: "28%" }}>
          PLANET
        </Text>
        <Text style={{ color: C.gold, fontWeight: "700", fontSize: 11.5, width: "52%" }}>
          D1 SIGN · NAKSHATRA · D9
        </Text>
        <Text
          style={{
            color: C.gold,
            fontWeight: "700",
            fontSize: 11.5,
            width: "20%",
            textAlign: "right",
          }}
        >
          HOUSE
        </Text>
      </View>

      {planets.map((p, idx) => {
        const dig = dignityStyle(p.dignity);
        return (
          <View
            key={p.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
              borderBottomWidth: idx < planets.length - 1 ? 1 : 0,
              borderBottomColor: "rgba(255, 255, 255, 0.07)",
            }}
          >
            {/* Planet Name & Badges */}
            <View style={{ width: "28%", gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: "700" }}>
                  {p.id}
                </Text>
                {p.retrograde && (
                  <View
                    style={{
                      backgroundColor: "rgba(243, 197, 86, 0.16)",
                      borderRadius: 5,
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                    }}
                  >
                    <Text style={{ color: C.gold, fontSize: 9.5, fontWeight: "700" }}>
                      R
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3 }}>
                {dig && (
                  <View
                    style={{
                      backgroundColor: dig.bg,
                      borderWidth: 1,
                      borderColor: dig.border,
                      borderRadius: 6,
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                    }}
                  >
                    <Text style={{ color: dig.text, fontSize: 9.5, fontWeight: "700" }}>
                      {dig.label}
                    </Text>
                  </View>
                )}
                {p.vargottama && (
                  <View
                    style={{
                      backgroundColor: "rgba(186, 230, 253, 0.14)",
                      borderRadius: 6,
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                    }}
                  >
                    <Text style={{ color: "#BAE6FD", fontSize: 9.5, fontWeight: "700" }}>
                      Vargottama
                    </Text>
                  </View>
                )}
                {p.combust && (
                  <Text style={{ color: "#FCA5A5", fontSize: 9.5, fontWeight: "600" }}>
                    Combust
                  </Text>
                )}
              </View>
            </View>

            {/* Sign, Degree, Nakshatra & D9 */}
            <View style={{ width: "52%", gap: 3 }}>
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
                  {p.d9Sign ? `  •  D9: ${p.d9Sign.slice(0, 3)}` : ""}
                </Text>
              )}
            </View>

            {/* House Number */}
            <View style={{ width: "20%", alignItems: "flex-end" }}>
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
        );
      })}
    </View>
  );
}
