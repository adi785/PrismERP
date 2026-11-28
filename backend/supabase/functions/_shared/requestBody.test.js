import assert from 'node:assert/strict';
import test from 'node:test';
import { readBoundedRequestBody } from './requestBody.js';

const toStream = (value) => new ReadableStream({
  start(controller) {
    controller.enqueue(typeof value === 'string' ? new TextEncoder().encode(value) : value);
    controller.close();
  },
});
const request = (body, headers = {}) => ({
  headers: new Headers(headers),
  body: body === null ? null : body instanceof ReadableStream ? body : toStream(body),
});

test('reads a body exactly at the configured byte limit', async () => {
  assert.equal(await readBoundedRequestBody(request('hello'), 5), 'hello');
});

test('counts UTF-8 bytes rather than JavaScript characters', async () => {
  assert.equal(await readBoundedRequestBody(request('₹'), 3), '₹');
  await assert.rejects(readBoundedRequestBody(request('₹'), 2), RangeError);
});

test('decodes UTF-8 sequences split across streamed chunks', async () => {
  const encoded = new TextEncoder().encode('₹');
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoded.slice(0, 1));
      controller.enqueue(encoded.slice(1));
      controller.close();
    },
  });
  assert.equal(await readBoundedRequestBody(request(body), 3), '₹');
});

test('rejects an oversized Content-Length before consuming the body', async () => {
  let consumed = false;
  const body = new ReadableStream({
    pull(controller) {
      consumed = true;
      controller.enqueue(new TextEncoder().encode('too large'));
      controller.close();
    },
  }, { highWaterMark: 0 });
  await assert.rejects(
    readBoundedRequestBody(request(body, { 'content-length': '9' }), 5),
    /too large/,
  );
  assert.equal(consumed, false);
});

test('cancels a chunked stream as soon as the streamed limit is exceeded', async () => {
  let cancelled = false;
  let reads = 0;
  const body = new ReadableStream({
    pull(controller) {
      reads += 1;
      controller.enqueue(new TextEncoder().encode(reads === 1 ? '1234' : '5678'));
    },
    cancel() {
      cancelled = true;
    },
  });

  await assert.rejects(readBoundedRequestBody(request(body), 5), /too large/);
  assert.equal(cancelled, true);
});

test('enforces the streamed limit when Content-Length is missing or understated', async () => {
  await assert.rejects(readBoundedRequestBody(request('123456'), 5), RangeError);
  await assert.rejects(
    readBoundedRequestBody(request('123456', { 'content-length': '1' }), 5),
    RangeError,
  );
});

test('rejects malformed UTF-8 instead of silently replacing bytes', async () => {
  const body = new Uint8Array([0xc3, 0x28]);
  await assert.rejects(readBoundedRequestBody(request(body), 2), /valid UTF-8/);
});

test('rejects malformed Content-Length values', async () => {
  await assert.rejects(
    readBoundedRequestBody(request('hello', { 'content-length': '5x' }), 10),
    /Content-Length must be a non-negative integer/,
  );
});

test('accepts an empty request body', async () => {
  assert.equal(await readBoundedRequestBody(request(null), 5), '');
});
