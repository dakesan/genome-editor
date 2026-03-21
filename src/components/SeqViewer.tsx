import { useEffect, useRef } from "react";
import { SeqViz } from "seqviz";
import type { SearchRange, SeqSelection } from "../types/selection";
import type { ParsedSequence, ViewerType } from "../types/sequence";

export interface Translation {
  start: number;
  end: number;
  direction: 1 | -1;
  name: string;
}

interface HighlightProp {
  start: number;
  end: number;
  color?: string;
}

interface SeqViewerProps {
  sequence: ParsedSequence;
  viewerType: ViewerType;
  enzymes: string[];
  translations?: Translation[];
  onSelection?: (selection: SeqSelection) => void;
  copyEvent?: (event: React.KeyboardEvent<HTMLElement>) => boolean;
  search?: { query: string; mismatch?: number };
  onSearch?: (ranges: SearchRange[]) => void;
  highlights?: HighlightProp[];
}

// Stable empty array to avoid creating new references on each render.
const EMPTY_PRIMERS: never[] = [];

// NOTE: React.memo is intentionally NOT used here.
// SeqViz uses class components with render-phase side effects (inputRef)
// that are incompatible with React 19's memo optimizations.
export function SeqViewer({
  sequence,
  viewerType,
  enzymes,
  translations = [],
  onSelection,
  copyEvent,
  search,
  onSearch,
  highlights,
}: SeqViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // --- Drag-aware scroll fix ---
    //
    // SeqViz's linear viewer auto-scrolls during drag-selection, but the
    // browser does NOT fire mousemove for a stationary cursor. We use a
    // requestAnimationFrame loop to detect scrollTop changes during drag
    // and dispatch a synthetic mousemove so SeqViz recalculates the base.

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let rafId = 0;
    let scrollerEl: Element | null = null;
    let prevScrollTop = -1;

    const getScroller = (): Element | null => {
      if (!scrollerEl || !scrollerEl.isConnected) {
        scrollerEl = el.querySelector(".la-vz-linear-scroller");
      }
      return scrollerEl;
    };

    const redispatchMove = () => {
      const target = document.elementFromPoint(lastX, lastY);
      if (!target) return;

      const svg = target.closest(".la-vz-seqblock");
      if (svg) {
        svg.dispatchEvent(
          new MouseEvent("mousemove", {
            clientX: lastX,
            clientY: lastY,
            bubbles: true,
            cancelable: true,
            button: 0,
            buttons: 1,
          }),
        );
      }
    };

    const pollDuringDrag = () => {
      if (!dragging) return;

      const scroller = getScroller();
      if (scroller) {
        const st = scroller.scrollTop;
        if (st !== prevScrollTop) {
          prevScrollTop = st;
          redispatchMove();
        }
      }

      rafId = requestAnimationFrame(pollDuringDrag);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      const scroller = getScroller();
      prevScrollTop = scroller ? scroller.scrollTop : -1;
      rafId = requestAnimationFrame(pollDuringDrag);
    };

    const onMouseMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMouseUp = () => {
      dragging = false;
      cancelAnimationFrame(rafId);
    };

    // When cursor re-enters the viewer with no button pressed,
    // dispatch mouseup to clear any stuck dragEvent in SeqViz.
    const onMouseEnter = (e: MouseEvent) => {
      if (e.buttons === 0 && !dragging) {
        document.dispatchEvent(new MouseEvent("mouseup"));
      }
    };

    el.addEventListener("mousedown", onMouseDown, true);
    el.addEventListener("mousemove", onMouseMove, true);
    el.addEventListener("mouseenter", onMouseEnter);
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("mousedown", onMouseDown, true);
      el.removeEventListener("mousemove", onMouseMove, true);
      el.removeEventListener("mouseenter", onMouseEnter);
      document.removeEventListener("mouseup", onMouseUp);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="seq-viewer" style={{ flex: 1 }}>
      <SeqViz
        name={sequence.name}
        seq={sequence.seq}
        annotations={sequence.annotations}
        viewer={viewerType}
        enzymes={enzymes}
        translations={translations}
        primers={EMPTY_PRIMERS}
        onSelection={onSelection}
        copyEvent={copyEvent}
        search={search}
        onSearch={onSearch}
        highlights={highlights}
      />
    </div>
  );
}
