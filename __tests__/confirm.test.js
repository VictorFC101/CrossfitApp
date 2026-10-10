import { Alert, Platform } from 'react-native';
import { confirmar, avisar } from '../utils/confirm';

describe('utils/confirm', () => {
  const originalOS = Platform.OS;
  let alertSpy;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
    delete global.window.confirm;
    delete global.window.alert;
  });

  describe('confirmar en nativo', () => {
    beforeEach(() => { Platform.OS = 'ios'; });

    it('muestra Alert con Cancelar y botón destructivo que ejecuta onOk', () => {
      const onOk = jest.fn();
      confirmar('Eliminar publicación', '¿Seguro?', 'Eliminar', onOk);
      expect(alertSpy).toHaveBeenCalledTimes(1);
      const [titulo, mensaje, botones] = alertSpy.mock.calls[0];
      expect(titulo).toBe('Eliminar publicación');
      expect(mensaje).toBe('¿Seguro?');
      expect(botones[0]).toEqual({ text: 'Cancelar', style: 'cancel' });
      expect(botones[1]).toMatchObject({ text: 'Eliminar', style: 'destructive' });
      expect(onOk).not.toHaveBeenCalled();
      botones[1].onPress();
      expect(onOk).toHaveBeenCalledTimes(1);
    });

    it('usa estilo default si destructive es false', () => {
      confirmar('Enviar solicitud', '¿Enviar?', 'Enviar', jest.fn(), { destructive: false });
      expect(alertSpy.mock.calls[0][2][1].style).toBe('default');
    });
  });

  describe('confirmar en web', () => {
    beforeEach(() => { Platform.OS = 'web'; });

    it('ejecuta onOk si el usuario acepta window.confirm', () => {
      global.window.confirm = jest.fn(() => true);
      const onOk = jest.fn();
      confirmar('Eliminar publicación', '¿Seguro?', 'Eliminar', onOk);
      expect(global.window.confirm).toHaveBeenCalledWith('Eliminar publicación\n¿Seguro?');
      expect(onOk).toHaveBeenCalledTimes(1);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('no ejecuta onOk si el usuario cancela', () => {
      global.window.confirm = jest.fn(() => false);
      const onOk = jest.fn();
      confirmar('Eliminar publicación', '¿Seguro?', 'Eliminar', onOk);
      expect(onOk).not.toHaveBeenCalled();
    });
  });

  describe('avisar', () => {
    it('en nativo usa Alert con un botón OK que ejecuta onOk', () => {
      Platform.OS = 'android';
      const onOk = jest.fn();
      avisar('✅ Asignado', 'Correcto', onOk);
      const botones = alertSpy.mock.calls[0][2];
      expect(botones).toHaveLength(1);
      expect(botones[0].text).toBe('OK');
      botones[0].onPress();
      expect(onOk).toHaveBeenCalledTimes(1);
    });

    it('en web usa window.alert y ejecuta onOk', () => {
      Platform.OS = 'web';
      global.window.alert = jest.fn();
      const onOk = jest.fn();
      avisar('✅ Asignado', 'Correcto', onOk);
      expect(global.window.alert).toHaveBeenCalledWith('✅ Asignado\nCorrecto');
      expect(onOk).toHaveBeenCalledTimes(1);
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });
});
