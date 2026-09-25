import { isSafeColor } from "@/lib/chart-data"
import type { ChartOptions, ChartType } from "@/types/chart"

export interface ShareConfig {
  type: ChartType
  csv: string
  options: ChartOptions
}

const GZIP_FLAG = "1"
const RAW_FLAG = "0"

async function gzipEncode(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gzipDecode(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes] as BlobPart[])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
  return new TextDecoder().decode(await new Response(stream).arrayBuffer())
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/** Encodes a chart config for the `?c=` share link query param. Compresses
 * via the native CompressionStream API when available (no new dependency);
 * falls back to plain base64 JSON in older browsers. */
export async function encodeShareConfig(config: ShareConfig): Promise<string> {
  const json = JSON.stringify(config)

  if (typeof CompressionStream !== "undefined") {
    const compressed = await gzipEncode(json)
    return `${GZIP_FLAG}.${bytesToBase64Url(compressed)}`
  }
  return `${RAW_FLAG}.${bytesToBase64Url(new TextEncoder().encode(json))}`
}

/** Drops custom colors that aren't plain color values. They're injected into
 * a <style> tag and SVG attributes, and a share link can contain anything. */
function sanitizeOptions(options: unknown): ChartOptions {
  if (typeof options !== "object" || options === null) return {}
  const { customColors, ...rest } = options as ChartOptions
  if (!customColors || typeof customColors !== "object") return rest
  const safe = Object.fromEntries(
    Object.entries(customColors).filter(([, color]) => isSafeColor(color))
  )
  return Object.keys(safe).length > 0 ? { ...rest, customColors: safe } : rest
}

/** Inverse of encodeShareConfig. Returns null on any malformed or
 * unparseable input rather than throwing, so a bad link just falls back to
 * the default sample chart. */
export async function decodeShareConfig(value: string): Promise<ShareConfig | null> {
  try {
    const [flag, payload] = value.split(".")
    if (!payload) return null

    const bytes = base64UrlToBytes(payload)
    const json =
      flag === GZIP_FLAG
        ? await gzipDecode(bytes)
        : new TextDecoder().decode(bytes)

    const parsed: unknown = JSON.parse(json)
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as ShareConfig).type !== "string" ||
      typeof (parsed as ShareConfig).csv !== "string"
    ) {
      return null
    }
    const config = parsed as ShareConfig
    return { ...config, options: sanitizeOptions(config.options) }
  } catch {
    return null
  }
}

export function buildShareURL(encoded: string): string {
  const url = new URL(window.location.href)
  url.searchParams.set("c", encoded)
  return url.toString()
}
