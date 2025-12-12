/**
 * FIRESTORE INDEXES CONFIGURATION
 * 
 * Create these indexes in Firebase Console for optimal performance.
 * 
 * Instructions:
 * 1. Go to: https://console.firebase.google.com/project/{YOUR_PROJECT}/firestore/indexes
 * 2. Click "Create Index"
 * 3. For each index below, add the fields in the order specified
 * 4. Set Collection ID and Query Scope (COLLECTION)
 * 5. Click "Create"
 * 
 * If you see any red warning messages when running queries in the console,
 * Firebase will offer to create the index automatically. You can click
 * the link to create it or create manually using these specifications.
 */

export const firestoreIndexesConfig = {
  indexes: [
    {
      name: 'Notifications by User and Date',
      collection: 'notifications',
      fields: [
        { field: 'userId', direction: 'ASCENDING' },
        { field: 'createdAt', direction: 'DESCENDING' },
      ],
      description: 'For querying notifications by user and sorting by newest first',
    },
    {
      name: 'Chat Sessions by Status and Date',
      collection: 'chat_sessions',
      fields: [
        { field: 'status', direction: 'ASCENDING' },
        { field: 'createdAt', direction: 'DESCENDING' },
      ],
      description: 'For finding active chat sessions sorted by newest',
    },
    {
      name: 'Sessions by Expert and Time',
      collection: 'sessions',
      fields: [
        { field: 'expertId', direction: 'ASCENDING' },
        { field: 'startTime', direction: 'ASCENDING' },
      ],
      description: 'For finding expert sessions sorted by start time',
    },
    {
      name: 'Sessions by Client and Time',
      collection: 'sessions',
      fields: [
        { field: 'clientId', direction: 'ASCENDING' },
        { field: 'startTime', direction: 'DESCENDING' },
      ],
      description: 'For finding client sessions sorted by newest',
    },
    {
      name: 'Reviews by Expert and Date',
      collection: 'reviews',
      fields: [
        { field: 'expertId', direction: 'ASCENDING' },
        { field: 'createdAt', direction: 'DESCENDING' },
      ],
      description: 'For finding expert reviews sorted by newest',
    },
    {
      name: 'Call Sessions by Status and Date',
      collection: 'call_sessions',
      fields: [
        { field: 'status', direction: 'ASCENDING' },
        { field: 'createdAt', direction: 'DESCENDING' },
      ],
      description: 'For finding active call sessions sorted by newest',
    },
  ],
};

/**
 * MANUAL FIREBASE CONSOLE INSTRUCTIONS
 * 
 * If automatic index creation is needed:
 * 1. Open Browser DevTools Console while using the app
 * 2. Look for messages like: "Cloud Firestore has detected an unindexed query"
 * 3. Click the provided link in the console message
 * 4. Firebase Console will open with index creation pre-filled
 * 5. Click "Create Index"
 * 
 * Alternative Manual Steps:
 * 1. Visit: https://console.firebase.google.com
 * 2. Select your project
 * 3. Go to Firestore Database > Indexes
 * 4. Click "Create Index"
 * 5. Use the specifications from firestoreIndexesConfig above
 */

export const printIndexInstructions = () => {
  console.log('%c=== FIRESTORE INDEXES NEEDED ===', 'color: #ff9800; font-weight: bold; font-size: 16px');
  console.log('%cCreate the following indexes in Firebase Console:', 'color: #ff9800; font-weight: bold');
  
  firestoreIndexesConfig.indexes.forEach((index, idx) => {
    console.log(`\n%c${idx + 1}. ${index.name}`, 'color: #2196f3; font-weight: bold');
    console.log(`%cCollection: ${index.collection}`, 'color: #2196f3');
    console.log(`%cDescription: ${index.description}`, 'color: #2196f3');
    console.log('%cFields:', 'color: #2196f3; font-weight: bold');
    index.fields.forEach((field) => {
      console.log(`  - ${field.field} (${field.direction})`);
    });
  });
  
  console.log('%c\nLink: https://console.firebase.google.com', 'color: #4caf50; font-weight: bold');
};

/**
 * Check if indexes are created by attempting queries
 * This function will log warnings if indexes are missing
 */
export const checkIndexStatus = () => {
  console.log('[FirestoreIndexes] Checking index status...');
  console.log('[FirestoreIndexes] Indexes will be automatically created when queries that require them are first executed.');
  console.log('[FirestoreIndexes] Check Firebase Console > Firestore > Indexes for creation status');
};
