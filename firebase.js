/* ===================================================================
   PAYUU LIVE PLATFORM V40 - FIREBASE CORE SDK & DB API
   =================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyDrZoqvp4UQ2KP1a3sYqniQg-SFodC24K0",
  authDomain: "payuulive.firebaseapp.com",
  databaseURL: "https://payuulive-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "payuulive",
  storageBucket: "payuulive.firebasestorage.app",
  messagingSenderId: "261040331266",
  appId: "1:261040331266:web:f4adaa25d4512ff5e9251b"
};

// Initialize Firebase App, Realtime Database, Authentication & Storage
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const auth = firebase.auth();
const storage = firebase.storage ? firebase.storage() : null;
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Global Firebase API Proxy
window.firebaseCore = {
  db,
  auth,
  storage,
  googleProvider,

  // Authentication Proxies
  signInWithGoogle: () => auth.signInWithPopup(googleProvider),
  signOut: () => auth.signOut(),
  onAuthStateChanged: (cb) => auth.onAuthStateChanged(cb),

  // Realtime Database Single-Subscription Handlers
  subscriptions: {},

  subscribeNode(nodePath, callback) {
    if (this.subscriptions[nodePath]) {
      db.ref(nodePath).off('value', this.subscriptions[nodePath]);
    }
    const listener = db.ref(nodePath).on('value', (snapshot) => {
      callback(snapshot.val(), snapshot);
    });
    this.subscriptions[nodePath] = listener;
  },

  unsubscribeNode(nodePath) {
    if (this.subscriptions[nodePath]) {
      db.ref(nodePath).off('value', this.subscriptions[nodePath]);
      delete this.subscriptions[nodePath];
    }
  },

  // Storage Upload Helper
  uploadBase64Image: async (base64Str, path) => {
    if (!storage) throw new Error("Firebase Storage SDK not loaded.");
    const ref = storage.ref().child(path);
    const snapshot = await ref.putString(base64Str, 'data_url');
    return await snapshot.ref.getDownloadURL();
  }
};