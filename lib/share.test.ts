import { afterEach, describe, expect, it, vi } from "vitest"

import { decodeShareConfig, encodeShareConfig } from "@/lib/share"
import type { ShareConfig } from "@/lib/share"

const config: ShareConfig = {
  type: "bar",
  csv: "Month,Revenue\nJan,100\nFeb,200",
  options: { stackMode: "stack", customColors: { series_Revenue: "#ff0000" } },
}

describe("encodeShareConfig / decodeShareConfig", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("round-trips a config through compression", () => {
    expect(typeof CompressionStream).toBe("function")
    return encodeShareConfig(config)
      .then((encoded) => decodeShareConfig(encoded))
      .then((decoded) => {
        expect(decoded).toEqual(config)
      })
  })

  it("round-trips a config via the uncompressed fallback when CompressionStream is unavailable", async () => {
    vi.stubGlobal("CompressionStream", undefined)

    const encoded = await encodeShareConfig(config)
    expect(encoded.startsWith("0.")).toBe(true)

    const decoded = await decodeShareConfig(encoded)
    expect(decoded).toEqual(config)
  })

  it("returns null for malformed input instead of throwing", async () => {
    await expect(decodeShareConfig("not-a-real-payload")).resolves.toBeNull()
    await expect(decodeShareConfig("")).resolves.toBeNull()
  })

  it("returns null when the decoded payload is missing required fields", async () => {
    const badJson = JSON.stringify({ foo: "bar" })
    const bytes = new TextEncoder().encode(badJson)
    let binary = ""
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })
    const base64Url = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

    await expect(decodeShareConfig(`0.${base64Url}`)).resolves.toBeNull()
  })
})

describe("decodeShareConfig: untrusted options", () => {
  it("drops custom colors that aren't plain color values", async () => {
    const encoded = await encodeShareConfig({
      ...config,
      options: {
        customColors: {
          series_Revenue: "#00ff00",
          series_Evil: "red;}</style><img src=x onerror=alert(1)>",
        },
      },
    })
    const decoded = await decodeShareConfig(encoded)
    expect(decoded?.options.customColors).toEqual({ series_Revenue: "#00ff00" })
  })
})
