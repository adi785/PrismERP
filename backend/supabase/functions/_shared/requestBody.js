/**
 * Read a request body without ever buffering more than `maxBytes`.
 * Content-Length is an early rejection hint only; the streamed byte count is authoritative.
 */
export async function readBoundedRequestBody(request, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new TypeError('Maximum request size must be a non-negative safe integer.');
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength !== null) {
    const normalizedLength = contentLength.trim();
    if (!/^\\d+$/.test(normalizedLength)) {
      throw new TypeError('Content-Length must be a non-negative integer.');
    }
    if (Number(normalizedLength) > maxBytes) {
      throw new RangeError('Request payload is too large.');
    }
  }

  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        throw new TypeError('Request body stream must contain byte chunks.');
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // The size limit has already been exceeded; cancellation is best-effort.
        }
        throw new RangeError('Request payload is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new TypeError('Request body must be valid UTF-8.');
  }
}
