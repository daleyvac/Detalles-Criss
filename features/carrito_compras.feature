# language: es
Característica: Carrito de compras y finalización por WhatsApp
  Como cliente (rol invitado automático)
  Quiero agregar productos a un carrito y confirmar la compra
  Para recibir un comprobante PDF y coordinar el pago por WhatsApp

  Antecedentes:
    Dado que el servidor de la tienda está en ejecución
    Y la base de datos contiene al menos 2 productos con precio vigente

  Escenario: El visitante es cliente automáticamente sin iniciar sesión
    Cuando abro la página del catálogo
    Entonces veo el badge "Cliente" en el encabezado
    Y no se me solicita ningún login para navegar el catálogo

  Escenario: Agregar un producto al carrito incrementa el contador
    Dado que mi carrito está vacío
    Cuando hago clic en "Agregar" del producto "Bomba de Baño Artesanal"
    Entonces el contador del carrito muestra 1 unidad
    Y el total del carrito es igual al precio del producto

  Escenario: Agregar el mismo producto varias veces suma cantidad
    Cuando agrego "Bomba de Baño Artesanal" al carrito 3 veces
    Entonces el carrito muestra una línea con cantidad 3
    Y el total es 3 veces el precio unitario vigente

  Escenario: Ajustar cantidades desde el carrito lateral
    Dado que tengo 2 unidades de "Set Relax" en el carrito
    Cuando reduzco la cantidad a 1 desde el carrito
    Entonces el total del carrito se recalcula con 1 unidad

  Escenario: Confirmar compra genera comprobante PDF y abre WhatsApp con enlace
    Dado que mi carrito contiene 1 "Bomba de Baño Artesanal" y 2 "Set Relax"
    Cuando hago clic en el botón "Confirmar compra"
    Entonces el sistema registra el pedido en la base de datos
    Y se genera un comprobante PDF descargable en el servidor
    Y se abre WhatsApp con el mensaje que incluye el enlace público al PDF
    Y el monto del pedido es recalculado en el servidor según precios vigentes
    Y mi carrito queda vacío tras la confirmación

  Escenario: No se puede confirmar una compra con el carrito vacío
    Dado que mi carrito está vacío
    Cuando intento confirmar la compra
    Entonces veo el aviso "Tu carrito está vacío"
    Y no se crea ningún pedido

  Escenario: Persistencia del carrito entre sesiones
    Dado que agregué 1 producto al carrito
    Cuando recargo la página
    Entonces el carrito conserva el producto y el total previo
