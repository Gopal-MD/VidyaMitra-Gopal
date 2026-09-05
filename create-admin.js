// Run this script to create admin user in Firestore
// Usage: node create-admin.js

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: "mockmate-ai-interview",
};

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "mockmate-ai-interview"
});

const db = admin.firestore();

async function createAdminUser() {
  try {
    // Get the admin user UID from Authentication
    const adminEmail = 'admin@mockmate.com';
    
    console.log('🔍 Looking for admin user in Authentication...');
    const userRecord = await admin.auth().getUserByEmail(adminEmail);
    console.log('✅ Found admin user:', userRecord.uid);
    
    // Create admin document in Firestore
    console.log('📝 Creating admin document in Firestore...');
    await db.collection('users').doc(userRecord.uid).set({
      email: adminEmail,
      isAdmin: true,
      name: 'Admin User',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Admin user document created successfully!');
    console.log('👤 User ID:', userRecord.uid);
    console.log('📧 Email:', adminEmail);
    console.log('🔐 Admin privileges: Enabled');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
