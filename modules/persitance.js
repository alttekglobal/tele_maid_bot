const sqlite3 = require('sqlite3').verbose();
const pkg = require('../package.json');

const connection = `${pkg.name}-${pkg.version}.db`;
const mode = sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;

const db = new sqlite3.Database(connection, mode, err => {
    if (err) {
        console.error(err.message);
    }
    console.log(`Connected to ${connection}`);
  });
db.run('CREATE TABLE IF NOT EXISTS tokens(id text PRIMARY KEY, token text NOT NULL, signing_key text NOT NULL, date_created text, date_modified text)');

process.on('SIGINT', () => {
    db.close();
});

module.exports = {
    db, mode,
}