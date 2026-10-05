import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { AuthenticatedArea } from '@/auth/authenticated-area';
import { useRequest } from '@/hooks/use-request';
import { colors } from '@/theme';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  OPERATOR: 'Operador',
  OWNER: 'Propietario',
};

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const profile = useRequest(() => session.auth.me());
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  const insets = useSafeAreaInsets();

  const user = profile.data;

  const source = user?.name || user?.username || 'U';
  const initial = source.trim().charAt(0).toUpperCase();

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await signOut();
    } finally {
      setLoggingOut(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
        setPhotoModalVisible(false);
      }
    } catch {
      setPhotoModalVisible(false);
    }
  };

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

          <Text style={styles.headerTitle}>Perfil</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Configuración"
            style={styles.settingsButton}
            onPress={() => router.push('/configuracion')}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={colors.onPrimary}
            />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {profile.loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator
                size="large"
                color={colors.primary}
              />

              <Text style={styles.stateText}>Cargando...</Text>
            </View>
          ) : profile.error || !user ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateError}>
                No se pudo cargar el perfil
              </Text>

              <Pressable
                accessibilityRole="button"
                style={styles.retryButton}
                onPress={() => void profile.run()}
              >
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.profileHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar foto de perfil"
                  style={styles.avatarWrapper}
                  onPress={() => setPhotoModalVisible(true)}
                >
                  <View style={styles.avatar}>
                    {avatarUri ? (
                      <Image
                        source={{ uri: avatarUri }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarLetter}>
                        {initial}
                      </Text>
                    )}
                  </View>

                  <View style={styles.cameraBadge}>
                    <Ionicons
                      name="camera-outline"
                      size={12}
                      color={colors.onPrimary}
                    />
                  </View>
                </Pressable>

                <View style={styles.profileInfo}>
                  <Text style={styles.name}>{user.name}</Text>

                  <Text style={styles.username}>
                    @{user.username}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Información de cuenta
                </Text>

                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={colors.textMuted}
                      />
                    </View>

                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Nombre</Text>

                      <Text style={styles.infoValue}>
                        {user.name}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Ionicons
                        name="at-outline"
                        size={18}
                        color={colors.textMuted}
                      />
                    </View>

                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Usuario</Text>

                      <Text style={styles.infoValue}>
                        @{user.username}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Ionicons
                        name="mail-outline"
                        size={18}
                        color={colors.textMuted}
                      />
                    </View>

                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Correo</Text>

                      <Text style={styles.infoValue}>
                        {user.email}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color={colors.textMuted}
                      />
                    </View>

                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Rol</Text>

                      <Text style={styles.infoValue}>
                        {ROLE_LABELS[user.role] ?? user.role}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Configuración
                </Text>

                <Pressable
                  style={styles.settingsRow}
                  onPress={() => router.push('/configuracion')}
                >
                  <View style={styles.settingsIcon}>
                    <Ionicons
                      name="settings-outline"
                      size={19}
                      color={colors.text}
                    />
                  </View>

                  <View style={styles.settingsContent}>
                    <Text style={styles.settingsTitle}>
                      Configuración de cuenta
                    </Text>

                    <Text style={styles.settingsDescription}>
                      Nombre, correo y contraseña
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom + 8, 20),
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            style={[
              styles.logoutButton,
              loggingOut && styles.logoutDisabled,
            ]}
            onPress={() => void handleLogout()}
          >
            <Text style={styles.logoutText}>
              {loggingOut
                ? 'Cerrando sesión...'
                : 'Cerrar sesión'}
            </Text>
          </Pressable>
        </View>

        <Modal
          visible={photoModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPhotoModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setPhotoModalVisible(false)}
          >
            <Pressable
              style={styles.photoModal}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.modalHandle} />

              <Text style={styles.modalTitle}>
                Foto de perfil
              </Text>

              <Text style={styles.modalDescription}>
                Selecciona una imagen de tu galería.
              </Text>

              <Pressable
                style={styles.galleryButton}
                onPress={() => void handlePickImage()}
              >
                <View style={styles.galleryIcon}>
                  <Ionicons
                    name="images-outline"
                    size={20}
                    color={colors.onPrimary}
                  />
                </View>

                <Text style={styles.galleryButtonText}>
                  Elegir de la galería
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={() => setPhotoModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
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

  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryVariant,
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
    paddingTop: 24,
    paddingBottom: 24,
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },

  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarLetter: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.onPrimary,
  },

  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },

  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },

  username: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },

  section: {
    marginTop: 30,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
  },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textMuted,
    overflow: 'hidden',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },

  infoIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 3,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },

  divider: {
    height: 1,
    backgroundColor: colors.background,
    marginLeft: 64,
  },

  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textMuted,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  settingsIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    marginRight: 12,
  },

  settingsContent: {
    flex: 1,
  },

  settingsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  settingsDescription: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },

  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
    gap: 12,
  },

  stateText: {
    fontSize: 14,
    color: colors.textMuted,
  },

  stateError: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },

  retryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: colors.background,
  },

  logoutButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },

  logoutDisabled: {
    opacity: 0.7,
  },

  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },

  photoModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },

  modalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },

  modalDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 5,
    marginBottom: 20,
  },

  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  galleryIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  galleryButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  cancelButton: {
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 4,
  },

  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
});