import { getMemoryUsage, measureRenderTime } from "./performance";

describe("measureRenderTime", () => {
  it("returns an object with a stop method", () => {
    const measure = measureRenderTime("test-label");
    expect(measure).toHaveProperty("stop");
    expect(typeof measure.stop).toBe("function");
  });

  it("returns correct RenderMetrics structure on stop", () => {
    const measure = measureRenderTime("test-render");
    const metrics = measure.stop();

    expect(metrics).toHaveProperty("startTime");
    expect(metrics).toHaveProperty("endTime");
    expect(metrics).toHaveProperty("duration");
    expect(metrics).toHaveProperty("label");
    expect(metrics.label).toBe("test-render");
    expect(typeof metrics.startTime).toBe("number");
    expect(typeof metrics.endTime).toBe("number");
    expect(typeof metrics.duration).toBe("number");
  });

  it("measures a positive duration", () => {
    const measure = measureRenderTime("duration-test");
    // Perform some work to ensure nonzero duration
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      sum += Math.sqrt(i);
    }
    // Prevent dead-code elimination
    if (sum < 0) console.log(sum);

    const metrics = measure.stop();
    expect(metrics.duration).toBeGreaterThanOrEqual(0);
    expect(metrics.endTime).toBeGreaterThanOrEqual(metrics.startTime);
  });
});

describe("getMemoryUsage", () => {
  it("returns null in jsdom (no performance.memory)", () => {
    const result = getMemoryUsage();
    expect(result).toBeNull();
  });
});
