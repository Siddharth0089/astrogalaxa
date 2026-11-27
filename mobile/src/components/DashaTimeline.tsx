import React from "react";
import { Text, View } from "react-native";
import { KundliData } from "../types";
import { C } from "../theme/colors";
import { s } from "../theme/styles";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));

export function DashaTimeline({ dasha }: { dasha: KundliData["dasha"] }) {
  const current = dasha.current;
  return (
    <View style={{ gap: 16 }}>
      {dasha.approximate && (
        <View
          style={{
            backgroundColor: "rgba(243, 197, 86, 0.08)",
            borderWidth: 1,
            borderColor: "rgba(243, 197, 86, 0.25)",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: "#F6E7B8", fontSize: 12, lineHeight: 18 }}>
            Note: Dasha timing is calculated using Moon longitude at noon. Add your exact birth time for pinpoint Antardasha dates.
          </Text>
        </View>
      )}

      {current ? (
        <View
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(243, 197, 86, 0.34)",
            backgroundColor: "rgba(18, 16, 28, 0.82)",
            padding: 20,
            gap: 12,
          }}
        >
          <Text
            style={{
              color: C.gold,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            ✦ Active Vimshottari Mahadasha
          </Text>
          <Text style={s.sign}>{current.planet} Mahadasha</Text>
          <Text style={s.sub}>
            {formatDate(current.start)} – {formatDate(current.end)}
          </Text>

          <View
            accessibilityRole="progressbar"
            accessibilityLabel={`${Math.round(current.percentElapsed)} percent of this period has passed`}
            style={s.progress}
          >
            <View
              style={[
                s.progressFill,
                {
                  width: `${Math.max(0, Math.min(100, current.percentElapsed))}%`,
                },
              ]}
            />
          </View>

          {current.subperiod && (
            <View
              style={{
                backgroundColor: "rgba(243, 197, 86, 0.08)",
                borderLeftWidth: 2.5,
                borderLeftColor: C.gold,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                gap: 2,
              }}
            >
              <Text style={{ color: C.gold, fontSize: 11, fontWeight: "700" }}>
                ANTARDASHA SUB-PERIOD: {current.subperiod.planet.toUpperCase()}
              </Text>
              <Text style={{ color: C.secondary, fontSize: 12 }}>
                {formatDate(current.subperiod.start)} – {formatDate(current.subperiod.end)}
              </Text>
            </View>
          )}

          <Text style={[s.cardText, { color: "#EAE3D2" }]}>
            {current.interpretation}
          </Text>
        </View>
      ) : (
        <Text style={s.sub}>No current period is available.</Text>
      )}

      <View style={{ gap: 8 }}>
        <Text
          style={{
            color: C.secondary,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1.4,
            textTransform: "uppercase",
          }}
        >
          Life Cycle Timeline
        </Text>
        <View
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
            backgroundColor: "rgba(18, 16, 28, 0.65)",
            padding: 16,
          }}
        >
          {dasha.timeline.map((p, idx) => {
            const isNow = p.tag === "Now";
            return (
              <View
                style={[
                  s.timeline,
                  {
                    borderLeftColor: isNow ? C.gold : "rgba(243, 197, 86, 0.25)",
                    borderLeftWidth: isNow ? 2 : 1,
                    paddingBottom: idx < dasha.timeline.length - 1 ? 14 : 4,
                  },
                ]}
                key={p.start}
              >
                <View
                  style={[
                    s.dot,
                    {
                      backgroundColor: isNow ? C.gold : "rgba(243, 197, 86, 0.45)",
                      width: isNow ? 11 : 7,
                      height: isNow ? 11 : 7,
                      borderRadius: 6,
                      left: isNow ? -6 : -4,
                    },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: isNow ? C.gold : C.text,
                      fontWeight: isNow ? "700" : "500",
                      fontSize: 13.5,
                    }}
                  >
                    {p.planet} Mahadasha{isNow ? " (Active)" : ""}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>
                    {formatDate(p.start)} – {formatDate(p.end)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
