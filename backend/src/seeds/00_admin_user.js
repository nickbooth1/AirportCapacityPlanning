/**
 * Initial admin user seed
 */

const crypto = require('crypto');

// Generate a password hash for the admin user
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

exports.seed = async function(knex) {
  // Check if the users table exists
  try {
    const tableExists = await knex.schema.hasTable('users');
    if (!tableExists) {
      console.log('Users table does not exist, skipping admin user seed');
      return;
    }

    // Check if admin user already exists
    const existingUsers = await knex('users').where('username', 'admin');
    
    if (existingUsers.length === 0) {
      // Create admin user
      await knex('users').insert({
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        password_hash: hashPassword('admin123'),
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists, skipping seed');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
};