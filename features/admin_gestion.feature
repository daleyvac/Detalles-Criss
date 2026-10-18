# language: es
Característica: Panel de administrador - gestión de catálogo
  Como administrador autenticado
  Quiero cambiar precios, descripciones y agregar productos
  Para mantener el catálogo actualizado sin tocar el código

  Antecedentes:
    Dado que el servidor de la tienda está en ejecución
    Y inicié sesión como administrador con "admin" y "admin123"

  Escenario: Iniciar sesión correctamente muestra el panel
    Cuando abro el catálogo
    Entonces veo el botón "Salir" del modo administrador
    Y puedo acceder al panel de gestión

  Escenario: Cambiar el precio de un producto se refleja en el catálogo
    Dado que el producto "Bomba de Baño Artesanal" cuesta "S/ 25.00"
    Cuando edito su precio a "S/ 30.00" desde el panel
    Entonces el catálogo muestra "S/ 30.00" para ese producto
    Y el carrito recalcula los totales con el nuevo precio

  Escenario: Cambiar la descripción de un producto
    Cuando edito la descripción de "Set Relax" a "Incluye bomba, vela y sales"
    Entonces el catálogo muestra la nueva descripción
    Y el cambio persiste tras recargar la página

  Escenario: Agregar un producto nuevo
    Cuando creo un producto con nombre "Vela Aromatizada", categoría "Velas", precio "S/ 18.00" e imagen válida
    Entonces el producto aparece en el catálogo con sus datos
    Y queda disponible para agregar al carrito

  Escenario: Un cliente no puede gestionar el catálogo
    Dado que cierro sesión como administrador
    Cuando intento actualizar el precio de un producto vía API sin token
    Entonces la API responde con estado 403
    Y ningún dato del catálogo cambia

  Escenario: Validaciones de datos al crear o editar productos
    Cuando intento guardar un producto con precio "-5"
    Entonces la API rechaza la operación con un mensaje de error de validación
    Y el catálogo permanece intacto
