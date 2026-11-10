/** Typed DOM access that fails loudly: a missing hook is a bug, not a silent no-op. */

export function query<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Expected an element matching "${selector}"`);
  return element;
}

export function queryAll<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/** Reads a data attribute rendered at build time. */
export function readDataset(element: HTMLElement, key: string): string {
  const value = element.dataset[key];
  if (value === undefined) throw new Error(`Missing data-${key} on <${element.tagName.toLowerCase()}>`);
  return value;
}

/** Reads a JSON payload rendered at build time into a data attribute. */
export function readDatasetJson<T>(element: HTMLElement, key: string): T {
  return JSON.parse(readDataset(element, key)) as T;
}

/** Writes text only when it differs, so per-tick and per-frame updates leave the DOM alone. */
export function setText(element: Element, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

/** A primary-button click with no modifier keys: the only kind a script should take over from a link. */
export function isPlainClick(event: MouseEvent): boolean {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** Moves focus to an in-page target without scrolling, as a native fragment jump does. */
export function focusTarget(target: HTMLElement): void {
  if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) target.tabIndex = -1;
  target.focus({ preventScroll: true });
}
