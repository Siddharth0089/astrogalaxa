import React from "react";
import { Text, View } from "react-native";
import { KundliData } from "../types";
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
    <>
      {dasha.approximate && (
        <Text style={s.helper}>Approximate: birth time was not provided.</Text>
      )}
      {current ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>RUNNING NOW</Text>
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
          <Text style={s.cardText}>
            {current.subperiod ? `Sub-period: ${current.subperiod.planet}. ` : ""}
            {current.interpretation}
          </Text>
        </View>
      ) : (
        <Text style={s.sub}>No current period is available.</Text>
      )}
      <Text style={s.label}>Life periods</Text>
      {dasha.timeline.map((p) => (
        <View style={s.timeline} key={p.start}>
          <View style={s.dot} />
          <Text style={s.cardText}>
            {p.tag} · {p.planet} · {formatDate(p.start)} – {formatDate(p.end)}
          </Text>
        </View>
      ))}
    </>
  );
}
