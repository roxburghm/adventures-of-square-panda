// ================================================================
//  SAVING THINGS IN THE BROWSER
//  High scores and home-made levels are kept in the browser's
//  localStorage. They stay on this computer, in this browser.
// ================================================================

export const KEYS = {
  scores: 'squarePanda.scores',
  myLevels: 'squarePanda.myLevels',
  draft: 'squarePanda.designerDraft',
  muted: 'squarePanda.muted',
  name: 'squarePanda.playerName',
};

export function load(key, fallback) {
  try {
    const text = localStorage.getItem(key);
    return text == null ? fallback : JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // private browsing or storage full
  }
}
