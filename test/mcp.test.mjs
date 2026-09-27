import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './helpers.mjs';

const SERVER = join(root, 'mcp/server.mjs');

test('mcp selftest passes', () => {
  const r = spawnSync(process.execPath, [SERVER, '--selftest'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /0 failed/);
});

test('mcp answers a JSON-RPC session over stdio', () => {
  const reqs = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'corf_get_area', arguments: { id: 'tprm 9.1.1', lang: 'ar' } } },
    { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'corf_readiness_report', arguments: { assessment: { schema: 'sadu/1', status: { 'crb:4.1.1.1': 'implemented' } } } } },
    { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'corf_get_area', arguments: { id: 'crb:99.1.1' } } },
    { jsonrpc: '2.0', id: 6, method: 'nope' },
  ];
  const input = reqs.map((r) => JSON.stringify(r)).join('\n') + '\n';
  const r = spawnSync(process.execPath, [SERVER], { input, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const byId = new Map(lines.map((m) => [m.id, m]));
  assert.equal(byId.get(1).result.protocolVersion, '2025-06-18');
  assert.equal(byId.get(1).result.serverInfo.name, 'sadu');
  assert.equal(byId.get(2).result.tools.length, 12, 'twelve tools listed');
  for (const t of byId.get(2).result.tools) assert.equal(t.annotations.readOnlyHint, true, `${t.name} read-only`);
  const ga = byId.get(3).result;
  assert.equal(ga.structuredContent.id, 'tprm:9.1.1');
  assert.ok(/[\u0600-\u06FF]/.test(ga.structuredContent.title), 'Arabic title returned');
  assert.equal(byId.get(4).result.structuredContent.overall.readiness, 100);
  assert.equal(byId.get(5).result.isError, true);
  assert.equal(byId.get(6).error.code, -32601);
});

test('README documents every tool by name', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const src = readFileSync(SERVER, 'utf8');
  const names = [...src.matchAll(/name: '(corf_[a-z_]+)'/g)].map((m) => m[1]);
  assert.equal(new Set(names).size, 12);
  for (const n of names) assert.ok(readme.includes(n), `README mentions ${n}`);
});
