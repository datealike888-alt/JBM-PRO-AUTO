const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.log('Usage: node scripts/generate-admin-hash.cjs <password>');
  process.exit(1);
}

try {
  const hash = bcrypt.hashSync(password, 10);
  console.log('Plaintext password:', password);
  console.log('Bcrypt hash:       ', hash);
} catch (error) {
  console.error('Error generating hash:', error);
  process.exit(1);
}
