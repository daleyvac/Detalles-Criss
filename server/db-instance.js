// Instancia única de la capa de datos (SQLite por defecto, SQL Server con DB_DRIVER=mssql)
module.exports = require('./db')();
