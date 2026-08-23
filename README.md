# الرباعية للنحل والعسل | Al Rabaa Apiaries

موقع عربي + نظام إدارة Node.js (عملاء، فواتير، متابعة إشراف، عقود).

## التشغيل محليًا

```bash
npm install
cp .env.example .env
npm start
```

افتح:
- الموقع: http://localhost:3000
- الإدارة: http://localhost:3000/admin.html

كلمة المرور الافتراضية: `alrabaa2026` (غيّرها في `.env`)

## النشر على Hostinger (Node.js)

1. في Hostinger اختر **Node.js web app**
2. اربط مستودع GitHub: `raspybd/honey-bees`
3. إعدادات التشغيل:
   - **Start command:** `npm start`
   - **Node version:** 18+
4. أضف متغير بيئة:
   - `ADMIN_PASSWORD=كلمة-قوية`
   - `PORT` عادة يضبطه Hostinger تلقائيًا
5. بعد النشر افتح `/admin.html` وسجّل الدخول

## ماذا يخزَّن على السيرفر؟

ملف البيانات: `data/db.json`

- العملاء
- الفواتير
- متابعة الإشراف والزيارات

صدّر نسخة احتياطية من تبويب النسخ الاحتياطي بانتظام.

## التواصل

واتساب: [+965 99787742](https://wa.me/96599787742)
