import { puzzleSearchParams } from './game/gameKey';
import type { HistoryEntry } from './progressStore';

// The installed app launches at ?resume (the manifest's start_url): a
// launch is a return to the game, not a request for a new one, so it lands
// on the puzzle last played — the one the player would still see in a
// browser tab, whose URL a tab keeps but a home-screen icon cannot. A board
// already cleared has nothing left to return to and deals fresh instead;
// so does a first launch. An explicit puzzle in the URL always wins.
//
// Returns the query string to boot with, or null when there is no ?resume
// to consume and the URL stands as it is.
export function resumedSearch(
  search: string,
  lastGameKey: string | null,
  summaries: readonly HistoryEntry[],
): string | null {
  const params = new URLSearchParams(search);
  if (!params.has('resume')) {
    return null;
  }
  params.delete('resume');
  const namesPuzzle = ['letters', 'required', 'min', 'dict'].some((name) =>
    params.has(name),
  );
  const summary = summaries.find(
    (entry) => entry.gameKey === lastGameKey,
  )?.summary;
  const cleared = summary !== undefined && summary.found >= summary.total;
  const puzzle =
    namesPuzzle || lastGameKey === null || cleared
      ? null
      : puzzleSearchParams(lastGameKey, params.get('lang'));
  const target = puzzle ?? params;
  return target.size === 0 ? '' : `?${target.toString()}`;
}
