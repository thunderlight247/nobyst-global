/**
 * Checks an upload's leading bytes against the type its extension claims. The browser-supplied
 * MIME type and file name are only hints; this is what decides whether a file is stored.
 */
export function matchesSignature(head: Uint8Array, extension: string): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  switch (extension) {
    case "jpg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "png":
      return ascii(1, 4) === "PNG" && head[0] === 0x89;
    case "webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "glb":
      return ascii(0, 4) === "glTF";
    case "gltf":
      // glTF JSON starts with "{" (allowing a UTF-8 BOM or whitespace before it).
      return /^\s*\{/.test(new TextDecoder().decode(head).replace(/^\uFEFF/, ""));
    default:
      return false;
  }
}
