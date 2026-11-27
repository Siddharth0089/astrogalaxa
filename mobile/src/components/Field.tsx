import React from "react";
import { Text, TextInput, View } from "react-native";
import { C } from "../theme/colors";
import { s } from "../theme/styles";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (x: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "numeric";
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        keyboardType={keyboardType}
        autoCapitalize="none"
        style={s.input}
      />
    </View>
  );
}
