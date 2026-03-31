const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('MongoDB Connected');
  
  // Check if admin exists
  const adminExists = await User.findOne({ role: 'admin' });
  if (adminExists) {
    console.log('Admin user already exists');
    process.exit();
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('eeswar@2711', salt);

  const adminUser = new User({
    username: 'eeswar',
    password: hashedPassword,
    role: 'admin'
  });

  await adminUser.save();
  console.log('Admin user seeded: eeswar / eeswar@2711');
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
