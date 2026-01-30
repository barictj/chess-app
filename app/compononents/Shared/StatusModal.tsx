import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../../../lib/ThemeContext";
import type { Theme } from "../../../lib/theme";

export function StatusModal({
  visible,
  title = "Status",
  message,
  onClose,
}: {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>

          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.btn,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.btnText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: 22,
    },
    card: {
      width: "100%",
      maxWidth: 360,
      borderRadius: 20,
      padding: 16,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      elevation: 10,
    },
    header: {
      marginBottom: 10,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "900",
    },
    message: {
      color: theme.subtext,
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 22,
    },
    actions: {
      marginTop: 14,
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    btn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: theme.primary,
    },
    btnPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
    btnText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "900",
    },
  });
