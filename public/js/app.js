        // ===== CATALOGO DINAMICO (editable por el Administrador, persistido en localStorage) =====
        const KEY_CATALOGO = 'criss_catalogo_v1';
        const KEY_CARRITO = 'criss_carrito_v1';
        const KEY_PEDIDOS = 'criss_pedidos_v1';

        let categorias = [
            { id: "cuadros", nombre: "Cuadros Personalizados" },
            { id: "chocotejas", nombre: "Chocotejas" },
            { id: "sorpresa", nombre: "Regalos Sorpresa" },
            { id: "arreglos", nombre: "Arreglos a Mano" },
            { id: "juguetes", nombre: "Juguetes y Peluches" }
        ];

        let productos = [
            { id: 1, nombre: "Cuadro Fotográfico Personalizado", categoria: "cuadros", precio: 45.00, imagen: "" },
            { id: 2, nombre: "Caja de Chocotejas Artesanales", categoria: "chocotejas", precio: 30.00, imagen: "" },
            { id: 3, nombre: "Box Sorpresa Especial", categoria: "sorpresa", precio: 85.00, imagen: "" },
            { id: 4, nombre: "Arreglo Floral Hecho a Mano", categoria: "arreglos", precio: 60.00, imagen: "" },
            { id: 5, nombre: "Peluche + Detalle Personalizado", categoria: "juguetes", precio: 55.00, imagen: "" },
            { id: 6, nombre: "Detalle Tallado Personalizado", categoria: "cuadros", precio: 40.00, imagen: "" }
        ];

        // Cargar catalogo guardado (ediciones del admin: precios, imagenes, productos y categorias nuevas)
        try {
            const guardado = JSON.parse(localStorage.getItem(KEY_CATALOGO));
            if (guardado && Array.isArray(guardado.productos) && Array.isArray(guardado.categorias)) {
                productos = guardado.productos;
                categorias = guardado.categorias;
            }
        } catch (e) { /* usa los datos por defecto */ }

        function guardarCatalogo() {
            localStorage.setItem(KEY_CATALOGO, JSON.stringify({ productos, categorias }));
        }

        const numeroWhatsApp = "51900000000"; // Reemplazar con tu número de WhatsApp real

        // ===== ROLES =====
        // El rol Invitado se elimina: todo visitante es CLIENTE automaticamente desde el inicio
        // y puede comprar sin iniciar sesion. Solo existe login para el ADMINISTRADOR.
        const usuariosRegistrados = {
            administrador: [
                { usuario: "admin", password: "admin123" }
            ]
        };

        let modoAdministrador = false; // false = Cliente (estado inicial automatico)
        let pedidosRegistrados = [];
        try {
            const guardadoPedidos = JSON.parse(localStorage.getItem(KEY_PEDIDOS));
            if (Array.isArray(guardadoPedidos)) pedidosRegistrados = guardadoPedidos;
        } catch (e) { /* sin pedidos guardados */ }

        function guardarPedidos() {
            localStorage.setItem(KEY_PEDIDOS, JSON.stringify(pedidosRegistrados));
        }

        function abrirModalLogin(rol = 'administrador') {
            document.getElementById('loginRol').value = rol;
            document.getElementById('loginError').style.display = 'none';
            document.getElementById('loginUsuario').value = '';
            document.getElementById('loginPassword').value = '';
            document.getElementById('modalLogin').style.display = 'flex';
        }

        function cerrarModalLogin() {
            document.getElementById('modalLogin').style.display = 'none';
        }

        function iniciarSesion(e) {
            e.preventDefault();
            const rol = document.getElementById('loginRol').value;
            const usuario = document.getElementById('loginUsuario').value.trim().toLowerCase();
            const password = document.getElementById('loginPassword').value;

            const valido = (usuariosRegistrados[rol] || []).some(u => u.usuario === usuario && u.password === password);

            if (!valido) {
                document.getElementById('loginError').style.display = 'block';
                return;
            }

            modoAdministrador = true;
            aplicarPermisosPorRol();
            cerrarModalLogin();
        }

        function salirAdministrador() {
            modoAdministrador = false;
            aplicarPermisosPorRol();
        }

        // Permisos segun el rol: Cliente compra directamente; Admin gestiona la tienda
        function aplicarPermisosPorRol() {
            const roleTag = document.getElementById('userRoleTag');
            const nameSession = document.getElementById('userNameSession');
            const btnAdminNav = document.getElementById('btnAdminNav');
            const btnSalir = document.getElementById('btnSalirAdmin');
            const adminPanel = document.getElementById('adminPanel');

            if (modoAdministrador) {
                roleTag.innerText = 'Administrador';
                nameSession.innerText = '👋 Admin';
                btnAdminNav.style.display = 'none';
                btnSalir.style.display = 'inline-block';
                adminPanel.style.display = 'block';
                renderSelectCategorias();
                renderTablaProductosAdmin();
                renderTablaCategoriasAdmin();
                renderTablaPedidosAdmin();
            } else {
                roleTag.innerText = 'Cliente';
                nameSession.innerText = '👋 Cliente';
                btnAdminNav.style.display = 'inline-block';
                btnSalir.style.display = 'none';
                adminPanel.style.display = 'none'; // Cliente NO ve el panel de administracion
            }
            renderFiltros();
            renderProductos(productos);
        }

        // ===== FUNCIONES MODULO ADMINISTRADOR =====

        // Renderiza los filtros del catalogo (un boton por categoria, gestionables por el admin)
        function renderFiltros() {
            const cont = document.getElementById('filtrosCategoria');
            cont.innerHTML = `<button class="filter-btn active" onclick="filterProducts('todos', this)">Todos</button>` +
                categorias.map(c => `<button class="filter-btn" onclick="filterProducts('${c.id}', this)">${c.nombre}</button>`).join('');
        }

        // Select de categorias del formulario de nuevo producto
        function renderSelectCategorias() {
            const sel = document.getElementById('nuevoProdCategoria');
            sel.innerHTML = categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        }

        function nombreCategoria(id) {
            const c = categorias.find(cat => cat.id === id);
            return c ? c.nombre : id;
        }

        function renderTablaProductosAdmin() {
            const tbody = document.getElementById('tablaProductosAdmin');
            tbody.innerHTML = productos.map(p => `
                <tr>
                    <td>${p.nombre}</td>
                    <td>${nombreCategoria(p.categoria)}</td>
                    <td><input type="number" step="0.10" min="0" value="${p.precio.toFixed(2)}" style="width:90px; padding:0.35rem; border:1px solid var(--accent-pink); border-radius:8px;" onchange="cambiarPrecioProducto(${p.id}, this.value)" title="Edita y presiona Enter para guardar el nuevo precio"></td>
                    <td>
                        <input type="text" value="${p.imagen || ''}" placeholder="URL imagen" style="width:140px; padding:0.35rem; border:1px solid var(--accent-pink); border-radius:8px;" onchange="cambiarImagenProducto(${p.id}, this.value)" title="Pega la URL y presiona Enter">
                    </td>
                    <td><button class="btn-small" onclick="eliminarProducto(${p.id})">🗑 Eliminar</button></td>
                </tr>
            `).join('');
        }

        // Cambio de PRECIO manual desde la tabla del admin
        function cambiarPrecioProducto(id, nuevoValor) {
            const prod = productos.find(p => p.id === id);
            if (!prod) return;
            const precio = parseFloat(nuevoValor);
            if (isNaN(precio) || precio <= 0) {
                alert('Precio inválido. Ingresa un número mayor a 0.');
                renderTablaProductosAdmin();
                return;
            }
            prod.precio = precio;
            guardarCatalogo();
            sincronizarCarrito(); // el carrito muestra de inmediato el nuevo precio
            renderTablaProductosAdmin();
            renderProductos(productos);
        }

        // Cambio de IMAGEN manual desde la tabla del admin
        function cambiarImagenProducto(id, url) {
            const prod = productos.find(p => p.id === id);
            if (!prod) return;
            prod.imagen = url.trim();
            guardarCatalogo();
            renderTablaProductosAdmin();
            renderProductos(productos);
        }

        // AGREGAR CATEGORIA (nuevo apartado de compra) manualmente
        function agregarCategoria() {
            const input = document.getElementById('nuevaCatNombre');
            const nombre = input.value.trim();
            if (!nombre) {
                alert('Escribe el nombre de la nueva categoría.');
                return;
            }
            const id = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
            if (categorias.some(c => c.id === id)) {
                alert('Esa categoría ya existe.');
                return;
            }
            categorias.push({ id, nombre });
            input.value = '';
            guardarCatalogo();
            renderSelectCategorias();
            renderTablaCategoriasAdmin();
            renderFiltros();
        }

        function eliminarCategoria(id) {
            if (productos.some(p => p.categoria === id)) {
                alert('No se puede eliminar: hay productos en esta categoría. Muévelos o elimínalos primero.');
                return;
            }
            categorias = categorias.filter(c => c.id !== id);
            guardarCatalogo();
            renderSelectCategorias();
            renderTablaCategoriasAdmin();
            renderFiltros();
        }

        function renderTablaCategoriasAdmin() {
            const tbody = document.getElementById('tablaCategoriasAdmin');
            tbody.innerHTML = categorias.map(c => `
                <tr>
                    <td>${c.nombre}</td>
                    <td>${productos.filter(p => p.categoria === c.id).length}</td>
                    <td><button class="btn-small" onclick="eliminarCategoria('${c.id}')">🗑 Eliminar</button></td>
                </tr>
            `).join('');
        }

        function agregarProducto() {
            const nombre = document.getElementById('nuevoProdNombre').value.trim();
            const categoria = document.getElementById('nuevoProdCategoria').value;
            const precio = parseFloat(document.getElementById('nuevoProdPrecio').value);
            const imagen = document.getElementById('nuevoProdImagen').value.trim();
            if (!nombre || isNaN(precio) || precio <= 0) {
                alert('Completa el nombre y un precio válido.');
                return;
            }
            productos.push({ id: Date.now(), nombre, categoria, precio, imagen });
            document.getElementById('nuevoProdNombre').value = '';
            document.getElementById('nuevoProdPrecio').value = '';
            document.getElementById('nuevoProdImagen').value = '';
            guardarCatalogo();
            renderTablaProductosAdmin();
            renderTablaCategoriasAdmin();
            renderProductos(productos);
        }

        function eliminarProducto(id) {
            const idx = productos.findIndex(p => p.id === id);
            if (idx > -1) productos.splice(idx, 1);
            window.carrito = window.carrito.filter(c => c.id !== id); // limpiar del carrito si estaba
            guardarCarrito(); // persiste el carrito sin el producto eliminado
            renderCarrito();
            guardarCatalogo();
            renderTablaProductosAdmin();
            renderTablaCategoriasAdmin();
            renderProductos(productos);
        }

        function renderTablaPedidosAdmin() {
            const tbody = document.getElementById('tablaPedidosAdmin');
            const sinPedidos = document.getElementById('sinPedidos');
            sinPedidos.style.display = pedidosRegistrados.length === 0 ? 'block' : 'none';
            tbody.innerHTML = pedidosRegistrados.map((pd, i) => `
                <tr>
                    <td>${pd.cliente}</td>
                    <td>${pd.producto}</td>
                    <td>S/ ${pd.precio.toFixed(2)}</td>
                    <td>${pd.entrega}</td>
                    <td><span class="badge-estado ${pd.estado === 'Confirmado' ? 'badge-confirmado' : 'badge-pendiente'}">${pd.estado}</span></td>
                    <td>${pd.estado === 'Pendiente' ? `<button class="btn-small" onclick="confirmarPedido(${i})">✔ Confirmar</button>` : ''}</td>
                </tr>
            `).join('');
        }

        function confirmarPedido(i) {
            pedidosRegistrados[i].estado = 'Confirmado';
            guardarPedidos();
            renderTablaPedidosAdmin();
        }

        // Registra la compra como UN solo pedido consolidado (todos los items y el total real)
        function registrarPedido(cliente, items, total, entrega, personalizacion, dedicatoria) {
            const detalle = items.map(c => `${c.nombre} x${c.cantidad}`).join(', ');
            pedidosRegistrados.push({
                cliente,
                producto: detalle,
                precio: total,
                entrega,
                personalizacion: personalizacion || '',
                dedicatoria: dedicatoria || '',
                fecha: new Date().toLocaleString(),
                estado: 'Pendiente'
            });
            guardarPedidos();
            if (modoAdministrador) renderTablaPedidosAdmin();
        }

        function renderProductos(lista) {
            const grid = document.getElementById('grid-productos');
            grid.innerHTML = '';
            lista.forEach(p => {
                const imagenHTML = p.imagen
                    ? `<img src="${p.imagen}" alt="${p.nombre}" onerror="this.parentElement.innerHTML='[ ${p.nombre} ]'">`
                    : `[ ${p.nombre} ]`;
                grid.innerHTML += `
                    <div class="product-card">
                        <div class="product-img">${imagenHTML}</div>
                        <div class="product-info">
                            <h3 class="product-title">${p.nombre}</h3>
                            <div class="product-price">S/ ${p.precio.toFixed(2)}</div>
                            <div class="card-actions">
                                <button class="btn-add-cart" onclick="agregarAlCarrito(${p.id})">🛒 Agregar</button>
                                <button class="btn-primary" style="animation:none;" onclick="comprarDirecto(${p.id})">Comprar ya</button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        function filterProducts(cat, btn) {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            if (cat === 'todos') {
                renderProductos(productos);
            } else {
                renderProductos(productos.filter(p => p.categoria === cat));
            }
        }

        // ===== CARRITO DE COMPRAS (persistido en localStorage) =====
        window.carrito = []; // [{ id, nombre, precio, cantidad }]
        try {
            const guardadoCarrito = JSON.parse(localStorage.getItem(KEY_CARRITO));
            if (Array.isArray(guardadoCarrito)) window.carrito = guardadoCarrito;
        } catch (e) { /* sin carrito guardado */ }

        function guardarCarrito() {
            localStorage.setItem(KEY_CARRITO, JSON.stringify(window.carrito));
        }

        // Sincroniza el carrito con el catalogo vigente (el admin pudo cambiar precios/nombres o eliminar productos)
        function sincronizarCarrito() {
            window.carrito = window.carrito.filter(c => productos.some(p => p.id === c.id));
            window.carrito.forEach(c => {
                const prod = productos.find(p => p.id === c.id);
                c.precio = prod.precio;
                c.nombre = prod.nombre;
            });
            guardarCarrito();
        }

        function agregarAlCarrito(id) {
            const prod = productos.find(p => p.id === id);
            if (!prod) return;
            const item = window.carrito.find(c => c.id === id);
            if (item) {
                item.cantidad++;
                item.precio = prod.precio; // sincroniza por si el admin cambio el precio
                item.nombre = prod.nombre;
            } else {
                window.carrito.push({ id: prod.id, nombre: prod.nombre, precio: prod.precio, cantidad: 1 });
            }
            guardarCarrito();
            renderCarrito();
            abrirCarrito();
        }

        function quitarDelCarrito(id) {
            window.carrito = window.carrito.filter(c => c.id !== id);
            guardarCarrito();
            renderCarrito();
        }

        function vaciarCarrito() {
            window.carrito = [];
            guardarCarrito();
            renderCarrito();
        }

        function cambiarCantidad(id, delta) {
            const item = window.carrito.find(c => c.id === id);
            if (!item) return;
            item.cantidad += delta;
            if (item.cantidad <= 0) {
                quitarDelCarrito(id);
                return;
            }
            guardarCarrito();
            renderCarrito();
        }

        function totalCarrito() {
            return window.carrito.reduce((sum, c) => sum + c.precio * c.cantidad, 0);
        }

        function renderCarrito() {
            const cont = document.getElementById('cartItems');
            const count = document.getElementById('cartCount');
            const totalEl = document.getElementById('cartTotal');
            const unidades = window.carrito.reduce((s, c) => s + c.cantidad, 0);
            count.textContent = unidades;
            totalEl.textContent = `S/ ${totalCarrito().toFixed(2)}`;

            if (window.carrito.length === 0) {
                cont.innerHTML = '<p class="cart-empty">Tu carrito está vacío.<br>¡Agrega tus detalles favoritos! 💝</p>';
                return;
            }
            cont.innerHTML = window.carrito.map(c => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${c.nombre}</h4>
                        <span class="cart-item-price">S/ ${c.precio.toFixed(2)} c/u</span>
                    </div>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="cambiarCantidad(${c.id}, -1)">−</button>
                        <span>${c.cantidad}</span>
                        <button class="qty-btn" onclick="cambiarCantidad(${c.id}, 1)">+</button>
                        <button class="btn-small" onclick="quitarDelCarrito(${c.id})">🗑</button>
                    </div>
                </div>
            `).join('');
        }

        function abrirCarrito() {
            document.getElementById('cartSidebar').classList.add('open');
            document.getElementById('cartOverlay').classList.add('show');
        }

        function cerrarCarrito() {
            document.getElementById('cartSidebar').classList.remove('open');
            document.getElementById('cartOverlay').classList.remove('show');
        }

        // Boton "Comprar ya": agrega el producto y abre el modal de finalizacion directamente
        function comprarDirecto(id) {
            if (modoAdministrador) {
                alert('Estás en modo Administrador. Para hacer una compra de prueba, presiona "Salir" primero.');
                return;
            }
            agregarAlCarrito(id);
            cerrarCarrito();          // cierra el panel lateral para no tapar el modal
            abrirModalCompra();       // abre directamente la finalizacion de compra
        }

        // Desde el carrito -> abrir modal de compra (el Cliente compra directamente, sin login)
        function irAComprar() {
            sincronizarCarrito();     // trae los precios/nombres vigentes del catalogo
            renderCarrito();
            if (window.carrito.length === 0) {
                alert('Tu carrito está vacío. Agrega productos antes de comprar. 🛒');
                return;
            }
            if (modoAdministrador) {
                alert('Estás en modo Administrador. Para hacer una compra de prueba, presiona "Salir" primero.');
                return;
            }
            cerrarCarrito();
            abrirModalCompra();
        }

        function abrirModalCompra() {
            const lista = document.getElementById('listaResumenCarrito');
            lista.innerHTML = window.carrito.map(c => `<li>${c.nombre} x${c.cantidad} — S/ ${(c.precio * c.cantidad).toFixed(2)}</li>`).join('');
            document.getElementById('totalResumenCarrito').textContent = `Total: S/ ${totalCarrito().toFixed(2)}`;
            document.getElementById('modalProductoNombre').textContent = 'Finaliza tu Compra 🛍️';
            document.getElementById('modalPedido').style.display = 'flex';
        }

        function cerrarModal() {
            document.getElementById('modalPedido').style.display = 'none';
        }

        function generarBoletaWhatsApp(e) {
            e.preventDefault();
            sincronizarCarrito(); // valida contra el catalogo vigente antes de cobrar
            if (window.carrito.length === 0) {
                alert('Tu carrito está vacío.');
                cerrarModal();
                return;
            }
            const cliente = document.getElementById('clienteNombre').value.trim();
            const personalizacion = document.getElementById('personalizarNombre').value.trim();
            const dedicatoria = document.getElementById('dedicatoria').value || "Sin dedicatoria";
            const entrega = document.getElementById('metodoEntrega').value;
            const tieneFoto = document.getElementById('adjuntaFoto').value;

            if (!cliente) {
                alert('Por favor escribe tu nombre completo para continuar con la compra. 🙂');
                document.getElementById('clienteNombre').focus();
                return;
            }
            if (!personalizacion) {
                alert('Indica el nombre o texto a personalizar en tu detalle.');
                document.getElementById('personalizarNombre').focus();
                return;
            }

            const total = totalCarrito();
            const detalleProductos = window.carrito.map(c => `   • ${c.nombre} x${c.cantidad} = S/ ${(c.precio * c.cantidad).toFixed(2)}`).join('\n');

            const mensaje =
`🧾 *BOLETA / RESUMEN DE COMPRA* 🧾
*Detalles Criss & más*
----------------------------------
👤 *Cliente:* ${cliente}
🛒 *Productos:*
${detalleProductos}
💰 *TOTAL:* S/ ${total.toFixed(2)}
🚚 *Entrega:* ${entrega}
----------------------------------
✏️ *Personalizado:* ${personalizacion}
💌 *Dedicatoria:* ${dedicatoria}
📸 *Foto:* ${tieneFoto}
----------------------------------
¡Hola! Quisiera realizar esta compra.`;

            // Registrar la compra como UN solo pedido consolidado para el administrador
            registrarPedido(cliente, window.carrito, total, entrega, personalizacion, dedicatoria);

            // Confirmacion ANTES de vaciar el carrito: si WhatsApp no se abre, el cliente conserva su compra
            const ventanaWA = window.open(`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`, '_blank');

            vaciarCarrito();
            document.getElementById('formPedido').reset();
            cerrarModal();

            if (!ventanaWA) {
                alert('⚠️ Tu navegador bloqueó la pestaña de WhatsApp.\nHabilita las ventanas emergentes y vuelve a presionar "Finalizar Compra" (tu carrito aún tendrá los productos si cancelas este aviso).');
                // Re-intentar una vez con enlace directo
                window.location.href = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
            } else {
                alert(`✅ ¡Compra registrada!\nTotal: S/ ${total.toFixed(2)}\nSe abrió WhatsApp con tu boleta para confirmar el pago y la entrega.`);
            }
        }

        renderProductos(productos);
        sincronizarCarrito(); // carrito guardado al dia con el catalogo actual
        renderCarrito();      // pintar contador/panel desde localStorage
