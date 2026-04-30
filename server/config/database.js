const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { require: true }
});

module.exports = {
    execute: async (sql, params = []) => {
        let i = 1;
        let pgSql = sql.replace(/\?/g, () => `$${i++}`);

        const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
        if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
            pgSql += ' RETURNING id';
        }
        
        const result = await pool.query(pgSql, params);
        
        let rows = result.rows;
        if (isInsert) {
            rows = { insertId: result.rows[0]?.id };
        } else if (pgSql.trim().toUpperCase().startsWith('UPDATE') || pgSql.trim().toUpperCase().startsWith('DELETE')) {
            rows = { affectedRows: result.rowCount };
        }
        
        return [rows, result.fields];
    },
    pool
};
