/**
 * Radix dialogs close on Escape from a document-level capture listener,
 * before the focused element sees the key. When focus is on an open popup
 * trigger (e.g. the MultiSelect combobox with its suggestions showing),
 * Escape should only close that popup, so keep the dialog open.
 */
export function keepDialogOpenForOpenPopup(event: KeyboardEvent) {
  const target = event.target;
  if (
    target instanceof Element &&
    target.getAttribute('aria-expanded') === 'true'
  ) {
    event.preventDefault();
  }
}
