import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smartglass',
  waitForConnections: true,
  connectionLimit: 10,
});

export async function saveJob(job) {
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.execute(
      `INSERT INTO jobs (name, sheet_width, sheet_height, allow_rotation, pieces_json, best_layout_json, waste_percent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        job.name,
        job.sheet.width,
        job.sheet.height,
        job.allowRotation ? 1 : 0,
        JSON.stringify(job.pieces),
        JSON.stringify(job.bestLayout),
        job.bestLayout.wastePercent,
      ]
    );
    return result.insertId;
  } finally {
    conn.release();
  }
}

export async function getJobs() {
  const [rows] = await pool.query('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50');
  return rows;
}
