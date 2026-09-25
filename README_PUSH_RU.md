# Push-уведомления Bitrate (Web Push / Firebase Cloud Messaging)

## Что уже добавлено в сайт
- Кнопка «Включить уведомления» появляется после входа.
- Запрашивается разрешение браузера, регистрируется `firebase-messaging-sw.js`.
- FCM-токен сохраняется в `users/{uid}/pushTokens`.
- Service worker показывает push даже когда вкладка сайта закрыта (при условии, что браузер/ОС разрешают фоновые уведомления).
- Firebase Cloud Functions в `functions/index.js` отправляют push при новых сообщениях в личных чатах и группах.

## Важно
Сайт должен работать по HTTPS (или localhost для тестирования). Обычный открытый HTML-файл (`file://`) push не поддерживает. На iPhone/iPad Web Push обычно доступен для сайта, добавленного на экран «Домой», в поддерживаемой версии iOS.

## Настройка Firebase Cloud Messaging
1. Открой Firebase Console → Project settings → Cloud Messaging.
2. Убедись, что предоставленный VAPID key — ключ Web Push certificates для этого проекта. Он уже прописан в клиенте.
3. Включи/проверь Firebase Cloud Messaging API для проекта.
4. Установи Firebase CLI: `npm install -g firebase-tools`, затем `firebase login` и `firebase use bitrate-71684`.
5. Из папки `functions` выполни `npm install`.
6. В корне проекта создай `firebase.json` с содержимым:
   ```json
   {"functions":{"source":"functions","runtime":"nodejs22"}}
   ```
7. Разверни функции: `firebase deploy --only functions`.
8. Обнови сайт на HTTPS-хостинге. Убедись, что `firebase-messaging-sw.js` размещён в корне домена.

## Ограничения / заметки
- Для деплоя Cloud Functions проекту может понадобиться подключённый план Blaze (оплата по фактическому использованию, согласно тарифам Firebase/Google Cloud).
- Функции обрабатывают личные чаты, чей chatId построен как два UID через подчёркивание, и группы с полем `members` — как в текущем коде Bitrate.
- Канальные посты не включены в пуши, поскольку подписчики каналов и права на уведомления требуют отдельной логики.
- Пуш не может быть гарантирован, если пользователь запретил уведомления, устройство ограничивает фоновую работу или браузер не поддерживает Web Push.
