-- =====================================================================
--  DATOS SEMILLA — Tienda Online (idempotente: se puede ejecutar varias veces)
-- =====================================================================
USE tienda_db;
GO

-- Categorías (apartados del catálogo)
IF NOT EXISTS (SELECT 1 FROM dbo.categorias)
INSERT INTO dbo.categorias (nombre) VALUES
    ('Bombas de Baño'),
    ('Sets de Regalo'),
    ('Velas Aromatizadas');
GO

-- Productos de ejemplo
IF NOT EXISTS (SELECT 1 FROM dbo.productos)
INSERT INTO dbo.productos (nombre, categoria_id, precio, imagen, descripcion) VALUES
    ('Bomba de Baño Lavanda', 1, 12.00, '', 'Bomba efervescente artesanal'),
    ('Bomba de Baño Rosa',    1, 12.00, '', 'Con manteca de karité'),
    ('Set Spa Completo',      2, 45.00, '', 'Bomba + vela + sales'),
    ('Set Cumpleaños',        2, 35.00, '', 'Personalizable con dedicatoria'),
    ('Vela Vainilla',         3, 18.00, '', 'Cera de soja, 30h de duración'),
    ('Vela Lavanda',          3, 18.00, '', 'Cera de soja, 30h de duración');
GO

-- Usuario administrador semilla.
-- Hash bcrypt de la contraseña "admin123" (costo 10).
-- ⚠ IMPORTANTE: en producción genera uno nuevo con:
--    node -e "console.log(require('bcryptjs').hashSync('TU_CLAVE',10))"
-- y reemplázalo aquí, o usa el endpoint/semilla del servidor Node.
IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE usuario = 'admin')
INSERT INTO dbo.usuarios (usuario, password_hash, rol)
VALUES ('admin', '$2b$10$s.4GE4LzWt9yf4L4gdkEoOsC6JuUYBClnw2.QTjhIQwhzyshYX1Py', 'admin');
GO

PRINT '✔ Semilla de datos lista.';
GO
