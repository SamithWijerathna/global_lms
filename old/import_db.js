import fs from 'fs';
import mysql from 'mysql2/promise';

async function main() {
  try {
    const rawSql = fs.readFileSync('E:/ssd_Data/Office Work/rhem/admin/rchemlms_admin/rchem_main.sql', 'utf8');
    
    // Replace DB references
    const cleanedSql = rawSql.replace(/`rchem_main`/g, '`cloudwave_lms`').replace(/rchem_main/g, 'cloudwave_lms');
    
    const fullDump = 'CREATE DATABASE IF NOT EXISTS `cloudwave_lms`;\nUSE `cloudwave_lms`;\n' + cleanedSql;
    fs.writeFileSync('cloudwave_lms.sql', fullDump);
    console.log('Created cloudwave_lms.sql dump file.');

    // Connect to port 3307
    let conn;
    try {
      conn = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3307,
        user: 'root',
        password: '',
        multipleStatements: true
      });
      console.log('Connected to MySQL on port 3307');
    } catch (e) {
      conn = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        multipleStatements: true
      });
      console.log('Connected to MySQL on port 3306');
    }

    await conn.query('CREATE DATABASE IF NOT EXISTS `cloudwave_lms`;');
    await conn.query('USE `cloudwave_lms`;');
    await conn.query(cleanedSql);
    console.log('Database cloudwave_lms tables & data successfully imported!');

    const [tables] = await conn.query('SHOW TABLES;');
    console.log('Tables created:', tables.map((t) => Object.values(t)[0]));

    await conn.end();
  } catch (err) {
    console.error('Error during DB setup:', err);
  }
}

main();
