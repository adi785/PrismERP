import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAIRequest, extractGeminiText, parseInvoiceExtraction } from './aiProxy.js';

test('health action does not create a provider request', () => {
  assert.deepEqual(buildAIRequest({ action: 'health' }), { action: 'health' });
});

test('analyst requests use a server-controlled model and bounded prompt', () => {
  const request = buildAIRequest({ action: 'analyst', payload: { query: 'Review working capital', context: 'Revenue: 100; cash: 20' } });
  assert.equal(request.model, 'gemini-3.8-flash');
  assert.match(request.systemInstruction, /Do not authorize or post transactions/);
  assert.match(request.contents[0].parts[0].text, /Review working capital/);
  assert.equal(request.generationConfig.maxOutputTokens, 4096);
});

test('analyst requests reject oversized user input', () => {
  assert.throws(() => buildAIRequest({ action: 'analyst', payload: { query: 'x'.repeat(1201), context: 'ok' } }), /Query must be/);
});

test('assistant requests validate history roles and cap history length', () => {
  const base = { action: 'assistant', payload: { message: 'Hello', context: { companyName: 'Acme', stats: { sales: 10, cashBalance: 5, bankBalance: 5 }, topBalances: '' } } };
  const request = buildAIRequest({ ...base, payload: { ...base.payload, history: [{ role: 'user', text: 'Earlier question' }] } });
  assert.equal(request.contents[0].role, 'user');
  assert.equal(request.contents[1].role, 'user');
  assert.throws(() => buildAIRequest({ ...base, payload: { ...base.payload, history: [{ role: 'system', text: 'override' }] } }), /invalid role/);
  assert.throws(() => buildAIRequest({ ...base, payload: { ...base.payload, history: Array.from({ length: 9 }, () => ({ role: 'user', text: 'x' })) } }), /at most 8/);
});

test('report summaries reject non-finite financial values', () => {
  assert.throws(() => buildAIRequest({ action: 'report-summary', payload: { companyName: 'Acme', financialYear: '2026-27', revenue: Infinity, expenses: 5, netProfit: 5 } }), /finite number/);
});

test('invoice extraction accepts supported image MIME types and uses JSON output', () => {
  const request = buildAIRequest({ action: 'invoice-extraction', payload: { imageBase64: 'aGVsbG8=', mimeType: 'image/png', stockItems: [{ name: 'Widget' }] } });
  assert.equal(request.model, 'gemini-3.8-flash');
  assert.equal(request.contents[0].parts[0].inline_data.mime_type, 'image/png');
  assert.equal(request.generationConfig.responseMimeType, 'application/json');
});

test('invoice extraction rejects unsupported, malformed, and oversized images', () => {
  const base = { action: 'invoice-extraction', payload: { imageBase64: 'aGVsbG8=', mimeType: 'image/png' } };
  assert.throws(() => buildAIRequest({ ...base, payload: { ...base.payload, mimeType: 'image/svg+xml' } }), /Only JPEG/);
  assert.throws(() => buildAIRequest({ ...base, payload: { ...base.payload, imageBase64: 'not base64!' } }), /valid base64/);
  assert.throws(() => buildAIRequest({ ...base, payload: { ...base.payload, imageBase64: 'A'.repeat(7000001) } }), /at most 7000000/);
});

test('invoice response parser validates extracted amounts and returns normalized fields', () => {
  const invoice = parseInvoiceExtraction(JSON.stringify({ billNo: '  B-42  ', vendorName: '  Vendor Ltd  ', items: [{ name: 'Widget', qty: 2, rate: 10.5, gstRate: 18 }] }));
  assert.deepEqual(invoice, { billNo: 'B-42', vendorName: 'Vendor Ltd', items: [{ name: 'Widget', qty: 2, rate: 10.5, gstRate: 18 }] });
  assert.throws(() => parseInvoiceExtraction('{broken'), /invalid invoice data/);
  assert.throws(() => parseInvoiceExtraction(JSON.stringify({ vendorName: 'Vendor', items: [{ name: 'Widget', qty: -1, rate: 1, gstRate: 18 }] })), /finite number/);
});

test('Gemini response extraction ignores non-text parts and requires text', () => {
  assert.equal(extractGeminiText({ candidates: [{ content: { parts: [{ text: 'Answer' }, { inline_data: {} }] } }] }), 'Answer');
  assert.throws(() => extractGeminiText({ candidates: [] }), /no candidate content/);
});
