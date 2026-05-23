const DEVICE_ID_KEY = 'krek-device-id';
const FORCED_DEVICE_ID = 'device1234';

export function getDeviceId() {
  if (typeof window === 'undefined') return FORCED_DEVICE_ID;

  try {
    window.localStorage.setItem(DEVICE_ID_KEY, FORCED_DEVICE_ID);
    return FORCED_DEVICE_ID;
  } catch {
    return FORCED_DEVICE_ID;
  }
}
