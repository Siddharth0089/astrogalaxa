import React, { RefObject } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Button } from "../components/Button";
import { C } from "../theme/colors";
import { s } from "../theme/styles";

export function OtpScreen({
  email,
  code,
  setCode,
  busy,
  authError,
  setAuthError,
  secondsLeft,
  codeInput,
  onVerify,
  onResend,
  onChangeEmail,
}: {
  email: string;
  code: string;
  setCode: (c: string) => void;
  busy: boolean;
  authError: string;
  setAuthError: (e: string) => void;
  secondsLeft: number;
  codeInput: RefObject<TextInput | null>;
  onVerify: () => void;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.header}>
        <Pressable accessibilityLabel="Go back" onPress={onChangeEmail} style={s.back}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>Check your Gmail</Text>
        <View style={s.back} />
      </View>
      <Text style={s.title}>Check your Gmail</Text>
      <Text style={s.sub}>
        We sent a 6-digit code to {email}.{" "}
        <Text style={s.link} onPress={onChangeEmail}>
          Change email
        </Text>
      </Text>
      <Pressable
        accessibilityLabel="Verification code, six digits"
        onPress={() => codeInput.current?.focus()}
        style={{ marginTop: 20 }}
      >
        <View pointerEvents="none" style={{ flexDirection: "row", gap: 8 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 58,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: i === code.length ? C.gold : C.border,
                backgroundColor: C.glass,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: C.text, fontSize: 24, fontWeight: "700" }}>
                {code[i] ?? ""}
              </Text>
            </View>
          ))}
        </View>
        <TextInput
          ref={codeInput as any}
          accessibilityLabel="Six digit verification code"
          value={code}
          onChangeText={(x) => {
            setCode(x.replace(/\D/g, "").slice(0, 6));
            setAuthError("");
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          style={{
            position: "absolute",
            opacity: 0,
            width: "100%",
            height: 58,
          }}
        />
      </Pressable>
      {!!authError && (
        <Text accessibilityRole="alert" style={{ color: "#FFB4AB" }}>
          {authError}
        </Text>
      )}
      {secondsLeft > 0 ? (
        <Text style={s.helper}>
          Resend code in 00:{String(secondsLeft).padStart(2, "0")}
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Resend code"
          disabled={busy}
          onPress={onResend}
        >
          <Text style={s.link}>{busy ? "Sending…" : "Resend code"}</Text>
        </Pressable>
      )}
      <Button
        label={busy ? "Verifying…" : "Verify and continue"}
        disabled={code.length !== 6 || busy}
        onPress={onVerify}
      />
    </ScrollView>
  );
}
