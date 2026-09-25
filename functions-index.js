const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
admin.initializeApp();
const db=admin.firestore();

async function sendToUsers(userIds, title, body, url){
  const ids=[...new Set((userIds||[]).filter(Boolean))];
  for(const uid of ids){
    const snap=await db.collection('users').doc(uid).collection('pushTokens').get();
    const docs=snap.docs;
    const tokens=docs.map(d=>d.get('token')).filter(Boolean);
    if(!tokens.length) continue;
    // FCM multicast supports up to 500 tokens per request.
    for(let i=0;i<tokens.length;i+=500){
      const chunk=tokens.slice(i,i+500);
      const response=await admin.messaging().sendEachForMulticast({
        tokens:chunk,
        notification:{title,body},
        data:{title,body,url},
        webpush:{fcmOptions:{link:url},notification:{icon:'/favicon.ico',badge:'/favicon.ico'}}
      });
      const invalid=[];
      response.responses.forEach((r,index)=>{
        if(!r.success && ['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(r.error?.code)) invalid.push(chunk[index]);
      });
      if(invalid.length){
        const batch=db.batch();
        docs.filter(d=>invalid.includes(d.get('token'))).forEach(d=>batch.delete(d.ref));
        await batch.commit();
      }
    }
  }
}

exports.pushDirectChatMessage=onDocumentCreated('chats/{chatId}/messages/{messageId}',async event=>{
  const m=event.data?.data(); if(!m || !m.from) return;
  // Existing Bitrate direct chat IDs are sorted Firebase UIDs joined with "_".
  const parts=String(event.params.chatId).split('_');
  if(parts.length!==2) return;
  const recipient=parts.find(id=>id!==m.from); if(!recipient) return;
  const preview=String(m.text||'Новое сообщение').slice(0,140);
  const sender=String(m.fromNickname||'Новое сообщение');
  await sendToUsers([recipient],`Сообщение от ${sender}`,preview,'/');
});

exports.pushGroupMessage=onDocumentCreated('groups/{groupId}/messages/{messageId}',async event=>{
  const m=event.data?.data(); if(!m || !m.from) return;
  const groupSnap=await db.collection('groups').doc(event.params.groupId).get();
  if(!groupSnap.exists) return;
  const group=groupSnap.data()||{};
  const members=Array.isArray(group.members)?group.members:[];
  const recipients=members.filter(uid=>uid!==m.from);
  const preview=String(m.text||'Новое сообщение').slice(0,140);
  await sendToUsers(recipients,`${group.name||'Группа'} · ${m.fromNickname||'Новое сообщение'}`,preview,'/');
});
