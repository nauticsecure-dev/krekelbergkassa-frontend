export const BOAT_PHOTO_CHANGED = 'krek_boat_photo_changed';

export function publishBoatPhotoChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(BOAT_PHOTO_CHANGED));
  try { localStorage.setItem(BOAT_PHOTO_CHANGED, String(Date.now())); } catch { /* Storage can be disabled. */ }
}
