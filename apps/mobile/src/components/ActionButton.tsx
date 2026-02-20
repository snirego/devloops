import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

interface Props {
  label: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export default function ActionButton({
  label,
  onPress,
  color = "#6366f1",
  textColor = "#fff",
  loading,
  disabled,
  compact,
}: Props) {
  return (
    <Pressable
      style={[
        styles.button,
        { backgroundColor: color },
        compact && styles.compact,
        (disabled || loading) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor }, compact && styles.compactText]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  compact: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
  },
  compactText: {
    fontSize: 12,
  },
});
