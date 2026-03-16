import { act, renderHook } from "@testing-library/react";
import { usePerformance } from "./usePerformance";

describe("usePerformance", () => {
  it("initializes with null metrics", () => {
    const { result } = renderHook(() => usePerformance("test"));

    expect(result.current.renderMetrics).toBeNull();
    expect(result.current.fps).toBeNull();
    expect(result.current.memory).toBeNull();
    expect(result.current.isMeasuring).toBe(false);
  });

  it("produces render metrics after startMeasure and stopMeasure", () => {
    const { result } = renderHook(() => usePerformance("test-component"));

    act(() => {
      result.current.startMeasure();
    });

    expect(result.current.isMeasuring).toBe(true);

    act(() => {
      result.current.stopMeasure();
    });

    expect(result.current.isMeasuring).toBe(false);
    expect(result.current.renderMetrics).not.toBeNull();
    expect(result.current.renderMetrics?.label).toBe("test-component");
    expect(result.current.renderMetrics?.duration).toBeGreaterThanOrEqual(0);
  });

  it("stopMeasure does nothing without a prior startMeasure", () => {
    const { result } = renderHook(() => usePerformance("no-start"));

    act(() => {
      result.current.stopMeasure();
    });

    expect(result.current.renderMetrics).toBeNull();
    expect(result.current.isMeasuring).toBe(false);
  });
});
