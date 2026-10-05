import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiError } from '@/api/errors';
import type { Ingredient } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { useRequest } from '@/hooks/use-request';
import { colors } from '@/theme';

type StatusFilter = 'active' | 'inactive' | 'all';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'active', label: 'Activos' },
  { key: 'inactive', label: 'Inactivos' },
  { key: 'all', label: 'Todos' },
];

const ERROR_MESSAGES: Record<string, string> = {
  'Ingredient already exists': 'Ya existe un ingrediente con ese nombre',
  'Cannot change the unit of an ingredient with inventory or movements':
    'No se puede cambiar la unidad: el ingrediente tiene inventario o movimientos',
  'Ingredient not found': 'El ingrediente ya no existe',
};

function toVisibleError(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.message] ?? error.message;
  }
  return error instanceof Error
    ? error.message
    : 'Ocurrió un error inesperado';
}

type FieldErrors = { name?: string; unit?: string };

export default function InventoryScreen() {
  const { session } = useAuth();

  const [filter, setFilter] = useState<StatusFilter>('active');
  const [query, setQuery] = useState('');
  const [banner, setBanner] = useState<string | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(
    () => session.client.get<Ingredient[]>(`/ingredients?status=${filter}`),
    [session, filter],
  );
  const list = useRequest<Ingredient[]>(fetchList, { immediate: false });
  const { run: runList } = list;

  useEffect(() => {
    void runList();
  }, [filter, runList]);

  const visibleItems = (list.data ?? []).filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const openCreate = () => {
    setEditing(null);
    setName('');
    setUnit('');
    setDescription('');
    setFieldErrors({});
    setFormError(null);
    setFormVisible(true);
  };

  const openEdit = (item: Ingredient) => {
    setEditing(item);
    setName(item.name);
    setUnit(item.unit);
    setDescription(item.description ?? '');
    setFieldErrors({});
    setFormError(null);
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditing(null);
    setFieldErrors({});
    setFormError(null);
  };

  const save = async () => {
    const nextErrors: FieldErrors = {};
    if (!name.trim()) {
      nextErrors.name = 'El nombre es obligatorio';
    }
    if (!unit.trim()) {
      nextErrors.unit = 'La unidad es obligatoria';
    }
    setFieldErrors(nextErrors);
    if (nextErrors.name || nextErrors.unit) {
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: name.trim(),
        unit: unit.trim(),
        description: description.trim() || undefined,
      };
      if (editing) {
        await session.client.patch(`/ingredients/${editing.id}`, payload);
      } else {
        await session.client.post('/ingredients', payload);
      }
      closeForm();
      setBanner(
        editing ? 'Ingrediente actualizado' : 'Ingrediente creado',
      );
      void list.run();
    } catch (error) {
      setFormError(toVisibleError(error));
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (value: boolean) => {
    if (!editing) {
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await session.client.patch(`/ingredients/${editing.id}`, {
        isActive: value,
      });
      closeForm();
      setBanner(value ? 'Ingrediente reactivado' : 'Ingrediente desactivado');
      void list.run();
    } catch (error) {
      setFormError(toVisibleError(error));
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (item: Ingredient) => {
    setSaving(true);
    setFormError(null);
    try {
      const result = await session.client.delete<Ingredient>(
        `/ingredients/${item.id}`,
      );
      closeForm();
      setBanner(
        result.isActive === false
          ? 'Se desactivó el ingrediente porque tiene historial de movimientos'
          : 'Ingrediente eliminado',
      );
      void list.run();
    } catch (error) {
      setFormError(toVisibleError(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!editing) {
      return;
    }
    const item = editing;
    Alert.alert(
      'Eliminar ingrediente',
      `¿Eliminar "${item.name}"? Si tiene historial solo se desactivará.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void performDelete(item),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar ingrediente"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
        </View>

        <View style={styles.chipRow}>
          {FILTERS.map((option) => (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              style={[
                styles.chip,
                filter === option.key && styles.chipActive,
              ]}
              onPress={() => setFilter(option.key)}
            >
              <Text
                style={[
                  styles.chipText,
                  filter === option.key && styles.chipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.countRow}>
          <Text style={styles.count}>
            {visibleItems.length}{' '}
            {visibleItems.length === 1 ? 'ingrediente' : 'ingredientes'}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.newButton}
            onPress={openCreate}
          >
            <Text style={styles.newButtonText}>+ Nuevo ingrediente</Text>
          </Pressable>
        </View>
      </View>

      {banner && (
        <View style={styles.bannerBox}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {list.loading ? (
          <Text style={styles.empty}>Cargando...</Text>
        ) : list.error ? (
          <Text style={styles.emptyError}>No se pudo cargar la lista</Text>
        ) : visibleItems.length === 0 ? (
          <Text style={styles.empty}>
            {query.trim()
              ? 'Sin resultados para la búsqueda'
              : 'Aún no hay ingredientes'}
          </Text>
        ) : (
          visibleItems.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              style={styles.row}
              onPress={() => openEdit(item)}
            >
              <View style={styles.rowMain}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowMeta}>Unidad: {item.unit}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  !item.isActive && styles.badgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    !item.isActive && styles.badgeTextInactive,
                  ]}
                >
                  {item.isActive ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal
        visible={formVisible}
        transparent
        animationType="fade"
        onRequestClose={closeForm}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeForm} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editing ? 'Editar ingrediente' : 'Nuevo ingrediente'}
            </Text>

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="sentences"
            />
            {fieldErrors.name && (
              <Text style={styles.fieldError}>{fieldErrors.name}</Text>
            )}

            <Text style={styles.label}>Unidad de medida</Text>
            <TextInput
              style={styles.input}
              placeholder="Unidad (ej. kg)"
              placeholderTextColor={colors.textMuted}
              value={unit}
              onChangeText={setUnit}
              autoCapitalize="none"
            />
            {fieldErrors.unit && (
              <Text style={styles.fieldError}>{fieldErrors.unit}</Text>
            )}

            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={styles.input}
              placeholder="Descripción (opcional)"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
            />

            {formError && <Text style={styles.apiError}>{formError}</Text>}

            <Pressable
              accessibilityRole="button"
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={() => void save()}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Text>
            </Pressable>

            {editing && (
              <View style={styles.editActions}>
                <Pressable
                  accessibilityRole="button"
                  style={styles.secondaryButton}
                  onPress={() => void setActive(!editing.isActive)}
                >
                  <Text style={styles.secondaryButtonText}>
                    {editing.isActive ? 'Desactivar' : 'Reactivar'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={styles.dangerButton}
                  onPress={confirmDelete}
                >
                  <Text style={styles.dangerButtonText}>
                    Eliminar ingrediente
                  </Text>
                </Pressable>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              style={styles.cancelButton}
              onPress={closeForm}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.onPrimary,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  newButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  newButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  bannerBox: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.softGreen,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.success,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowMain: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  badge: {
    backgroundColor: colors.softGreen,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.success,
  },
  badgeInactive: {
    backgroundColor: colors.softAmber,
    borderColor: colors.accent,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  badgeTextInactive: {
    color: colors.down,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyError: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  fieldError: {
    fontSize: 12,
    color: '#C0392B',
    marginBottom: 8,
  },
  apiError: {
    fontSize: 13,
    color: '#C0392B',
    marginTop: 10,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  dangerButton: {
    flex: 1,
    backgroundColor: colors.softRed,
    borderWidth: 1,
    borderColor: '#D96A6A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C0392B',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
