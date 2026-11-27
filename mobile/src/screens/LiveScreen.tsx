import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Astrologer, Screen } from "../types";
import { apiRequest } from "../../session";
import { s } from "../theme/styles";

export function LiveScreen({
  authenticated,
  onNavigate,
}: {
  authenticated: boolean;
  onNavigate: (s: Screen) => void;
}) {
  const [filter, setFilter] = useState("All");
  const [items, setItems] = useState<Astrologer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    if (!authenticated) {
      setItems([]);
      setError("Sign in to see astrologers.");
      return;
    }
    setLoading(true);
    setError("");
    apiRequest(
      `/astrologers?specialty=${encodeURIComponent(filter)}`,
      undefined,
      true,
    )
      .then((result: Astrologer[]) => {
        if (active) setItems(result);
      })
      .catch(() => {
        if (active) {
          setItems([]);
          setError("Could not load astrologers. Please try again.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authenticated, filter, retry]);

  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => onNavigate("home")}
          style={s.back}
        >
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>Live astrologer</Text>
        <View style={{ width: 44 }} />
      </View>
      <Text style={s.title}>Talk to an astrologer</Text>
      <Text style={s.sub}>
        Verified experts. Your kundli is shared only with your consent.
      </Text>
      <Text style={s.disclaimer}>
        Live consultations use encrypted real-time audio and messaging.
      </Text>
      <View style={s.chips}>
        {["All", "Career", "Love", "Health"].map((x) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === x }}
            accessibilityLabel={x}
            onPress={() => setFilter(x)}
            key={x}
          >
            <Text style={[s.chip, filter === x && s.chipActive]}>{x}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <Text style={s.sub}>Loading astrologers…</Text>
      ) : !!error ? (
        <>
          <Text style={s.sub}>{error}</Text>
          {authenticated && (
            <Button
              label="Try again"
              onPress={() => setRetry((x) => x + 1)}
              variant="glass"
            />
          )}
        </>
      ) : items.length === 0 ? (
        <Text style={s.sub}>
          No verified astrologers are available for this filter yet.
        </Text>
      ) : (
        items.map((item) => (
          <View style={[s.card, { gap: 10 }]} key={item._id}>
            <View
              style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
            >
              <View style={s.avatar}>
                <Text style={s.avatarText}>{(item.name || "?").charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.tileTitle}>{item.name}</Text>
                <Text style={s.sub}>
                  {(item.specialties ?? []).join(" · ")}
                </Text>
                <Text style={s.helper}>
                  {(item.languages ?? []).join(", ")}
                  {item.experienceYears != null
                    ? ` · ${item.experienceYears} years`
                    : ""}
                </Text>
              </View>
            </View>
            <Text style={item.status === "online" ? s.online : s.sub}>
              {item.status === "online"
                ? "● Online"
                : item.status === "busy"
                  ? "○ Busy"
                  : "○ Offline"}
              {item.ratingCount
                ? ` · ${item.ratingAvg?.toFixed(1) ?? "—"} (${item.ratingCount})`
                : ""}
              {item.pricePerMinute != null
                ? ` · ₹${item.pricePerMinute}/min`
                : ""}
            </Text>
            <Button
              label={item.status === "online" ? "Connect now" : "Unavailable"}
              disabled={item.status !== "online"}
              onPress={() => {}}
              variant={item.status === "online" ? "gold" : "glass"}
            />
          </View>
        ))
      )}
    </ScrollView>
  );
}
