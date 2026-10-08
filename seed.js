/**
 * LUXE HAUS - Database Seed Script
 * Creates default Head Admin and sample Branch Admin credentials
 * 
 * Run: node seed.js
 * 
 * Default Head Admin Credentials:
 *   Email:    admin@luxehaus.com
 *   Password: admin123
 *
 * Sample Branch Admin Credentials:
 *   Email:    branch1@luxehaus.com
 *   Password: branch123
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();

const seedDB = async () => {
  try {
    await connectDB();
    console.log('[Seed] Connected to MongoDB');

    // ─── 1. Create Head Admin ───────────────────────────────
    const existingHeadAdmin = await User.findOne({ role: 'head_admin' });
    if (existingHeadAdmin) {
      console.log('[Seed] Head Admin already exists:', existingHeadAdmin.email);
    } else {
      const headAdmin = await User.create({
        name: 'Head Admin',
        email: 'admin@luxehaus.com',
        loginId: 'admin@luxehaus.com',
        password: 'admin123',
        phone: '9999999999',
        role: 'head_admin',
        active: true
      });
      console.log('[Seed] ✅ Head Admin created');
      console.log('       Email:    admin@luxehaus.com');
      console.log('       Password: admin123');
    }

    // ─── 2. Create Sample Branch + Branch Admin ─────────────
    let sampleBranch = await Branch.findOne({ code: 'BR-MAIN' });
    if (!sampleBranch) {
      sampleBranch = await Branch.create({
        name: 'Luxe Haus - Main Street',
        code: 'BR-MAIN',
        city: 'Mumbai',
        address: '123 Main Street, Andheri West, Mumbai 400058',
        phone: '9876543210',
        email: 'mainstreet@luxehaus.com',
        status: 'active',
        openingTime: '09:00',
        closingTime: '20:00',
        chairs: 10
      });
      console.log('[Seed] ✅ Sample Branch created: Luxe Haus - Main Street');
    } else {
      console.log('[Seed] Sample branch already exists:', sampleBranch.name);
    }

    const existingBranchAdmin = await User.findOne({ email: 'branch1@luxehaus.com' });
    if (existingBranchAdmin) {
      console.log('[Seed] Branch Admin already exists:', existingBranchAdmin.email);
    } else {
      const branchAdmin = await User.create({
        name: 'Branch Admin',
        email: 'branch1@luxehaus.com',
        loginId: 'branch1@luxehaus.com',
        password: 'branch123',
        phone: '9876543211',
        role: 'branch_admin',
        branch: sampleBranch._id,
        active: true
      });

      // Link admin to branch
      sampleBranch.admin = branchAdmin._id;
      await sampleBranch.save();

      console.log('[Seed] ✅ Branch Admin created');
      console.log('       Email:    branch1@luxehaus.com');
      console.log('       Password: branch123');
      console.log('       Branch:   Luxe Haus - Main Street');
    }

    // ─── 3. Create Sample Customer ──────────────────────
    const existingCustomer = await User.findOne({ email: 'customer@gmail.com' });
    if (existingCustomer) {
      console.log('[Seed] Customer already exists:', existingCustomer.email);
    } else {
      await User.create({
        name: 'Sophia Laurent',
        email: 'customer@gmail.com',
        loginId: 'customer@gmail.com',
        password: 'customer123',
        phone: '9819988776',
        role: 'customer',
        memberTier: 'Regular Customer',
        loyaltyPoints: 480,
        active: true
      });
      console.log('[Seed] ✅ Sample Customer created');
      console.log('       Email:    customer@gmail.com');
      console.log('       Password: customer123');
    }

    console.log('\n[Seed] 🎉 Database seeding complete!');
    console.log('─'.repeat(50));
    console.log('  Head Admin Login:');
    console.log('    Email:    admin@luxehaus.com');
    console.log('    Password: admin123');
    console.log('');
    console.log('  Branch Admin Login:');
    console.log('    Email:    JR@luxehaus.in');
    console.log('    Password: branch123');
    console.log('');
    console.log('  Customer Login:');
    console.log('    Email:    customer@gmail.com');
    console.log('    Password: customer123');
    console.log('─'.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('[Seed] ❌ Error:', error.message);
    process.exit(1);
  }
};

seedDB();
