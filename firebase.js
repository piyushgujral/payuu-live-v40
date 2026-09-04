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

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
const storage = firebase.storage();
const googleProvider = new firebase.auth.GoogleAuthProvider();

window.firebaseDB = {
  signInWithGoogle: function() { return auth.signInWithPopup(googleProvider); },
  signOut: function() { return auth.signOut(); },
  onAuthStateChanged: function(callback) { auth.onAuthStateChanged(callback); },
  checkAdminStatus: function(userEmail, callback) { db.ref("admins").once("value", (snapshot) => { const admins = snapshot.val() || {}; let matchedAdmin = null; Object.keys(admins).forEach(uid => { if (admins[uid].email && admins[uid].email.toLowerCase() === userEmail.toLowerCase()) matchedAdmin = { uid, ...admins[uid] }; }); callback(matchedAdmin); }); },
  listenAdmins: function(callback) { db.ref("admins").on("value", (snapshot) => { const data = snapshot.val(); callback(data ? Object.keys(data).map(key => ({ ...data[key], _key: key })) : []); }); },
  getActiveAdminEmails: function(callback) { db.ref("admins").once("value", (snapshot) => { const data = snapshot.val() || {}; const activeEmails = []; Object.keys(data).forEach(key => { if (data[key].active === true && data[key].email) activeEmails.push(data[key].email); }); callback(activeEmails); }); },
  saveAdmin: function(adminData) { const sanitizeEmailKey = adminData.email.replace(/[@.]/g, "_"); return db.ref("admins/" + sanitizeEmailKey).set({ email: adminData.email.toLowerCase(), role: adminData.role || "moderator", active: adminData.active !== undefined ? adminData.active : true, updatedAt: firebase.database.ServerValue.TIMESTAMP }); },
  toggleAdminActive: function(key, activeState) { return db.ref("admins/" + key).update({ active: activeState }); },
  deleteAdmin: function(key) { return db.ref("admins/" + key).remove(); },
  logAuditAction: function(auditData) { const newRef = db.ref("auditLogs").push(); return newRef.set({ id: newRef.key, adminEmail: auditData.adminEmail || "System", action: auditData.action || "UNKNOWN", supporterName: auditData.supporterName || "N/A", amount: auditData.amount || 0, details: auditData.details || "", timestamp: firebase.database.ServerValue.TIMESTAMP }); },
  listenAuditLogs: function(callback) { db.ref("auditLogs").limitToLast(50).on("value", (snapshot) => { const data = snapshot.val(); callback(data ? Object.keys(data).map(key => ({ ...data[key], _key: key })).reverse() : []); }); },
  logNotificationAttempt: function(logData) { const newRef = db.ref("notificationLogs").push(); return newRef.set({ id: newRef.key, recipient: logData.recipient || "N/A", supporterName: logData.supporterName || "N/A", amount: logData.amount || 0, status: logData.status || "UNKNOWN", error: logData.error || null, timestamp: firebase.database.ServerValue.TIMESTAMP }); },
  listenNotificationLogs: function(callback) { db.ref("notificationLogs").limitToLast(25).on("value", (snapshot) => { const data = snapshot.val(); callback(data ? Object.keys(data).map(key => ({ ...data[key], _key: key })).reverse() : []); }); },

  uploadVoiceRecording: function(blob, fileName, contentType) {
  if (!blob) return Promise.reject(new Error("No voice recording supplied."));

  const type = contentType || blob.type || "audio/webm";

  if (!type.toLowerCase().startsWith("audio/")) {
    return Promise.reject(new Error("Only audio files are allowed."));
  }

  if (blob.size > 5 * 1024 * 1024) {
    return Promise.reject(new Error("Voice recording exceeds the 5 MB limit."));
  }

  return fetch("/api/upload-voice", {
    method: "POST",
    headers: {
      "Content-Type": type
    },
    body: blob
  })
  .then(async response => {
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.voiceUrl) {
      throw new Error(data.error || "Voice upload failed.");
    }

    return data.voiceUrl;
  });
},

  addPendingSupport: function(data) { const newRef = db.ref("pendingSupport").push(); return newRef.set({ id: newRef.key, name: data.name, amount: Number(data.amount), msg: data.msg || "", messageSource: data.messageSource || "text", voiceUrl: data.voiceUrl || "", voiceMimeType: data.voiceMimeType || "", voiceDuration: Number(data.voiceDuration || 0), voiceStatus: data.voiceStatus || "none", voiceEnabled: data.voiceEnabled === true, status: data.status || "Awaiting Verification", timeSubmitted: data.timeSubmitted || new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), timestamp: firebase.database.ServerValue.TIMESTAMP }).then(() => newRef.key); },
  approveSupport: function(key, data) { const approvedRef = db.ref("approvedSupport").push(); const updateData = { id: approvedRef.key, name: data.name, amount: Number(data.amount), msg: data.msg || "", messageSource: data.messageSource || "text", voiceUrl: data.voiceUrl || "", voiceMimeType: data.voiceMimeType || "", voiceDuration: Number(data.voiceDuration || 0), voiceStatus: data.voiceUrl ? "approved" : (data.voiceStatus || "none"), voiceEnabled: data.voiceEnabled === true, status: "Approved", approvedAt: firebase.database.ServerValue.TIMESTAMP, pinned: false }; return approvedRef.set(updateData).then(() => db.ref("pendingSupport/" + key).remove().then(() => approvedRef.key)); },
  updateApprovedSupportDetail: function(key, updatedData) { return db.ref("approvedSupport/" + key).update({ name: updatedData.name, amount: Number(updatedData.amount), msg: updatedData.msg || "", timeSubmitted: updatedData.timeSubmitted || "", dateSubmitted: updatedData.dateSubmitted || "", editedAt: firebase.database.ServerValue.TIMESTAMP }); },
  duplicateSupport: function(data) { const approvedRef = db.ref("approvedSupport").push(); const duplicatePayload = { id: approvedRef.key, name: data.name + " (Copy)", amount: Number(data.amount), msg: data.msg || "", messageSource: data.messageSource || "text", voiceUrl: data.voiceUrl || "", voiceMimeType: data.voiceMimeType || "", voiceDuration: Number(data.voiceDuration || 0), voiceStatus: data.voiceUrl ? "approved" : (data.voiceStatus || "none"), voiceEnabled: data.voiceEnabled === true, status: "Approved", approvedAt: firebase.database.ServerValue.TIMESTAMP, pinned: false }; return approvedRef.set(duplicatePayload).then(() => { this.pushOverlayAlert(duplicatePayload, approvedRef.key); return approvedRef.key; }); },
  pinSupporter: function(keyToPin) { return db.ref("approvedSupport").once("value").then((snapshot) => { const data = snapshot.val() || {}; const updates = {}; Object.keys(data).forEach(k => { updates["approvedSupport/" + k + "/pinned"] = (k === keyToPin); }); return db.ref().update(updates); }); },
  unpinSupporter: function(key) { return db.ref("approvedSupport/" + key).update({ pinned: false }); },
  deleteApprovedSupport: function(key) { return db.ref("approvedSupport/" + key).remove(); },
  rejectSupport: function(key) { return db.ref("pendingSupport/" + key).update({ status: "Rejected" }).then(() => db.ref("pendingSupport/" + key).remove()); },
  pushOverlayAlert: function(data, approvedKey) { const overlayRef = db.ref("overlayQueue").push(); return overlayRef.set({ id: overlayRef.key, approvedKey: approvedKey || "", name: data.name, amount: Number(data.amount), msg: data.msg || "", messageSource: data.messageSource || "text", voiceUrl: data.voiceUrl || "", voiceMimeType: data.voiceMimeType || "", voiceDuration: Number(data.voiceDuration || 0), voiceStatus: data.voiceStatus || (data.voiceUrl ? "approved" : "none"), voiceEnabled: data.voiceEnabled === true, timestamp: firebase.database.ServerValue.TIMESTAMP }); },
  removeOverlayAlert: function(key) { return db.ref("overlayQueue/" + key).remove(); },
  listenPending: function(callback) { db.ref("pendingSupport").on("value", (snapshot) => { const data = snapshot.val(); callback(data ? Object.keys(data).map(key => ({ ...data[key], _key: key })).reverse() : []); }); },
  listenApproved: function(callback) { db.ref("approvedSupport").on("value", (snapshot) => { const data = snapshot.val(); callback(data ? Object.keys(data).map(key => ({ ...data[key], _key: key })) : []); }); },
  listenOverlay: function(callback) { db.ref("overlayQueue").on("child_added", (snapshot) => { callback(snapshot.val(), snapshot.key); }); },
  listenSettings: function(callback) { db.ref("settings").on("value", (snapshot) => { callback(snapshot.val()); }); },
  saveSettings: function(settingsObj) { return db.ref("settings").update(settingsObj); },
  resetSettings: function(defaultSettings) { return db.ref("settings").set(defaultSettings); },
  resetStatistics: function() { return Promise.all([db.ref("approvedSupport").remove(), db.ref("overlayQueue").remove()]); }
};

/* ====================================================
   ORIGINAL SUPPORTER VOICE BRIDGE
   ==================================================== */
(function installOriginalSupporterVoiceBridge() {
  let voiceBlob = null, voiceMimeType = '', voiceDuration = 0, voiceRecorder = null, voiceChunks = [], voiceStartedAt = 0, voiceStopTimer = null, voicePreviewUrl = '';
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const show = (id, yes) => { const el = document.getElementById(id); if (el) el.style.display = yes ? 'inline-block' : 'none'; };

  function resetVoice() {
    if (voiceStopTimer) clearTimeout(voiceStopTimer);
    if (voiceRecorder && voiceRecorder.state === 'recording') voiceRecorder.stop();
    voiceRecorder = null; voiceBlob = null; voiceMimeType = ''; voiceDuration = 0; voiceChunks = [];
    if (voicePreviewUrl) { URL.revokeObjectURL(voicePreviewUrl); voicePreviewUrl = ''; }
    const preview = document.getElementById('voice-preview');
    if (preview) { preview.pause(); preview.removeAttribute('src'); preview.load(); preview.style.display = 'none'; }
    ['voice-stop-btn','voice-play-btn','voice-rerecord-btn','voice-delete-btn'].forEach(id => show(id, false));
    const panel = document.getElementById('voice-recorder-panel'); if (panel) panel.style.display = 'none';
    setText('voice-upload-status',''); setText('voice-recording-time','00:00');
    const recBtn = document.getElementById('voice-record-btn'); if (recBtn) recBtn.disabled = false;
  }

  function startVoice() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { alert('Voice recording is not supported in this browser.'); return; }
    navigator.mediaDevices.getUserMedia({audio:true}).then(stream => {
      voiceChunks = [];
      const choices = ['audio/webm;codecs=opus','audio/webm','audio/mp4'];
      const mime = choices.find(t => MediaRecorder.isTypeSupported(t)) || '';
      voiceRecorder = new MediaRecorder(stream, mime ? {mimeType:mime} : undefined);
      voiceMimeType = voiceRecorder.mimeType || mime || 'audio/webm'; voiceStartedAt = Date.now();
      const panel = document.getElementById('voice-recorder-panel'); if (panel) panel.style.display = 'block';
      const recBtn = document.getElementById('voice-record-btn'); if (recBtn) recBtn.disabled = true;
      show('voice-stop-btn', true); show('voice-play-btn', false); show('voice-rerecord-btn', false); show('voice-delete-btn', false);
      setText('voice-recording-status','🔴 Recording… maximum 30 seconds.');
      voiceRecorder.ondataavailable = e => { if (e.data?.size) voiceChunks.push(e.data); };
      voiceRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop()); if (voiceStopTimer) clearTimeout(voiceStopTimer);
        voiceDuration = Math.min(30, Math.max(1, Math.round((Date.now()-voiceStartedAt)/1000)));
        voiceBlob = new Blob(voiceChunks,{type:voiceMimeType}); voicePreviewUrl = URL.createObjectURL(voiceBlob);
        const preview=document.getElementById('voice-preview'); if (preview) { preview.src=voicePreviewUrl; preview.style.display='block'; }
        show('voice-stop-btn',false); show('voice-play-btn',true); show('voice-rerecord-btn',true); show('voice-delete-btn',true); if (recBtn) recBtn.disabled=false;
        setText('voice-recording-status',`Original voice recorded (${voiceDuration}s).`); setText('voice-recording-time',`00:${String(voiceDuration).padStart(2,'0')}`);
      };
      voiceRecorder.start(250); voiceStopTimer=setTimeout(()=>{ if (voiceRecorder?.state==='recording') voiceRecorder.stop(); },30000);
    }).catch(err=>{ console.error('Microphone error:',err); alert('Microphone permission is required to record your voice.'); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const recordBtn=document.getElementById('voice-record-btn'), stopBtn=document.getElementById('voice-stop-btn'), playBtn=document.getElementById('voice-play-btn'), rerecordBtn=document.getElementById('voice-rerecord-btn'), deleteBtn=document.getElementById('voice-delete-btn');
    if (recordBtn) recordBtn.addEventListener('click',startVoice);
    if (stopBtn) stopBtn.addEventListener('click',()=>{if(voiceRecorder?.state==='recording')voiceRecorder.stop();});
    if (playBtn) playBtn.addEventListener('click',()=>document.getElementById('voice-preview')?.play());
    if (rerecordBtn) rerecordBtn.addEventListener('click',()=>{resetVoice();startVoice();});
    if (deleteBtn) deleteBtn.addEventListener('click',resetVoice);

    // Add an audio player to each pending admin card when an original voice message exists.
    const queue=document.getElementById('pending-queue-list');
    if (queue) {
      const injectPlayers=()=>{
        try {
          if (typeof STATE==='undefined' || !Array.isArray(STATE.pendingQueue)) return;
          Array.from(queue.children).forEach((card,index)=>{
            const item=STATE.pendingQueue[index];
            if (!item?.voiceUrl || card.querySelector('[data-original-voice-player]')) return;
            const wrap=document.createElement('div'); wrap.setAttribute('data-original-voice-player','true'); wrap.style.margin='10px 0';
            const label=document.createElement('div'); label.textContent='🎙️ Original supporter voice'; label.style.fontSize='.75rem'; label.style.marginBottom='5px';
            const audio=document.createElement('audio'); audio.controls=true; audio.preload='metadata'; audio.src=item.voiceUrl; audio.style.width='100%';
            wrap.appendChild(label); wrap.appendChild(audio); card.querySelector('.admin-card-body')?.appendChild(wrap);
          });
        } catch(err) { console.error('Voice player injection error:',err); }
      };
      new MutationObserver(injectPlayers).observe(queue,{childList:true}); injectPlayers();
    }
  });

  // Only voice submissions are intercepted. Typed-only submissions continue through the existing master script.
  document.addEventListener('submit', e => {
    if (e.target?.id !== 'tip-form' || !voiceBlob) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const name=document.getElementById('supporter-name')?.value.trim()||'';
    const custom=parseFloat(document.getElementById('custom-amount')?.value);
    const activeCard=document.querySelector('.donation-card.active');
    const amount=custom>0?custom:Number(activeCard?.dataset.value||50);
    const settings=window.__payuuVoiceSettings||{}; const minAmt=Number(settings.minAmount||40);
    if(!name||!amount||amount<minAmt){alert(`Please enter a valid name and amount (Minimum ₹${minAmt}).`);return;}
    const msg=document.getElementById('supporter-message')?.value.trim()||'';
    const now=new Date(); const timeSubmitted=now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    try { STATE.activeSubmission={name,amount:Number(amount),msg,messageSource:'voice',voiceEnabled:true,voiceBlob,voiceMimeType,voiceDuration,timeSubmitted,status:STATUS.AWAITING_VERIFICATION}; } catch(err) { console.error('Voice submission state error:',err); return; }
    const note=`${name}: ${msg}`.substring(0,50); const upiId=settings.upiId||document.getElementById('upi-id-text')?.textContent||''; const payee=settings.streamerName||'Payuu Live';
    const upiUrl=`upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    try{window.location.href=upiUrl;}catch(_){}
    setTimeout(()=>{const modal=document.getElementById('confirm-payment-modal');if(modal)modal.classList.add('active');},600);
  },true);

  // For voice submissions, upload the original audio after payment confirmation, then allow the normal admin-email flow.
  document.addEventListener('click', async e => {
    if(e.target?.id!=='btn-paid-yes'||!voiceBlob||!STATE.activeSubmission?.voiceBlob)return;
    e.preventDefault(); e.stopImmediatePropagation();
    try {
      setText('voice-upload-status','Uploading original voice…');
      const mime=STATE.activeSubmission.voiceMimeType||voiceBlob.type||'audio/webm'; const ext=mime.includes('mp4')?'m4a':'webm';
      const fileName=`supporter-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const voiceUrl=await window.firebaseDB.uploadVoiceRecording(voiceBlob,fileName,mime);
      STATE.activeSubmission.voiceUrl=voiceUrl; STATE.activeSubmission.voiceStatus='pending'; delete STATE.activeSubmission.voiceBlob;
      await window.firebaseDB.addPendingSupport(STATE.activeSubmission);
      if(typeof sendAdminEmailNotification==='function')sendAdminEmailNotification(STATE.activeSubmission);
      const modal=document.getElementById('confirm-payment-modal');if(modal)modal.classList.remove('active');
      const nameInput=document.getElementById('supporter-name'),msgInput=document.getElementById('supporter-message');if(nameInput)nameInput.value='';if(msgInput)msgInput.value='';setText('char-count','0');resetVoice();
      const thank=document.getElementById('thankyou-modal');if(thank)thank.classList.add('active'); STATE.activeSubmission=null;
    } catch(err){console.error('Voice upload/submission failed:',err);alert('Unable to submit your voice message. Please try again.');}
  },true);

  window.__payuuVoiceSettings=window.__payuuVoiceSettings||{};
  db.ref('settings').on('value',snap=>{window.__payuuVoiceSettings=snap.val()||{};});

  // Overlay: use the actual supporter recording instead of browser speech synthesis.
  document.addEventListener('DOMContentLoaded',()=>{
    if(!document.getElementById('alert-card'))return;
    const audio=document.createElement('audio');audio.id='supporter-voice-player';audio.preload='auto';audio.style.display='none';document.body.appendChild(audio);window.__payuuOriginalVoiceAudio=audio;
    setTimeout(()=>{
      const originalSpeakAlertVoice = window.speakAlertVoice;

window.speakAlertVoice = function(item, onComplete) {
  const done = typeof onComplete === 'function' ? onComplete : () => {};
  const url = item?.voiceUrl ? String(item.voiceUrl) : '';

  // No original recording: use the normal TTS engine.
  if (!url || item.voiceEnabled !== true || item.voiceStatus === 'rejected') {
    if (typeof originalSpeakAlertVoice === 'function') {
      originalSpeakAlertVoice(item, done);
    } else {
      done();
    }
    return;
  }

  // Original supporter recording: play the actual audio.
  const durationSec = Number(item.voiceDuration || 0);
  const configured = Number(siteSettings?.overlay?.duration || 6);
  const needed = Math.max(configured, durationSec + 1, 12);

  try {
    if (siteSettings?.overlay) {
      siteSettings.overlay.duration = needed;
    }
  } catch (_) {}

  audio.pause();
  audio.currentTime = 0;
  audio.src = url;

  audio.volume =
    siteSettings?.overlay?.volume !== undefined
      ? Number(siteSettings.overlay.volume)
      : 0.9;

  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    audio.onended = null;
    audio.onerror = null;
    done();
  };

  audio.onended = finish;
  audio.onerror = finish;

  setTimeout(() => {
    audio.play().catch(finish);
  }, 700);
      }, 0);
    });
  });
})();
