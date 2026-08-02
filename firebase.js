/* ====================================================
   PAYUU LIVE DASHBOARD - FIREBASE REALTIME DB & AUTH MODULE
   ==================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyDrZoqvp4UQ2KP1a3sYqniQg-SFodC24K0",
  authDomain: "payuulive.firebaseapp.com",
  databaseURL: "https://payuulive-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "payuulive",
  storageBucket: "payuulive.firebasestorage.app",
  messagingSenderId: "261040331266",
  appId: "1:261040331266:web:f4adaa25d4512ff5e9251b"
};

// Initialize Firebase App, Auth, & Realtime Database Safely
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Reusable Helper SDK Methods
window.firebaseDB = {
  // --- AUTHENTICATION HELPERS ---
  signInWithGoogle: function() {
    return auth.signInWithPopup(googleProvider);
  },

  signOut: function() {
    return auth.signOut();
  },

  onAuthStateChanged: function(callback) {
    auth.onAuthStateChanged(callback);
  },

  checkAdminStatus: function(userEmail, callback) {
    db.ref("admins").once("value", (snapshot) => {
      const admins = snapshot.val() || {};
      let matchedAdmin = null;

      Object.keys(admins).forEach(uid => {
        if (admins[uid].email && admins[uid].email.toLowerCase() === userEmail.toLowerCase()) {
          matchedAdmin = { uid, ...admins[uid] };
        }
      });

      callback(matchedAdmin);
    });
  },

  listenAdmins: function(callback) {
    db.ref("admins").on("value", (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.keys(data).map(key => ({ ...data[key], _key: key })) : [];
      callback(list);
    });
  },

  getActiveAdminEmails: function(callback) {
    db.ref("admins").once("value", (snapshot) => {
      const data = snapshot.val() || {};
      const activeEmails = [];
      Object.keys(data).forEach(key => {
        if (data[key].active === true && data[key].email) {
          activeEmails.push(data[key].email);
        }
      });
      callback(activeEmails);
    });
  },

  saveAdmin: function(adminData) {
    const sanitizeEmailKey = adminData.email.replace(/[@.]/g, "_");
    return db.ref("admins/" + sanitizeEmailKey).set({
      email: adminData.email.toLowerCase(),
      role: adminData.role || "moderator",
      active: adminData.active !== undefined ? adminData.active : true,
      updatedAt: firebase.database.ServerValue.TIMESTAMP
    });
  },

  toggleAdminActive: function(key, activeState) {
    return db.ref("admins/" + key).update({ active: activeState });
  },

  deleteAdmin: function(key) {
    return db.ref("admins/" + key).remove();
  },

  // --- AUDIT LOGGING HELPERS ---
  logAuditAction: function(auditData) {
    const newRef = db.ref("auditLogs").push();
    return newRef.set({
      id: newRef.key,
      adminEmail: auditData.adminEmail || "System",
      action: auditData.action || "UNKNOWN",
      supporterName: auditData.supporterName || "N/A",
      amount: auditData.amount || 0,
      details: auditData.details || "",
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  },

  listenAuditLogs: function(callback) {
    db.ref("auditLogs").limitToLast(50).on("value", (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.keys(data).map(key => ({ ...data[key], _key: key })).reverse() : [];
      callback(list);
    });
  },

  // --- NOTIFICATION LOGGING HELPERS ---
  logNotificationAttempt: function(logData) {
    const newRef = db.ref("notificationLogs").push();
    return newRef.set({
      id: newRef.key,
      recipient: logData.recipient || "N/A",
      supporterName: logData.supporterName || "N/A",
      amount: logData.amount || 0,
      status: logData.status || "UNKNOWN",
      error: logData.error || null,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  },

  listenNotificationLogs: function(callback) {
    db.ref("notificationLogs").limitToLast(25).on("value", (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.keys(data).map(key => ({ ...data[key], _key: key })).reverse() : [];
      callback(list);
    });
  },

  // --- DATA HELPERS ---
  addPendingSupport: function(data) {
    const newRef = db.ref("pendingSupport").push();
    return newRef.set({
      id: newRef.key,
      name: data.name,
      amount: Number(data.amount),
      msg: data.msg || "",
      status: data.status || "Awaiting Verification",
      timeSubmitted: data.timeSubmitted || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => newRef.key);
  },

  approveSupport: function(key, data) {
    const approvedRef = db.ref("approvedSupport").push();
    const updateData = {
      id: approvedRef.key,
      name: data.name,
      amount: Number(data.amount),
      msg: data.msg || "",
      status: "Approved",
      approvedAt: firebase.database.ServerValue.TIMESTAMP,
      pinned: false
    };

    return approvedRef.set(updateData).then(() => {
      return db.ref("pendingSupport/" + key).remove().then(() => approvedRef.key);
    });
  },

  updateApprovedSupportDetail: function(key, updatedData) {
    return db.ref("approvedSupport/" + key).update({
      name: updatedData.name,
      amount: Number(updatedData.amount),
      msg: updatedData.msg || "",
      timeSubmitted: updatedData.timeSubmitted || "",
      dateSubmitted: updatedData.dateSubmitted || "",
      editedAt: firebase.database.ServerValue.TIMESTAMP
    });
  },

  duplicateSupport: function(data) {
    const approvedRef = db.ref("approvedSupport").push();
    const duplicatePayload = {
      id: approvedRef.key,
      name: data.name + " (Copy)",
      amount: Number(data.amount),
      msg: data.msg || "",
      status: "Approved",
      approvedAt: firebase.database.ServerValue.TIMESTAMP,
      pinned: false
    };

    return approvedRef.set(duplicatePayload).then(() => {
      this.pushOverlayAlert(duplicatePayload, approvedRef.key);
      return approvedRef.key;
    });
  },

  pinSupporter: function(keyToPin) {
    return db.ref("approvedSupport").once("value").then((snapshot) => {
      const data = snapshot.val() || {};
      const updates = {};
      
      Object.keys(data).forEach(k => {
        updates["approvedSupport/" + k + "/pinned"] = (k === keyToPin);
      });

      return db.ref().update(updates);
    });
  },

  unpinSupporter: function(key) {
    return db.ref("approvedSupport/" + key).update({ pinned: false });
  },

  deleteApprovedSupport: function(key) {
    return db.ref("approvedSupport/" + key).remove();
  },

  rejectSupport: function(key) {
    return db.ref("pendingSupport/" + key).update({
      status: "Rejected"
    }).then(() => {
      return db.ref("pendingSupport/" + key).remove();
    });
  },

  pushOverlayAlert: function(data, approvedKey) {
    const overlayRef = db.ref("overlayQueue").push();
    return overlayRef.set({
      id: overlayRef.key,
      approvedKey: approvedKey || "",
      name: data.name,
      amount: Number(data.amount),
      msg: data.msg || "",
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  },

  removeOverlayAlert: function(key) {
    return db.ref("overlayQueue/" + key).remove();
  },

  listenPending: function(callback) {
    db.ref("pendingSupport").on("value", (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.keys(data).map(key => ({ ...data[key], _key: key })).reverse() : [];
      callback(list);
    });
  },

  listenApproved: function(callback) {
    db.ref("approvedSupport").on("value", (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.keys(data).map(key => ({ ...data[key], _key: key })) : [];
      callback(list);
    });
  },

  listenOverlay: function(callback) {
    db.ref("overlayQueue").on("child_added", (snapshot) => {
      callback(snapshot.val(), snapshot.key);
    });
  },

  listenSettings: function(callback) {
    db.ref("settings").on("value", (snapshot) => {
      callback(snapshot.val());
    });
  },

  saveSettings: function(settingsObj) {
    return db.ref("settings").update(settingsObj);
  },

  resetSettings: function(defaultSettings) {
    return db.ref("settings").set(defaultSettings);
  },

  resetStatistics: function() {
    const p1 = db.ref("approvedSupport").remove();
    const p2 = db.ref("overlayQueue").remove();
    return Promise.all([p1, p2]);
  }
};