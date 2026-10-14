
// LISTA DE PRODUCTOS DE MUESTRA
const productos = [
    { id: 1, nombre: "Cuadro Fotográfico Personalizado", categoria: "cuadros", precio: 45.00 },
    { id: 2, nombre: "Caja de Chocotejas Artesanales x12", categoria: "chocotejas", precio: 30.00 },
    { id: 3, nombre: "Box Sorpresa Cumpleaños", categoria: "sorpresa", precio: 85.00 },
    { id: 4, nombre: "Arreglo Floral Hecho a Mano", categoria: "arreglos", precio: 60.00 },
    { id: 5, nombre: "Peluche + Detalle Personalizado", categoria: "juguetes", precio: 55.00 },
    { id: 6, nombre: "Detalle Tallado en Madera", categoria: "personalizados", precio: 40.00 }
];

const numeroWhatsApp = "51901239388"; // CAMBIAR POR TU NÚMERO REAL CON CÓDIGO DE PAÍS

function renderProductos(lista) {
    const grid = document.getElementById('grid-productos');
    grid.innerHTML = '';
    lista.forEach(p => {
        grid.innerHTML += `
                    <div class="product-card">
                        <div class="product-img">[ Imagen de ${p.nombre} ]</div>
                        <div class="product-info">
                            <h3 class="product-title">${p.nombre}</h3>
                            <div class="product-price">S/ ${p.precio.toFixed(2)}</div>
                            <button class="btn-primary" onclick="abrirModal('${p.nombre}', ${p.precio})">Personalizar y Comprar</button>
                        </div>
                    </div>
                `;
    });
}

function filterProducts(cat) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (cat === 'todos') {
        renderProductos(productos);
    } else {
        const filtrados = productos.filter(p => p.categoria === cat);
        renderProductos(filtrados);
    }
}

function abrirModal(nombre, precio) {
    document.getElementById('modalProductoNombre').innerText = `Personalizar: ${nombre}`;
    document.getElementById('productoSeleccionado').value = nombre;
    document.getElementById('precioSeleccionado').value = precio;
    document.getElementById('modalPedido').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modalPedido').style.display = 'none';
}

function generarBoletaWhatsApp(e) {
    e.preventDefault();

    const producto = document.getElementById('productoSeleccionado').value;
    const precio = document.getElementById('precioSeleccionado').value;
    const cliente = document.getElementById('clienteNombre').value;
    const personalizacion = document.getElementById('personalizarNombre').value;
    const dedicatoria = document.getElementById('dedicatoria').value || "Sin dedicatoria";
    const entrega = document.getElementById('metodoEntrega').value;
    const tieneFoto = document.getElementById('fotoAdjunta').files.length > 0 ? "Sí (adjuntaré la foto en este chat)" : "No";

    const mensaje =
        `💐 *BOLETA / RESUMEN DE PEDIDO* 💐
*Detalles Criss & más*
----------------------------------
👤 *Cliente:* ${cliente}
🎁 *Producto:* ${producto}
💰 *Precio:* S/ ${parseFloat(precio).toFixed(2)}
🚚 *Modo de Entrega:* ${entrega}
----------------------------------
✏️ *Personalización (Nombres/Texto):* ${personalizacion}
💌 *Dedicatoria:* ${dedicatoria}
📸 *Adjunta Foto:* ${tieneFoto}
----------------------------------
¡Hola! Me gustaría confirmar este pedido.`;

    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
    cerrarModal();
}

// Cargar productos al iniciar
renderProductos(productos);


// Ejemplo Practica
const botonReservar = document.querySelector("#boton-reservar");
const contadorTazas = document.querySelector("#contador-tazas");

botonReservar.addEventListener("click", function() {
    const tazasActuales = Number(contadorTazas.textContent);
    if (puedeReservar(tazasActuales)) {
        contadorTazas.textContent = tazasActuales -1;
    } else {
        botonReservar.textContent = "Sin cupos de Reserva";
        botonReservar.display = true;
    }
});