import { DatabaseSync } from 'node:sqlite';

const source = process.env.DB_PATH;
const destination = process.env.SNAPSHOT_PATH;
if (!source || !destination) throw new Error('DB_PATH and SNAPSHOT_PATH are required');

const db = new DatabaseSync(source);
try {
  const escapedDestination = destination.replaceAll("'", "''");
  db.exec(`VACUUM INTO '${escapedDestination}'`);
} finally {
  db.close();
}
