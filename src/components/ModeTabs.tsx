// Tab-based mode switcher: Editor / Alignment.

import type { AppMode } from "../types/alignment";

interface ModeTabsProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  return (
    <div className="mode-tabs">
      <button
        type="button"
        className={`mode-tab ${mode === "editor" ? "active" : ""}`}
        onClick={() => onModeChange("editor")}
      >
        Editor
      </button>
      <button
        type="button"
        className={`mode-tab ${mode === "alignment" ? "active" : ""}`}
        onClick={() => onModeChange("alignment")}
      >
        Alignment
      </button>
    </div>
  );
}
