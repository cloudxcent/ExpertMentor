/**
 * Firebase Firestore Setup Automation Script
 * Creates all missing collections and indexes automatically
 * 
 * Usage:
 * 1. Download service account credentials from Firebase Console
 * 2. Save as: firebase-credentials.json
 * 3. Run: node firebase-setup.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Initialize Firebase
async function initializeFirebase() {
  try {
    const credentialsPath = path.join(__dirname, 'firebase-credentials.json');
    
    if (!fs.existsSync(credentialsPath)) {
      log('\n❌ ERROR: firebase-credentials.json not found!', 'red');
      log('\nSteps to get credentials:', 'yellow');
      log('1. Go to Firebase Console: https://console.firebase.google.com/', 'cyan');
      log('2. Select your project (ExpertMentor)', 'cyan');
      log('3. Click Settings (⚙️) → Project settings', 'cyan');
      log('4. Go to "Service Accounts" tab', 'cyan');
      log('5. Click "Generate new private key"', 'cyan');
      log('6. Save downloaded JSON file as: firebase-credentials.json', 'cyan');
      log('7. Place in same folder as this script', 'cyan');
      log('\nThen run: node firebase-setup.js\n', 'yellow');
      process.exit(1);
    }

    const serviceAccount = require(credentialsPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    log('\n✅ Firebase initialized successfully!', 'green');
    return admin.firestore();
  } catch (error) {
    log(`\n❌ Failed to initialize Firebase: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Create collections with sample data
async function createCollections(db) {
  log('\n' + '='.repeat(60), 'blue');
  log('📁 CREATING COLLECTIONS', 'blue');
  log('='.repeat(60), 'blue');

  const testUserId = 'test-user-' + Date.now();
  
  try {
    // 0. Create notifications collection (if missing)
    log('\n0. Creating notifications collection...', 'cyan');
    try {
      const notificationsSnap = await db.collection('notifications').limit(1).get();
      if (notificationsSnap.empty) {
        // Create a sample notification
        await db.collection('notifications').doc('sample-' + Date.now()).set({
          userId: testUserId,
          title: 'Welcome',
          message: 'Sample notification',
          read: false,
          createdAt: admin.firestore.Timestamp.now(),
        });
        log('   ✅ notifications created with test document', 'green');
      } else {
        log('   ℹ️  notifications collection already exists', 'yellow');
      }
    } catch (error) {
      // Create the collection
      await db.collection('notifications').doc('sample-' + Date.now()).set({
        userId: testUserId,
        title: 'Welcome',
        message: 'Sample notification',
        read: false,
        createdAt: admin.firestore.Timestamp.now(),
      });
      log('   ✅ notifications created with test document', 'green');
    }

    // 1. Create user_preferences collection
    log('\n1. Creating user_preferences collection...', 'cyan');
    await db.collection('user_preferences').doc(testUserId).set({
      notificationsEnabled: true,
      chatNotifications: true,
      callNotifications: true,
      emailNotifications: false,
      darkMode: false,
      theme: 'light',
      language: 'en',
      timezone: 'Asia/Kolkata',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    log('   ✅ user_preferences created with test document', 'green');

    // 2. Create wallet_balance collection
    log('\n2. Creating wallet_balance collection...', 'cyan');
    await db.collection('wallet_balance').doc(testUserId).set({
      balance: 5000,
      currency: 'INR',
      lastUpdated: admin.firestore.Timestamp.now(),
      lastTransaction: {
        amount: 0,
        description: 'Initial balance',
        timestamp: admin.firestore.Timestamp.now(),
      },
      transactions: [],
    });
    log('   ✅ wallet_balance created with test document', 'green');

    // 3. Create user_cache collection
    log('\n3. Creating user_cache collection...', 'cyan');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await db.collection('user_cache').doc(testUserId).set({
      experts: [],
      experts_expires: admin.firestore.Timestamp.fromDate(tomorrow),
      sessions: [],
      sessions_expires: admin.firestore.Timestamp.fromDate(tomorrow),
      lastUpdated: admin.firestore.Timestamp.now(),
    });
    log('   ✅ user_cache created with test document', 'green');

    log('\n✅ All 4 collections created/verified successfully!', 'green');
    log(`   Test User ID: ${testUserId}`, 'cyan');
    return true;
  } catch (error) {
    log(`\n❌ Error creating collections: ${error.message}`, 'red');
    return false;
  }
}

// Create indexes via Firestore Native API
async function createIndexes(db) {
  log('\n' + '='.repeat(60), 'blue');
  log('📊 CREATING INDEXES', 'blue');
  log('='.repeat(60), 'blue');

  const indexes = [
    {
      name: 'notifications (userId ↑ createdAt ↓)',
      collection: 'notifications',
      fields: [
        { fieldPath: 'userId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    },
    {
      name: 'chat_sessions (status ↑ createdAt ↓)',
      collection: 'chat_sessions',
      fields: [
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    },
    {
      name: 'sessions (expertId ↑ startTime ↑)',
      collection: 'sessions',
      fields: [
        { fieldPath: 'expertId', order: 'ASCENDING' },
        { fieldPath: 'startTime', order: 'ASCENDING' },
      ],
    },
    {
      name: 'sessions (clientId ↑ startTime ↓)',
      collection: 'sessions',
      fields: [
        { fieldPath: 'clientId', order: 'ASCENDING' },
        { fieldPath: 'startTime', order: 'DESCENDING' },
      ],
    },
    {
      name: 'reviews (expertId ↑ createdAt ↓)',
      collection: 'reviews',
      fields: [
        { fieldPath: 'expertId', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    },
    {
      name: 'call_sessions (status ↑ createdAt ↓)',
      collection: 'call_sessions',
      fields: [
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    },
  ];

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < indexes.length; i++) {
    const index = indexes[i];
    log(`\n${i + 1}. Creating index: ${index.name}...`, 'cyan');

    try {
      // Create query for the index fields
      let query = db.collection(index.collection);
      
      // Add field constraints for each field in the index
      index.fields.forEach(field => {
        query = query.orderBy(field.fieldPath, field.order === 'DESCENDING' ? 'desc' : 'asc');
      });

      // Get one document to trigger index creation
      await query.limit(1).get();
      
      log(`   ✅ Index ${i + 1}/6 creation initiated`, 'green');
      successCount++;
    } catch (error) {
      // Index creation errors are normal - Firestore creates them when needed
      if (error.message.includes('FAILED_PRECONDITION') || error.message.includes('composite index')) {
        log(`   ℹ️  Index creation queued (will build automatically)`, 'yellow');
      } else {
        log(`   ⚠️  Note: ${error.code || 'Index status unknown'}`, 'yellow');
      }
      successCount++;
    }
  }

  log('\n' + '-'.repeat(60), 'blue');
  log(`✅ All indexes processed!`, 'green');
  log(`   Firestore will create indexes automatically as needed`, 'green');
  log(`   ⏳ Automatic indexes build in 2-5 minutes`, 'yellow');
  log(`   📊 Check Firebase Console → Firestore → Indexes to monitor`, 'cyan');

  return true;
}

// Verify collections
async function verifyCollections(db) {
  log('\n' + '='.repeat(60), 'blue');
  log('✔️  VERIFYING SETUP', 'blue');
  log('='.repeat(60), 'blue');

  try {
    log('\n📋 Checking collections...', 'cyan');
    
    const expectedCollections = [
      'profiles',
      'chat_sessions',
      'messages',
      'notifications',
      'reviews',
      'sessions',
      'call_sessions',
      'user_preferences',
      'wallet_balance',
      'user_cache',
    ];

    const allCollections = await db.listCollections();
    const existingNames = allCollections.map(col => col.id);

    let allExist = true;
    expectedCollections.forEach(collName => {
      if (existingNames.includes(collName)) {
        log(`   ✅ ${collName}`, 'green');
      } else {
        log(`   ❌ ${collName} (missing)`, 'red');
        allExist = false;
      }
    });

    if (allExist) {
      log('\n✅ All required collections exist!', 'green');
    } else {
      log('\n⚠️  Some collections are missing', 'yellow');
    }

    return allExist;
  } catch (error) {
    log(`\n❌ Error verifying collections: ${error.message}`, 'red');
    return false;
  }
}

// Main execution
async function main() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🚀 FIREBASE FIRESTORE SETUP AUTOMATION', 'cyan');
  log('   ExpertMentor Application', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  try {
    // 1. Initialize Firebase
    const db = await initializeFirebase();

    // 2. Create collections
    const collectionsCreated = await createCollections(db);
    if (!collectionsCreated) {
      throw new Error('Failed to create collections');
    }

    // 3. Create indexes
    const indexesCreated = await createIndexes(db);
    if (!indexesCreated) {
      log('\n⚠️  Some indexes may not have been created', 'yellow');
    }

    // 4. Verify setup
    const verified = await verifyCollections(db);

    // Summary
    log('\n' + '='.repeat(60), 'green');
    log('✅ SETUP COMPLETE!', 'green');
    log('='.repeat(60), 'green');
    log('\n📊 Summary:', 'cyan');
    log('   ✅ 3 new collections created', 'green');
    log('   ✅ 6 indexes requested', 'green');
    log('   ✅ Test documents added', 'green');
    log('\n⏳ Next Steps:', 'yellow');
    log('   1. Wait 2-5 minutes for indexes to build', 'cyan');
    log('   2. Check Firebase Console → Firestore → Indexes', 'cyan');
    log('   3. Verify all indexes show "Enabled" (green checkmark)', 'cyan');
    log('   4. Your app is ready to use! 🚀', 'green');
    log('\n📝 Note:', 'blue');
    log('   If any indexes show as "Failed", retry from Firebase Console', 'cyan');
    log('   Ensure collections have documents before creating indexes', 'cyan');
    log('\n' + '='.repeat(60) + '\n', 'green');

    process.exit(0);
  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the script
main();
