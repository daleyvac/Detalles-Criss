# language: es
Característica: Comprobante PDF del pedido
  Como cliente que confirma una compra
  Quiero un comprobante PDF accesible mediante enlace en WhatsApp
  Para tener constancia formal de mi pedido

  Escenario: El PDF contiene el detalle completo del pedido
    Dado que realicé una compra con 2 productos distintos
    Cuando obtengo el enlace público del comprobante enviado a WhatsApp
    Y descargo el PDF desde ese enlace
    Entonces el PDF muestra el código del pedido
    Y lista cada producto con nombre, cantidad, precio unitario y subtotal
    Y muestra el total general del pedido
    Y muestra los datos de contacto del cliente registrados en la compra

  Escenario: El monto del PDF es el recalculado por el servidor
    Dado que el carrito del cliente enviaba precios manipulados
    Cuando confirmo la compra
    Entonces el PDF refleja exclusivamente los precios vigentes en la base de datos

  Escenario: Enlace inválido no expone otros comprobantes
    Cuando solicito un PDF con un código de pedido inexistente
    Entonces el servidor responde con estado 404
    Y no se devuelve ningún documento
