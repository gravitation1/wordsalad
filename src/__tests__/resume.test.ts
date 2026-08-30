import { describe, expect, it } from 'vitest';

import type { HistoryEntry } from '../progressStore';
import { resumedSearch } from '../resume';

function entry(gameKey: string, found: number, total: number): HistoryEntry {
  return {
    gameKey,
    summary: {
      earned: 0,
      found,
      hints: 0,
      lost: 0,
      max: 10,
      playedAt: 1,
      total,
    },
  };
}

describe('resumedSearch', () => {
  it('leaves a URL without ?resume alone', () => {
    expect(resumedSearch('', 'DEORSTW.T.4', [])).toBeNull();
    expect(resumedSearch('?letters=AZIMUTH', 'DEORSTW.T.4', [])).toBeNull();
  });

  it('returns to the last game played', () => {
    expect(resumedSearch('?resume', 'DEORSTW.T.4', [])).toBe(
      '?letters=DEORSTW&required=T',
    );
    // Its dictionary and the UI-language override ride along.
    expect(resumedSearch('?resume&lang=de', 'fr:ACEIRST.A.5', [])).toBe(
      '?lang=de&dict=fr&letters=ACEIRST&required=A&min=5',
    );
  });

  it('deals fresh on a first launch', () => {
    expect(resumedSearch('?resume', null, [])).toBe('');
    expect(resumedSearch('?resume&lang=fr', null, [])).toBe('?lang=fr');
  });

  it('deals fresh when the last board was cleared', () => {
    const summaries = [entry('DEORSTW.T.4', 3, 3)];
    expect(resumedSearch('?resume', 'DEORSTW.T.4', summaries)).toBe('');
    // A board with words left is worth returning to.
    expect(
      resumedSearch('?resume', 'DEORSTW.T.4', [entry('DEORSTW.T.4', 2, 3)]),
    ).toBe('?letters=DEORSTW&required=T');
  });

  it('lets an explicit puzzle win over the last game', () => {
    expect(resumedSearch('?resume&letters=AZIMUTH', 'DEORSTW.T.4', [])).toBe(
      '?letters=AZIMUTH',
    );
    expect(resumedSearch('?dict=fr&resume', 'DEORSTW.T.4', [])).toBe(
      '?dict=fr',
    );
  });

  it('deals fresh when the last key no longer parses', () => {
    expect(resumedSearch('?resume', 'garbage', [])).toBe('');
  });
});
