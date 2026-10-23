const { DatabaseSync } = require('node:sqlite');

class DatabaseLayer {
  constructor(path) {
    this.driver = 'sqlite';
    this.db = new DatabaseSync(path);
  }

  // This wrapper allows us to switch to PG later without changing app logic
  prepare(sql, ...params) {
    return this.db.prepare(sql);
  }
  
  exec(sql) {
    return this.db.exec(sql);
  }
}

module.exports = DatabaseLayer;
