-- =====================================================================
--  BASE DE DATOS SQL SERVER — Tienda Online (Criss Artesanal)
--  Ejecutar en SSMS o con sqlcmd. Compatible con SQL Server 2016+
--  (y Azure SQL Database: comentar el bloque CREATE DATABASE si ya existe)
-- =====================================================================

IF DB_ID('tienda_db') IS NULL
BEGIN
    CREATE DATABASE tienda_db;
END
GO

USE tienda_db;
GO

-- ---------------------------------------------------------------------
-- TABLA: categorias  (apartados del catálogo, gestionadas por el admin)
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.categorias', 'U') IS NULL
CREATE TABLE dbo.categorias (
    id        INT IDENTITY(1,1) PRIMARY KEY,
    nombre    NVARCHAR(80) NOT NULL,
    creado_en DATETIME2 NOT NULL CONSTRAINT DF_cat_creado DEFAULT SYSDATETIME()
);
GO

-- nombre único (índice único = equivalente funcional al UNIQUE)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_categorias_nombre' AND object_id=OBJECT_ID('dbo.categorias'))
CREATE UNIQUE INDEX UX_categorias_nombre ON dbo.categorias(nombre);
GO

-- ---------------------------------------------------------------------
-- TABLA: productos
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.productos', 'U') IS NULL
CREATE TABLE dbo.productos (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    nombre       NVARCHAR(120) NOT NULL,
    categoria_id INT NOT NULL,
    precio       DECIMAL(10,2) NOT NULL CONSTRAINT CK_prod_precio CHECK (precio > 0),
    imagen       NVARCHAR(500) NOT NULL CONSTRAINT DF_prod_imagen DEFAULT '',
    descripcion  NVARCHAR(500) NOT NULL CONSTRAINT DF_prod_desc DEFAULT '',
    activo       BIT NOT NULL CONSTRAINT DF_prod_activo DEFAULT 1,   -- borrado lógico
    creado_en    DATETIME2 NOT NULL CONSTRAINT DF_prod_creado DEFAULT SYSDATETIME(),
    CONSTRAINT FK_productos_categorias FOREIGN KEY (categoria_id)
        REFERENCES dbo.categorias(id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_productos_categoria' AND object_id=OBJECT_ID('dbo.productos'))
CREATE INDEX IX_productos_categoria ON dbo.productos(categoria_id) INCLUDE (nombre, precio, imagen);
GO

-- ---------------------------------------------------------------------
-- TABLA: usuarios  (roles reales: cliente no necesita cuenta; admin sí)
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.usuarios', 'U') IS NULL
CREATE TABLE dbo.usuarios (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    usuario       NVARCHAR(50) NOT NULL,
    password_hash NVARCHAR(100) NOT NULL,          -- hash bcrypt (60 chars)
    rol           NVARCHAR(20) NOT NULL CONSTRAINT DF_user_rol DEFAULT 'admin'
                  CONSTRAINT CK_user_rol CHECK (rol IN ('admin')),
    creado_en     DATETIME2 NOT NULL CONSTRAINT DF_user_creado DEFAULT SYSDATETIME()
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_usuarios_usuario' AND object_id=OBJECT_ID('dbo.usuarios'))
CREATE UNIQUE INDEX UX_usuarios_usuario ON dbo.usuarios(usuario);
GO

-- ---------------------------------------------------------------------
-- TABLA: pedidos  (cabecera)
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.pedidos', 'U') IS NULL
CREATE TABLE dbo.pedidos (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    cliente     NVARCHAR(120) NOT NULL,
    telefono    NVARCHAR(30)  NOT NULL CONSTRAINT DF_ped_tel DEFAULT '',
    total       DECIMAL(10,2) NOT NULL CONSTRAINT CK_ped_total CHECK (total >= 0),
    dedicatoria NVARCHAR(500) NOT NULL CONSTRAINT DF_ped_ded DEFAULT '',
    entrega     NVARCHAR(500) NOT NULL CONSTRAINT DF_ped_ent DEFAULT '',
    codigo      NVARCHAR(40)  NULL CONSTRAINT UQ_ped_codigo UNIQUE, -- código público del comprobante PDF
    estado      NVARCHAR(20)  NOT NULL CONSTRAINT DF_ped_estado DEFAULT 'pendiente'
                CONSTRAINT CK_ped_estado CHECK (estado IN ('pendiente','confirmado','anulado')),
    creado_en   DATETIME2 NOT NULL CONSTRAINT DF_ped_creado DEFAULT SYSDATETIME()
);
GO

-- migración: agregar columna codigo si la tabla ya existía sin ella
IF COL_LENGTH('dbo.pedidos', 'codigo') IS NULL
    ALTER TABLE dbo.pedidos ADD codigo NVARCHAR(40) NULL CONSTRAINT UQ_ped_codigo UNIQUE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_pedidos_estado' AND object_id=OBJECT_ID('dbo.pedidos'))
CREATE INDEX IX_pedidos_estado ON dbo.pedidos(estado, creado_en DESC);
GO

-- ---------------------------------------------------------------------
-- TABLA: pedido_items  (detalle normalizado — reemplaza el JSON del prototipo)
-- El precio/nombre se COPIAN al momento de comprar (histórico inmutable
-- aunque el admin cambie el producto después). subtotal es calculada.
-- ---------------------------------------------------------------------
IF OBJECT_ID('dbo.pedido_items', 'U') IS NULL
CREATE TABLE dbo.pedido_items (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    pedido_id   INT NOT NULL,
    producto_id INT NOT NULL,
    nombre      NVARCHAR(120) NOT NULL,        -- snapshot del nombre
    cantidad    INT NOT NULL CONSTRAINT CK_pi_cant CHECK (cantidad >= 1),
    precio      DECIMAL(10,2) NOT NULL CONSTRAINT CK_pi_precio CHECK (precio >= 0),
    subtotal    AS (CAST(precio * cantidad AS DECIMAL(10,2))) PERSISTED, -- columna calculada
    CONSTRAINT FK_pedidoitems_pedidos   FOREIGN KEY (pedido_id)   REFERENCES dbo.pedidos(id) ON DELETE CASCADE,
    CONSTRAINT FK_pedidoitems_productos FOREIGN KEY (producto_id) REFERENCES dbo.productos(id)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_pedido_items_pedido' AND object_id=OBJECT_ID('dbo.pedido_items'))
CREATE INDEX IX_pedido_items_pedido ON dbo.pedido_items(pedido_id);
GO

PRINT '✔ Esquema de tienda_db listo.';
GO
