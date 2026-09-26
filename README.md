# ריסט — PWA

PWA אישית למעקב אחרי רצף, דחפים, טריגרים ו-90 יום.

## הרצה מקומית

מתוך תיקיית הפרויקט:

```bash
python -m http.server 8080
```

ב-Windows, אם `python` לא מזוהה:

```bash
py -m http.server 8080
```

ואז פותחים בדפדפן:

`http://localhost:8080`

## מה כלול

- שעון רצף חי: ימים / שעות / דקות / שניות מאז האיפוס האחרון.
- איפוס רצף עם שמירת ההיסטוריה ותחילת הספירה מחדש מיד.
- מאגר גדול של משפטי מוטיבציה שפועל כ"חפיסה": אין חזרה עד שכל המאגר הוצג, ואז הוא מתערבב מחדש.
- החלפת משפט אוטומטית כל 12 שניות + כפתור למשפט הבא.
- מסלול 90 יום, משימות, SOS, צ'ק-אין, טריגרים, יומן וסטטיסטיקות.
- שמירה מקומית ב-localStorage, ללא שרת חיצוני.
- Service Worker, manifest, מצב בהיר/כהה, RTL ואנימציות.

- Trigger Coach: כל טריגר פותח זרימת פעולה מותאמת, צ'קליסט ביצוע, טיימר ובדיקה חוזרת של עוצמת הדחף.
- v5: מסך הבית עוצב מחדש כדאשבורד: שעון חי, משפט מוטיבציה, CTA לדחף, מצב התהליך, משימת היום ונתונים קצרים במקום אחד.

- v7: מצב דיסקרטי עם זהות התקנה ניטרלית (פוקוס), ניסוחים ניטרליים ומסך פרטיות בעת מעבר לרקע.
- v7: דוח שבועי חכם שמשווה לשבוע הקודם, מזהה דפוסים/שעות, מודד יעילות פעולות ומציע צעד לשבוע הבא.

- v8: כל איפוס נרשם כנפילה/התחלה מחדש עם timestamp מקומי, יום ושעה.
- v8: מסך סטטיסטיקות נפילות לומד יום בשבוע, שעות חוזרות וטריגר שתועד עד שעתיים לפני האיפוס.
- v8: אחרי הצטברות נתונים, תובנת סיכון מופיעה גם בדאשבורד והדוח השבועי משתמש בדפוס שנלמד.


## AI chat backend

The app includes a dedicated AI chat screen. The frontend calls a Cloudflare Worker at `https://reset-ai.eladshimonn.workers.dev/chat`.

The Worker validates the signed-in Appwrite user with a short-lived JWT and keeps the OpenAI API key on the server.

Deploy:

```bash
cd ai-worker
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

If your Workers subdomain differs, update `AI_CHAT_ENDPOINT` in `app.js`.
