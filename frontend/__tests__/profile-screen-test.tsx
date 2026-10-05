jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Redirect: jest.fn(() => null),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { Redirect } from 'expo-router';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ProfileScreen from '@/app/profile';
import { AuthProvider } from '@/auth/auth-context';
import { createSession } from '@/api/session';
import { createMemoryTokenStorage } from '@/api/token-storage';

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const BASE_URL = 'http://api.test/api/v1';

const meBody = {
  id: 'id-jose',
  name: 'Jose',
  username: 'jose',
  role: 'ADMIN',
};

const routeResponse = (url: string) => {
  if (url.includes('/auth/me')) {
    return jsonResponse(200, meBody);
  }
  if (url.includes('/auth/logout')) {
    return jsonResponse(200, { message: 'Logged out successfully' });
  }
  return jsonResponse(404, { message: 'Not found' });
};

const renderProfile = async (
  fetchFn: jest.Mock = jest.fn(
    async (url: string) => routeResponse(url as string),
  ),
  storage = createMemoryTokenStorage({
    accessToken: 'acc',
    refreshToken: 'ref',
  }),
) => {
  const session = createSession({
    storage,
    baseUrl: BASE_URL,
    fetchFn: fetchFn as unknown as typeof fetch,
  });
  const view = await render(
    <AuthProvider session={session}>
      <ProfileScreen />
    </AuthProvider>,
  );
  return { ...view, storage, fetchFn };
};

const redirectMock = Redirect as unknown as jest.Mock;

describe('<ProfileScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra nombre, usuario y rol desde GET /auth/me (RF-021)', async () => {
    const { getAllByText, findAllByText } = await renderProfile();

    expect((await findAllByText('Jose')).length).toBeGreaterThan(0);
    expect(getAllByText('@jose').length).toBeGreaterThan(0);
    expect(getAllByText('Administrador').length).toBeGreaterThan(0);
  });

  it('consulta el perfil con GET /auth/me autenticado', async () => {
    const fetchFn = jest.fn(
      async (url: string) => routeResponse(url as string),
    );
    await renderProfile(fetchFn);

    await waitFor(() =>
      expect(fetchFn).toHaveBeenCalledWith(`${BASE_URL}/auth/me`, {
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer acc',
        }),
      }),
    );
  });

  it('cierra la sesión limpiando los tokens locales y volviendo al acceso (RF-021)', async () => {
    const { getByText, findAllByText, storage, fetchFn } =
      await renderProfile();

    await findAllByText('Jose');
    await fireEvent.press(getByText('Cerrar sesión'));

    await waitFor(() =>
      expect(fetchFn).toHaveBeenCalledWith(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ refreshToken: 'ref' }),
      }),
    );
    expect(await storage.getAccessToken()).toBeNull();
    expect(await storage.getRefreshToken()).toBeNull();
    await waitFor(() => {
      expect(redirectMock.mock.calls[0]?.[0]).toMatchObject({
        href: '/welcome',
      });
    });
  });
});
