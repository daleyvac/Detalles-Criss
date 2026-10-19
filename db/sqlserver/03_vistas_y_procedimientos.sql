-- =====================================================================
--  VISTAS Y PROCEDIMIENTOS ALMACENADOS — API de datos SQL Server
--  El backend Node llama SOLO a estos objetos (capa de acceso limpia).
-- =====================================================================
USE tienda_db;
GO

-- ---------------------------------------------------------------------
-- VISTA: vw_catalogo — productos activos con su categoría (GET /productos)
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.vw_catalogo', 'V') IS NOT NULL DROP VIEW dbo.vw_catalogo;
GO
CREATE VIEW dbo.vw_catalogo AS
SELECT p.id, p.nombre, p.categoria_id, c.nombre AS categoria,
       p.precio, p.imagen, p.descripcion
FROM   dbo.productos p
JOIN   dbo.categorias c ON c.id = p.categoria_id
WHERE  p.activo = 1;
GO

-- ---------------------------------------------------------------------
-- SP: sp_crear_pedido — registra pedido + items en UNA transacción.
-- Recalcula precio/total desde la BD (nunca confía en el front).
-- Devuelve el id del pedido y su total confirmado.
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.sp_crear_pedido', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_crear_pedido;
GO
CREATE PROCEDURE dbo.sp_crear_pedido
    @cliente     NVARCHAR(120),
    @telefono    NVARCHAR(30)  = '',
    @dedicatoria NVARCHAR(500) = '',
    @entrega     NVARCHAR(500) = '',
    @items_json  NVARCHAR(MAX)            -- [{"id":1,"cantidad":2}, ...]
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF LTRIM(RTRIM(@cliente)) = '' THROW 50001, 'Nombre del cliente requerido', 1;
    IF @items_json IS NULL OR @items_json = '' OR @items_json = '[]'
        THROW 50002, 'El carrito está vacío', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Tabla temporal con los items solicitados
        DECLARE @sel TABLE (producto_id INT NOT NULL, cantidad INT NOT NULL);
        INSERT INTO @sel (producto_id, cantidad)
        SELECT j.id, CASE WHEN j.cantidad < 1 THEN 1 ELSE j.cantidad END
        FROM OPENJSON(@items_json)
             WITH (id INT '$.id', cantidad INT '$.cantidad') j;

        -- Validar que TODOS existan y estén activos (fallback al precio real)
        IF EXISTS (SELECT 1 FROM @sel s
                   LEFT JOIN dbo.productos p ON p.id = s.producto_id AND p.activo = 1
                   WHERE p.id IS NULL)
            THROW 50003, 'Uno o más productos no están disponibles', 1;

        DECLARE @total DECIMAL(10,2) =
            (SELECT SUM(CAST(p.precio * s.cantidad AS DECIMAL(10,2)))
             FROM @sel s JOIN dbo.productos p ON p.id = s.producto_id);

        INSERT INTO dbo.pedidos (cliente, telefono, total, dedicatoria, entrega)
        VALUES (LTRIM(RTRIM(@cliente)), @telefono, @total, @dedicatoria, @entrega);

        DECLARE @pedido_id INT = CAST(SCOPE_IDENTITY() AS INT);
        DECLARE @codigo NVARCHAR(40) = 'PDD-' + FORMAT(SYSDATETIME(), 'yyyyMMddHHmmssfff') + '-' + CAST(@pedido_id AS NVARCHAR(10));
        UPDATE dbo.pedidos SET codigo = @codigo WHERE id = @pedido_id;

        INSERT INTO dbo.pedido_items (pedido_id, producto_id, nombre, cantidad, precio)
        SELECT @pedido_id, p.id, p.nombre, s.cantidad, p.precio
        FROM @sel s JOIN dbo.productos p ON p.id = s.producto_id;

        COMMIT;
        SELECT @pedido_id AS id, @total AS total, @codigo AS codigo;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END;
GO

-- ---------------------------------------------------------------------
-- SP: sp_listar_pedidos — pedidos con detalle (panel admin)
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.sp_listar_pedidos', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_listar_pedidos;
GO
CREATE PROCEDURE dbo.sp_listar_pedidos
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.id, p.cliente, p.telefono, p.total, p.dedicatoria, p.entrega,
           p.estado, p.creado_en,
           ISNULL((
             SELECT i.producto_id AS id, i.nombre, i.cantidad, i.precio, i.subtotal
             FROM dbo.pedido_items i
             WHERE i.pedido_id = p.id
             FOR JSON PATH
           ), '[]') AS detalle
    FROM dbo.pedidos p
    ORDER BY p.id DESC;
END;
GO

-- ---------------------------------------------------------------------
-- SP: sp_actualizar_estado_pedido — pendiente | confirmado | anulado
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.sp_actualizar_estado_pedido', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_actualizar_estado_pedido;
GO
CREATE PROCEDURE dbo.sp_actualizar_estado_pedido
    @id     INT,
    @estado NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    IF @estado NOT IN ('pendiente','confirmado','anulado')
        THROW 50004, 'Estado inválido', 1;
    UPDATE dbo.pedidos SET estado = @estado WHERE id = @id;
    IF @@ROWCOUNT = 0 THROW 50005, 'Pedido no encontrado', 1;
END;
GO

PRINT '✔ Vistas y procedimientos listos.';
GO
