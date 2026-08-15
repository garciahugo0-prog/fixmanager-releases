import React from 'react';

/**
 * Helper to update inputs while preserving caret position (selection start/end).
 * This prevents the cursor from jumping to the end of the text input when
 * value formatting or case conversion (like .toUpperCase()) is applied on React controlled inputs.
 */
export function handleCaretPreservingChange(
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  updater: (val: string) => void,
  transform?: (val: string) => string
) {
  const target = e.target;
  const start = target.selectionStart;
  const end = target.selectionEnd;
  const val = transform ? transform(target.value) : target.value;
  updater(val);
  requestAnimationFrame(() => {
    if (target) {
      target.setSelectionRange(start, end);
    }
  });
}
