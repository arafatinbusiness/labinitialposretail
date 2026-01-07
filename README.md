# Labinitial - Business Management System

A comprehensive POS, Inventory, and Invoicing solution for small to medium businesses with Firebase integration for cloud storage and local caching for speed.

## Features

- **Firebase Authentication**: Secure user authentication with email/password
- **Firestore Database**: Cloud storage for all business data
- **Local Caching**: Fast data access with 5-minute cache expiration
- **POS System**: Point of Sale with real-time inventory updates
- **Inventory Management**: Product catalog with categories, VAT, and stock tracking
- **Customer Management**: Customer database with due tracking
- **Invoice System**: Generate, print, and manage invoices
- **Employee Management**: Attendance, salary, and employee records
- **Reports & AI Insights**: Business analytics with Gemini AI integration
- **Multi-language**: English and Bengali support
- **Super Admin Dashboard**: Manage store subscriptions and access

## Firebase Integration

The application now uses Firebase for:
1. **Authentication**: User signup/login with Firebase Auth
2. **Data Storage**: All business data stored in Firestore
3. **Real-time Updates**: Live data synchronization across devices
4. **Local Caching**: Data cached in localStorage for instant access

## Setup Instructions

### 1. Firebase Configuration Setup

The application uses Firebase for authentication and data storage. To enable authentication:

#### For the Pre-configured Project:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the project: `business-management-70fd4`
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Email/Password**
5. Enable **Email/Password** authentication
6. Click **Save**

#### Using Your Own Firebase Project:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (e.g., "costest-business")
3. Enable Authentication:
   - Go to Authentication → Sign-in method
   - Enable Email/Password provider
4. Enable Firestore Database:
   - Go to Firestore Database → Create database
   - Start in production mode
   - Choose a location close to your users
5. Get your Firebase configuration:
   - Go to Project settings → General
   - Scroll down to "Your apps" section
   - Register a web app if not already done
   - Copy the Firebase configuration object
6. Update `services/firebaseService.ts` with your configuration:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

### 3. Firestore Security Rules (CRITICAL FOR DATA ISOLATION)

To prevent stores from seeing each other's data, update your Firestore security rules in Firebase Console with the following comprehensive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isStoreOwner(storeId) {
      return isSignedIn() && request.auth.uid == storeId;
    }
    
    function hasStoreIdField() {
      return request.resource.data.storeId is string && 
             request.resource.data.storeId == request.auth.uid;
    }
    
    // --- STORES COLLECTION ---
    match /stores/{storeId} {
      allow read: if isStoreOwner(storeId);
      allow write: if isStoreOwner(storeId);
    }
    
    // --- PRODUCTS COLLECTION ---
    match /products/{productId} {
      allow read: if isSignedIn() && resource.data.storeId == request.auth.uid;
      allow create: if isSignedIn() && hasStoreIdField();
      allow update: if isSignedIn() && 
                     resource.data.storeId == request.auth.uid &&
                     request.resource.data.storeId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.storeId == request.auth.uid;
    }
    
    // --- CUSTOMERS COLLECTION ---
    match /customers/{customerId} {
      allow read: if isSignedIn() && resource.data.storeId == request.auth.uid;
      allow create: if isSignedIn() && hasStoreIdField();
      allow update: if isSignedIn() && 
                     resource.data.storeId == request.auth.uid &&
                     request.resource.data.storeId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.storeId == request.auth.uid;
    }
    
    // --- INVOICES COLLECTION ---
    match /invoices/{invoiceId} {
      allow read: if isSignedIn() && resource.data.storeId == request.auth.uid;
      allow create: if isSignedIn() && hasStoreIdField();
      allow update: if isSignedIn() && 
                     resource.data.storeId == request.auth.uid &&
                     request.resource.data.storeId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.storeId == request.auth.uid;
    }
    
    // --- EMPLOYEES COLLECTION ---
    match /employees/{employeeId} {
      allow read: if isSignedIn() && resource.data.storeId == request.auth.uid;
      allow create: if isSignedIn() && hasStoreIdField();
      allow update: if isSignedIn() && 
                     resource.data.storeId == request.auth.uid &&
                     request.resource.data.storeId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.storeId == request.auth.uid;
    }
    
    // --- ATTENDANCE COLLECTION ---
    match /attendance/{recordId} {
      allow read: if isSignedIn() && resource.data.storeId == request.auth.uid;
      allow create: if isSignedIn() && hasStoreIdField();
      allow update: if isSignedIn() && 
                     resource.data.storeId == request.auth.uid &&
                     request.resource.data.storeId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.storeId == request.auth.uid;
    }
    
    // --- SALARIES COLLECTION ---
    match /salaries/{recordId} {
      allow read: if isSignedIn() && resource.data.storeId == request.auth.uid;
      allow create: if isSignedIn() && hasStoreIdField();
      allow update: if isSignedIn() && 
                     resource.data.storeId == request.auth.uid &&
                     request.resource.data.storeId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.storeId == request.auth.uid;
    }
    
    // --- SETTINGS COLLECTION ---
    match /settings/{storeId} {
      allow read: if isStoreOwner(storeId);
      allow write: if isStoreOwner(storeId);
    }
    
    // --- DEFAULT DENY RULE ---
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**IMPORTANT**: These rules ensure:
1. Each store can only access their own data
2. The `storeId` field must match the user's Firebase Auth UID
3. Users cannot change the `storeId` field once set
4. All collections require authentication
5. Default deny prevents accidental data exposure

### 4. Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### 5. First Time Setup

1. Start the application: `npm run dev`
2. Open `http://localhost:5173` in your browser
3. Click "Login / Sign Up"
4. Create a new store account with your email and business name
5. The system will automatically:
   - Create your Firebase authentication account
   - Set up your Firestore database structure
   - Migrate any existing localStorage data to Firebase
   - Set up real-time data synchronization

## Data Migration

Existing users with localStorage data will have their data automatically migrated to Firebase upon first login. The migration process:

1. Checks for existing localStorage data
2. Transfers all data to Firestore
3. Cleans up old localStorage entries
4. Sets up real-time subscriptions

## Architecture

### Data Flow
1. **Initial Load**: Data loaded from cache (if valid) or Firestore
2. **Real-time Updates**: Firestore subscriptions keep data in sync
3. **Local Changes**: Changes saved to cache immediately, then synced to Firestore
4. **Offline Support**: Local cache allows continued operation without internet

### Cache Strategy
- **Cache Duration**: 5 minutes
- **Cache Validation**: Timestamp-based expiration
- **Fallback**: localStorage used if Firebase is unavailable
- **Real-time**: Firestore subscriptions update cache automatically

## Security Features

1. **Firebase Authentication**: Secure user management
2. **Firestore Security Rules**: Data access control
3. **Local Data Encryption**: Sensitive data hashed in localStorage
4. **Anti-tampering**: Developer tools protection
5. **Session Management**: Automatic logout on token expiration

## Performance Optimization

1. **Parallel Data Loading**: All data loaded simultaneously
2. **Debounced Writes**: Batched Firestore writes to reduce costs
3. **Local Cache**: Instant data access for frequently used data
4. **Lazy Loading**: Components load only when needed
5. **Real-time Updates**: Only changed data is transmitted

## Troubleshooting

### Common Issues

1. **Firebase Connection Failed**:
   - Check internet connection
   - Verify Firebase configuration in `.env`
   - Ensure Firestore database is created

2. **Authentication Errors**:
   - Verify email/password
   - Check Firebase Authentication is enabled
   - Ensure user exists in Firebase Console

3. **Data Not Syncing**:
   - Check Firestore security rules
   - Verify collection names match
   - Check browser console for errors

### Development

- **Admin Login**: Username: `admin`, Password: `dream5360`
- **Local Testing**: Use Firebase Emulator Suite for offline development
- **Debug Mode**: Check browser console for Firebase debug logs

## Deployment

### Vercel / Netlify
1. Set environment variables in deployment settings
2. Build command: `npm run build`
3. Output directory: `dist`

### Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase
firebase init

# Deploy
firebase deploy
```

## Support

For issues or questions:
- Email: dev@soft.com
- GitHub Issues: [Create new issue]

## License

Proprietary Software - All rights reserved.
