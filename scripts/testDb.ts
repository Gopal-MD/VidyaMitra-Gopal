import { DB } from '../server/database.ts';

async function main() {
  console.log('DB type:', DB.type);
  const users = await DB.all('SELECT id, email, name FROM users LIMIT 3', []);
  console.log('Users:', users.length, 'rows');
  const admin = await DB.get('SELECT email, name FROM users WHERE email = ?', ['admin@vidyamitra.com']);
  console.log('Admin:', admin?.name);
  console.log('✅ All DB operations working!');
  process.exit(0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
