import React from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { s } from "../theme/styles";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const appIcon = require("../../assets/icon.png");

export function LoginScreen({
  email,
  setEmail,
  busy,
  authError,
  onLogin,
}: {
  email: string;
  setEmail: (email: string) => void;
  busy: boolean;
  authError: string;
  onLogin: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 28,
        paddingTop: 30,
        paddingBottom: 28,
        flexGrow: 1,
      }}
    >
      <View
        style={{
          height: 150,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Image
          source={appIcon}
          style={{
            width: 108,
            height: 108,
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: "rgba(234, 179, 8, 0.4)",
          }}
          resizeMode="cover"
        />
      </View>
      <Text style={s.brand}>Astro Galaxa</Text>
      <Text style={[s.tagline, { marginTop: 8, marginBottom: 44 }]}>
        Your kundli, horoscope and guidance,{"\n"}written in the stars.
      </Text>
      <View style={{ gap: 14 }}>
        <Field
          label="Email address"
          value={email}
          onChange={setEmail}
          placeholder="Enter your email address"
          keyboardType="email-address"
        />
        <Button
          label={busy ? "Sending…" : "Send code"}
          disabled={busy}
          onPress={onLogin}
        />
        {!!authError && (
          <Text accessibilityRole="alert" style={{ color: "#FFB4AB" }}>
            {authError}
          </Text>
        )}
        <Text style={s.helper}>
          We will email you a 6-digit code. No password needed.
        </Text>
        <Text style={s.or}>──────── or ────────</Text>
        <Button
          label="Continue with Google"
          variant="glass"
          onPress={() =>
            Alert.alert(
              "Google sign-in",
              "Configure native Google client IDs and use a development build.",
            )
          }
        />
      </View>
      <Text style={[s.footer, { marginTop: 36 }]}>
        By continuing you agree to our <Text style={s.link}>Terms</Text> and{" "}
        <Text style={s.link}>Privacy Policy</Text>
      </Text>
    </ScrollView>
  );
}
