import test from 'node:test'
import assert from 'node:assert/strict'
import { loginDestination, resolveDemoSession } from './demoAuth.js'

test('legacy customer sessions retain their identity and acquire a customer role', () => {
  assert.equal(resolveDemoSession({ id: 'demo-customer' }).role, 'customer')
  assert.equal(resolveDemoSession({ id: 'demo-customer', role: 'admin' }).role, 'customer')
  assert.equal(resolveDemoSession({ id: 'demo-admin' }).role, 'admin')
  assert.equal(resolveDemoSession({ id: 'unknown', role: 'admin' }), null)
  assert.equal(resolveDemoSession(null), null)
})
test('login resumes safe local routes and never accepts external redirects', () => {
  assert.equal(loginDestination('/admin/floor', 'admin'), '/admin/floor')
  assert.equal(loginDestination('/booking?zone=pc', 'customer'), '/booking?zone=pc')
  assert.equal(loginDestination('/admin/floor', 'customer'), '/admin')
  assert.equal(loginDestination('/booking', 'admin'), '/admin')
  for (const path of ['https://example.com', '//example.com', '/admin//example.com', '/unrelated']) assert.equal(loginDestination(path, 'admin'), '/admin')
})
