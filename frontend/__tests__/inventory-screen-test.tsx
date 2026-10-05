import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import InventoryScreen from '@/app/(tabs)/inventory';
import { AuthProvider } from '@/auth/auth-context';
import { createSession } from '@/api/session';
import { createMemoryTokenStorage } from '@/api/token-storage';
import type { Ingredient } from '@/api/types';

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const BASE_URL = 'http://api.test/api/v1';

const normalize = (value: string) => value.trim().toLowerCase();

const makeIngredient = (
  overrides: Partial<Ingredient> & Pick<Ingredient, 'id' | 'name'>,
): Ingredient => ({
  normalizedName: normalize(overrides.name),
  description: null,
  unit: 'kg',
  isActive: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

type Db = {
  ingredients: Ingredient[];
  history: Record<string, boolean>;
};

const createFetch = (db: Db): jest.Mock => {
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(init.body as string) : {};

    if (url.includes('/auth/me')) {
      return jsonResponse(200, {
        id: 'id-jose',
        name: 'Jose',
        username: 'jose',
        role: 'ADMIN',
      });
    }

    if (method === 'GET' && url.includes('/ingredients')) {
      const status = url.includes('status=')
        ? new URL(url).searchParams.get('status')
        : 'active';
      const rows = db.ingredients.filter((item) => {
        if (status === 'inactive') {
          return !item.isActive;
        }
        if (status === 'all') {
          return true;
        }
        return item.isActive;
      });
      return jsonResponse(200, rows);
    }

    if (method === 'POST' && url.endsWith('/ingredients')) {
      const duplicated = db.ingredients.find(
        (item) => item.normalizedName === normalize(body.name),
      );
      if (duplicated) {
        return jsonResponse(409, {
          statusCode: 409,
          message: 'Ingredient already exists',
        });
      }
      const created = makeIngredient({
        id: `ing-${db.ingredients.length + 1}`,
        name: body.name,
        unit: body.unit,
        description: body.description ?? null,
      });
      db.ingredients.push(created);
      return jsonResponse(201, created);
    }

    if (method === 'PATCH' && url.includes('/ingredients/')) {
      const id = url.split('/').pop();
      const item = db.ingredients.find((row) => row.id === id);
      if (!item) {
        return jsonResponse(404, {
          statusCode: 404,
          message: 'Ingredient not found',
        });
      }
      if (
        body.unit !== undefined &&
        body.unit !== item.unit &&
        db.history[item.id]
      ) {
        return jsonResponse(409, {
          statusCode: 409,
          message:
            'Cannot change the unit of an ingredient with inventory or movements',
        });
      }
      Object.assign(item, body);
      return jsonResponse(200, item);
    }

    if (method === 'DELETE' && url.includes('/ingredients/')) {
      const id = url.split('/').pop();
      const item = db.ingredients.find((row) => row.id === id);
      if (!item) {
        return jsonResponse(404, {
          statusCode: 404,
          message: 'Ingredient not found',
        });
      }
      if (db.history[item.id]) {
        item.isActive = false;
        return jsonResponse(200, item);
      }
      db.ingredients = db.ingredients.filter((row) => row.id !== id);
      return jsonResponse(200, item);
    }

    return jsonResponse(404, { statusCode: 404, message: 'Not found' });
  });
  return fetchFn as unknown as jest.Mock;
};

const renderScreen = async (db: Db) => {
  const fetchFn = createFetch(db);
  const session = createSession({
    storage: createMemoryTokenStorage({
      accessToken: 'acc',
      refreshToken: 'ref',
    }),
    baseUrl: BASE_URL,
    fetchFn: fetchFn as unknown as typeof fetch,
  });
  const view = await render(
    <AuthProvider session={session}>
      <InventoryScreen />
    </AuthProvider>,
  );
  return { ...view, fetchFn, db };
};

describe('<InventoryScreen /> (T035 ingredientes)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(
      (_title, _message, buttons) => {
        const destructive = buttons?.find(
          (button) => button.style === 'destructive',
        );
        destructive?.onPress?.();
      },
    );
  });

  it('lista los ingredientes activos con su unidad y estado (RF-001)', async () => {
    const db: Db = {
      ingredients: [
        makeIngredient({ id: 'ing-1', name: 'Yuca' }),
        makeIngredient({ id: 'ing-2', name: 'Queso', unit: 'g' }),
        makeIngredient({ id: 'ing-3', name: 'Harina vieja', isActive: false }),
      ],
      history: {},
    };
    const { findByText, queryByText, fetchFn } = await renderScreen(db);

    await findByText('Yuca');
    await findByText('Queso');
    expect(queryByText('Harina vieja')).toBeNull();
    await findByText('2 ingredientes');
    expect(fetchFn).toHaveBeenCalledWith(
      `${BASE_URL}/ingredients?status=active`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('busca ingredientes por nombre', async () => {
    const db: Db = {
      ingredients: [
        makeIngredient({ id: 'ing-1', name: 'Yuca' }),
        makeIngredient({ id: 'ing-2', name: 'Queso' }),
      ],
      history: {},
    };
    const { findByText, queryByText, getByPlaceholderText } =
      await renderScreen(db);

    await findByText('Yuca');
    await fireEvent.changeText(
      getByPlaceholderText('Buscar ingrediente'),
      'que',
    );

    await waitFor(() => expect(queryByText('Yuca')).toBeNull());
    await findByText('Queso');
  });

  it('filtra los ingredientes inactivos', async () => {
    const db: Db = {
      ingredients: [
        makeIngredient({ id: 'ing-1', name: 'Yuca' }),
        makeIngredient({ id: 'ing-3', name: 'Harina', isActive: false }),
      ],
      history: {},
    };
    const { findByText, queryByText, getByText, fetchFn } =
      await renderScreen(db);

    await findByText('Yuca');
    await fireEvent.press(getByText('Inactivos'));

    await findByText('Harina');
    expect(queryByText('Yuca')).toBeNull();
    await waitFor(() =>
      expect(fetchFn).toHaveBeenCalledWith(
        `${BASE_URL}/ingredients?status=inactive`,
        expect.objectContaining({ method: 'GET' }),
      ),
    );
  });

  it('valida los campos requeridos del formulario (RF-001)', async () => {
    const db: Db = { ingredients: [], history: {} };
    const { getByText, findByText } = await renderScreen(db);

    await findByText('0 ingredientes');
    await fireEvent.press(getByText('+ Nuevo ingrediente'));
    await findByText('Nuevo ingrediente');
    await fireEvent.press(getByText('Guardar'));

    await findByText('El nombre es obligatorio');
    await findByText('La unidad es obligatoria');
  });

  it('crea un ingrediente y refresca la lista (RF-001)', async () => {
    const db: Db = { ingredients: [], history: {} };
    const { getByText, getByPlaceholderText, findByText, queryByText } =
      await renderScreen(db);

    await findByText('0 ingredientes');
    await fireEvent.press(getByText('+ Nuevo ingrediente'));
    await fireEvent.changeText(getByPlaceholderText('Nombre'), 'Maíz');
    await fireEvent.changeText(getByPlaceholderText('Unidad (ej. kg)'), 'kg');
    await fireEvent.press(getByText('Guardar'));

    await findByText('Maíz');
    expect(queryByText('Nuevo ingrediente')).toBeNull();
    await findByText('1 ingrediente');
  });

  it('muestra el bloqueo de nombre duplicado del backend (RF-001a)', async () => {
    const db: Db = {
      ingredients: [makeIngredient({ id: 'ing-1', name: 'Yuca' })],
      history: {},
    };
    const { getByText, getByPlaceholderText, findByText } =
      await renderScreen(db);

    await findByText('Yuca');
    await fireEvent.press(getByText('+ Nuevo ingrediente'));
    await fireEvent.changeText(getByPlaceholderText('Nombre'), '  YUCA  ');
    await fireEvent.changeText(getByPlaceholderText('Unidad (ej. kg)'), 'kg');
    await fireEvent.press(getByText('Guardar'));

    await findByText('Ya existe un ingrediente con ese nombre');
  });

  it('edita un ingrediente preservando su historial (RF-002)', async () => {
    const db: Db = {
      ingredients: [makeIngredient({ id: 'ing-1', name: 'Yuca' })],
      history: { 'ing-1': true },
    };
    const {
      getByText,
      getByPlaceholderText,
      findByText,
      queryByText,
      fetchFn,
    } = await renderScreen(db);

    await findByText('Yuca');
    await fireEvent.press(getByText('Yuca'));
    await findByText('Editar ingrediente');

    await fireEvent.changeText(getByPlaceholderText('Nombre'), 'Yuca fresca');
    await fireEvent.press(getByText('Guardar'));

    await findByText('Yuca fresca');
    expect(queryByText('Editar ingrediente')).toBeNull();
    await waitFor(() =>
      expect(fetchFn).toHaveBeenCalledWith(
        `${BASE_URL}/ingredients/ing-1`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Yuca fresca', unit: 'kg' }),
        }),
      ),
    );
  });

  it('muestra el bloqueo de cambio de unidad del backend (RF-004)', async () => {
    const db: Db = {
      ingredients: [makeIngredient({ id: 'ing-1', name: 'Yuca', unit: 'kg' })],
      history: { 'ing-1': true },
    };
    const { getByText, getByPlaceholderText, findByText } =
      await renderScreen(db);

    await findByText('Yuca');
    await fireEvent.press(getByText('Yuca'));
    await findByText('Editar ingrediente');

    await fireEvent.changeText(getByPlaceholderText('Unidad (ej. kg)'), 'g');
    await fireEvent.press(getByText('Guardar'));

    await findByText(
      'No se puede cambiar la unidad: el ingrediente tiene inventario o movimientos',
    );
  });

  it('desactiva en lugar de eliminar cuando hay historial (RF-003)', async () => {
    const db: Db = {
      ingredients: [makeIngredient({ id: 'ing-1', name: 'Yuca' })],
      history: { 'ing-1': true },
    };
    const { getByText, findByText, fetchFn } = await renderScreen(db);

    await findByText('Yuca');
    await fireEvent.press(getByText('Yuca'));
    await findByText('Editar ingrediente');
    await fireEvent.press(getByText('Eliminar ingrediente'));

    await waitFor(() =>
      expect(fetchFn).toHaveBeenCalledWith(
        `${BASE_URL}/ingredients/ing-1`,
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
    await findByText(
      'Se desactivó el ingrediente porque tiene historial de movimientos',
    );
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('elimina permanentemente cuando no hay historial (RF-003a)', async () => {
    const db: Db = {
      ingredients: [makeIngredient({ id: 'ing-9', name: 'Azúcar' })],
      history: {},
    };
    const { getByText, findByText, queryByText } = await renderScreen(db);

    await findByText('Azúcar');
    await fireEvent.press(getByText('Azúcar'));
    await findByText('Editar ingrediente');
    await fireEvent.press(getByText('Eliminar ingrediente'));

    await findByText('Ingrediente eliminado');
    await waitFor(() => expect(queryByText('Editar ingrediente')).toBeNull());
    expect(queryByText('Azúcar')).toBeNull();
  });

  it('desactiva y reactiva ingredientes desde el formulario', async () => {
    const db: Db = {
      ingredients: [makeIngredient({ id: 'ing-1', name: 'Yuca' })],
      history: { 'ing-1': true },
    };
    const { getByText, findByText, fetchFn } = await renderScreen(db);

    await findByText('Yuca');
    await fireEvent.press(getByText('Yuca'));
    await findByText('Editar ingrediente');
    await fireEvent.press(getByText('Desactivar'));

    await findByText('Ingrediente desactivado');
    await waitFor(() =>
      expect(fetchFn).toHaveBeenCalledWith(
        `${BASE_URL}/ingredients/ing-1`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ isActive: false }),
        }),
      ),
    );
  });
});
