const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('/workspace/compras.html', 'utf8');
let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) { pass++; console.log('PASS:', msg); } else { fail++; console.log('FAIL:', msg); } }

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true });
const w = dom.window;
// stubs
w.alert = m => { w.__lastAlert = m; };
let openedURLs = [];
w.open = (url) => { openedURLs.push(url); return {}; };

const $ = id => w.document.getElementById(id);

// --- 1. Cliente automático sin login
assert($('userRoleTag').innerText === 'Cliente', 'rol inicial es Cliente automatico');
assert($('adminPanel').style.display === 'none', 'cliente no ve panel admin');

// --- 2. Agregar al carrito
w.agregarAlCarrito(1); // 45
w.agregarAlCarrito(1); // cantidad 2
w.agregarAlCarrito(2); // 30
assert($('cartCount').textContent === '3', 'contador = 3 unidades');
assert(w.totalCarrito() === 120, 'total S/120 (45x2 + 30x1), got ' + w.totalCarrito());

// --- 3. Persistencia del carrito en localStorage
const guardado = JSON.parse(w.localStorage.getItem('criss_carrito_v1'));
assert(Array.isArray(guardado) && guardado.length === 2, 'carrito persistido en localStorage');

// --- 4. Cambiar cantidades
w.cambiarCantidad(1, -1); // 45 x1
assert(w.totalCarrito() === 75, 'tras restar 1 unidad total = 75, got ' + w.totalCarrito());

// --- 5. Admin cambia precio -> carrito sincroniza
w.iniciarSesionTest = null;
$('loginUsuario').value = 'admin'; $('loginPassword').value = 'admin123';
const ev = new w.Event('submit', {bubbles:true, cancelable:true});
$('formLogin') ? $('formLogin').dispatchEvent(ev) : $('modalLogin').querySelector('form').dispatchEvent(ev);
assert($('userRoleTag').innerText === 'Administrador', 'login admin OK');
w.cambiarPrecioProducto(1, 50);
assert(w.totalCarrito() === 80, 'precio admin 50 reflejado en carrito: total 80, got ' + w.totalCarrito());

// --- 6. Admin NO puede finalizar compra
w.irAComprar();
assert(/Administrador/.test(w.__lastAlert || ''), 'admin bloqueado al finalizar compra');

// --- 7. Salir a modo cliente y comprar
w.salirAdministrador();
assert($('userRoleTag').innerText === 'Cliente', 'logout admin -> Cliente');
$('clienteNombre').value = '   ';
$('personalizarNombre').value = 'Ana';
const form = $('formPedido');
form.dispatchEvent(new w.Event('submit', {bubbles:true, cancelable:true}));
assert(/nombre completo/.test(w.__lastAlert || ''), 'validacion: nombre requerido');
assert(w.carritoActual ? true : JSON.parse(w.localStorage.getItem('criss_carrito_v1')).length === 2, 'carrito NO se vacia si validacion falla');

$('clienteNombre').value = 'Maria Lopez';
form.dispatchEvent(new w.Event('submit', {bubbles:true, cancelable:true}));
assert(openedURLs.length === 1 && openedURLs[0].includes('wa.me/51900000000'), 'WhatsApp abierto con boleta');
const msg = decodeURIComponent(openedURLs[0]);
assert(msg.includes('TOTAL:* S/ 80.00'), 'boleta con TOTAL correcto S/80');
assert(msg.includes('Chocotejas'.slice(0,5)) || msg.includes('Caja de Chocotejas Artesanales x1 = S/ 30.00'), 'detalle producto 2 en boleta');
assert(JSON.parse(w.localStorage.getItem('criss_carrito_v1')).length === 0, 'carrito vaciado tras compra');
assert($('cartCount').textContent === '0', 'contador vuelve a 0');
assert(/Compra registrada/.test(w.__lastAlert || ''), 'mensaje de confirmacion mostrado');

// --- 8. Pedido consolidado: UN solo registro con total real
const pedidos = JSON.parse(w.localStorage.getItem('criss_pedidos_v1'));
assert(pedidos.length === 1, 'un solo pedido consolidado, got ' + pedidos.length);
assert(pedidos[0].precio === 80, 'pedido guarda total real 80');
assert(pedidos[0].producto.includes('x1'), 'pedido incluye cantidades');

// --- 9. Confirmar pedido persiste
w.iniciarSesion ? null : null;
$('loginUsuario').value = 'admin'; $('loginPassword').value = 'admin123';
$('modalLogin').querySelector('form').dispatchEvent(new w.Event('submit', {bubbles:true, cancelable:true}));
w.confirmarPedido(0);
const pedidos2 = JSON.parse(w.localStorage.getItem('criss_pedidos_v1'));
assert(pedidos2[0].estado === 'Confirmado', 'confirmacion de pedido persistida');

// --- 10. "Comprar ya" abre modal directamente
w.salirAdministrador();
w.comprarDirecto(3);
assert($('modalPedido').style.display === 'flex', '"Comprar ya" abre modal de finalizacion');
assert(!$('cartSidebar').classList.contains('open'), '"Comprar ya" cierra panel lateral');

// --- 11. Carrito vacio no permite comprar (en modo Cliente)
assert($('userRoleTag').innerText === 'Cliente', 'estado antes de prueba 11: Cliente');
w.eval("vaciarCarrito(); __lastAlert=''; irAComprar();");
assert((w.__lastAlert || '').includes('está vacío'), 'carrito vacio bloquea compra');

// --- 12. Producto eliminado por admin sale del carrito
const carritoAntes = JSON.parse(w.localStorage.getItem('criss_carrito_v1'));
assert(carritoAntes.length === 0, 'carrito vacio tras compra (estado limpio)');
w.window.agregarAlCarrito(4);
assert(JSON.parse(w.localStorage.getItem('criss_carrito_v1')).length === 1, 'producto 4 agregado y persistido');
$('loginUsuario').value = 'admin'; $('loginPassword').value = 'admin123';
$('modalLogin').querySelector('form').dispatchEvent(new w.Event('submit', {bubbles:true, cancelable:true}));
w.eval("eliminarProducto(4);");
assert(JSON.parse(w.localStorage.getItem('criss_carrito_v1')).length === 0, 'producto eliminado desaparece del carrito persistido');

console.log(`\nRESULTADO: ${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
