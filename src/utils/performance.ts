import type { MetricType } from "web-vitals";
import { onCLS, onINP, onLCP } from "web-vitals";

export interface RenderMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  label: string;
}

export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * Measure the time it takes for a synchronous or async operation.
 */
export function measureRenderTime(label: string): { stop: () => RenderMetrics } {
  const startTime = performance.now();
  return {
    stop: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      const metrics: RenderMetrics = { startTime, endTime, duration, label };
      console.log(`[Perf] ${label}: ${duration.toFixed(2)}ms`);
      return metrics;
    },
  };
}

/**
 * Measure FPS over a given duration.
 */
export function measureFPS(durationMs = 3000): Promise<number> {
  return new Promise((resolve) => {
    let frameCount = 0;
    const startTime = performance.now();

    function countFrame() {
      frameCount++;
      if (performance.now() - startTime < durationMs) {
        requestAnimationFrame(countFrame);
      } else {
        const elapsed = performance.now() - startTime;
        const fps = (frameCount / elapsed) * 1000;
        console.log(
          `[Perf] FPS: ${fps.toFixed(1)} (${frameCount} frames in ${elapsed.toFixed(0)}ms)`,
        );
        resolve(fps);
      }
    }

    requestAnimationFrame(countFrame);
  });
}

/**
 * Get current memory usage (Chrome only).
 */
export function getMemoryUsage(): MemoryMetrics | null {
  const perf = performance as Performance & {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  };

  if (!perf.memory) return null;

  const metrics: MemoryMetrics = {
    usedJSHeapSize: perf.memory.usedJSHeapSize,
    totalJSHeapSize: perf.memory.totalJSHeapSize,
    jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
  };

  console.log(
    `[Perf] Memory: ${(metrics.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB used / ${(metrics.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB total`,
  );

  return metrics;
}

/**
 * Report web vitals (CLS, INP, LCP).
 */
export function reportWebVitals(onReport?: (metric: MetricType) => void): void {
  const handler =
    onReport ||
    ((metric: MetricType) => {
      console.log(`[Perf] ${metric.name}: ${metric.value.toFixed(2)}`);
    });
  onCLS(handler);
  onINP(handler);
  onLCP(handler);
}
