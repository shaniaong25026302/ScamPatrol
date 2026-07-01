const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "yy3xxq.h.filess.io",
  port: 3307,
  user: "devops_readyfurof",
  password: "a636c757e068042ec2ed9058142a52b30985fd14",
  database: "devops_readyfurof",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
