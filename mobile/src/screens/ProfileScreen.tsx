import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Gender, Language, UserProfile } from "../types";
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
  const [gender, setGender] = useState<Gender>("male");
  const [language, setLanguage] = useState<Language>("English");
  const [prefs, setPrefs] = useState({
    dailyHoroscope: true,
    astrologerOnline: true,
    chat: true,
    notifyTime: "08:00",
    timezone: "UTC",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [langStatus, setLangStatus] = useState("");
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
        setGender(data.gender ?? "male");
        setLanguage(data.language ?? "English");
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

  const switchLanguage = async (nextLang: Language) => {
    setLanguage(nextLang);
    setLangStatus("Saving…");
    setError("");
    try {
      const updated: UserProfile = await apiRequest(
        "/users/me",
        { language: nextLang },
        true,
        "PATCH",
      );
      setProfile(updated);
      onSaved(updated);
      setLangStatus("Applied ✓");
    } catch {
      setLangStatus("Tap Save changes below");
    }
  };

  const save = async () => {
    if (!name.trim()) return setError("Enter your full name.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(prefs.notifyTime))
      return setError("Enter notification time as 24-hour HH:MM.");
    setSaving(true);
    setError("");
    try {
      const updated: UserProfile = await apiRequest(
        "/users/me",
        { name: name.trim(), gender, language, prefs },
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
    <ScrollView
      contentContainerStyle={[s.page, { paddingBottom: 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to Home"
        onPress={onBack}
        style={{
          width: 40,
          height: 40,
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: C.text,
            fontSize: 34,
            lineHeight: 36,
            fontWeight: "300",
          }}
        >
          ‹
        </Text>
      </Pressable>
      <Text style={s.title}>Profile & settings</Text>
      <Text style={s.sub}>{profile.email}</Text>
      <Field
        label="Full name"
        value={name}
        onChange={setName}
        placeholder="Your full name"
      />
      <View style={{ gap: 8 }}>
        <Text style={s.label}>Gender</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(
            [
              { id: "male", label: "Male", icon: "👨" },
              { id: "female", label: "Female", icon: "👩" },
              { id: "other", label: "Other", icon: "✨" },
            ] as const
          ).map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Select gender ${item.label}`}
              onPress={() => setGender(item.id)}
              style={{
                flex: 1,
                height: 44,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: gender === item.id ? C.gold : C.border,
                backgroundColor: gender === item.id ? C.gold : C.glass,
              }}
            >
              <Text style={{ fontSize: 14 }}>{item.icon}</Text>
              <Text
                style={{
                  color: gender === item.id ? C.onGold : C.text,
                  fontWeight: gender === item.id ? "700" : "500",
                  fontSize: 13,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={s.label}>Preferred Language</Text>
          {!!langStatus && (
            <Text style={{ color: C.gold, fontSize: 11, fontWeight: "700" }}>
              {langStatus}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(
            [
              { id: "English", label: "English" },
              { id: "Hindi", label: "हिन्दी" },
              { id: "Hinglish", label: "Hinglish" },
            ] as const
          ).map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Select language ${item.label}`}
              onPress={() => void switchLanguage(item.id)}
              style={{
                flex: 1,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: language === item.id ? C.gold : C.border,
                backgroundColor: language === item.id ? C.gold : C.glass,
              }}
            >
              <Text
                style={{
                  color: language === item.id ? C.onGold : C.text,
                  fontWeight: language === item.id ? "700" : "500",
                  fontSize: 13,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
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
