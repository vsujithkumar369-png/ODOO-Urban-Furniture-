const { pool } = require('./src/db');
async function audit() {
  const usersCols = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users'");
  const contactsCols = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contacts'");
  const constraints = await pool.query("SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid IN ('users'::regclass, 'contacts'::regclass)");
  const indexes = await pool.query("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE tablename IN ('users', 'contacts')");
  
  console.log('--- USERS COLUMNS ---'); console.log(JSON.stringify(usersCols.rows, null, 2));
  console.log('--- CONTACTS COLUMNS ---'); console.log(JSON.stringify(contactsCols.rows, null, 2));
  console.log('--- CONSTRAINTS ---'); console.log(JSON.stringify(constraints.rows, null, 2));
  console.log('--- INDEXES ---'); console.log(JSON.stringify(indexes.rows, null, 2));
  process.exit(0);
}
audit().catch(err => { console.error(err); process.exit(1); });
