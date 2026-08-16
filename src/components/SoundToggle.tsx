import { useMessages } from '../i18n';

interface SoundToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

// Sits in the header rather than inside the ⋯ menu: sound is the one
// setting a player wants to reach mid-word, without opening anything. Set
// in the header's muted vocabulary (a ♪ to match its ⋯) so it reads as
// furniture until it is needed. The padding, only partly clawed back by
// the negative margin, keeps the tap target finger-sized.
export function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
  const t = useMessages();

  return (
    <button
      aria-label={t.soundLabel}
      aria-pressed={enabled}
      className="-m-1 flex touch-manipulation items-center justify-center p-2.5 text-gray-400 transition hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
      onClick={onToggle}
      title={t.soundLabel}
      type="button"
    >
      {/* Muting draws the slash the ♪ glyph has no version of itself. It
          leans the opposite way to the note's flag — a slash parallel to
          the flag is read as part of the note rather than as a strike — and
          rides on a thicker line in the page color, so the gap that line
          carves keeps the two shapes from merging where they cross. */}
      <span
        aria-hidden="true"
        className="relative inline-block text-xl leading-none"
      >
        ♪
        {enabled ? null : (
          <>
            <span className="absolute left-1/2 top-1/2 h-[4px] w-[1.125rem] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white dark:bg-gray-950" />
            <span className="absolute left-1/2 top-1/2 h-px w-[1.125rem] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current" />
          </>
        )}
      </span>
    </button>
  );
}
