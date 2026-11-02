require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || '';
const isLocalDevelopment =
  /127\.0\.0\.1|localhost/.test(uri) &&
  uri.toLowerCase().endsWith('/petsmandi') &&
  process.env.ALLOW_DEV_DATABASE_RESET === 'true';

async function main() {
  if (!isLocalDevelopment) {
    throw new Error('Refusing reset: target must be local development database and ALLOW_DEV_DATABASE_RESET=true.');
  }
  await mongoose.connect(uri);
  const collections = ['users', 'emailotps', 'pets', 'purchaserequests', 'orders', 'paymentrequests', 'notifications', 'messages', 'wishlists', 'tickets', 'reviews', 'reports'];
  for (const name of collections) {
    if ((await mongoose.connection.db.listCollections({ name }).toArray()).length) {
      await mongoose.connection.db.collection(name).deleteMany({});
      console.log(`Cleared ${name}`);
    }
  }
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
