import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import SplashAnimated from '../SplashAnimated';

describe('SplashAnimated', () => {
  it('cubre toda la pantalla (posición absoluta en los 4 bordes)', async () => {
    const { toJSON } = await render(<SplashAnimated onFinish={() => {}} />);
    const style = StyleSheet.flatten(toJSON().props.style);
    expect(style.position).toBe('absolute');
    expect(style.top).toBe(0);
    expect(style.left).toBe(0);
    expect(style.right).toBe(0);
    expect(style.bottom).toBe(0);
  });
});
