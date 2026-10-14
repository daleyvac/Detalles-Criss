// Pruebas de integración de la API local (npm test)
const assert = require('assert');
const app = require('../server/index');

let server, base;
const results = [];
async function t(nombre, fn) {
  try { await fn(); results.push(['✅', nombre]); }
  catch (e) { results.push(['❌', nombre + ' -> ' + e.message]); }
}
async function api(path, opts = {}) {
  const { token, body, ...rest } = opts;
  const r = await fetch(base + path, {
    method: rest.method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    ...rest
  });
  return { status: r.status, json: await r.json().catch(() => null) };
}

(async () => {
  server = app.listen(0);
  base = 'http://localhost:' + server.address().port;

  let token;
  await t('login admin correcto', async () => {
    const r = await api('/api/auth/login', { body: { usuario: 'admin', password: 'admin123' } });
    assert.strictEqual(r.status, 200); assert.ok(r.json.token); token = r.json.token;
  });
  await t('login con clave errónea -> 401', async () => {
    const r = await api('/api/auth/login', { body: { usuario: 'admin', password: 'mal' } });
    assert.strictEqual(r.status, 401);
  });
  await t('GET productos público con semilla', async () => {
    const r = await api('/api/productos');
    assert.strictEqual(r.status, 200); assert.ok(r.json.length >= 6);
    assert.ok(r.json[0].categoria, 'trae nombre de categoría');
  });
  await t('POST producto sin token -> 403', async () => {
    const r = await api('/api/productos', { method: 'POST', body: { nombre: 'X', categoria_id: 1, precio: 5 } });
    assert.strictEqual(r.status, 403);
  });
  await t('admin crea categoría', async () => {
    const r = await api('/api/categorias', { token, method: 'POST', body: { nombre: 'Diffusores ' + Date.now() } });
    assert.strictEqual(r.status, 201);
  });
  let prodNuevoId;
  await t('admin crea producto', async () => {
    const r = await api('/api/productos', { token, method: 'POST', body: { nombre: 'Diffusor Bambú', categoria_id: 1, precio: 25, imagen: '/img/test.jpg' } });
    assert.strictEqual(r.status, 201); assert.ok(r.json.id); prodNuevoId = r.json.id;
  });
  await t('admin elimina producto creado', async () => {
    const r = await api('/api/productos/' + prodNuevoId, { token, method: 'DELETE' });
    assert.strictEqual(r.status, 200);
  });
  await t('admin cambia precio (PUT)', async () => {
    const r = await api('/api/productos/1', { token, method: 'PUT', body: { precio: 15 } });
    assert.strictEqual(r.status, 200);
    const p = (await api('/api/productos')).json.find(x => x.id === 1);
    assert.strictEqual(p.precio, 15);
  });
  await t('cliente crea pedido SIN login (público) con total recalculado', async () => {
    // id1 precio 15 x2 = 30 ; id2 precio 12 x2 = 24 ; total 54
    const r = await api('/api/pedidos', { method: 'POST', body: { cliente: 'Ana Pérez', telefono: '999888777', items: [{ id: 1, cantidad: 2 }, { id: 2, cantidad: 2 }], dedicatoria: 'Feliz cumple', entrega: 'Domicilio' } });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.json.total, 54);
  });
  await t('pedido rechaza carrito vacío', async () => {
    const r = await api('/api/pedidos', { method: 'POST', body: { cliente: 'Luis', items: [] } });
    assert.strictEqual(r.status, 400);
  });
  await t('GET pedidos sin token -> 403', async () => {
    assert.strictEqual((await api('/api/pedidos')).status, 403);
  });
  await t('admin ve pedidos y los confirma', async () => {
    const r = await api('/api/pedidos', { token });
    assert.strictEqual(r.status, 200); assert.ok(r.json.length >= 1);
    const id = r.json[0].id;
    const c = await api(`/api/pedidos/${id}/estado`, { token, method: 'PATCH', body: { estado: 'confirmado' } });
    assert.strictEqual(c.status, 200);
  });
  await t('logout invalida token', async () => {
    await api('/api/auth/logout', { token, method: 'POST' });
    assert.strictEqual((await api('/api/pedidos', { token })).status, 403);
  });
  await t('frontend servido estáticamente conserva diseño', async () => {
    const r = await fetch(base + '/compras.html');
    assert.strictEqual(r.status, 200);
    assert.ok((await r.text()).includes('fc5da5'), 'conserva la paleta original');
  });

  console.log(results.map(([s, n]) => s + ' ' + n).join('\n'));
  const fallos = results.filter(([s]) => s === '❌').length;
  server.close();
  process.exit(fallos ? 1 : 0);
})();
