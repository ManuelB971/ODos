import { Platform } from 'react-native';
import * as Location from 'expo-location';

import { watchForegroundPosition } from './watchForegroundPosition';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

const OPTIONS = { distanceInterval: 80, timeInterval: 30_000 };
const originalOS = Platform.OS;

function setOS(os: string) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

afterEach(() => {
  setOS(originalOS);
  jest.clearAllMocks();
  delete (globalThis.navigator as { geolocation?: unknown }).geolocation;
});

describe('watchForegroundPosition — web', () => {
  it('uses navigator.geolocation and never expo-location (whose web stop() throws)', async () => {
    setOS('web');
    const watchPosition = jest.fn((success: PositionCallback) => {
      success({ coords: { latitude: 45.76, longitude: 4.83 } } as GeolocationPosition);
      return 7;
    });
    const clearWatch = jest.fn();
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: { watchPosition, clearWatch },
    });
    const onPosition = jest.fn();

    const stop = await watchForegroundPosition(onPosition, OPTIONS);

    expect(onPosition).toHaveBeenCalledWith(45.76, 4.83);
    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
    expect(() => stop?.()).not.toThrow();
    expect(clearWatch).toHaveBeenCalledWith(7);
  });

  it('returns null when the browser has no geolocation', async () => {
    setOS('web');
    await expect(watchForegroundPosition(jest.fn(), OPTIONS)).resolves.toBeNull();
  });
});

describe('watchForegroundPosition — native', () => {
  it('returns null without watching when permission is denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    await expect(watchForegroundPosition(jest.fn(), OPTIONS)).resolves.toBeNull();
    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  });

  it('watches with balanced accuracy and stops through the subscription', async () => {
    const remove = jest.fn();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.watchPositionAsync as jest.Mock).mockResolvedValue({ remove });

    const stop = await watchForegroundPosition(jest.fn(), OPTIONS);
    stop?.();

    expect(Location.watchPositionAsync).toHaveBeenCalledWith(
      { accuracy: 3, distanceInterval: 80, timeInterval: 30_000 },
      expect.any(Function),
    );
    expect(remove).toHaveBeenCalled();
  });
});
