import React from 'react';
import { Text, Platform, Alert } from 'react-native';
import { render, act } from '@testing-library/react-native';

const mockCapture = jest.fn(() => Promise.resolve('file://x.png'));
const mockShareAsync = jest.fn(() => Promise.resolve());

jest.mock('react-native-view-shot', () => {
  const React = require('react');
  const ViewShot = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ capture: mockCapture }));
    return props.children;
  });
  return { __esModule: true, default: ViewShot };
});
jest.mock('expo-sharing', () => ({ shareAsync: (...a) => mockShareAsync(...a) }));
jest.mock('../ShareResultCard', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: () => <Text>card</Text> };
});

Platform.OS = 'ios';
const { useShareResult } = require('../hooks/useShareResult');
let api;
function Probe() {
  api = useShareResult({ acento: '#f00' });
  const { ShareHost } = api;
  return <ShareHost />;
}

const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 80)); }); };

beforeEach(() => {
  jest.clearAllMocks();
});

function load(os) {
  Platform.OS = os;
}

describe('useShareResult', () => {
  test('en nativo captura y comparte con las mismas opciones', async () => {
    load('ios');
    await render(<Probe />);
    await act(async () => { api.share({ titulo: 'x' }); });
    await flush();
    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockShareAsync).toHaveBeenCalledWith('file://x.png', {
      mimeType: 'image/png',
      dialogTitle: 'Compartir resultado WOD',
    });
  });

  test('sharing pasa de true a false', async () => {
    load('ios');
    await render(<Probe />);
    expect(api.sharing).toBe(false);
    await act(async () => { api.share({ titulo: 'x' }); });
    expect(api.sharing).toBe(true);
    await flush();
    expect(api.sharing).toBe(false);
  });

  test('share(null) no hace nada', async () => {
    load('ios');
    await render(<Probe />);
    await act(async () => { await api.share(null); });
    await flush();
    expect(mockCapture).not.toHaveBeenCalled();
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(api.sharing).toBe(false);
  });

  test('en web muestra el aviso y no captura', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    load('web');
    await render(<Probe />);
    await act(async () => { await api.share({ titulo: 'x' }); });
    expect(spy).toHaveBeenCalledWith('No disponible', 'Compartir el resultado como imagen no está disponible en la versión web.');
    expect(mockCapture).not.toHaveBeenCalled();
    Platform.OS = 'ios';
  });
});
