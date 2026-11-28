/**
 * Read a request body with a hard byte limit.
 * Content-Length is an early rejection hint only; streamed bytes are authoritative.
 */
export async function readBoundedRequestBody(request, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new TypeError('Maximum request size must be a non-negative safe integer.');
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength !== null) {
    const normalizedLength = contentLength.trim();
    if (!/^\d+$/.test(normalizedLength)) {
      throw new TypeError('Content-Length must be a non-negative integer.');
    }
    if (Number(normalizedLength) > maxBytes) {
      throw new RangeError('Request payload is too large.');
    }
  }

  if (!request.body) return '';

  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let totalBytes = 0;
  let bodyText = '';

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

      try {
        bodyText += decoder.decode(value, { stream: true });
      } catch {
        try {
          await reader.cancel();
        } catch {
          // Invalid input is already rejected; cancellation is best-effort.
        }
        throw new TypeError('Request body must be valid UTF-8.');
      }
    }

    try {
      bodyText += decoder.decode();
    } catch {
      throw new TypeError('Request body must be valid UTF-8.');
    }
    return bodyText;
  } finally {
    reader.releaseLock();
  }
}
