importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyD0U_7IJTQS_Lo6vMVp4l4_wIYlvxeG8Rg",
  authDomain: "bitrate-71684.firebaseapp.com",
  databaseURL: "https://bitrate-71684-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bitrate-71684",
  storageBucket: "bitrate-71684.firebasestorage.app",
  messagingSenderId: "794345122154",
  appId: "1:794345122154:web:97fa87fbdf4cf066895d13",
  measurementId: "G-ZY44TPBTF0"
});
const messaging=firebase.messaging();
messaging.onBackgroundMessage(payload=>{
  const title=payload.notification?.title || payload.data?.title || 'Bitrate';
  const options={body:payload.notification?.body || payload.data?.body || 'У вас новое сообщение',icon:'/favicon.ico',badge:'/favicon.ico',data:{url:payload.data?.url || '/'}};
  return self.registration.showNotification(title,options);
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification.data?.url || '/';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if('focus' in client){client.navigate(url);return client.focus();}}
    return clients.openWindow(url);
  }));
});
