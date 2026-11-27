import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { UserProfile } from "../types";
import { apiRequest } from "../../session";
import { C } from "../theme/colors";
import { s } from "../theme/styles";

export function ProfileScreen({
  authenticated,
  onBack,
  logout,
  deleteAccount,
  onSaved,
  onEditBirth,
}: {
  authenticated: boolean;
  onBack: () => void;
  logout: () => void;
  deleteAccount: () => void;
  onSaved: (profile: UserProfile) => void;
  onEditBirth: (profile: UserProfile) => void;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [prefs, setPrefs] = useState({
    dailyHoroscope: true,
    astrologerOnline: true,
    chat: true,
    notifyTime: "08:00",
    timezone: "UTC",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    if (!authenticated) {
      setLoading(false);
      setError("Sign in to view your profile.");
      return;
    }
    setLoading(true);
    setError("");
    apiRequest("/users/me", undefined, true)
      .then((data: UserProfile) => {
        if (!active) return;
        setProfile(data);
        setName(data.name ?? "");
        setPrefs({
          dailyHoroscope: data.prefs?.dailyHoroscope ?? true,
          astrologerOnline: data.prefs?.astrologerOnline ?? true,
          chat: data.prefs?.chat ?? true,
          notifyTime: data.prefs?.notifyTime ?? "08:00",
          timezone:
            data.prefs?.timezone ??
            Intl.DateTimeFormat().resolvedOptions().timeZone ??
            "UTC",
        });
      })
      .catch(() => {
        if (active)
          setError(
            "Could not load your profile. Check your connection and try again.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authenticated, retry]);

  const save = async () => {
    if (!name.trim()) return setError("Enter your full name.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(prefs.notifyTime))
      return setError("Enter notification time as 24-hour HH:MM.");
    setSaving(true);
    setError("");
    try {
      const updated: UserProfile = await apiRequest(
        "/users/me",
        { name: name.trim(), prefs },
        true,
        "PATCH",
      );
      setProfile(updated);
      setName(updated.name ?? name.trim());
      onSaved(updated);
      Alert.alert("Saved", "Your profile and preferences have been saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <View style={s.page}>
        <Text style={s.sub}>Loading your profile…</Text>
      </View>
    );

  if (!profile)
    return (
      <View style={s.page}>
        <Button label="Back to Home" onPress={onBack} variant="glass" />
        <Text style={s.title}>Profile & settings</Text>
        <Text style={s.sub}>{error}</Text>
        {authenticated && (
          <Button
            label="Try again"
            onPress={() => setRetry((x) => x + 1)}
            variant="glass"
          />
        )}
      </View>
    );

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to Home"
        onPress={onBack}
        style={s.back}
      >
        <Text style={s.backText}>‹</Text>
      </Pressable>
      <Text style={s.title}>Profile & settings</Text>
      <Text style={s.sub}>{profile.email}</Text>
      <Field
        label="Full name"
        value={name}
        onChange={setName}
        placeholder="Your full name"
      />
      <Button
        label="Edit birth details"
        onPress={() => onEditBirth(profile)}
        variant="glass"
      />
      <View style={s.card}>
        <Text style={s.tileTitle}>Notification preferences</Text>
        <Text style={s.helper}>
          Preferences are saved, and daily notifications trigger based on your timezone.
        </Text>
        {(
          [
            ["dailyHoroscope", "Daily horoscope"],
            ["astrologerOnline", "Astrologer availability"],
            ["chat", "Chat messages"],
          ] as const
        ).map(([key, label]) => (
          <View
            key={key}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: 44,
            }}
          >
            <Text style={s.cardText}>{label}</Text>
            <Switch
              accessibilityLabel={label}
              value={prefs[key]}
              onValueChange={(value) => setPrefs({ ...prefs, [key]: value })}
              trackColor={{ true: C.gold }}
            />
          </View>
        ))}
        <Field
          label="Daily notification time (24-hour)"
          value={prefs.notifyTime}
          onChange={(value) => setPrefs({ ...prefs, notifyTime: value })}
          placeholder="08:00"
        />
        <Text style={s.helper}>Timezone: {prefs.timezone}</Text>
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: "#FFB4AB" }}>
          {error}
        </Text>
      )}
      <Button
        label={saving ? "Saving…" : "Save changes"}
        disabled={saving}
        onPress={save}
      />
      <Button label="Log out" onPress={logout} variant="glass" />
      <Button
        label="Delete account"
        onPress={() =>
          Alert.alert(
            "Delete account?",
            "This permanently removes your account.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: deleteAccount },
            ],
          )
        }
        variant="glass"
      />
    </ScrollView>
  );
}
