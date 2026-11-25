// Keyboard Shortcut Dispatch for Disagall Viewer
import { isEditableTarget, isExternalModalOpen } from '../ui/overlay.js';
import { navigatePost } from './post_nav_controller.js';
import { triggerPostRecommend } from './recommend_controller.js';
import { navigate } from './image_loader.js';
import {
  isOverlayActive,
  toggleUiManual,
  getFullscreenElement,
  exitFullscreenSafely,
  toggleFullscreen
} from './immersion_controller.js';

let shortcutCallbacks = {
  onOpenViewer: () => {},
  onCloseViewer: () => {},
};

export function setViewerShortcutCallbacks(callbacks = {}) {
  shortcutCallbacks = { ...shortcutCallbacks, ...callbacks };
}

export const KEY_ACTIONS = {
  'Escape': () => (getFullscreenElement() ? exitFullscreenSafely() : shortcutCallbacks.onCloseViewer()),
  'ArrowLeft': () => navigate(-1),
  'a': () => navigate(-1),
  'A': () => navigate(-1),
  'ArrowRight': () => navigate(1),
  'd': () => navigate(1),
  'D': () => navigate(1),
  'ArrowUp': () => navigatePost('up'),
  'w': () => navigatePost('up'),
  'W': () => navigatePost('up'),
  'ArrowDown': () => navigatePost('down'),
  's': () => navigatePost('down'),
  'S': () => navigatePost('down'),
  'r': () => triggerPostRecommend(),
  'R': () => triggerPostRecommend(),
  'c': () => triggerPostRecommend(),
  'C': () => triggerPostRecommend(),
  'h': () => toggleUiManual(),
  'H': () => toggleUiManual(),
  'f': () => toggleFullscreen(),
  'F': () => toggleFullscreen()
};

export const CODE_ACTIONS = {
  'KeyA': () => navigate(-1),
  'KeyD': () => navigate(1),
  'KeyW': () => navigatePost('up'),
  'KeyS': () => navigatePost('down'),
  'KeyR': () => triggerPostRecommend(),
  'KeyC': () => triggerPostRecommend(),
  'KeyH': () => toggleUiManual(),
  'KeyF': () => toggleFullscreen()
};

export function handleKeyDown(e) {
  if (!isOverlayActive() || !e || e.repeat) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (isEditableTarget(e.target)) {
    if (e.key === 'Escape' && typeof e.target.blur === 'function') e.target.blur();
    return;
  }
  if (isExternalModalOpen()) return;

  const action = KEY_ACTIONS[e.key] || (e.code ? CODE_ACTIONS[e.code] : null);
  if (!action) return;
  if (typeof e.preventDefault === 'function') e.preventDefault();
  if (typeof e.stopPropagation === 'function') e.stopPropagation();
  action();
}

export function handleGlobalViewerShortcut(e) {
  if (!e || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return false;
  if (isOverlayActive() || isExternalModalOpen()) return false;
  const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
  if (isEditableTarget(e.target) || isEditableTarget(activeEl)) return false;
  if (e.key !== 'v' && e.key !== 'V' && e.code !== 'KeyV') return false;
  shortcutCallbacks.onOpenViewer();
  return true;
}
