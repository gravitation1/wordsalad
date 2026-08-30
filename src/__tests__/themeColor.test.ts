import { afterEach, describe, expect, it } from 'vitest';

import { syncThemeColor } from '../themeColor';

function metas(): HTMLMetaElement[] {
  return Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  );
}

describe('syncThemeColor', () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('gates the pair by the OS scheme while following the system', () => {
    document.head.innerHTML =
      '<meta name="theme-color" content="#fff" media="all" data-scheme="light">' +
      '<meta name="theme-color" content="#000" media="not all" data-scheme="dark">';
    syncThemeColor('system');
    expect(metas().map((meta) => meta.media)).toEqual([
      '(prefers-color-scheme: light)',
      '(prefers-color-scheme: dark)',
    ]);
  });

  it('shows only the chosen scheme under an override', () => {
    document.head.innerHTML =
      '<meta name="theme-color" content="#fff" media="(prefers-color-scheme: light)" data-scheme="light">' +
      '<meta name="theme-color" content="#000" media="(prefers-color-scheme: dark)" data-scheme="dark">';
    syncThemeColor('dark');
    expect(metas().map((meta) => meta.media)).toEqual(['not all', 'all']);
    syncThemeColor('light');
    expect(metas().map((meta) => meta.media)).toEqual(['all', 'not all']);
    // The colors themselves are never touched.
    expect(metas().map((meta) => meta.content)).toEqual(['#fff', '#000']);
  });
});
