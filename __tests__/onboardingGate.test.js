import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../supabase', () => {
  const tablas = {
    usuarios_publicos: { id: 'u1', nombre: 'Test' },
    usuarios: {
      onboarding_completed: true,
      genero: null,
      push_token: null,
      box_id: null,
      partner_id: null,
    },
  };
  const builder = (tabla) => {
    const esUnico = tabla in tablas;
    const resultado = { data: esUnico ? tablas[tabla] : [], error: null };
    const b = {};
    ['select', 'eq', 'or', 'in', 'order', 'limit', 'update', 'insert', 'delete'].forEach((m) => {
      b[m] = jest.fn(() => b);
    });
    b.single = jest.fn(() => Promise.resolve(resultado));
    b.then = (res, rej) => Promise.resolve(resultado).then(res, rej);
    return b;
  };
  const channel = { on: jest.fn(() => channel), subscribe: jest.fn(() => channel) };
  return {
    supabase: {
      from: jest.fn(builder),
      rpc: jest.fn(() => Promise.resolve({ data: [], error: null })),
      channel: jest.fn(() => channel),
      removeChannel: jest.fn(),
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: { user: { id: 'u1' } } } })),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      },
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProvider, useApp } from '../AppContext';

function Sonda() {
  const { userProfile, onboardingCompleted } = useApp();
  return (
    <>
      <Text testID="perfil">{userProfile ? userProfile.id : 'sin-perfil'}</Text>
      <Text testID="onboarding">{String(onboardingCompleted)}</Text>
    </>
  );
}

describe('Gate de onboarding', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('usuario con onboarding completado en Supabase no ve onboarding en dispositivo nuevo', async () => {
    await render(
      <AppProvider>
        <Sonda />
      </AppProvider>
    );

    // El perfil se carga desde Supabase
    await waitFor(() => expect(screen.getByTestId('perfil').props.children).toBe('u1'));

    // BUG: onboardingCompleted debería ser true (Supabase dice onboarding_completed=true)
    await waitFor(() => expect(screen.getByTestId('onboarding').props.children).toBe('true'), { timeout: 1000 });
  });
});
