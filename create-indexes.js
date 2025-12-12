/**
 * Firebase Firestore Composite Index Creation Script
 * Creates composite indexes via Firebase REST API
 * 
 * Usage:
 * 1. Ensure firebase-admin is installed: npm install firebase-admin
 * 2. Run: node create-indexes.js
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
      process.exit(1);
    }

    const serviceAccount = require(credentialsPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    log('\n✅ Firebase initialized successfully!', 'green');
    return serviceAccount;
  } catch (error) {
    log(`\n❌ Failed to initialize Firebase: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Create composite indexes via REST API
async function createCompositeIndexes(serviceAccount) {
  log('\n' + '='.repeat(70), 'blue');
  log('📊 CREATING COMPOSITE INDEXES VIA FIREBASE REST API', 'blue');
  log('='.repeat(70), 'blue');

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
    log(`\n${i + 1}. Creating: ${index.name}`, 'cyan');

    try {
      const projectId = serviceAccount.project_id;
      const response = await createIndexViaRestAPI(projectId, index);
      
      log(`   ✅ Index created successfully!`, 'green');
      log(`   📌 Operation: ${response.name}`, 'cyan');
      successCount++;
    } catch (error) {
      if (error.message.includes('ALREADY_EXISTS') || error.message.includes('already exists')) {
        log(`   ℹ️  Index already exists`, 'yellow');
        successCount++;
      } else {
        log(`   ❌ Error: ${error.message}`, 'red');
        failureCount++;
      }
    }
  }

  log('\n' + '-'.repeat(70), 'blue');
  log(`✅ Index creation completed!`, 'green');
  log(`   Successful: ${successCount}/6`, 'green');
  if (failureCount > 0) {
    log(`   Failed: ${failureCount}/6`, 'red');
  }
  log(`   ⏳ Indexes should now appear in Firebase Console`, 'yellow');
  log(`   📊 Firestore → Indexes → Composite tab`, 'cyan');

  return successCount === 6;
}

// Create index via REST API
async function createIndexViaRestAPI(projectId, index) {
  try {
    // Get access token
    const accessToken = await admin.app().options.credential.getAccessToken();
    
    // Build the index request
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/indexes`;
    
    const indexBody = {
      fields: index.fields.map(field => ({
        fieldPath: field.fieldPath,
        order: field.order,
      })),
      queryScope: 'COLLECTION_GROUP', // Use COLLECTION_GROUP for broader compatibility
    };

    log(`   📡 Sending request to: ${url}`, 'cyan');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(indexBody),
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Check if it's already exists error
      if (error.error?.code === 6 || error.error?.message?.includes('already exists')) {
        throw new Error('ALREADY_EXISTS');
      }
      
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
}

// Check index status
async function checkIndexStatus(projectId, serviceAccount) {
  log('\n' + '='.repeat(70), 'blue');
  log('✔️  CHECKING INDEX STATUS', 'blue');
  log('='.repeat(70), 'blue');

  try {
    const accessToken = await admin.app().options.credential.getAccessToken();
    
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/indexes`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (result.indexes && result.indexes.length > 0) {
      log(`\n📊 Found ${result.indexes.length} composite indexes:`, 'green');
      
      result.indexes.forEach((idx, i) => {
        const fields = idx.fields.map(f => `${f.fieldPath} (${f.order})`).join(' + ');
        const state = idx.state || 'UNKNOWN';
        const stateColor = state === 'READY' ? 'green' : (state === 'CREATING' ? 'yellow' : 'cyan');
        
        log(`   ${i + 1}. ${idx.queryScope} - ${fields}`, 'cyan');
        log(`      State: ${state}`, stateColor);
      });
    } else {
      log('\n⚠️  No composite indexes found yet', 'yellow');
      log('   Indexes may still be building...', 'yellow');
    }
  } catch (error) {
    log(`\n⚠️  Could not check index status: ${error.message}`, 'yellow');
  }
}

// Main execution
async function main() {
  log('\n' + '='.repeat(70), 'cyan');
  log('🚀 FIREBASE COMPOSITE INDEX CREATION', 'cyan');
  log('   ExpertMentor Application', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');

  try {
    // 1. Initialize Firebase
    const serviceAccount = await initializeFirebase();

    // 2. Create indexes
    const indexesCreated = await createCompositeIndexes(serviceAccount);

    // 3. Check status
    await checkIndexStatus(serviceAccount.project_id, serviceAccount);

    // Summary
    log('\n' + '='.repeat(70), 'green');
    log('✅ COMPOSITE INDEXES CREATION COMPLETE!', 'green');
    log('='.repeat(70), 'green');
    log('\n📋 Summary:', 'cyan');
    log('   ✅ 6 composite indexes processed', 'green');
    log('   ✅ All index creation requests sent', 'green');
    log('\n⏳ Next Steps:', 'yellow');
    log('   1. Wait 2-5 minutes for indexes to build', 'cyan');
    log('   2. Go to Firebase Console → Firestore → Indexes', 'cyan');
    log('   3. Click "Composite" tab to see your indexes', 'cyan');
    log('   4. All should show "Enabled" (green checkmark)', 'cyan');
    log('\n🎯 If indexes don\'t appear:', 'blue');
    log('   • Refresh Firebase Console (F5)', 'cyan');
    log('   • Check project ID is correct', 'cyan');
    log('   • Ensure collections have documents', 'cyan');
    log('   • Try again in 5 minutes', 'cyan');
    log('\n' + '='.repeat(70) + '\n', 'green');

    process.exit(0);
  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    log(`   Stack: ${error.stack}`, 'red');
    process.exit(1);
  }
}

// Run the script
main();
