// src/components/download/AudioFormatSelector.tsx
// ═══════════════════════════════════════════════════════════════
// مكوّن اختيار صيغة الصوت (mp3, m4a, flac, opus)
// ═══════════════════════════════════════════════════════════════

import { useLang } from "../../i18n/LangContext";

interface AudioFormatSelectorProps {
  afmt: string;
  setAfmt: (fmt: string) => void;
}

export function AudioFormatSelector({ afmt, setAfmt }: AudioFormatSelectorProps) {
  const { t } = useLang();
  const formats = ["mp3", "m4a", "flac", "opus"];

  return (
    <div className="options-row">
      <span className="ol">{t.format}</span>
      {formats.map((fmt) => (
        <button
          key={fmt}
          className={`chip ${afmt === fmt ? "ac" : ""}`}
          onClick={() => setAfmt(fmt)}
        >
          {fmt.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
