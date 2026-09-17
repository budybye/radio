import { describe, expect, it } from "vite-plus/test";

import { formatGeo, globeHeading, signalArc } from "./globe-view";

describe("globeHeading", () => {
  it("aims the equator at longitude 0 toward the front-center", () => {
    const [phi, theta] = globeHeading(0, 0);

    expect(phi).toBeCloseTo(Math.PI * 1.5);
    expect(theta).toBe(0);
  });
});

describe("formatGeo", () => {
  it("formats signed coordinates as hemisphere pairs", () => {
    expect(formatGeo(35.6762, 139.6503)).toBe("35.68° N · 139.65° E");
    expect(formatGeo(-33.8688, -151.2093)).toBe("33.87° S · 151.21° W");
  });
});

describe("signalArc", () => {
  it("skips an arc when the site is the broadcast hub", () => {
    expect(signalArc([35.6762, 139.6503], [35.6762, 139.6503])).toBeNull();
  });

  it("draws an arc between distant broadcast sites", () => {
    expect(signalArc([35.6762, 139.6503], [40.7128, -74.006])).toEqual({
      from: [35.6762, 139.6503],
      to: [40.7128, -74.006],
      id: "signal",
    });
  });
});
