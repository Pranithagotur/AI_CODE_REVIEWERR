import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let mysqlPool: mysql.Pool | null = null;

export async function initDatabase(): Promise<void> {
  mysqlPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
  });

  const connection = await mysqlPool.getConnection();
  console.log("MySQL connected successfully");
  connection.release();
}

export function getPool() {
  if (!mysqlPool) {
    throw new Error("Database not initialized");
  }
  return mysqlPool;
}

export async function query(
  sql: string,
  params: any[] = []
): Promise<any> {
  if (!mysqlPool) {
    throw new Error("Database not initialized");
  }

  const [rows] = await mysqlPool.execute(sql, params);
  return rows;
}