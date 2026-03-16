import { useCallback, useEffect, useRef, useState } from "react";
import type { MemoryMetrics, RenderMetrics } from "../utils/performance";
import { getMemoryUsage, measureFPS, measureRenderTime } from "../utils/performance";

export interface PerformanceData {
  renderMetrics: RenderMetrics | null;
  fps: number | null;
  memory: MemoryMetrics | null;
  isMeasuring: boolean;
}

/**
 * Hook for measuring component-level performance.
 * Call startMeasure() before rendering, stopMeasure() after.
 * Call measureCurrentFPS() to measure scroll/interaction FPS.
 */
export function usePerformance(label: string) {
  const [data, setData] = useState<PerformanceData>({
    renderMetrics: null,
    fps: null,
    memory: null,
    isMeasuring: false,
  });

  const measureRef = useRef<ReturnType<typeof measureRenderTime> | null>(null);

  const startMeasure = useCallback(() => {
    measureRef.current = measureRenderTime(label);
    setData((prev) => ({ ...prev, isMeasuring: true }));
  }, [label]);

  const stopMeasure = useCallback(() => {
    if (!measureRef.current) return;
    const renderMetrics = measureRef.current.stop();
    const memory = getMemoryUsage();
    measureRef.current = null;
    setData({
      renderMetrics,
      fps: null,
      memory,
      isMeasuring: false,
    });
  }, []);

  const measureCurrentFPS = useCallback(async (durationMs?: number) => {
    setData((prev) => ({ ...prev, isMeasuring: true }));
    const fps = await measureFPS(durationMs);
    const memory = getMemoryUsage();
    setData((prev) => ({
      ...prev,
      fps,
      memory,
      isMeasuring: false,
    }));
    return fps;
  }, []);

  // Measure memory on mount
  useEffect(() => {
    const memory = getMemoryUsage();
    if (memory) {
      setData((prev) => ({ ...prev, memory }));
    }
  }, []);

  return { ...data, startMeasure, stopMeasure, measureCurrentFPS };
}
