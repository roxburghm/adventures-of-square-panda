// ================================================================
//  WHAT KIND OF DEVICE IS THIS?
// ================================================================

/**
 * Is this a phone? That means a touch screen whose short side is small.
 * Tablets (like iPads) and touch-screen laptops don't count, so they still get the level designer.
 */
export function isPhone() {
  if (typeof window === 'undefined') return false;
  const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  return touch && Math.min(window.screen.width, window.screen.height) < 600;
}
