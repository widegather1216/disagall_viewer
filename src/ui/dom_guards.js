// Shared DOM Guard Helpers for Disagall Viewer UI
import { state } from '../state.js';

const NON_TEXT_INPUT_TYPES = new Set([
  'range',
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'color',
  'file',
  'hidden',
]);

export function isEditableTarget(target) {
  if (!target) return false;
  const tag = typeof target.tagName === 'string' ? target.tagName.toUpperCase() : '';
  if (tag === 'INPUT') {
    const inputType = typeof target.type === 'string' ? target.type.toLowerCase() : 'text';
    return !NON_TEXT_INPUT_TYPES.has(inputType);
  }
  return tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(target.isContentEditable);
}

export function isExternalModalOpen() {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
    return false;
  }
  const openModal = document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]');
  if (!openModal) return false;
  const { overlayEl } = state.elements;
  return !overlayEl || (typeof overlayEl.contains === 'function' && !overlayEl.contains(openModal));
}
