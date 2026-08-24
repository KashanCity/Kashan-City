# DigiWeb | دیجی وب

وب‌سایت دیجی وب — ساخته‌شده با React + Vite + Tailwind CSS.

## اجرا روی سیستم خودت

```bash
npm install
npm run dev
```

سپس آدرس نمایش‌داده‌شده در ترمینال (معمولاً http://localhost:5173) را باز کن.

## Build نهایی

```bash
npm run build
```

خروجی در پوشه `dist` ساخته می‌شود.

## آپلود روی گیت‌هاب

```bash
git init
git add .
git commit -m "Initial commit - DigiWeb website"
git branch -M main
git remote add origin <آدرس ریپازیتوری گیت‌هاب شما>
git push -u origin main
```

## ساختار پروژه

```
digiweb-project/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── App.jsx      (کل کد سایت)
    └── index.css
```
