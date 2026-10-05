jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

import { router } from 'expo-router';
import { fireEvent, render } from '@testing-library/react-native';

import { HeaderAvatar } from '@/components/header-avatar';
import { AuthProvider } from '@/auth/auth-context';
import { createSession } from '@/api/session';
import { createMemoryTokenStorage } from '@/api/token-storage';

const BASE_URL = 'http://api.test/api/v1';

describe('<HeaderAvatar />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('abre el perfil al tocar el avatar', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('sin sesión'));
    const session = createSession({
      storage: createMemoryTokenStorage(),
      baseUrl: BASE_URL,
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    const { getByLabelText } = await render(
      <AuthProvider session={session}>
        <HeaderAvatar />
      </AuthProvider>,
    );

    await fireEvent.press(getByLabelText('Abrir perfil'));

    expect(router.push).toHaveBeenCalledWith('/profile');
  });
});
