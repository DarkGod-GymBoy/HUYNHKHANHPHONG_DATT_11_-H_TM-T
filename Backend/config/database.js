const sql = require("mssql");


const dbConfig = {
    server: process.env.DB_SERVER, 
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    options: {
        encrypt: false,
        trustServerCertificate: true,
    },

    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool;

const connectDB = async () => {
    try {
        pool = await sql.connect(dbConfig);
        console.log("✅ SQL Server Connected successfully");
        return pool;
    } catch (error) {
        console.error("❌ SQL Server Connection Failed");
        console.error(error);
        process.exit(1);
    }
};

const getPool = () => {
    if (!pool) {
        throw new Error("Database chưa được kết nối");
    }
    return pool;
};

module.exports = {
    sql,
    connectDB,
    getPool
};