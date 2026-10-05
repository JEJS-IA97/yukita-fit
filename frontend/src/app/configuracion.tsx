import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AuthenticatedArea } from '@/auth/authenticated-area';
import { colors } from '@/theme';

export default function ConfiguracionScreen() {
  return (
    <AuthenticatedArea>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={21}
              color={colors.onPrimary}
            />
          </Pressable>

          <Text style={styles.headerTitle}>Configuración</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <Text style={styles.sectionTitle}>Cuenta</Text>

          <View style={styles.card}>
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push('/configuracion/datos-personales')
              }
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name="person-outline"
                  size={19}
                  color={colors.text}
                />
              </View>

              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>
                  Datos personales
                </Text>

                <Text style={styles.rowDescription}>
                  Modificar nombre y correo
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={styles.row}
              onPress={() =>
                router.push('/configuracion/contrasena')
              }
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={colors.text}
                />
              </View>

              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>
                  Contraseña
                </Text>

                <Text style={styles.rowDescription}>
                  Cambiar contraseña de acceso
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </AuthenticatedArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 14,
    backgroundColor: colors.surface,
  },

  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  headerSpacer: {
    width: 36,
    height: 36,
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textMuted,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    marginRight: 12,
  },

  rowContent: {
    flex: 1,
  },

  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  rowDescription: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: colors.background,
    marginLeft: 66,
  },
});