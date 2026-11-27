import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "../components/Button";
import { LagnaChart } from "../components/LagnaChart";
import { PlanetsTable } from "../components/PlanetsTable";
import { DashaTimeline } from "../components/DashaTimeline";
import { getZodiacSymbol, KundliData, Screen } from "../types";
import { s } from "../theme/styles";

export function KundliScreen({
  name,
  birth,
  kundli,
  kundliLoading,
  kundliError,
  token,
  onRetry,
  onNavigate,
}: {
  name: string;
  birth: { dob: string; time: string; place: string };
  kundli: KundliData | null;
  kundliLoading: boolean;
  kundliError: string;
  token?: string;
  onRetry: () => void;
  onNavigate: (s: Screen) => void;
}) {
  const [tab, setTab] = useState<"Chart" | "Planets" | "Dasha">("Chart");

  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.header}>
        <Pressable accessibilityLabel="Go back" onPress={() => onNavigate("home")} style={s.back}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>{`${name || "Your"}'s Kundli`}</Text>
        <View style={s.back} />
      </View>
      <Text style={s.sub}>
        {birth.dob || "Birth date"} · {birth.time || "Time not provided"}
      </Text>
      <View style={s.tabs}>
        {(["Chart", "Planets", "Dasha"] as const).map((x) => (
          <Pressable
            key={x}
            onPress={() => setTab(x)}
            style={[s.tab, tab === x && s.tabActive]}
          >
            <Text style={tab === x ? s.tabTextActive : s.tabText}>{x}</Text>
          </Pressable>
        ))}
      </View>
      {kundliLoading ? (
        <Text style={s.sub}>Loading your Kundli…</Text>
      ) : !kundli ? (
        <>
          <Text style={s.sub}>
            {kundliError || "Sign in and complete your birth details to view your Kundli."}
          </Text>
          {!!token && (
            <Button label="Try again" onPress={onRetry} variant="glass" />
          )}
        </>
      ) : tab === "Chart" ? (
        <>
          {kundli.ascendant ? (
            <LagnaChart data={kundli} />
          ) : (
            <Text style={s.sub}>The chart needs your exact time of birth.</Text>
          )}
          <View style={s.grid}>
            {["Ascendant", "Moon sign", "Nakshatra"].map((x, i) => (
              <View
                key={x}
                style={[
                  s.tile,
                  {
                    flex: 1,
                    width: undefined,
                    minWidth: 0,
                    minHeight: 76,
                    padding: 10,
                  },
                ]}
              >
                <Text style={s.sub}>{x}</Text>
                <Text style={s.tileTitle}>
                  {
                    [
                      kundli.ascendant?.sign
                        ? `${getZodiacSymbol(kundli.ascendant.sign)} ${kundli.ascendant.sign}`
                        : "Needs birth time",
                      kundli.moonSign
                        ? `${getZodiacSymbol(kundli.moonSign)} ${kundli.moonSign}`
                        : "Unavailable",
                      kundli.nakshatra.name,
                    ][i]
                  }
                </Text>
              </View>
            ))}
          </View>
          {!kundli.ascendant && (
            <Button
              label="Add time of birth"
              onPress={() => onNavigate("birth")}
              variant="glass"
            />
          )}
        </>
      ) : tab === "Planets" ? (
        <PlanetsTable planets={kundli.planets} />
      ) : (
        <DashaTimeline dasha={kundli.dasha} />
      )}
    </ScrollView>
  );
}
