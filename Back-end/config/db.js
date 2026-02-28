import mysql from 'mysql2';

const db = mysql.createConnection({
  host: 'localhost',
  user: 'userName',
  password: 'password',
  database: 'nodeProject',   // Replace with your actual database name and 2 tables: users and admins
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the MySQL database.');
});

export default db;