# Bitrate без ИИ

Версия Bitrate без TomatoAI, Groq и любых AI API-вызовов. Сохранены клиент Firebase и push-уведомления.

## Запуск
1. Разместите сайт на HTTPS-хостинге.
2. Для push-уведомлений установите зависимости в папке `functions`: `npm install`.
3. Выполните вход в Firebase CLI и выберите проект `bitrate-71684`.
4. Разверните функции из корня проекта: `firebase deploy --only functions`.
5. Объедините правила из `firestore-tomatoai.rules.txt` с действующими правилами Firestore внутри правильного блока `match /databases/{database}/documents`. Не заменяйте ими все правила проекта без проверки.

Push требует разрешения уведомлений в браузере, HTTPS и развернутых Cloud Functions. Включение уведомлений доступно в самом приложении.
