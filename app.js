const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const DAY = 86400000;
const KEY = 'reset90-state-v3';
const localISO = (d=new Date()) => { const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; };
const todayISO = () => localISO();
const freshState = () => ({startDate:todayISO(),resetAt:new Date().toISOString(),best:0,bestMs:0,slips:[],checkins:[],urges:[],interventions:[],journal:[],completedDays:{},notifications:true,theme:'dark',discreet:false,nickname:'אלעד',currentView:'home',why:'',quoteDeck:[],quoteCursor:0});
let state = load();
let currentView = state.currentView || 'home';
let touchStartX = 0, touchStartY = 0, sosTimer = null, homeClockTimer = null, quoteTimer = null, transitionClass = '', urgeDraft = null;

function load(){
  try{
    const v1=JSON.parse(localStorage.getItem('reset90-state-v1')||'null');
    const v2=JSON.parse(localStorage.getItem('reset90-state-v2')||'null');
    const current=JSON.parse(localStorage.getItem(KEY)||'null');
    const source=current||v2||v1;
    const data={...freshState(), ...(source||{})};
    if(!source) return data;
    if(!source.resetAt){
      const legacy=source.startDate||data.startDate||todayISO();
      const migrated=new Date(`${legacy}T00:00:00`);
      data.resetAt=Number.isNaN(migrated.getTime())?new Date().toISOString():migrated.toISOString();
    }
    return data;
  }catch{return freshState();}
}
function save(){ localStorage.setItem(KEY,JSON.stringify(state)); window.FocusCloud?.scheduleSync?.(state); }
function resetTimestamp(){
  const ts=Date.parse(state.resetAt||'');
  if(Number.isFinite(ts)) return ts;
  const fallback=Date.parse(`${state.startDate||todayISO()}T00:00:00`);
  return Number.isFinite(fallback)?fallback:Date.now();
}
function elapsedMs(){ return Math.max(0,Date.now()-resetTimestamp()); }
function daysSince(date){ const a=new Date(date+'T00:00:00'); const b=new Date(); b.setHours(0,0,0,0); return Math.max(0,Math.floor((b-a)/DAY)); }
function streak(){ return Math.floor(elapsedMs()/DAY)+1; }
function cleanDays(){ return Math.floor(elapsedMs()/DAY); }
function updateBest(){
  const ms=elapsedMs();
  const dayValue=Math.floor(ms/DAY)+1;
  let changed=false;
  if(ms>(state.bestMs||0)){state.bestMs=ms;changed=true;}
  if(dayValue>(state.best||0)){state.best=dayValue;changed=true;}
  if(changed)save();
}
function pct(n,d=90){ return Math.max(0,Math.min(100,Math.round(n/d*100))); }
function esc(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function haptic(ms=12){ try{navigator.vibrate?.(ms)}catch{} }

const icons={
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7Z"/></svg>',
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>',
  settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05-2.78 2.78-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21h-3.8v-.07A1.8 1.8 0 0 0 9 19.3a1.8 1.8 0 0 0-1.98.36l-.05.05-2.78-2.78.05-.05A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.1H3v-3.8h.07A1.8 1.8 0 0 0 4.7 9a1.8 1.8 0 0 0-.36-1.98l-.05-.05 2.78-2.78.05.05A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1.1-1.65V3h3.8v.07A1.8 1.8 0 0 0 15 4.7a1.8 1.8 0 0 0 1.98-.36l.05-.05 2.78 2.78-.05.05A1.8 1.8 0 0 0 19.4 9a1.8 1.8 0 0 0 1.65 1.1H21v3.8h-.07A1.8 1.8 0 0 0 19.4 15Z"/></svg>',
  stats:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>',
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z"/></svg>',
  journey:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="17" r="2"/><circle cx="19" cy="7" r="2"/><path d="M7 16c3-1 3-5 6-6 2-.7 2.5 1 4 0"/></svg>',
  tools:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m14.7 6.3 3-3a4 4 0 0 1-5 5L5 16l3 3 7.7-7.7a4 4 0 0 1-1-5Z"/></svg>',
  smile:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 10h.01M15.5 10h.01M8.5 14.5c1 1.1 2.1 1.6 3.5 1.6s2.5-.5 3.5-1.6"/></svg>',
  bolt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m13 2-7 11h5l-1 9 8-12h-5V2Z"/></svg>',
  journal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h11a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V3Z"/><path d="M8 8h7M8 12h7M8 16h4M5 19a2 2 0 0 1 2-2h11"/></svg>',
  target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v2M22 12h-2"/></svg>',
  reset:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7v5h5"/><path d="M5.2 16a8 8 0 1 0 .5-9.2L4 8"/></svg>',
  wave:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 13c2.2 0 2.2-4 4.4-4s2.2 7 4.4 7 2.2-9 4.4-9 2.2 6 4.8 6"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>',
  spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/></svg>'
};
const icon=n=>icons[n]||icons.spark;

const motivationalQuotes=[
  "הדחף לא מחליט בשבילך. הוא רק עובר דרכך.",
  "עוד דקה של בחירה מודעת שווה יותר מעוד שעה על טייס אוטומטי.",
  "אתה לא צריך להרגיש חזק כדי לבחור נכון.",
  "המטרה היא לא לא להרגיש דחף — אלא לא להיות מנוהל על ידו.",
  "כל פעם שאתה עוצר את האוטומט, אתה מחזק מסלול חדש.",
  "רגע קשה הוא לא יום אבוד.",
  "תן לדחף להיות רעש ברקע, לא הוראה לביצוע.",
  "אתה בונה אמון בעצמך בכל בחירה קטנה.",
  "אין צורך לנצח את השבוע. רק את הדקות הקרובות.",
  "דחף הוא תחושה, לא פקודה.",
  "היום לא חייב להיות מושלם כדי להיחשב הצלחה.",
  "אל תחפש מוטיבציה. תעשה את הצעד הבא גם בלעדיה.",
  "הגרסה שאתה רוצה להיות נוצרת דווקא ברגעים שאף אחד לא רואה.",
  "שעמום עובר. גם מתח עובר. אין צורך לפתור אותם באוטומט.",
  "בחירה אחת טובה עכשיו משנה את הכיוון של כל הערב.",
  "אתה לא מוותר על משהו — אתה מחזיר לעצמך שליטה.",
  "הדחף יעלה, יגיע לשיא ויירד. תן לזמן לעבוד בשבילך.",
  "עצרת לשנייה? כבר שברת את האוטומט.",
  "אין משמעות לכמה פעמים רצית. יש משמעות למה שבחרת לעשות.",
  "לא צריך להתווכח עם המחשבה. אפשר לתת לה לחלוף.",
  "כל יום נקי הוא הוכחה שאתה מסוגל לבחור אחרת.",
  "כשקשה, תקטין את המשימה: עוד חמש דקות.",
  "שינוי אמיתי מרגיש לפעמים משעמם. זה סימן שההרגל הישן מאבד כוח.",
  "אל תמדוד את עצמך לפי הדחף. מדוד לפי התגובה שלך אליו.",
  "מה שאתה עושה עכשיו חשוב יותר ממה שעשית אתמול.",
  "המוח לומד מחזרות. תן לו עוד חזרה אחת בכיוון שאתה רוצה.",
  "אתה לא חייב לספק כל צורך ברגע שהוא מופיע.",
  "תנועה קטנה עדיפה על משא ומתן ארוך עם עצמך.",
  "קום, שתה מים, החלף חדר. לפעמים זה כל מה שצריך כדי לשבור את הלולאה.",
  "ההתקדמות שלך לא נמדדת רק במספר שעל השעון, אלא בכמה פעמים בחרת בעצמך.",
  "רצף הוא תוצאה. שליטה היא המטרה.",
  "יום אחד בכל פעם הוא לא קלישאה — זו הדרך שבה הרגלים משתנים.",
  "המוח מבקש את המוכר. אתה יכול לבחור את הטוב יותר.",
  "גם דחף חזק מגיע עם סוף.",
  "אל תיתן לחמש דקות להחליט איך תרגיש בשעה שאחריהן.",
  "הבחירה הכי חשובה היא זו שמגיעה כשלא מתחשק לבחור.",
  "אתה לא נלחם בעצמך. אתה מאמן את עצמך.",
  "חופש מתחיל במקום שבו האוטומט נעצר.",
  "רק בגלל שמחשבה הופיעה, לא צריך להמשיך איתה.",
  "אם הראש מחפש תירוץ, החלף סביבה לפני שתענה לו.",
  "הדקה הראשונה היא בדרך כלל הקשה ביותר. תעבור אותה.",
  "לא כל דחף צריך סיפור. לפעמים הוא פשוט עייפות, שעמום או מתח.",
  "תזכור למה התחלת לפני שאתה מחליט איך להמשיך.",
  "תן לעצמך להיות לא נוח בלי לברוח מיד מהתחושה.",
  "הרגל ישן נחלש בכל פעם שאתה לא מזין אותו.",
  "אין קיצור דרך לביטחון עצמי. בונים אותו מהבטחות קטנות שמקיימים לעצמנו.",
  "היום הזה עדיין בידיים שלך.",
  "עצירה של עשר שניות יכולה למנוע שעה של חרטה.",
  "אתה יכול לרצות משהו ועדיין לבחור לא לעשות אותו.",
  "התחושה דחופה; המציאות לא.",
  "כשאתה עייף, אל תקבל החלטות מתוך אוטומט. שנה מקום קודם.",
  "תבחר פעולה שמקרבת אותך לעצמך של מחר.",
  "המטרה היא לא לדכא את עצמך. המטרה היא לבחור במודע.",
  "תזוז לפני שהמחשבה הופכת ללולאה.",
  "גם אם היום קשה, הרצף שלך נבנה שנייה אחרי שנייה.",
  "אתה לא חייב לפתור הכול עכשיו. רק לא לעשות את הדבר שאתה יודע שירחיק אותך מהמטרה.",
  "הדחף לא גדל לנצח. אם לא תאכיל אותו, הוא ייחלש.",
  "כוח רצון נגמר. סביבה טובה ממשיכה לעבוד.",
  "סגור את המסך, קום מהכיסא, ותן לגוף להוביל את הראש החוצה מהלולאה.",
  "שינוי לא תמיד מרגיש דרמטי. לרוב הוא נראה כמו בחירה שקטה אחת.",
  "כל 'לא עכשיו' שאתה אומר לאוטומט הוא 'כן' למשהו שבחרת באמת.",
  "אל תנסה להבטיח שלעולם לא. תבחר לא עכשיו.",
  "גם כשאין לך חשק להתקדם, אתה יכול להימנע מללכת אחורה.",
  "הדחף שלך לא אומר שום דבר על הערך שלך.",
  "במקום לשאול 'כמה זמן אחזיק?', שאל 'מה הצעד הבא?'.",
  "המוח אוהב מסלול מוכר. אתה סולל לו מסלול חדש.",
  "הצלחה היא לא להפסיק להרגיש. הצלחה היא להפסיק לפעול אוטומטית.",
  "אם אתה לבד עם המחשבה יותר מדי זמן, שנה הקשר: אור, חדר, מוזיקה, תנועה.",
  "אין צורך בכוח ענק. צריך חיכוך קטן בין הדחף לפעולה.",
  "אתה בונה מערכת יחסים חדשה עם עצמך — אחת שבה המילה שלך שווה משהו.",
  "רגע אחד של משמעת יכול להחזיר ערב שלם למסלול.",
  "אל תיתן לעייפות להתחפש להחלטה.",
  "ככל שאתה מזהה את הטריגר מוקדם יותר, כך הוא פחות חזק.",
  "אם המחשבה חוזרת, גם הבחירה שלך יכולה לחזור.",
  "אין בעיה להתחיל מחדש. אבל כרגע יש לך הזדמנות להמשיך.",
  "לפעמים ניצחון נראה פשוט כמו להניח את הטלפון בצד.",
  "תן לעצמך עשר דקות לפני כל החלטה אימפולסיבית.",
  "אתה לא מפסיד משהו כשאתה שומר על הגבול שקבעת לעצמך.",
  "הגוף יכול להיות חסר שקט בלי שאתה חייב להגיב מיד.",
  "כל פעם שאתה נשאר עם התחושה והיא חולפת, המוח לומד שהיא לא מסוכנת.",
  "אל תסתכל על 90 יום. תסתכל על השעה הקרובה.",
  "השקט שאחרי בחירה טובה שווה את חוסר הנוחות שלפניה.",
  "אתה לא צריך להצדיק את הגבול שלך בפני הדחף.",
  "מחשבה היא אירוע בראש, לא חוזה שאתה חייב לקיים.",
  "כשאין לך תוכנית, ההרגל הישן מציע אחת. תכין פעולה חלופית מראש.",
  "עוד ערב שבו בחרת בעצמך הוא לא 'סתם עוד ערב'. הוא אימון.",
  "אל תנסה למחוק את הדחף. תן לו לעבור בלי להצטרף אליו.",
  "התקדמות היא כשאותו טריגר מקבל תגובה חדשה.",
  "השאלה היא לא אם יהיה קשה. השאלה היא מה תעשה כשיהיה קשה.",
  "תשאיר פחות מקום למשא ומתן: החלטה מראש חזקה מהחלטה בזמן דחף.",
  "רצף יכול להישבר; הידע שצברת לא נעלם.",
  "גם אם הראש אומר 'רק פעם אחת', אתה עדיין זה שמחליט.",
  "תן למחר לקבל ממך מתנה קטנה: בחירה טובה עכשיו.",
  "הרגע הזה זמני. הכיוון שאתה בונה יכול להישאר.",
  "תזכור: תחושת דחיפות היא חלק מהדחף, לא הוכחה שאתה חייב לפעול.",
  "כשהאוטומט מתחיל, תעשה משהו שאי אפשר לעשות באותו מצב: קום, צא, התקשר, התאמן.",
  "אתה לא מתחיל מאפס בכל יום. אתה מתחיל עם כל מה שלמדת עד עכשיו."
];

function shuffledQuoteDeck(avoid=-1){
  const deck=motivationalQuotes.map((_,i)=>i);
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  if(deck.length>1&&deck[0]===avoid){[deck[0],deck[1]]=[deck[1],deck[0]];}
  return deck;
}
function ensureQuoteDeck(){
  const valid=Array.isArray(state.quoteDeck)&&state.quoteDeck.length===motivationalQuotes.length&&state.quoteDeck.every(i=>Number.isInteger(i)&&i>=0&&i<motivationalQuotes.length);
  if(!valid){state.quoteDeck=shuffledQuoteDeck();state.quoteCursor=0;save();}
  if(!Number.isInteger(state.quoteCursor)||state.quoteCursor<0||state.quoteCursor>=state.quoteDeck.length)state.quoteCursor=0;
}
function currentQuote(){ensureQuoteDeck();return motivationalQuotes[state.quoteDeck[state.quoteCursor]];}
function advanceQuote(){
  ensureQuoteDeck();
  const previous=state.quoteDeck[state.quoteCursor];
  state.quoteCursor+=1;
  if(state.quoteCursor>=state.quoteDeck.length){state.quoteDeck=shuffledQuoteDeck(previous);state.quoteCursor=0;}
  save();
  return motivationalQuotes[state.quoteDeck[state.quoteCursor]];
}

const dailyTasks=[
 ['זהה את הרגעים המסוכנים','רשום מתי בדרך כלל עולה אצלך הדחף ומה קורה רגע לפניו.'],
 ['שנה את הסביבה','בחר שינוי אחד קטן שמקשה על פעולה אוטומטית: טלפון מחוץ לחדר, דלת פתוחה או יציאה מהבית.'],
 ['10 דקות במקום','כשעולה דחף, דחה אותו בעשר דקות ועשה פעולה פיזית קצרה.'],
 ['כתוב את הסיבה שלך','נסח במשפט אחד למה החלטת להתחיל. המשפט יחכה לך במסך החירום.'],
 ['בלי טייס אוטומטי','שים לב לטריגר אחד היום עוד לפני שהוא הופך לדחף.'],
 ['תנועה','עשה לפחות 15 דקות של פעילות גופנית מכוונת.'],
 ['סיכום שבוע','מה עבד השבוע ומה כדאי לשנות לשבוע הבא?']
];
const phases=[
 {from:1,to:7,title:'שבירת האוטומט',desc:'זיהוי טריגרים ובניית מרווח בין דחף לפעולה',ico:'wave'},
 {from:8,to:14,title:'יציבות ראשונה',desc:'החלפת הרגלים ושגרה שמורידה חיכוך',ico:'target'},
 {from:15,to:30,title:'בונים שליטה',desc:'כלים לדחפים, שינה, שעמום וסביבה',ico:'tools'},
 {from:31,to:60,title:'זה כבר שלך',desc:'העמקת ההרגלים וחזרה מהירה אחרי ימים קשים',ico:'spark'},
 {from:61,to:90,title:'חופש',desc:'תחזוקה, זהות חדשה ותוכנית המשך',ico:'journey'}
];
const triggerLabels=['שעמום','מתח','בדידות','כעס/תסכול','עייפות','לילה','טלפון','תוכן ברשת','הרגל אוטומטי','חרדה','אחר'];
const triggerActionPlans={
  'שעמום':[
    {id:'bored-move',title:'שינוי מקום + 5 דקות תנועה',desc:'שוברים את האוטומט דרך הגוף והסביבה.',duration:300,steps:['קום מהמקום שבו אתה נמצא','עבור לחדר אחר או צא החוצה','עשה הליכה קצרה, מתיחות או 20 סקוואטים']},
    {id:'bored-task',title:'משימת 10 דקות',desc:'נותנים למוח יעד קטן ומוגדר במקום גלילה.',duration:600,steps:['בחר משימה אחת קטנה שאפשר לסיים','שים את הטלפון מחוץ להישג יד','עבוד עליה 10 דקות בלי להחליף משימה']},
    {id:'bored-contact',title:'לצאת מהבועה',desc:'מחליפים שעמום בסביבה פעילה או בקשר.',duration:180,steps:['קום ועבור למקום אחר','שלח הודעה קצרה למישהו או פתח שיחה','הישאר מחוץ למקום שבו התחיל הדחף לפחות 3 דקות']}
  ],
  'מתח':[
    {id:'stress-breathe',title:'נשימה + הורדת עוררות',desc:'קודם מרגיעים את הגוף, אחר כך מחליטים.',duration:120,steps:['הנח את שתי הרגליים על הרצפה','בצע 8 נשימות איטיות עם נשיפה ארוכה יותר','שתה כוס מים לפני שאתה ממשיך']},
    {id:'stress-walk',title:'הליכת פריקה קצרה',desc:'מוציאים את המתח מהראש אל הגוף.',duration:300,steps:['קום מיד מהמקום','לך 5 דקות בלי מסך ביד','שים לב ל-3 דברים שאתה רואה ו-3 דברים שאתה שומע']},
    {id:'stress-write',title:'לפרוק במקום לברוח',desc:'נותנים למתח שם וסיבה במקום לפעול עליו.',duration:180,steps:['כתוב במשפט אחד מה מלחיץ אותך','כתוב מה הדבר הכי קטן שאתה יכול לעשות בנוגע לזה','עשה רק את הצעד הקטן הזה']}
  ],
  'בדידות':[
    {id:'alone-public',title:'לעבור למרחב משותף',desc:'הסביבה עושה חלק מהעבודה בשבילך.',duration:300,steps:['צא מהחדר או השאר את הדלת פתוחה','עבור לסלון, מטבח, מרפסת או מקום ציבורי','הישאר שם 5 דקות לפחות']},
    {id:'alone-contact',title:'קשר אנושי עכשיו',desc:'לא צריך שיחת עומק — רק לשבור את הבידוד.',duration:180,steps:['בחר אדם אחד שקל לפנות אליו','שלח הודעה, התקשר או פתח שיחה קצרה','אל תחזור למקום הפרטי לפני שהשיחה הסתיימה']},
    {id:'alone-outside',title:'לצאת החוצה',desc:'שינוי פיזי חד יכול לסיים את הלולאה לפני שהיא מתחזקת.',duration:300,steps:['לבש נעליים','צא מהבית/בניין או עשה סיבוב קצר','השאר את הטלפון בכיס בזמן ההליכה']}
  ],
  'כעס/תסכול':[
    {id:'anger-release',title:'פריקת אנרגיה בטוחה',desc:'מעבירים את העומס לגוף בלי להישאר בלולאה.',duration:300,steps:['קום מהמקום','עשה הליכה מהירה או סט קצר של תרגילים','סיים בדקה של נשימות איטיות']},
    {id:'anger-cool',title:'מים קרים לפנים + מעבר מקום',desc:'שינוי תחושתי קצר יכול לשבור הצפה.',duration:120,steps:['קום מהמסך','שטוף פנים במים קרירים','עבור למקום אחר לשתי דקות']},
    {id:'anger-write',title:'לכתוב בלי לשלוח',desc:'מוציאים את התסכול החוצה בלי לפעול באימפולס.',duration:180,steps:['כתוב מה הכעיס אותך','אל תשלח את הטקסט לאף אחד עדיין','בחר פעולה אחת רגועה להמשך']}
  ],
  'לילה':[
    {id:'night-phone',title:'הטלפון מחוץ למיטה',desc:'בלילה עדיף לשנות תנאים במקום להתווכח עם הדחף.',duration:300,steps:['חבר את הטלפון לטעינה הרחק מהמיטה','כבה תוכן/גלילה והדלק אור בחדר','חזור למיטה רק בלי הטלפון ביד']},
    {id:'night-reset',title:'איפוס שגרת שינה',desc:'מחליפים את הלולאה בטקס קצר ומוכר.',duration:300,steps:['קום מהמיטה','שטוף פנים או צחצח שיניים','חזור עם פעילות שקטה שאינה מסך למשך 5 דקות']},
    {id:'night-room',title:'לצאת מהחדר ל-5 דקות',desc:'אם הדחף התחזק במקום מסוים, לא נשארים איתו שם.',duration:300,steps:['צא מיד מהחדר','שתה מים או עשה מתיחה קצרה','חזור רק כשהעוצמה ירדה']}
  ],
  'טלפון':[
    {id:'phone-away',title:'להרחיק את הטלפון',desc:'מוסיפים חיכוך פיזי לפני שהאצבע ממשיכה לבד.',duration:300,steps:['נעל את המסך עכשיו','הנח את הטלפון בחדר אחר או במרחק כמה מטרים','עשה פעילות בלי מסך במשך 5 דקות']},
    {id:'phone-block',title:'לסגור את המסלול',desc:'לא מסתמכים על כוח רצון כשאפשר לחסום את הדרך.',duration:180,steps:['סגור את האפליקציה/הדפדפן שהפעילו אותך','הפעל חסימה או זמן מסך אם יש לך','הנח את המכשיר בצד']},
    {id:'phone-hands',title:'להעסיק ידיים וגוף',desc:'שינוי פעולה פיזית עוזר לצאת מהאוטומט.',duration:300,steps:['הנח את הטלפון','קח מים, סדר משהו או התחל משימה ידנית','הישאר בפעילות 5 דקות']}
  ],
  'תוכן ברשת':[
    {id:'content-close',title:'סגירה מלאה של התוכן',desc:'לא עוד "רק שנייה" — מסיימים את החשיפה.',duration:180,steps:['סגור את הטאב/האפליקציה לחלוטין','עבור למסך הבית','קום מהמקום למשך 3 דקות']},
    {id:'content-block',title:'לחסום את המקור',desc:'הופכים את הבחירה הבאה לקלה יותר כבר עכשיו.',duration:180,steps:['זהה את המקור שהפעיל אותך','חסום אותו בכלי החסימה שבו אתה משתמש','בדוק שהוא לא נפתח מחדש']},
    {id:'content-switch',title:'מעבר חד לפעילות אחרת',desc:'לא נשארים באותה לולאת מסך.',duration:300,steps:['סגור את כל המסכים הקשורים','בחר פעילות אחת שאינה גלילה','בצע אותה 5 דקות בלי לחזור לבדוק']}
  ]
};

const adaptiveActions=[
 {id:'shield-now',title:'מיגון מיידי ל-5 דקות',desc:'כשזה חזק מאוד, קודם מורידים גישה ומחליפים סביבה.',duration:300,steps:['קום מהמקום שבו התחיל הדחף','הרחיק את הטלפון או המסך','עבור למקום פתוח/משותף והישאר שם 5 דקות'],weight:15,highIntensity:true},
 {id:'leave-room',title:'לצאת מהחדר עכשיו',desc:'שינוי מקום חד הוא אחד הקיצורים הכי טובים לשבירת לולאה.',duration:180,steps:['קום בלי להתווכח עם עצמך','צא מהחדר','הישאר במקום אחר 3 דקות'],weight:9,activities:['מיטה','גלילה','ישיבה לבד']},
 {id:'lego-build',title:'לפנות לבנייה של לגו',desc:'להעביר את הידיים והראש למשימה מוחשית שמושכת אותך פנימה.',duration:600,steps:['קח את הסט או החלקים שנמצאים לידך','בחר שלב אחד קטן בלבד','בנה 10 דקות בלי טלפון'],triggers:['שעמום','בדידות','מתח','הרגל אוטומטי'],requiresResource:'lego-near',weight:11},
 {id:'lego-fetch',title:'ללכת להביא את הלגו',desc:'אם הוא לא לידך, עצם ההליכה אליו שוברת את הרצף האוטומטי.',duration:600,steps:['קום מהמקום עכשיו','לך למקום שבו הלגו נמצא','בחר שלב קטן ובנה 10 דקות'],triggers:['שעמום','בדידות','מתח','הרגל אוטומטי'],requiresResource:'lego-away',weight:12},
 {id:'quick-shower',title:'מקלחת קצרה ואיפוס',desc:'שינוי תחושתי וסביבתי יכול להוריד את העוררות.',duration:300,steps:['השאר את הטלפון מחוץ לחדר הרחצה','היכנס למקלחת קצרה','צא, התלבש ועבור למקום אחר'],requiresResource:'shower',weight:7},
 {id:'cool-face',title:'מים קרירים לפנים',desc:'איפוס קצר בלי להיכנס למקלחת מלאה.',duration:90,steps:['עזוב את המסך','שטוף פנים במים קרירים','קח 6 נשימות איטיות'],requiresResource:'water',weight:6,feelings:['חרדה','כעס/תסכול','מתח']},
 {id:'water-reset',title:'מים + מעבר חדר',desc:'פעולה פשוטה שמוציאה אותך מהנקודה שבה התחילה הלולאה.',duration:180,steps:['קום מיד','שתה כוס מים מלאה','עבור לחדר אחר ל-3 דקות'],requiresResource:'water',weight:6},
 {id:'micro-workout',title:'אימון קצר',desc:'להשתמש באנרגיה של הדחף במקום להילחם בה בראש.',duration:300,steps:['קום מהכיסא/מיטה','עשה 3 סבבים של 10 סקוואטים או שכיבות סמיכה','סיים בדקה של נשימות איטיות'],requiresResource:'exercise',weight:8,feelings:['כעס/תסכול','מתח','חוסר שקט']},
 {id:'outside-walk',title:'לצאת לסיבוב',desc:'סביבה חדשה מורידה את העוצמה של הרבה טריגרים.',duration:600,steps:['נעל נעליים','צא מהבית או הבניין','לך 10 דקות בלי לגלול'],requiresResource:'walk',requires:'can-leave',weight:9},
 {id:'shared-space',title:'לעבור למקום עם אנשים',desc:'אם אתה לבד, שינוי הסביבה עושה חלק מהעבודה בשבילך.',duration:300,steps:['צא מהחדר','עבור למקום משותף או ציבורי','הישאר שם 5 דקות'],requires:'alone',weight:10},
 {id:'music-task',title:'מוזיקה + משימה בידיים',desc:'מחליפים את האוטומט בפעילות מוגדרת ולא פסיבית.',duration:600,steps:['בחר פלייליסט אחד','הנח את הטלפון רחוק אחרי ההפעלה','סדר, נקה או הרכב משהו 10 דקות'],requiresResource:'music',weight:6},
 {id:'study-sprint',title:'ספרינט לימוד של 10 דקות',desc:'יעד קצר וברור נותן למוח משהו אחר להיצמד אליו.',duration:600,steps:['פתח רק חומר אחד','כוון טיימר ל-10 דקות','עשה תרגיל אחד או קרא עמודים ספורים'],requiresResource:'study',triggers:['שעמום','הרגל אוטומטי'],weight:7},
 {id:'small-task',title:'משימה קטנה של 5 דקות',desc:'כשאין כוח לפרויקט גדול, עושים משהו קטן וסגור.',duration:300,steps:['בחר משימה אחת קטנה','שים את הטלפון בצד','סיים רק את המשימה הזאת'],requiresResource:'task',weight:6},
 {id:'message-someone',title:'לשלוח הודעה למישהו',desc:'לא חייבים לדבר על הדחף — רק לצאת מבידוד.',duration:180,steps:['בחר אדם אחד','שלח הודעה פשוטה','אל תחזור למסך/מקום שהפעיל אותך עד שיש שינוי הקשר'],requiresResource:'contact',requires:'alone',weight:8},
 {id:'call-someone',title:'להתקשר למישהו',desc:'קול אנושי ושינוי הקשר יכולים לשבור את הרגע מהר.',duration:300,steps:['בחר אדם אחד שקל לדבר איתו','התקשר גם בלי להסביר למה','הישאר בשיחה כמה דקות'],requiresResource:'contact',requires:'alone',weight:8},
 {id:'phone-lock',title:'לנעול ולהרחיק את הטלפון',desc:'אם הטלפון חלק מהלולאה, עדיף להסיר אותו פיזית.',duration:300,steps:['נעל את המסך','שים את הטלפון בחדר אחר','בצע פעולה אחרת 5 דקות'],triggers:['טלפון','תוכן ברשת','לילה'],activities:['גלילה'],weight:12},
 {id:'bed-exit',title:'לצאת מהמיטה',desc:'אם המיטה הפכה לטריגר, לא נשארים באותה תנוחה וסביבה.',duration:300,steps:['קום מהמיטה','הדלק אור','עבור לחדר אחר ל-5 דקות'],activities:['מיטה'],weight:12},
 {id:'breath-90',title:'90 שניות נשימה',desc:'להוריד את העוררות לפני שבוחרים את הצעד הבא.',duration:90,steps:['הנח רגליים על הרצפה','שאף 4 שניות ונשוף 6 שניות','חזור על זה 9 פעמים'],requiresResource:'breathing',weight:5,feelings:['חרדה','מתח','כעס/תסכול']},
 {id:'write-two-lines',title:'לכתוב שתי שורות',desc:'לתת שם למה שקורה במקום לברוח ממנו.',duration:180,steps:['כתוב מה אתה מרגיש עכשיו','כתוב מה אתה באמת צריך כרגע','בחר צעד קטן אחד בהתאם'],requiresResource:'journal',triggers:['מתח','חרדה','בדידות'],weight:7},
 {id:'remember-why',title:'להיזכר למה התחלת',desc:'כשהראש מצמצם את העולם לרגע הזה, מחזירים את התמונה הגדולה.',duration:120,steps:['פתח את הסיבה ששמרת באפליקציה','קרא אותה לאט פעמיים','כתוב משפט אחד שאתה רוצה לזכור בעוד שעה'],weight:6,requiresWhy:true},
 {id:'quiet-audio',title:'צליל רגוע בלי גלילה',desc:'מחליפים גירוי חזותי ברקע שמע רגוע.',duration:300,steps:['בחר מוזיקה או צליל רגוע','כבה את המסך','הישאר 5 דקות בלי לפתוח אפליקציות אחרות'],requiresResource:'music',feelings:['חרדה','מתח','עייפות'],weight:5},
 {id:'night-reset-action',title:'טקס לילה בלי מסך',desc:'כשהעייפות והלילה מתחברים לדחף, משנים את כל ההקשר.',duration:600,steps:['הנח את הטלפון מחוץ למיטה','שטוף פנים/צחצח שיניים','עשה 10 דקות של פעילות שקטה בלי מסך'],triggers:['לילה','עייפות'],weight:9}
];

const resourceLabels={
 'lego-near':'לגו לידי',
 'lego-away':'לגו נמצא במקום אחר',
 'shower':'מקלחת',
 'water':'מים',
 'exercise':'אפשר להתאמן',
 'walk':'אפשר לצאת להליכה',
 'contact':'אפשר לפנות למישהו',
 'music':'מוזיקה/אוזניות',
 'study':'חומר לימוד',
 'journal':'אפשר לכתוב',
 'task':'יש משימה קטנה לעשות',
 'breathing':'נשימה'
};
const feelingLabels=['רגוע יחסית','משועמם','לחוץ','חרד','בודד','כועס/מתוסכל','עייף','חסר שקט'];
const activityLabels=['מיטה','גלילה','ישיבה לבד','לימודים/עבודה','שירותים/מקלחת','צפייה בתוכן','בחוץ','אחר'];

function actionPlansFor(trigger){return triggerActionPlans[trigger]||triggerActionPlans['שעמום'];}
function adaptiveActionAllowed(a,s){
 const c=s.context||{}, resources=new Set(c.resources||[]);
 if(a.requiresWhy&&!state.why)return false;
 if(a.requiresResource&&!resources.has(a.requiresResource))return false;
 if(a.requires==='can-leave'&&c.canLeave===false)return false;
 if(a.requires==='alone'&&c.alone!==true)return false;
 return true;
}
function personalActionStats(actionId,session){
 const rows=(state.interventions||[]).filter(x=>x.status==='completed'&&x.actionId===actionId&&Number.isFinite(+x.before)&&Number.isFinite(+x.after));
 const sameTrigger=rows.filter(x=>x.trigger===session.trigger);
 const sameFeeling=rows.filter(x=>x.context?.feeling&&x.context.feeling===session.context?.feeling);
 const pool=sameTrigger.length?sameTrigger:sameFeeling.length?sameFeeling:rows;
 if(!pool.length)return {uses:0,avgDrop:0};
 return {uses:pool.length,avgDrop:pool.reduce((sum,x)=>sum+((+x.before)-(+x.after)),0)/pool.length};
}
function actionScore(a,s){
 const c=s.context||{};
 let score=a.weight||0;
 if(a.triggers?.includes(s.trigger))score+=8;
 if(a.feelings?.includes(c.feeling))score+=6;
 if(a.activities?.includes(c.activity))score+=8;
 if((s.intensity||0)>=8&&a.highIntensity)score+=18;
 if((s.intensity||0)>=8&&['breath-90','micro-workout','outside-walk','shared-space','phone-lock','leave-room','shield-now'].includes(a.id))score+=6;
 if(c.activity==='מיטה'&&a.id==='bed-exit')score+=14;
 if(c.activity==='גלילה'&&a.id==='phone-lock')score+=14;
 if(c.alone===true&&['shared-space','message-someone','call-someone'].includes(a.id))score+=7;
 if(['טלפון','תוכן ברשת'].includes(s.trigger)&&a.id==='phone-lock')score+=10;
 if(c.resources?.includes('lego-near')&&a.id==='lego-build')score+=16;
 if(c.resources?.includes('lego-away')&&a.id==='lego-fetch')score+=16;
 if(c.feeling==='חרד'&&a.id==='breath-90')score+=8;
 if(c.feeling==='כועס/מתוסכל'&&a.id==='micro-workout')score+=8;
 if(s.mode==='early'&&['small-task','lego-build','lego-fetch','study-sprint','music-task','outside-walk'].includes(a.id))score+=5;
 const learned=personalActionStats(a.id,s);
 if(learned.uses){score+=Math.max(-8,Math.min(18,learned.avgDrop*4))+Math.min(5,learned.uses);}
 if((s.triedActions||[]).includes(a.id))score-=30;
 return score;
}
function allActionsFor(session){
 const legacy=actionPlansFor(session.trigger);
 const merged=[...adaptiveActions.filter(a=>adaptiveActionAllowed(a,session)),...legacy];
 const seen=new Set();
 return merged.filter(a=>!seen.has(a.id)&&seen.add(a.id));
}
function recommendedActionsFor(session){
 const offset=session.suggestionOffset||0;
 const unavailable=new Set(session.unavailableActions||[]);
 const ranked=allActionsFor(session).filter(a=>!unavailable.has(a.id)).sort((a,b)=>actionScore(b,session)-actionScore(a,session));
 if(!ranked.length)return [{id:'breath-90',title:'90 שניות נשימה',desc:'אם כרגע שום דבר אחר לא אפשרי, רק מורידים את העוררות.',duration:90,steps:['הנח רגליים על הרצפה','שאף 4 שניות ונשוף 6 שניות','חזור על זה 9 פעמים']}];
 const count=Math.min(6,ranked.length);
 const rotated=ranked.map((_,i)=>ranked[(i+offset)%ranked.length]);
 return rotated.slice(0,count);
}
function actionById(session,id){return allActionsFor(session).find(a=>a.id===id)||actionPlansFor(session.trigger).find(a=>a.id===id)||adaptiveActions.find(a=>a.id===id);}
function activeIntervention(){return [...(state.interventions||[])].reverse().find(x=>x.status==='active'||x.status==='choosing'||x.status==='reassess')||null;}

const taskForDay=day=>dailyTasks[(day-1)%dailyTasks.length];

function setTheme(t){
  state.theme=t; document.documentElement.dataset.theme=t==='light'?'light':'dark';
  $('#themeBtn').innerHTML=t==='light'?icon('sun'):icon('moon');
  const meta=$('meta[name="theme-color"]'); if(meta)meta.content=t==='light'?'#f7f5fb':'#08070d'; save();
}
function applyDiscreetMode(){
  const on=!!state.discreet;
  document.body.classList.toggle('discreet-mode',on);
  document.title=on?'פוקוס — מעקב אישי':'ריסט — 90 יום';
  const apple=$('meta[name="apple-mobile-web-app-title"]');if(apple)apple.content=on?'פוקוס':'ריסט';
  const brand=$('.brand span:last-child');if(brand)brand.textContent=on?'פוקוס':'ריסט';
  const sos=$('#sosFloat b');if(sos)sos.textContent=on?'בדיקה מהירה':'דחף עכשיו';
  const sosBtn=$('#sosFloat');if(sosBtn)sosBtn.setAttribute('aria-label',on?'בדיקה מהירה':'עזרה עכשיו');
  const privacy=$('#privacyCover');if(privacy&&!on)privacy.classList.remove('show');
}
function injectStaticIcons(){ $$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon)); }
function navigate(v,push=true,direction=''){
  if(v===currentView&&push)return;
  currentView=v; state.currentView=v; transitionClass=direction; save();
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  $('#sosFloat').classList.toggle('hide',v==='stats'); haptic(8); render();
}
function render(){
  clearInterval(homeClockTimer); clearInterval(quoteTimer); homeClockTimer=null; quoteTimer=null;
  updateBest(); const view=$('#view'); view.scrollTop=0;
  $('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView));
  $('#sosFloat')?.classList.toggle('hide',currentView==='stats');
  view.innerHTML=({home:homeView,journey:journeyView,stats:statsView,tools:toolsView,settings:settingsView}[currentView]||homeView)();
  const screen=$('.screen',view); if(screen&&transitionClass)screen.classList.add(transitionClass); transitionClass=''; applyDiscreetMode(); bindView();
}
const delay=i=>`style="--delay:${Math.min(i*55,330)}ms"`;

function homeView(){
  const d=streak(),elapsedDay=cleanDays(),[tt,td]=taskForDay(d),done=!!state.completedDays[todayISO()],quote=currentQuote();
  const completedActions=state.interventions.filter(x=>x.status==='completed').length;
  const todayCheckin=state.checkins.some(x=>(x.date||'').slice(0,10)===todayISO());
  const active=activeIntervention(),discreet=!!state.discreet;
  return `<section class="screen home-dashboard">
    <header class="dashboard-head reveal" ${delay(0)}>
      <div><div class="eyebrow">יום ${Math.min(d,90)} מתוך 90</div><h1>היום שלך.</h1></div>
      <div class="dashboard-day"><strong>${Math.min(d,90)}</strong><span>/90</span></div>
    </header>

    <div class="clean-timer-card dashboard-timer reveal" ${delay(1)}>
      <div class="timer-topline"><span><i class="live-dot"></i> הזמן שלך</span><small>מאז האיפוס האחרון</small></div>
      <div class="clean-clock" id="cleanClock" aria-label="זמן מאז האיפוס האחרון">
        <div class="clock-unit"><strong id="clockDays">${elapsedDay}</strong><span>ימים</span></div>
        <i>:</i><div class="clock-unit"><strong id="clockHours">00</strong><span>שעות</span></div>
        <i>:</i><div class="clock-unit"><strong id="clockMinutes">00</strong><span>דקות</span></div>
        <i>:</i><div class="clock-unit"><strong id="clockSeconds">00</strong><span>שניות</span></div>
      </div>
      <div class="timer-meta"><span>שיא: ${Math.max(state.best,d)} ימים</span><span>${pct(Math.min(d,90))}% מהמסע</span></div>
      <button class="reset-clock-btn" data-sheet="reset">${icon('reset')}<span>איפוס והתחלה מחדש</span></button>
    </div>

    <article class="quote-card dashboard-quote reveal" ${delay(2)}>
      <div class="quote-glow"></div><span class="quote-mark">״</span>
      <div class="quote-kicker">משפט לרגע הזה</div>
      <p id="motiveQuote">${esc(quote)}</p>
      <div class="quote-footer"><span>מתחלף אוטומטית · בלי חזרות קרובות</span><button id="nextQuote" aria-label="משפט נוסף">${icon('spark')}</button></div>
    </article>

    ${active?`<button class="active-intervention dashboard-resume reveal" ${delay(3)} id="resumeIntervention"><span class="active-pulse"></span><span><b>ממשיכים מאיפה שעצרת</b><small>${esc(active.actionTitle||'בחר פעולה כדי לצאת מהדחף')}</small></span><span class="arrow">‹</span></button>`:''}

    <button class="urge-cta reveal" ${delay(active?4:3)} data-sheet="trigger">
      <span class="urge-orb">${icon('bolt')}</span>
      <span class="urge-copy"><small>${discreet?'צריך רגע להתאפס?':'מרגיש שההרגל מושך?'}</small><b>${discreet?'בדיקה מהירה':'יש לי דחף עכשיו'}</b><em>${discreet?'נזהה את הדפוס ונעבור לצעד הבא':'נזהה את הטריגר ונבצע פעולה עד הסוף'}</em></span>
      <span class="urge-arrow">‹</span>
    </button>

    <div class="dashboard-stats reveal" ${delay(active?5:4)}>
      <button data-go="journey"><strong>${Math.min(d,90)}</strong><span>יום במסע</span></button>
      <button data-go="stats"><strong>${completedActions}</strong><span>פעולות שבוצעו</span></button>
      <button data-sheet="checkin"><strong>${todayCheckin?'✓':'—'}</strong><span>צ׳ק־אין היום</span></button>
    </div>

    ${homeSlipInsight()}

    <div class="section-head dashboard-section reveal" ${delay(5)}><h2>המשימה של היום</h2><button data-go="journey">למסע</button></div>
    <article class="card daily-card dashboard-task reveal" ${delay(6)}><div class="task-top"><span class="tag">משימה · ${Math.min(d,90)}</span>${done?'<span class="task-done">הושלם ✓</span>':''}</div><h3>${tt}</h3><p>${td}</p><button class="${done?'secondary-btn':'primary-btn'}" id="completeToday">${done?'✓ הושלם להיום':'סיימתי את המשימה'}</button></article>

    <div class="section-head dashboard-section reveal" ${delay(6)}><h2>כלים מהירים</h2></div>
    <div class="quick-grid dashboard-quick reveal" ${delay(6)}>
      ${quick('smile','צ׳ק־אין','איך אני עכשיו?','checkin')}${quick('journal','יומן קצר','להוציא מהראש','journal')}${quick('target',discreet?'העוגן שלי':'למה התחלתי','להיזכר בעוגן','why')}${quick('wave',discreet?'פוקוס 90':'SOS','90 שניות לעצור','sos')}
    </div>
  </section>`;
}
function quick(ic,title,sub,sheet){const attr=sheet==='sos'?'data-action="sos"':`data-sheet="${sheet}"`;return `<button class="card quick-card" ${attr}><span class="qicon">${icon(ic)}</span><b>${title}</b><span>${sub}</span></button>`;}

function journeyView(){
  const d=Math.min(streak(),90),p=pct(d),grid=Array.from({length:90},(_,i)=>i+1).map(n=>`<div class="day ${n<d?'done':n===d?'current':'locked'}" data-day="${n}">${n}</div>`).join('');
  return `<section class="screen"><div class="reveal" ${delay(0)}><div class="eyebrow">המסע שלך</div><h1 class="hero-title">90 יום.<br>יום אחד בכל פעם.</h1></div>
    <div class="card progress-banner reveal" ${delay(1)}><div class="progress-row"><div><small>התקדמות כוללת</small><strong>${p}%</strong></div><div>יום ${d}/90</div></div><div class="meter"><i style="--w:${p}%"></i></div></div>
    <div class="section-head reveal" ${delay(2)}><h2>שלבים</h2></div><div class="phase-list">${phases.map((ph,i)=>{const cls=d>ph.to?'done':d>=ph.from?'current':'';return `<div class="card phase ${cls} reveal" ${delay(3+i)}><div class="phase-icon">${d>ph.to?icon('check'):icon(ph.ico)}</div><div><h3>${ph.title}</h3><p>${ph.desc}</p></div><span class="phase-state">${ph.from}–${ph.to}</span></div>`}).join('')}</div>
    <div class="section-head"><h2>כל הימים</h2><span class="eyebrow">${d} נוכחי</span></div><div class="card"><div class="day-grid">${grid}</div></div>
  </section>`;
}

function statsView(){
  const d=streak(),triggersLabel=state.discreet?'דפוסים':'טריגרים';
  return `<section class="screen"><div class="reveal" ${delay(0)}><div class="eyebrow">הנתונים שלך</div><h1 class="hero-title">התקדמות<br>בלי לנחש.</h1><p class="hero-sub">המטרה היא לזהות דפוסים, לא לשפוט את עצמך.</p></div>
  <div class="segmented stats-segments reveal" ${delay(1)}><button class="segment active" data-stats="overview">סטטיסטיקות</button><button class="segment" data-stats="triggers">${triggersLabel}</button><button class="segment" data-stats="slips">${state.discreet?'איפוסים':'נפילות'}</button><button class="segment" data-stats="weekly">דוח שבועי</button></div>
  <div id="statsBody">${statsOverview(d)}</div></section>`;
}
function statsOverview(d=streak()){
  const week=last7(),eventLabel=state.discreet?'אירועים שתיעדת':'דחפים שתיעדת',wr=weeklyReportData();
  return `<div class="stats-grid">${stat(d,'רצף נוכחי')}${stat(Math.max(d,state.best),'שיא אישי')}${stat(state.urges.length,eventLabel)}${stat(state.slips.length,state.discreet?'התחלות מחדש':'נפילות')}</div>
    <div class="section-head"><h2>7 ימים אחרונים</h2></div><div class="card"><div class="chart">${week.map(x=>`<div class="bar-wrap"><div class="bar" style="--h:${x.v}%"></div><small>${x.l}</small></div>`).join('')}</div></div>
    <button class="card weekly-teaser" id="openWeeklyReport"><span class="weekly-teaser-icon">${icon('spark')}</span><span><small>דוח שבועי חכם</small><b>${esc(wr.headline)}</b><em>פתח ניתוח מלא של השבוע</em></span><span class="arrow">‹</span></button>`;
}
function statsTriggers(){
  const counts=triggerCounts(),max=Math.max(1,...Object.values(counts)),total=Object.values(counts).reduce((a,b)=>a+b,0);
  if(!total)return `<div class="card empty-state"><div class="empty-icon">${icon('bolt')}</div><h3>עדיין אין מספיק נתונים</h3><p>אחרי שתתעד כמה ${state.discreet?'דפוסים':'טריגרים'}, תראה כאן אילו מצבים חוזרים אצלך הכי הרבה.</p></div>`;
  return `<div class="card trigger-map">${triggerLabels.map(t=>`<div class="trigger-row"><span>${t}</span><div class="track"><div class="fill" style="--w:${Math.round((counts[t]||0)/max*100)}%"></div></div><small>${counts[t]||0}</small></div>`).join('')}</div>`;
}
function stat(n,label){return `<div class="card stat"><b>${n}</b><span>${label}</span></div>`;}

const weekDayNames=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const weekDayShort=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
function slipHourLabel(h){return `${String(h).padStart(2,'0')}:00–${String(h).padStart(2,'0')}:59`;}
function priorUrgeForSlip(date){
  const t=Date.parse(date||''); if(!Number.isFinite(t))return null;
  return (state.urges||[]).filter(x=>{const u=Date.parse(x.date||'');return Number.isFinite(u)&&u<=t&&t-u<=2*60*60*1000&&x.trigger&&x.trigger!=='SOS';}).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))[0]||null;
}
function slipPatternData(){
  const rows=(state.slips||[]).map(x=>{const d=new Date(x.date);if(Number.isNaN(d.getTime()))return null;const prior=priorUrgeForSlip(x.date);return {...x,_d:d,hour:Number.isFinite(+x.localHour)?+x.localHour:d.getHours(),weekday:Number.isFinite(+x.weekday)?+x.weekday:d.getDay(),triggerBefore:x.triggerBefore||prior?.trigger||null};}).filter(Boolean);
  const hours=Array(24).fill(0),days=Array(7).fill(0),triggers={};
  rows.forEach(x=>{hours[x.hour]++;days[x.weekday]++;if(x.triggerBefore)triggers[x.triggerBefore]=(triggers[x.triggerBefore]||0)+1;});
  const topHours=hours.map((count,hour)=>({hour,count})).filter(x=>x.count).sort((a,b)=>b.count-a.count||a.hour-b.hour);
  const topDays=days.map((count,weekday)=>({weekday,count})).filter(x=>x.count).sort((a,b)=>b.count-a.count||a.weekday-b.weekday);
  const topTrigger=Object.entries(triggers).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)[0]||null;
  const total=rows.length,topHour=topHours[0]||null,topDay=topDays[0]||null;
  let insight='ככל שיצטברו עוד נתונים, האפליקציה תזהה מתי ואילו מצבים חוזרים לפני איפוס.';
  if(total===1) insight=`יש כרגע נפילה מתועדת אחת, ב${weekDayNames[rows[0].weekday]} בשעה ${slipHourLabel(rows[0].hour)}. צריך עוד נתונים לפני שמסיקים דפוס.`;
  if(total>=2&&topHour&&topDay) insight=`הדפוס הבולט כרגע: ${topDay.count} מתוך ${total} נפילות היו ביום ${weekDayNames[topDay.weekday]}, והשעה שחזרה הכי הרבה היא ${slipHourLabel(topHour.hour)}.`;
  if(total>=3&&topTrigger) insight+=` הטריגר שנרשם סמוך לנפילות הכי הרבה הוא “${topTrigger.name}” (${topTrigger.count}).`;
  let next='תעד דחפים לפני שהם מתחזקים — זה יאפשר לקשר בין הטריגר לבין הנפילה אם תהיה.';
  if(total>=2&&topHour) next=`סביב ${slipHourLabel(topHour.hour)} כדאי להפעיל פעולה יזומה עוד לפני שהדחף נהיה חזק.`;
  if(total>=3&&topDay&&topHour) next=`ביום ${weekDayNames[topDay.weekday]}, במיוחד סביב ${slipHourLabel(topHour.hour)}, כדאי להכין מראש פעולה חלופית ולהרחיק את הטריגר הרגיל.`;
  return {rows,hours,days,triggers,total,topHours,topDays,topHour,topDay,topTrigger,insight,next};
}
function formatSlipRun(ms){
  const n=+ms||0,d=Math.floor(n/DAY),h=Math.floor((n%DAY)/3600000),m=Math.floor((n%3600000)/60000);
  if(d)return `${d} ימים ${h} שעות`; if(h)return `${h} שעות ${m} דקות`; return `${Math.max(0,m)} דקות`;
}
function statsSlips(){
  const r=slipPatternData(),label=state.discreet?'התחלות מחדש':'נפילות';
  if(!r.total)return `<div class="card empty-state"><div class="empty-icon">${icon('reset')}</div><h3>עדיין אין ${state.discreet?'איפוסים':'נפילות'} מתועדים</h3><p>אם תאפס את השעון, האירוע יישמר עם יום ושעה כדי לזהות בהמשך דפוסים שחוזרים.</p></div>`;
  const maxDay=Math.max(1,...r.days),hot=r.topHours.slice(0,3);
  const recent=[...r.rows].sort((a,b)=>b._d-a._d).slice(0,5);
  return `<div class="slip-intel">
    <div class="slip-summary"><div class="card"><b>${r.total}</b><span>${label}</span></div><div class="card"><b>${r.topDay?weekDayShort[r.topDay.weekday]:'—'}</b><span>יום שחוזר</span></div><div class="card"><b>${r.topHour?String(r.topHour.hour).padStart(2,'0')+':00':'—'}</b><span>שעה שחוזרת</span></div></div>
    <article class="card slip-learning"><small>מה האפליקציה לומדת</small><b>${esc(r.insight)}</b><p>${esc(r.next)}</p></article>
    <div class="section-head"><h2>לפי יום בשבוע</h2></div>
    <div class="card slip-day-chart">${r.days.map((count,i)=>`<div class="slip-day-col"><div class="slip-day-bar"><i style="--h:${Math.max(count?12:2,Math.round(count/maxDay*100))}%"></i></div><b>${count}</b><span>${weekDayShort[i]}</span></div>`).join('')}</div>
    <div class="section-head"><h2>שעות שחוזרות</h2></div>
    <div class="hot-hours">${hot.length?hot.map(x=>`<div class="card hot-hour"><b>${slipHourLabel(x.hour)}</b><span>${x.count} ${x.count===1?'פעם':'פעמים'}</span></div>`).join(''):'<div class="card">אין עדיין מספיק נתונים</div>'}</div>
    ${r.topTrigger?`<article class="card slip-trigger-link"><span>${icon('bolt')}</span><div><small>${state.discreet?'דפוס סמוך':'טריגר סמוך לנפילות'}</small><b>${esc(r.topTrigger.name)}</b><p>תועד עד שעתיים לפני ${r.topTrigger.count} ${r.topTrigger.count===1?'נפילה':'נפילות'}.</p></div></article>`:''}
    <div class="section-head"><h2>אחרונות</h2></div>
    <div class="card slip-history">${recent.map(x=>`<div class="slip-history-row"><div><b>${x._d.toLocaleDateString('he-IL',{weekday:'short',day:'2-digit',month:'2-digit'})}</b><small>${x._d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}${x.triggerBefore?' · '+esc(x.triggerBefore):''}</small></div><span>${formatSlipRun(x.elapsedMs)}</span></div>`).join('')}</div>
  </div>`;
}
function homeSlipInsight(){
  const r=slipPatternData(); if(r.total<2||!r.topHour)return '';
  const discreet=!!state.discreet;
  return `<button class="card home-learning reveal" ${delay(5)} id="openSlipInsights"><span>${icon('spark')}</span><span><small>${discreet?'תובנה מההיסטוריה':'האפליקציה מתחילה ללמוד אותך'}</small><b>${esc(r.topDay?`יום ${weekDayNames[r.topDay.weekday]} סביב ${String(r.topHour.hour).padStart(2,'0')}:00 חוזר אצלך יותר.`:`סביב ${String(r.topHour.hour).padStart(2,'0')}:00 נרשמו יותר איפוסים.`)}</b><em>פתח סטטיסטיקות כדי לראות את הדפוס</em></span><span class="arrow">‹</span></button>`;
}

function toolsView(){
 const discreet=!!state.discreet;
 return `<section class="screen"><div class="reveal" ${delay(0)}><div class="eyebrow">ארגז כלים</div><h1 class="hero-title">לא צריך כוח רצון<br>לכל רגע.</h1><p class="hero-sub">מכינים מראש תגובה פשוטה לרגע שבו הראש מתחיל להתווכח.</p></div>
 <div class="section-head reveal" ${delay(1)}><h2>עזרה מיידית</h2></div><div class="tool-list">
 ${tool('wave',discreet?'פוקוס 90':'גל דחף','90 שניות של נשימה והשהיה.','sos',2)}${tool('bolt',discreet?'מפת דפוסים':'מפת טריגרים',discreet?'רשום מה קרה ומה עזר לך לחזור למסלול.':'רשום מה הפעיל אותך ומה עזרת לעצמך לעשות.','trigger',3)}${tool('journal','יומן','שמור משפט או מחשבה לפני שהיא נתקעת בראש.','journal',4)}${tool('target',discreet?'העוגן שלי':'הסיבה שלי','המשפט שאתה רוצה לראות ברגע קשה.','why',5)}${tool('reset','התחלה מחדש',discreet?'פותחים רצף חדש בלי למחוק את מה שלמדת.':'אם הייתה נפילה, מתחילים מחדש בלי למחוק את מה שלמדת.','reset',6)}
 </div></section>`;
}
function tool(ic,t,d,a,i){return `<button class="card tool reveal" data-action="${a}" ${delay(i)}><span class="tool-icon">${icon(ic)}</span><span><h3>${t}</h3><p>${d}</p></span><span class="arrow">‹</span></button>`;}

function cloudSnapshot(){return window.FocusCloud?.snapshot?.()||{ready:false,status:'local',user:null,lastSyncAt:null,error:null};}
function cloudStatusText(cloud){
 if(cloud.status==='syncing'||cloud.status==='connecting')return 'מסנכרן עכשיו…';
 if(cloud.status==='error')return cloud.error||'שגיאת סנכרון';
 if(cloud.status==='synced'&&cloud.lastSyncAt)return 'סונכרן '+new Date(cloud.lastSyncAt).toLocaleString('he-IL',{dateStyle:'short',timeStyle:'short'});
 if(cloud.user)return 'מחובר · הנתונים מגובים ומסתנכרנים';
 return 'הנתונים נשמרים כרגע רק במכשיר הזה';
}
function cloudSettingsBlock(){
 const cloud=cloudSnapshot(),user=cloud.user;
 return `<div id="cloudSettingsMount"><div class="section-head reveal" ${delay(3)}><h2>חשבון וסנכרון</h2></div>
 <div class="card reveal cloud-card ${cloud.status==='error'?'cloud-error':''}" ${delay(4)}>
   <div class="cloud-account-head">
     <span class="cloud-orb">${icon(user?'check':'spark')}</span>
     <div><b>${user?'הגיבוי בענן פעיל':'עובד במצב מקומי'}</b><p>${user?esc(user.email):'אפשר להתחבר בכל שלב כדי לגבות ולסנכרן בין מכשירים'}</p></div>
   </div>
   <div class="cloud-status"><i class="${cloud.status==='syncing'||cloud.status==='connecting'?'busy':user?'online':''}"></i><span>${esc(cloudStatusText(cloud))}</span></div>
   ${user?`<div class="cloud-actions"><button class="secondary-btn" id="cloudSyncBtn">סנכרן עכשיו</button><button class="secondary-btn cloud-logout" id="cloudLogoutBtn">התנתק</button></div>`:`<button class="secondary-btn" id="showAuthGateBtn">פתח מסך התחברות</button>`}
 </div></div>`;
}
function bindCloudSettingsControls(){
  $('#showAuthGateBtn')?.addEventListener('click',()=>openDedicatedAuth('login'));
  $('#cloudSyncBtn')?.addEventListener('click',async()=>{const b=$('#cloudSyncBtn');if(b)b.disabled=true;try{await window.FocusCloud?.syncNow?.();toast('הנתונים סונכרנו ✓')}catch(e){toast(e.message||'הסנכרון נכשל')}finally{updateCloudSettingsUI()}});
  $('#cloudLogoutBtn')?.addEventListener('click',async()=>{const b=$('#cloudLogoutBtn');if(b)b.disabled=true;try{await window.FocusCloud?.logout?.();localStorage.removeItem('reset90-auth-local-ok');localStorage.removeItem('reset90-auth-signed-in');toast('התנתקת. הנתונים המקומיים נשארו במכשיר');openDedicatedAuth('login')}catch(e){toast(e.message||'ההתנתקות נכשלה')}finally{updateCloudSettingsUI()}});
}
function updateCloudSettingsUI(){
  if(currentView!=='settings')return;
  const mount=$('#cloudSettingsMount');if(!mount)return;
  const holder=document.createElement('div');holder.innerHTML=cloudSettingsBlock();
  const next=holder.firstElementChild;if(!next)return;
  mount.replaceWith(next);
  bindCloudSettingsControls();
}

function setAuthGateVisible(show){
 const gate=$('#authGate');
 if(!gate)return;
 gate.classList.toggle('hidden',!show);
 document.body.classList.toggle('auth-open',show);
}
function renderAuthBoot(){
 const host=$('#authGateBody');if(!host)return;
 host.innerHTML=`<div class="auth-boot"><div class="auth-boot-ring"></div><b>מחבר את החשבון שלך…</b><span>רק רגע</span></div>`;
}
function authGateTemplate(mode='login'){
 const register=mode==='register';
 return `<div class="auth-copy"><div class="auth-eyebrow">${register?'חשבון חדש':'ברוך הבא'}</div><h1>${register?'יוצרים חשבון.':'ממשיכים מאיפה שעצרת.'}</h1><p>${register?'המידע שכבר נמצא במכשיר יתחבר לחשבון ויישמר גם בענן.':'התחבר כדי להחזיר את הנתונים שלך ולסנכרן אותם בין מכשירים.'}</p></div>
 <div class="auth-tabs"><button type="button" class="${!register?'active':''}" data-auth-mode="login">התחברות</button><button type="button" class="${register?'active':''}" data-auth-mode="register">הרשמה</button></div>
 <form class="auth-form" id="authGateForm">
   ${register?'<label><span>שם</span><input id="gateName" type="text" autocomplete="name" placeholder="איך לקרוא לך?"></label>':''}
   <label><span>אימייל</span><input id="gateEmail" type="email" inputmode="email" autocomplete="email" placeholder="name@example.com" required></label>
   <label><span>סיסמה</span><input id="gatePassword" type="password" autocomplete="${register?'new-password':'current-password'}" minlength="8" placeholder="לפחות 8 תווים" required></label>
   <div class="auth-error" id="authGateError"></div>
   <button class="primary-btn auth-submit" type="submit" id="authGateSubmit">${register?'צור חשבון והמשך':'התחבר והמשך'}</button>
 </form>
 <button class="auth-local" id="continueLocalBtn">המשך בלי חשבון במכשיר הזה</button>
 <p class="auth-note">גם במצב מקומי האפליקציה ממשיכה לעבוד כרגיל. אפשר להתחבר אחר כך דרך ההגדרות.</p>`;
}
function renderAuthGate(mode='login'){
 const host=$('#authGateBody');if(!host)return;
 host.innerHTML=authGateTemplate(mode);
 $('#continueLocalBtn',host).onclick=()=>{setAuthGateVisible(false);localStorage.setItem('reset90-auth-local-ok','1')};
 $('#authGateForm',host).onsubmit=async e=>{
   e.preventDefault();
   const register=mode==='register';
   const email=$('#gateEmail',host).value.trim(),password=$('#gatePassword',host).value,name=$('#gateName',host)?.value.trim()||'';
   const err=$('#authGateError',host),btn=$('#authGateSubmit',host);
   if(!email||!password){err.textContent='מלא אימייל וסיסמה';return}
   if(password.length<8){err.textContent='הסיסמה צריכה להכיל לפחות 8 תווים';return}
   btn.disabled=true;btn.textContent=register?'יוצר חשבון…':'מתחבר…';err.textContent='';
   try{
     if(register)await window.FocusCloud.register(email,password,name);
     else await window.FocusCloud.login(email,password);
     localStorage.removeItem('reset90-auth-local-ok');
     localStorage.setItem('reset90-auth-signed-in','1');
     setAuthGateVisible(false);
     render();
     toast(register?'החשבון נוצר והנתונים סונכרנו':'התחברת והנתונים סונכרנו');
   }catch(error){
     err.textContent=error.message||'הפעולה נכשלה';
     btn.disabled=false;btn.textContent=register?'צור חשבון והמשך':'התחבר והמשך';
   }
 };
}
function openDedicatedAuth(mode='login'){renderAuthGate(mode);setAuthGateVisible(true);}
async function initDedicatedAuth(){
 const authHost=$('#authGateBody');
 if(authHost&&!authHost.dataset.tabsBound){
   authHost.dataset.tabsBound='1';
   authHost.addEventListener('click',e=>{
     const tab=e.target.closest('[data-auth-mode]');
     if(!tab||!authHost.contains(tab))return;
     e.preventDefault();
     e.stopPropagation();
     renderAuthGate(tab.dataset.authMode);
   });
 }
 const choseLocal=localStorage.getItem('reset90-auth-local-ok')==='1';
 const wasSignedIn=localStorage.getItem('reset90-auth-signed-in')==='1';
 if(choseLocal){setAuthGateVisible(false)}
 else{renderAuthBoot();setAuthGateVisible(true)}
 const snap=await window.FocusCloud?.init?.({
   getState:()=>state,
   applyState:(incoming)=>{
     state={...freshState(),...(incoming||{})};
     localStorage.setItem(KEY,JSON.stringify(state));
     currentView=state.currentView||currentView||'home';
     setTheme(state.theme||'dark');
     applyDiscreetMode();
     render();
   }
 });
 if(snap?.user){
   localStorage.setItem('reset90-auth-signed-in','1');
   localStorage.removeItem('reset90-auth-local-ok');
   setAuthGateVisible(false);
   return;
 }
 if(wasSignedIn && snap?.ready===false){
   setAuthGateVisible(false);
   return;
 }
 localStorage.removeItem('reset90-auth-signed-in');
 if(!choseLocal){
   renderAuthGate('login');
   setAuthGateVisible(true);
 }
}

function settingsView(){
 return `<section class="screen"><div class="reveal" ${delay(0)}><div class="eyebrow">הגדרות</div><h1 class="hero-title">המסע שלך,<br>בקצב שלך.</h1></div>
 <div class="section-head reveal" ${delay(1)}><h2>אפליקציה</h2></div><div class="card reveal" ${delay(2)}>
 <div class="setting-row"><div><b>תזכורת יומית</b><p>צ׳ק־אין קצר בסוף היום</p></div><button class="toggle ${state.notifications?'on':''}" id="notifToggle" aria-label="תזכורת יומית"><i></i></button></div>
 <div class="setting-row"><div><b>מצב דיסקרטי</b><p>שם וניסוחים ניטרליים + מסך פרטיות כשעוברים לרקע</p></div><button class="toggle ${state.discreet?'on':''}" id="discreetToggle" aria-label="מצב דיסקרטי"><i></i></button></div>
 <div class="setting-row"><div><b>מצב תצוגה</b><p>${state.theme==='dark'?'כהה':'בהיר'}</p></div><button class="secondary-btn" style="width:auto;min-height:42px;padding:0 15px" id="themeSetting">החלף</button></div>
 <div class="setting-row"><div><b>תחילת הרצף</b><p>${new Date(resetTimestamp()).toLocaleString('he-IL',{dateStyle:'short',timeStyle:'short'})}</p></div><button class="secondary-btn" style="width:auto;min-height:42px;padding:0 15px" data-sheet="startdate">שנה</button></div></div>
 ${cloudSettingsBlock()}
 <div class="section-head reveal" ${delay(5)}><h2>הנתונים שלי</h2></div><div class="card reveal" ${delay(6)}><div class="setting-row"><div><b>ייצוא נתונים</b><p>קובץ JSON מקומי</p></div><button class="secondary-btn" style="width:auto;min-height:42px;padding:0 15px" id="exportBtn">ייצא</button></div><div class="setting-row"><div><b>מחיקת נתונים</b><p>איפוס מלא במכשיר הזה ובסנכרון הבא גם בענן</p></div><button class="secondary-btn" style="width:auto;min-height:42px;padding:0 15px" id="wipeBtn">אפס</button></div></div>
 </section>`;
}

function bindView(){
  $('#completeToday')?.addEventListener('click',completeToday);
  $('#resumeIntervention')?.addEventListener('click',()=>resumeIntervention());
  $('#openSlipInsights')?.addEventListener('click',()=>{navigate('stats',false);setTimeout(()=>document.querySelector('[data-stats="slips"]')?.click(),25)});
  if($('#cleanClock'))startHomeDynamics();
  $$('[data-sheet]').forEach(b=>b.onclick=()=>openSheet(b.dataset.sheet));
  $$('[data-go]').forEach(b=>b.onclick=()=>navigate(b.dataset.go));
  $$('[data-action]').forEach(b=>b.onclick=()=>b.dataset.action==='sos'?openSOS():openSheet(b.dataset.action));
  $$('[data-day]').forEach(b=>b.onclick=()=>{const n=+b.dataset.day;if(n>streak())return toast('היום הזה עדיין נעול');openDay(n)});
  $$('[data-stats]').forEach(b=>b.onclick=()=>{$$('[data-stats]').forEach(x=>x.classList.toggle('active',x===b));$('#statsBody').innerHTML=b.dataset.stats==='triggers'?statsTriggers():b.dataset.stats==='slips'?statsSlips():b.dataset.stats==='weekly'?statsWeekly():statsOverview();bindStatsBody();haptic(7)});
  $('#notifToggle')?.addEventListener('click',()=>{state.notifications=!state.notifications;save();render();toast(state.notifications?'תזכורת יומית הופעלה':'תזכורת יומית כובתה')});
  $('#discreetToggle')?.addEventListener('click',()=>{state.discreet=!state.discreet;save();applyDiscreetMode();render();toast(state.discreet?'מצב דיסקרטי הופעל':'מצב דיסקרטי כובה')});
  $('#themeSetting')?.addEventListener('click',()=>{setTheme(state.theme==='dark'?'light':'dark');render()});
  bindCloudSettingsControls();
  $('#exportBtn')?.addEventListener('click',exportData); $('#wipeBtn')?.addEventListener('click',()=>openSheet('wipe'));
  bindStatsBody();
}
function bindStatsBody(){
  $('#openWeeklyReport')?.addEventListener('click',()=>{const tab=$('[data-stats="weekly"]');if(tab){tab.click();setTimeout(()=>$('#view')?.scrollTo({top:150,behavior:'smooth'}),40)}});
  $('#copyWeeklyReport')?.addEventListener('click',copyWeeklyReport);
}
function startHomeDynamics(){
  const updateClock=()=>{
    const ms=elapsedMs(),days=Math.floor(ms/DAY),hours=Math.floor(ms%DAY/3600000),minutes=Math.floor(ms%3600000/60000),seconds=Math.floor(ms%60000/1000);
    const put=(id,val)=>{const el=$(id);if(el)el.textContent=String(val).padStart(id==='#clockDays'?1:2,'0');};
    put('#clockDays',days);put('#clockHours',hours);put('#clockMinutes',minutes);put('#clockSeconds',seconds);
  };
  const rotate=()=>{
    const el=$('#motiveQuote');if(!el)return;
    el.classList.add('quote-out');
    setTimeout(()=>{if(!$('#motiveQuote'))return;el.textContent=advanceQuote();el.classList.remove('quote-out');el.classList.add('quote-in');setTimeout(()=>el.classList.remove('quote-in'),430);},190);
  };
  updateClock();homeClockTimer=setInterval(updateClock,1000);quoteTimer=setInterval(rotate,10*60*1000);
  $('#nextQuote')?.addEventListener('click',()=>{clearInterval(quoteTimer);rotate();quoteTimer=setInterval(rotate,10*60*1000);haptic(7)});
}
function completeToday(){
  const k=todayISO();if(state.completedDays[k])return toast('כבר סימנת את המשימה להיום');state.completedDays[k]=true;save();haptic(20);confetti();render();toast('המשימה של היום הושלמה ✓');
}
function openDay(n){const [t,d]=taskForDay(n);openSheet('day',{n,t,d});}

function openSheet(type,data={}){
  const s=$('#sheet'),b=$('#sheetBackdrop');s.innerHTML=sheetContent(type,data);s.classList.remove('hidden','closing');b.classList.remove('hidden','closing');document.body.style.overflow='hidden';haptic(8);bindSheet(type);enableSheetDrag();
}
function closeSheet(animated=true){
  const s=$('#sheet'),b=$('#sheetBackdrop');if(s.classList.contains('hidden'))return;
  if(!animated){s.classList.add('hidden');b.classList.add('hidden');document.body.style.overflow='';return;}
  s.classList.add('closing');b.classList.add('closing');setTimeout(()=>{s.classList.add('hidden');b.classList.add('hidden');s.classList.remove('closing');b.classList.remove('closing');s.style.transform='';document.body.style.overflow=''},230);
}
function sheetContent(type,data={}){
 const grab='<div class="sheet-grab"></div>',discreet=!!state.discreet;
 if(type==='checkin')return `${grab}<h2>איך אתה עכשיו?</h2><p class="sub">10 שניות. בלי לנתח יותר מדי.</p><div class="choice-grid" id="moods">${(discreet?['רגוע','בסדר','מתוח','עייף','משועמם','קשה לי']:['רגוע','בסדר','מתוח','עייף','משועמם','דחף חזק']).map(x=>`<button class="choice">${x}</button>`).join('')}</div><div class="range-wrap"><b>${discreet?'עוצמה':'עוצמת דחף'}</b><input id="urgeRange" type="range" min="0" max="10" value="3"><div class="range-labels"><span>0 רגוע</span><span id="urgeVal">3</span><span>10 חזק</span></div></div><button class="primary-btn" id="saveCheckin">שמור צ׳ק־אין</button>`;
 if(type==='trigger')return `${grab}<div id="adaptiveFlow"></div>`;
 if(type==='journal')return `${grab}<h2>יומן קצר</h2><p class="sub">לא צריך לכתוב יפה. רק להוציא את זה מהראש.</p><textarea id="journalText" rows="6" placeholder="מה עובר עליי עכשיו?"></textarea><div style="height:11px"></div><button class="primary-btn" id="saveJournal">שמור ביומן</button>`;
 if(type==='why')return `${grab}<h2>${discreet?'העוגן שלי':'למה התחלתי?'}</h2><p class="sub">המשפט הזה יופיע לך ברגע שבו תצטרך אותו.</p><textarea id="whyText" rows="4" placeholder="${discreet?'מה חשוב לי לזכור עכשיו?':'אני רוצה להפסיק כי...'}">${esc(state.why||'')}</textarea><div style="height:11px"></div><button class="primary-btn" id="saveWhy">שמור</button>`;
 if(type==='reset')return `${grab}<h2>${discreet?'להתחיל מחדש?':'לרשום נפילה ולהתחיל מחדש?'}</h2><p class="sub">${discreet?'האיפוס יישמר בהיסטוריה עם היום והשעה, כדי לזהות דפוסים חוזרים.':'האיפוס יירשם כנפילה עם היום והשעה. האפליקציה תשתמש בהיסטוריה כדי ללמוד מתי ומה נוטה להקדים נפילות.'} השעון יחזור מיד ל־00:00:00; שאר הנתונים נשמרים.</p><button class="danger-btn" id="confirmReset">${discreet?'אפס והתחל מחדש':'רשום נפילה והתחל מחדש'}</button><div style="height:9px"></div><button class="secondary-btn" id="cancelSheet">ביטול</button>`;
 if(type==='startdate')return `${grab}<h2>תאריך התחלה</h2><p class="sub">אפשר לעדכן אם התחלת לפני שהתקנת את האפליקציה.</p><input type="date" id="startDateInput" value="${state.startDate}" max="${todayISO()}"><div style="height:12px"></div><button class="primary-btn" id="saveStartDate">שמור</button>`;
 if(type==='wipe')return `${grab}<h2>לאפס את כל הנתונים?</h2><p class="sub">הפעולה מוחקת רצפים, צ׳ק־אינים, ${discreet?'דפוסים':'טריגרים'} ויומן מהמכשיר הזה.</p><button class="danger-btn" id="confirmWipe">מחק הכל</button><div style="height:9px"></div><button class="secondary-btn" id="cancelSheet">ביטול</button>`;
 if(type==='day')return `${grab}<div class="eyebrow">יום ${data.n}</div><h2>${esc(data.t)}</h2><p class="sub">${esc(data.d)}</p><button class="secondary-btn" id="cancelSheet">סגור</button>`;
 return `${grab}<h2>בקרוב</h2>`;
}
function bindSheet(type){
 $('#sheetBackdrop').onclick=()=>closeSheet();$('#cancelSheet')?.addEventListener('click',()=>closeSheet());

 if(type==='checkin'){
  let mood='בסדר';const choices=$$('#moods .choice');choices[1]?.classList.add('selected');choices.forEach(b=>b.onclick=()=>{choices.forEach(x=>x.classList.remove('selected'));b.classList.add('selected');mood=b.textContent;haptic(6)});
  $('#urgeRange').oninput=e=>$('#urgeVal').textContent=e.target.value;
  $('#saveCheckin').onclick=()=>{state.checkins.push({date:new Date().toISOString(),mood,urge:+$('#urgeRange').value});save();closeSheet();haptic(16);toast('הצ׳ק־אין נשמר')};
 }
 if(type==='trigger'){startAdaptiveUrgeFlow();}
 if(type==='journal')$('#saveJournal').onclick=()=>{const text=$('#journalText').value.trim();if(!text)return toast('כתוב לפחות משהו קטן');state.journal.push({date:new Date().toISOString(),text});save();closeSheet();toast('נשמר ביומן')};
 if(type==='why')$('#saveWhy').onclick=()=>{state.why=$('#whyText').value.trim();save();closeSheet();toast('הסיבה שלך נשמרה')};
 if(type==='reset')$('#confirmReset').onclick=()=>{const now=new Date();const ms=elapsedMs();const prior=priorUrgeForSlip(now.toISOString());state.slips.push({date:now.toISOString(),localDate:localISO(now),localHour:now.getHours(),weekday:now.getDay(),triggerBefore:prior?.trigger||null,streak:streak(),elapsedMs:ms});state.bestMs=Math.max(state.bestMs||0,ms);state.best=Math.max(state.best||0,streak());state.resetAt=now.toISOString();state.startDate=todayISO();save();closeSheet();haptic([18,28,18]);render();toast(state.discreet?'ההתחלה מחדש נשמרה':'הנפילה נרשמה והשעון התחיל מחדש')};
 if(type==='startdate')$('#saveStartDate').onclick=()=>{state.startDate=$('#startDateInput').value||todayISO();const d=new Date(`${state.startDate}T00:00:00`);state.resetAt=(Number.isNaN(d.getTime())?new Date():d).toISOString();save();closeSheet();render();toast('תאריך ההתחלה עודכן')};
 if(type==='wipe')$('#confirmWipe').onclick=()=>{localStorage.removeItem(KEY);localStorage.removeItem('reset90-state-v2');localStorage.removeItem('reset90-state-v1');state=freshState();setTheme('dark');closeSheet();navigate('home',false);toast('הנתונים אופסו')};
}

function startAdaptiveUrgeFlow(){
 urgeDraft={mode:null,intensity:6,trigger:null,context:{feeling:null,activity:null,location:null,alone:null,canLeave:null,resources:[]}};
 renderAdaptiveUrgeStep('mode');
}
function flowDots(step){
 const steps=['mode','intensity','trigger','feeling','activity','location','alone','resources'];
 const idx=steps.indexOf(step);
 return `<div class="flow-dots">${steps.map((_,i)=>`<i class="${i<=idx?'on':''}"></i>`).join('')}</div>`;
}
function renderAdaptiveUrgeStep(step){
 const s=$('#sheet');if(!s)return;
 const d=urgeDraft||(urgeDraft={intensity:6,trigger:null,context:{feeling:null,activity:null,location:null,alone:null,canLeave:null,resources:[]}});
 const head=(title,sub)=>`<div class="coach-head adaptive-head">${flowDots(step)}<h2>${title}</h2><p class="sub">${sub}</p></div>`;
 if(step==='mode'){
  s.innerHTML=`<div class="sheet-grab"></div>${head('מה קורה עכשיו?','נבחר מסלול קצר שמתאים לרגע — בלי שאלון ארוך אם לא צריך.')}<div class="smart-entry-grid"><button class="smart-entry" data-mode="urge"><span>${icon('bolt')}</span><b>יש לי דחף עכשיו</b><small>הדחף כבר מורגש ואני רוצה לעצור אותו.</small></button><button class="smart-entry" data-mode="early"><span>${icon('spark')}</span><b>אני מתחיל להחליק</b><small>עוד לא חזק, אבל אני מזהה את הכיוון ורוצה לעצור מוקדם.</small></button></div><button class="coach-link" id="cancelIntervention">לא עכשיו</button>`;
  $$('[data-mode]').forEach(b=>b.onclick=()=>{d.mode=b.dataset.mode;d.intensity=d.mode==='early'?4:7;haptic(8);renderAdaptiveUrgeStep('intensity')});
  $('#cancelIntervention').onclick=()=>closeSheet();
 }
 if(step==='intensity'){
  s.innerHTML=`<div class="sheet-grab"></div>${head(state.discreet?'כמה חזק זה עכשיו?':'כמה חזק הדחף עכשיו?','נשתמש בעוצמה כדי לבחור צעד שמתאים לרגע הזה.')}<div class="urge-meter"><strong id="adaptiveIntensity">${d.intensity}/10</strong><span id="adaptiveIntensityWord">${d.intensity>=8?'חזק':d.intensity>=5?'בינוני':'קל'}</span></div><input class="adaptive-range" id="adaptiveRange" type="range" min="1" max="10" value="${d.intensity}"><div class="intensity-pills"><button data-intensity="3">קל</button><button data-intensity="6">בינוני</button><button data-intensity="9">חזק</button></div><button class="primary-btn" id="adaptiveNext">המשך</button>`;
  $('#adaptiveRange').oninput=e=>{d.intensity=+e.target.value;$('#adaptiveIntensity').textContent=`${d.intensity}/10`;$('#adaptiveIntensityWord').textContent=d.intensity>=8?'חזק':d.intensity>=5?'בינוני':'קל'};
  $$('[data-intensity]').forEach(b=>b.onclick=()=>{$('#adaptiveRange').value=b.dataset.intensity;$('#adaptiveRange').dispatchEvent(new Event('input'));haptic(6)});
  $('#adaptiveNext').onclick=()=>{if(d.intensity>=9&&d.mode!=='early'){d.trigger='הרגל אוטומטי';d.context.activity='ישיבה לבד';d.context.alone=true;d.context.canLeave=true;d.context.resources=['water','breathing'];startTriggerIntervention(d.trigger,d.intensity,d.context,d.mode);urgeDraft=null;}else renderAdaptiveUrgeStep('trigger')};
 }
 if(step==='trigger'){
  s.innerHTML=`<div class="sheet-grab"></div>${head('מה הצית את הדחף?','בחר את הדבר שהכי קרוב למה שקורה עכשיו.')}<div class="adaptive-grid">${triggerLabels.map(x=>`<button class="adaptive-choice ${d.trigger===x?'selected':''}" data-trigger="${x}">${x}</button>`).join('')}</div><button class="primary-btn" id="adaptiveNext" ${d.trigger?'':'disabled'}>המשך</button><button class="coach-link" id="adaptiveBack">חזרה</button>`;
  $$('[data-trigger]').forEach(b=>b.onclick=()=>{d.trigger=b.dataset.trigger;$$('[data-trigger]').forEach(x=>x.classList.toggle('selected',x===b));$('#adaptiveNext').disabled=false;haptic(6)});
  $('#adaptiveNext').onclick=()=>{if(d.mode==='early')renderAdaptiveUrgeStep('location');else renderAdaptiveUrgeStep('feeling')};$('#adaptiveBack').onclick=()=>renderAdaptiveUrgeStep('intensity');
 }
 if(step==='feeling'){
  s.innerHTML=`<div class="sheet-grab"></div>${head('מה אתה מרגיש עכשיו?','הרגש משנה מאוד איזה סוג פעולה יעזור יותר.')}<div class="adaptive-grid">${feelingLabels.map(x=>`<button class="adaptive-choice ${d.context.feeling===x?'selected':''}" data-feeling="${x}">${x}</button>`).join('')}</div><button class="primary-btn" id="adaptiveNext" ${d.context.feeling?'':'disabled'}>המשך</button><button class="coach-link" id="adaptiveBack">חזרה</button>`;
  $$('[data-feeling]').forEach(b=>b.onclick=()=>{d.context.feeling=b.dataset.feeling;$$('[data-feeling]').forEach(x=>x.classList.toggle('selected',x===b));$('#adaptiveNext').disabled=false;haptic(6)});
  $('#adaptiveNext').onclick=()=>renderAdaptiveUrgeStep('activity');$('#adaptiveBack').onclick=()=>renderAdaptiveUrgeStep('trigger');
 }
 if(step==='activity'){
  s.innerHTML=`<div class="sheet-grab"></div>${head('מה אתה עושה כרגע?','לפעמים הדבר הכי חשוב הוא לשבור את הפעולה שכבר מתרחשת.')}<div class="adaptive-grid">${activityLabels.map(x=>`<button class="adaptive-choice ${d.context.activity===x?'selected':''}" data-activity="${x}">${x}</button>`).join('')}</div><button class="primary-btn" id="adaptiveNext" ${d.context.activity?'':'disabled'}>המשך</button><button class="coach-link" id="adaptiveBack">חזרה</button>`;
  $$('[data-activity]').forEach(b=>b.onclick=()=>{d.context.activity=b.dataset.activity;$$('[data-activity]').forEach(x=>x.classList.toggle('selected',x===b));$('#adaptiveNext').disabled=false;haptic(6)});
  $('#adaptiveNext').onclick=()=>renderAdaptiveUrgeStep('location');$('#adaptiveBack').onclick=()=>renderAdaptiveUrgeStep('feeling');
 }
 if(step==='location'){
  const locations=['חדר','בית','עבודה/לימודים','רכב/תחבורה','בחוץ','מקום ציבורי','אחר'];
  s.innerHTML=`<div class="sheet-grab"></div>${head('איפה אתה עכשיו?','המיקום מסנן פעולות שלא באמת אפשריות כרגע.')}<div class="adaptive-grid">${locations.map(x=>`<button class="adaptive-choice ${d.context.location===x?'selected':''}" data-location="${x}">${x}</button>`).join('')}</div><button class="primary-btn" id="adaptiveNext" ${d.context.location?'':'disabled'}>המשך</button><button class="coach-link" id="adaptiveBack">חזרה</button>`;
  $$('[data-location]').forEach(b=>b.onclick=()=>{d.context.location=b.dataset.location;$$('[data-location]').forEach(x=>x.classList.toggle('selected',x===b));$('#adaptiveNext').disabled=false;haptic(6)});
  $('#adaptiveNext').onclick=()=>renderAdaptiveUrgeStep('alone');$('#adaptiveBack').onclick=()=>renderAdaptiveUrgeStep('activity');
 }
 if(step==='alone'){
  s.innerHTML=`<div class="sheet-grab"></div>${head('אתה לבד כרגע?','נשתמש בזה כדי לבחור בין שינוי סביבה, קשר עם מישהו או פעולה עצמאית.')}<div class="adaptive-grid two"><button class="adaptive-choice ${d.context.alone===true?'selected':''}" data-alone="1">כן, לבד</button><button class="adaptive-choice ${d.context.alone===false?'selected':''}" data-alone="0">לא</button></div><div class="mini-question"><b>אפשר לצאת מהמקום אם צריך?</b><div class="adaptive-grid two"><button class="adaptive-choice ${d.context.canLeave===true?'selected':''}" data-leave="1">כן</button><button class="adaptive-choice ${d.context.canLeave===false?'selected':''}" data-leave="0">לא כרגע</button></div></div><button class="primary-btn" id="adaptiveNext" ${d.context.alone===null||d.context.canLeave===null?'disabled':''}>המשך</button><button class="coach-link" id="adaptiveBack">חזרה</button>`;
  $$('[data-alone]').forEach(b=>b.onclick=()=>{d.context.alone=b.dataset.alone==='1';$$('[data-alone]').forEach(x=>x.classList.toggle('selected',x===b));$('#adaptiveNext').disabled=d.context.alone===null||d.context.canLeave===null;haptic(6)});
  $$('[data-leave]').forEach(b=>b.onclick=()=>{d.context.canLeave=b.dataset.leave==='1';$$('[data-leave]').forEach(x=>x.classList.toggle('selected',x===b));$('#adaptiveNext').disabled=d.context.alone===null||d.context.canLeave===null;haptic(6)});
  $('#adaptiveNext').onclick=()=>renderAdaptiveUrgeStep('resources');$('#adaptiveBack').onclick=()=>renderAdaptiveUrgeStep('location');
 }
 if(step==='resources'){
  const atHome=['בית','חדר'].includes(d.context.location);
  const all=[
    ...(atHome?[['lego-near','לגו לידי'],['lego-away','יש לגו, אבל הוא לא לידי'],['shower','מקלחת']]:[]),
    ['water','מים'],['exercise','אפשר להתאמן'],['walk','אפשר לצאת להליכה'],['contact','אפשר לפנות למישהו'],['music','מוזיקה/אוזניות'],['study','חומר לימוד'],['journal','אפשר לכתוב'],['task','יש משימה קטנה'],['breathing','נשימה']
  ];
  const selected=new Set(d.context.resources||[]);
  s.innerHTML=`<div class="sheet-grab"></div>${head('מה זמין לך עכשיו?','אפשר לבחור כמה. מכאן אנחנו מייצרים הרבה יותר הסתעפויות ולא רשימה קבועה.')}<div class="resource-grid">${all.map(([id,label])=>`<button class="resource-choice ${selected.has(id)?'selected':''}" data-resource="${id}"><span>${selected.has(id)?icon('check'):''}</span><b>${label}</b></button>`).join('')}</div><button class="primary-btn" id="adaptiveNext">תן לי פעולות שמתאימות עכשיו</button><button class="secondary-btn" id="noResources">שום דבר מהרשימה לא זמין</button><button class="coach-link" id="adaptiveBack">חזרה</button>`;
  $$('[data-resource]').forEach(b=>b.onclick=()=>{const id=b.dataset.resource;const set=new Set(d.context.resources||[]);if(set.has(id))set.delete(id);else{if(id==='lego-near')set.delete('lego-away');if(id==='lego-away')set.delete('lego-near');set.add(id)}d.context.resources=[...set];$$('[data-resource]').forEach(x=>{const on=set.has(x.dataset.resource);x.classList.toggle('selected',on);x.querySelector('span').innerHTML=on?icon('check'):''});haptic(6)});
  $('#adaptiveNext').onclick=finishAdaptiveUrgeFlow;$('#noResources').onclick=()=>{d.context.resources=[];finishAdaptiveUrgeFlow()};$('#adaptiveBack').onclick=()=>renderAdaptiveUrgeStep('alone');
 }
 enableSheetDrag();
}
function finishAdaptiveUrgeFlow(){
 const d=urgeDraft;if(!d?.trigger)return;
 startTriggerIntervention(d.trigger,d.intensity,d.context,d.mode||'urge');
 urgeDraft=null;
}
function startTriggerIntervention(trigger,intensity,context={},mode='urge'){
  const id=`int-${Date.now().toString(36)}`;
  const now=new Date().toISOString();
  state.interventions=state.interventions||[];
  const session={id,date:now,mode,trigger,intensity,before:intensity,after:null,status:'choosing',context:{...context},unavailableActions:[],suggestionOffset:0,triedActions:[],actionId:null,actionTitle:null,startedAt:null,completedAt:null,stepsDone:[],timeline:[{at:now,type:'started',intensity}]};
  state.interventions.push(session);
  state.urges.push({date:now,mode,trigger,intensity,context:{...context},outcome:'intervention-started',interventionId:id});
  save();haptic(12);
  renderActionPicker(id);
}
function interventionById(id){return (state.interventions||[]).find(x=>x.id===id);}
function renderActionPicker(id){
  const session=interventionById(id);if(!session)return closeSheet();
  session.status='choosing';save();
  const plans=recommendedActionsFor(session), top=plans[0];
  const c=session.context||{};
  const learned=top?personalActionStats(top.id,session):{uses:0,avgDrop:0};
  const contextBits=[c.feeling,c.activity,c.location,c.alone===true?'לבד':c.alone===false?'עם אנשים':null].filter(Boolean);
  const why=learned.uses>=2&&learned.avgDrop>0.5?`אצלך הפעולה הזו הורידה בעבר בממוצע ${learned.avgDrop.toFixed(1)} נק׳`:(session.intensity>=8?'עכשיו עדיף צעד שמקטין גישה ומשנה סביבה מהר':'זו ההתאמה הכי טובה למה שסימנת כרגע');
  const s=$('#sheet');
  s.innerHTML=`<div class="sheet-grab"></div><div class="coach-head adaptive-result-head"><span class="coach-step">${session.mode==='early'?'מניעה מוקדמת':'הצעד הבא שלך'}</span><h2>עכשיו עושים דבר אחד.</h2><p class="sub">${esc(why)}${contextBits.length?' · '+contextBits.map(esc).join(' · '):''}</p></div>
  ${top?`<div class="smart-recommend"><div class="smart-recommend-badge">מומלץ עכשיו</div><h3>${esc(top.title)}</h3><p>${esc(top.desc)}</p><div class="smart-steps">${top.steps.slice(0,3).map((x,i)=>`<span><b>${i+1}</b>${esc(x)}</span>`).join('')}</div><button class="primary-btn" id="doRecommended">התחל עכשיו · ${Math.max(1,Math.round(top.duration/60))} דק׳</button></div>`:''}
  <div class="smart-alt-row"><button class="secondary-btn" id="notPossible">לא אפשרי כרגע</button><button class="secondary-btn" id="showAlternatives">תן חלופה</button></div>
  <button class="coach-link" id="goSOSFromPicker">אני צריך עצירה מיידית</button><button class="coach-link" id="cancelIntervention">לא עכשיו</button>`;
  enableSheetDrag();
  $('#doRecommended')?.addEventListener('click',()=>beginInterventionAction(id,top.id));
  $('#notPossible')?.addEventListener('click',()=>{if(top)session.unavailableActions=[...new Set([...(session.unavailableActions||[]),top.id])];session.suggestionOffset=0;save();haptic(6);renderActionPicker(id)});
  $('#showAlternatives')?.addEventListener('click',()=>{session.suggestionOffset=(session.suggestionOffset||0)+1;save();haptic(6);renderActionPicker(id)});
  $('#goSOSFromPicker').onclick=()=>{session.timeline=session.timeline||[];session.timeline.push({at:new Date().toISOString(),type:'sos'});save();closeSheet(false);setTimeout(openSOS,60)};
  $('#cancelIntervention').onclick=()=>{session.status='abandoned';session.timeline=session.timeline||[];session.timeline.push({at:new Date().toISOString(),type:'abandoned'});save();closeSheet();toast('נשמר. אפשר לחזור לזה בכל רגע')};
}
function beginInterventionAction(id,actionId){
  const session=interventionById(id);if(!session)return;
  const action=actionById(session,actionId);if(!action)return;
  session.actionId=action.id;session.actionTitle=action.title;session.actionDuration=action.duration;session.steps=action.steps;session.stepsDone=[];session.startedAt=new Date().toISOString();session.status='active';session.triedActions=[...new Set([...(session.triedActions||[]),action.id])];session.timeline=session.timeline||[];session.timeline.push({at:session.startedAt,type:'action-started',actionId:action.id,title:action.title});save();haptic([12,20,12]);renderActiveIntervention(id);
}
function renderActiveIntervention(id){
  const session=interventionById(id);if(!session)return closeSheet();
  const duration=session.actionDuration||180;
  const started=Date.parse(session.startedAt||new Date().toISOString());
  const elapsed=Math.max(0,Math.floor((Date.now()-started)/1000));
  const remain=Math.max(0,duration-elapsed);
  const steps=session.steps||[];
  const done=new Set(session.stepsDone||[]);
  const s=$('#sheet');
  s.innerHTML=`<div class="sheet-grab"></div><div class="coach-head"><span class="coach-step">שלב 2 מתוך 3 · עכשיו עושים</span><h2>${esc(session.actionTitle||'הפעולה שלך')}</h2><p class="sub">סמן צעד רק אחרי שביצעת אותו. הטיימר עוזר לך להישאר מחוץ ללולאה.</p></div><div class="coach-timer"><strong id="coachTimer">${formatShortTimer(remain)}</strong><span>נשארו</span></div><div class="coach-progress"><i id="coachProgress" style="--w:${Math.min(100,Math.round(elapsed/duration*100))}%"></i></div><div class="coach-checklist">${steps.map((step,i)=>`<button class="coach-check ${done.has(i)?'done':''}" data-step="${i}"><span>${done.has(i)?icon('check'):''}</span><b>${esc(step)}</b></button>`).join('')}</div><button class="primary-btn" id="finishAction" ${done.size<steps.length?'disabled':''}>סיימתי את הפעולה</button><button class="coach-link" id="switchAction">הפעולה הזאת לא מתאימה לי — בחר אחרת</button>`;
  enableSheetDrag();
  let timer=setInterval(()=>{if(!$('#coachTimer'))return clearInterval(timer);const passed=Math.max(0,Math.floor((Date.now()-started)/1000)),left=Math.max(0,duration-passed);$('#coachTimer').textContent=formatShortTimer(left);const bar=$('#coachProgress');if(bar)bar.style.setProperty('--w',`${Math.min(100,Math.round(passed/duration*100))}%`);if(left<=0){clearInterval(timer);haptic(18);toast('הטיימר הסתיים — סיים את הצעדים ובדוק את הדחף')}} ,1000);
  $$('.coach-check').forEach(btn=>btn.onclick=()=>{const i=+btn.dataset.step;const set=new Set(session.stepsDone||[]);if(set.has(i))set.delete(i);else set.add(i);session.stepsDone=[...set];save();haptic(7);btn.classList.toggle('done',set.has(i));btn.querySelector('span').innerHTML=set.has(i)?icon('check'):'';$('#finishAction').disabled=set.size<steps.length;});
  $('#finishAction').onclick=()=>{clearInterval(timer);session.status='reassess';save();renderInterventionReassess(id)};
  $('#switchAction').onclick=()=>{clearInterval(timer);renderActionPicker(id)};
}
function formatShortTimer(sec){const m=String(Math.floor(sec/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');return `${m}:${s}`;}
function renderInterventionReassess(id){
  const session=interventionById(id);if(!session)return closeSheet();
  const s=$('#sheet');s.innerHTML=`<div class="sheet-grab"></div><div class="coach-head"><span class="coach-step">שלב 3 מתוך 3</span><h2>בדיקה קצרה</h2><p class="sub">עשית פעולה אמיתית. עכשיו נבדוק אם הדחף השתנה.</p></div><div class="before-after"><div><small>לפני</small><b>${session.before}/10</b></div><span>←</span><div><small>עכשיו</small><b id="afterValue">${Math.max(1,session.before-2)}/10</b></div></div><div class="range-wrap"><b>כמה חזק הדחף עכשיו?</b><input id="afterRange" type="range" min="0" max="10" value="${Math.max(1,session.before-2)}"><div class="range-labels"><span>0 עבר</span><span></span><span>10 חזק</span></div></div><button class="primary-btn" id="saveAfter">שמור והמשך</button>`;
  enableSheetDrag();
  $('#afterRange').oninput=e=>$('#afterValue').textContent=`${e.target.value}/10`;
  $('#saveAfter').onclick=()=>finishIntervention(id,+$('#afterRange').value);
}
function finishIntervention(id,after){
  const session=interventionById(id);if(!session)return;
  session.after=after;session.completedAt=new Date().toISOString();session.status='completed';session.timeline=session.timeline||[];session.timeline.push({at:session.completedAt,type:'reassessed',before:session.before,after,actionId:session.actionId});
  const urge=state.urges.find(x=>x.interventionId===id);if(urge){urge.outcome='action-completed';urge.after=after;urge.action=session.actionTitle;}
  save();haptic([15,24,15]);
  const improved=after<session.before;
  const s=$('#sheet');s.innerHTML=`<div class="sheet-grab"></div><div class="coach-result ${after>=7?'needs-more':''}">${icon(after>=7?'wave':'check')}<h2>${after>=7?'הדחף עדיין גבוה — ממשיכים':'יפה. שברת את האוטומט.'}</h2><p>${after>=7?'זה לא אומר שהפעולה נכשלה. פשוט עוברים לשכבת הגנה נוספת.':improved?`ירדת מ־${session.before}/10 ל־${after}/10. זה בדיוק מה שהמעקב אמור ללמד אותך.`:'גם אם המספר לא ירד, ביצעת תגובה חדשה במקום לפעול אוטומטית.'}</p></div>${after>=7?`<button class="primary-btn" id="anotherAction">בחר פעולה נוספת</button><div style="height:9px"></div><button class="secondary-btn" id="goSOS">עבור ל־SOS של 90 שניות</button>`:`<button class="primary-btn" id="doneIntervention">סיום</button>`}`;
  enableSheetDrag();
  if(after>=7){$('#anotherAction').onclick=()=>{session.before=after;session.intensity=after;session.status='choosing';session.timeline=session.timeline||[];session.timeline.push({at:new Date().toISOString(),type:'escalated',intensity:after});save();renderActionPicker(id)};$('#goSOS').onclick=()=>{session.timeline=session.timeline||[];session.timeline.push({at:new Date().toISOString(),type:'sos'});save();closeSheet(false);setTimeout(openSOS,60)};}
  else{$('#doneIntervention').onclick=()=>{confetti();closeSheet();render();toast('הפעולה הושלמה ונשמרה ✓')}}
}
function resumeIntervention(){
  const session=activeIntervention();if(!session)return;
  const s=$('#sheet'),b=$('#sheetBackdrop');s.classList.remove('hidden','closing');b.classList.remove('hidden','closing');document.body.style.overflow='hidden';
  if(session.status==='active')renderActiveIntervention(session.id);else if(session.status==='reassess')renderInterventionReassess(session.id);else renderActionPicker(session.id);
}

function enableSheetDrag(){
 const s=$('#sheet'),grab=$('.sheet-grab',s);if(!grab)return;let sy=0,dy=0,dragging=false;
 const start=e=>{sy=e.touches?.[0]?.clientY??e.clientY;dy=0;dragging=true;s.classList.add('dragging')};
 const move=e=>{if(!dragging)return;const y=e.touches?.[0]?.clientY??e.clientY;dy=Math.max(0,y-sy);s.style.transform=`translate(-50%,${dy}px)`};
 const end=()=>{if(!dragging)return;dragging=false;s.classList.remove('dragging');if(dy>105)closeSheet();else{s.style.transition='transform .22s var(--ease)';s.style.transform='translate(-50%,0)';setTimeout(()=>s.style.transition='',230)}};
 grab.addEventListener('touchstart',start,{passive:true});grab.addEventListener('touchmove',move,{passive:true});grab.addEventListener('touchend',end,{passive:true});grab.addEventListener('mousedown',start);window.addEventListener('mousemove',move);window.addEventListener('mouseup',end,{once:true});
}

function openSOS(){
 const prev=currentView;$('#sosFloat').classList.add('hide');$('.bottom-nav').style.transform='translateY(125%)';$('.bottom-nav').style.opacity='0';
 const v=$('#view'),discreet=!!state.discreet;v.style.bottom='0';v.scrollTop=0;v.innerHTML=`<section class="screen sos-screen"><button class="sos-close" id="closeSOS">×</button><div class="sos-kicker">${discreet?'עצירה קצרה. נשימה ואז צעד אחד קדימה.':'הדחף הוא גל. הוא עולה — והוא יורד.'}</div><h1>רק 90 שניות.</h1><p>${esc(state.why||(discreet?'לא צריך לפתור הכול עכשיו. רק להישאר עם הרגע ולעבור לצעד הבא.':'אתה לא חייב לעשות שום דבר עם הדחף הזה. תן לו להיות כאן בלי לפעול עליו.'))}</p><div class="breather"><div class="circle c1"></div><div class="circle c2"></div><div class="circle c3"></div><div class="breather-core">${icon('wave')}</div></div><div class="breathe-label" id="breatheLabel">שאיפה</div><div class="timer" id="sosTimer">01:30</div><div class="sos-actions"><button class="primary-btn" id="strongBtn">עבר לי / בחרתי אחרת</button><button class="secondary-btn" id="logFromSOS">רשום מה הפעיל אותי</button></div></section>`;
 haptic(18);let left=90,phase=0;clearInterval(sosTimer);sosTimer=setInterval(()=>{left--;phase++;const m=String(Math.floor(left/60)).padStart(2,'0'),s=String(left%60).padStart(2,'0');if($('#sosTimer'))$('#sosTimer').textContent=`${m}:${s}`;const lbl=$('#breatheLabel');if(lbl)lbl.textContent=(Math.floor(phase/4)%2===0?'שאיפה':'נשיפה');if(left<=0){clearInterval(sosTimer);if(lbl)lbl.textContent='הגל ירד. תבחר את הצעד הבא.';haptic(25)}},1000);
 const close=()=>{clearInterval(sosTimer);$('.bottom-nav').style.transform='';$('.bottom-nav').style.opacity='';v.style.bottom='';navigate(prev,false);$('#sosFloat').classList.toggle('hide',prev==='stats')};
 $('#closeSOS').onclick=close;$('#strongBtn').onclick=()=>{state.urges.push({date:new Date().toISOString(),trigger:'SOS',intensity:7,outcome:'stayed-strong'});save();haptic([20,35,20]);confetti();toast('הרגע הזה נחשב. יפה.');setTimeout(close,520)};$('#logFromSOS').onclick=()=>{close();setTimeout(()=>openSheet('trigger'),120)};
}

function last7(){const labels=['א','ב','ג','ד','ה','ו','ש'],now=new Date();return Array.from({length:7},(_,i)=>{const d=new Date(now);d.setDate(now.getDate()-(6-i));const iso=localISO(d),cs=state.checkins.filter(x=>x.date.slice(0,10)===iso),us=state.urges.filter(x=>x.date.slice(0,10)===iso);const score=Math.max(8,Math.min(100,25+cs.length*18+us.filter(x=>x.outcome==='stayed-strong').length*30-us.filter(x=>x.outcome!=='stayed-strong').length*7));return{l:labels[d.getDay()],v:score}})}
function dateInWindow(value,start,end){const t=Date.parse(value||'');return Number.isFinite(t)&&t>=start&&t<end;}
function weeklySnapshot(offset=0){
  const end=Date.now()-offset*7*DAY,start=end-7*DAY;
  const urges=(state.urges||[]).filter(x=>dateInWindow(x.date,start,end));
  const interventions=(state.interventions||[]).filter(x=>dateInWindow(x.date,start,end));
  const completed=interventions.filter(x=>x.status==='completed'&&Number.isFinite(+x.before)&&Number.isFinite(+x.after));
  const checkins=(state.checkins||[]).filter(x=>dateInWindow(x.date,start,end));
  const slips=(state.slips||[]).filter(x=>dateInWindow(x.date,start,end));
  const completedDays=Object.keys(state.completedDays||{}).filter(k=>{const t=Date.parse(`${k}T12:00:00`);return Number.isFinite(t)&&t>=start&&t<end;}).length;
  const counts={};urges.forEach(x=>{if(x.trigger&&x.trigger!=='SOS')counts[x.trigger]=(counts[x.trigger]||0)+1});
  const topTrigger=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]||null;
  const periods={לילה:0,בוקר:0,צהריים:0,ערב:0};
  urges.forEach(x=>{const d=new Date(x.date);if(Number.isNaN(d.getTime()))return;const h=d.getHours();periods[h<6?'לילה':h<12?'בוקר':h<18?'צהריים':'ערב']++;});
  const topPeriod=Object.entries(periods).sort((a,b)=>b[1]-a[1])[0];
  const actions={};completed.forEach(x=>{const k=x.actionTitle||'פעולה';const drop=Math.max(-10,Math.min(10,(+x.before)-(+x.after)));(actions[k]||(actions[k]=[])).push(drop)});
  const bestAction=Object.entries(actions).map(([name,vals])=>({name,uses:vals.length,avg:vals.reduce((a,b)=>a+b,0)/vals.length})).sort((a,b)=>b.avg-a.avg||b.uses-a.uses)[0]||null;
  const avgBefore=completed.length?completed.reduce((a,x)=>a+(+x.before),0)/completed.length:0;
  const avgAfter=completed.length?completed.reduce((a,x)=>a+(+x.after),0)/completed.length:0;
  return {start,end,urges,interventions,completed,checkins,slips,completedDays,topTrigger,topPeriod,bestAction,avgBefore,avgAfter};
}
function weeklyReportData(){
  const w=weeklySnapshot(0),prev=weeklySnapshot(1),d=state.discreet?'אירועים':'דחפים';
  let headline='השבוע עוד מתחיל להיבנות.';
  if(w.urges.length&&w.completed.length)headline=`תיעדת ${w.urges.length} ${d} והשלמת ${w.completed.length} פעולות.`;
  else if(w.urges.length)headline=`תיעדת ${w.urges.length} ${d} השבוע — כבר יש דפוס שאפשר ללמוד ממנו.`;
  else if(w.checkins.length)headline=`עשית ${w.checkins.length} צ׳ק־אינים השבוע.`;
  const insights=[];
  if(w.urges.length||prev.urges.length)insights.push(`תיעוד: ${w.urges.length} ${d} השבוע, לעומת ${prev.urges.length} בשבעת הימים שלפני כן.`);
  if(w.topTrigger)insights.push(`${state.discreet?'הדפוס':'הטריגר'} שחזר הכי הרבה היה “${w.topTrigger[0]}” (${w.topTrigger[1]} פעמים).`);
  if(w.topPeriod&&w.topPeriod[1]>0)insights.push(`הזמן שבו נרשמו הכי הרבה אירועים היה ${w.topPeriod[0]} (${w.topPeriod[1]}).`);
  if(w.completed.length){const drop=w.avgBefore-w.avgAfter;insights.push(drop>0.25?`בפעולות שהשלמת, העוצמה ירדה בממוצע מ־${w.avgBefore.toFixed(1)} ל־${w.avgAfter.toFixed(1)}.`:`השלמת ${w.completed.length} פעולות. כרגע השינוי הממוצע בעוצמה קטן, ולכן שווה להמשיך למדוד מה עובד.`);}
  if(w.bestAction&&w.bestAction.avg>0)insights.push(`הפעולה שנראית הכי יעילה כרגע היא “${w.bestAction.name}” — ירידה ממוצעת של ${w.bestAction.avg.toFixed(1)} נקודות (${w.bestAction.uses} שימושים).`);
  if(w.checkins.length)insights.push(`צ׳ק־אינים: ${w.checkins.length} מתוך 7 ימים. ${w.checkins.length>=5?'יש כאן תמונה שבועית טובה.':'עוד כמה צ׳ק־אינים יתנו ניתוח מדויק יותר.'}`);
  if(w.completedDays)insights.push(`השלמת ${w.completedDays} משימות יומיות השבוע.`);
  if(w.slips.length){const sp=slipPatternData();insights.push(`${state.discreet?'היו':'נרשמו'} ${w.slips.length} ${state.discreet?'התחלות מחדש':'נפילות'} השבוע. ${sp.total>=2&&sp.topHour?`בכל ההיסטוריה, השעה שחזרה הכי הרבה היא ${slipHourLabel(sp.topHour.hour)}.`:'ככל שיצטברו עוד נתונים נוכל לזהות זמן ודפוס חוזר.'}`);}
  if(!insights.length)insights.push('עדיין אין מספיק נתונים לשבוע הזה. תיעוד קצר של צ׳ק־אין ואירועים יאפשר לאפליקציה לזהות דפוסים אמיתיים.');
  let next='המשך לתעד באופן עקבי — הדוח נהיה חכם יותר ככל שיש יותר נתונים.';
  if(w.topTrigger)next=`לשבוע הבא: כש“${w.topTrigger[0]}” מופיע, כדאי להפעיל פעולה מתאימה מוקדם ולא לחכות שהעוצמה תעלה.`;
  if(w.bestAction&&w.bestAction.avg>0)next=`לשבוע הבא: תן עדיפות ל“${w.bestAction.name}”, כי כרגע זו הפעולה שמראה את השיפור הגדול ביותר אצלך.`;
  if(w.slips.length){const sp=slipPatternData();if(sp.total>=2)next=`לשבוע הבא: ${sp.next}`;}
  return {w,prev,headline,insights,next};
}
function statsWeekly(){
  const r=weeklyReportData(),w=r.w,fmt=n=>Number.isFinite(n)?n.toFixed(1):'—';
  return `<div class="weekly-report">
    <article class="card weekly-hero"><div class="weekly-badge">7 ימים אחרונים</div><h3>${esc(r.headline)}</h3><p>הדוח מבוסס רק על מה שתיעדת במכשיר הזה.</p></article>
    <div class="weekly-metrics"><div class="card"><b>${w.urges.length}</b><span>${state.discreet?'אירועים':'דחפים'}</span></div><div class="card"><b>${w.completed.length}</b><span>פעולות שהושלמו</span></div><div class="card"><b>${w.completed.length?fmt(w.avgBefore-w.avgAfter):'—'}</b><span>ירידה ממוצעת</span></div></div>
    <div class="section-head"><h2>מה למדנו השבוע</h2></div>
    <div class="card weekly-insights">${r.insights.map((x,i)=>`<div class="weekly-insight"><span>${i+1}</span><p>${esc(x)}</p></div>`).join('')}</div>
    <article class="card weekly-next"><small>הצעד הבא</small><b>${esc(r.next)}</b></article>
    <button class="secondary-btn weekly-copy" id="copyWeeklyReport">העתק דוח</button>
  </div>`;
}
function copyWeeklyReport(){
  const r=weeklyReportData();const text=['דוח שבועי — פוקוס',r.headline,'',...r.insights.map(x=>'• '+x),'','הצעד הבא: '+r.next].join('\n');
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>toast('הדוח הועתק')).catch(()=>toast('לא הצלחתי להעתיק'));
  else toast('העתקה אינה נתמכת בדפדפן הזה');
}
function triggerCounts(){return state.urges.reduce((a,x)=>{if(triggerLabels.includes(x.trigger))a[x.trigger]=(a[x.trigger]||0)+1;return a},{})}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._x);t._x=setTimeout(()=>t.classList.remove('show'),2300)}
function confetti(){const layer=$('#confetti'),colors=['#8d6cff','#ff4661','#ffd25f','#7ee081','#cdbfff'];for(let i=0;i<42;i++){const e=document.createElement('i');e.className='confetti';e.style.setProperty('--x',Math.random()*100+'%');e.style.setProperty('--d',(1.7+Math.random()*1.6)+'s');e.style.setProperty('--c',colors[i%colors.length]);e.style.setProperty('--r',Math.random()*180+'deg');e.style.setProperty('--drift',(Math.random()*140-70)+'px');layer.appendChild(e);setTimeout(()=>e.remove(),3500)}}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='reset90-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800);toast('קובץ הגיבוי נוצר')}

injectStaticIcons();setTheme(state.theme);applyDiscreetMode();
$$('.nav-item').forEach(b=>b.onclick=()=>navigate(b.dataset.view));
$('#sosFloat').onclick=openSOS;$('#themeBtn').onclick=()=>{setTheme(state.theme==='dark'?'light':'dark');render()};$('#profileBtn').onclick=()=>toast(`יום ${streak()} · שיא ${Math.max(state.best,streak())}`);$('#sheetBackdrop').onclick=()=>closeSheet();
const viewOrder=['tools','stats','home','journey','settings'];
$('#view').addEventListener('touchstart',e=>{touchStartX=e.changedTouches[0].clientX;touchStartY=e.changedTouches[0].clientY},{passive:true});
$('#view').addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchStartX,dy=e.changedTouches[0].clientY-touchStartY;if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.2)return;const i=viewOrder.indexOf(currentView),next=dx>0?Math.min(viewOrder.length-1,i+1):Math.max(0,i-1);if(next!==i)navigate(viewOrder[next],true,dx>0?'from-left':'from-right')},{passive:true});
advanceQuote();
render();
window.addEventListener('focus-cloud-status',()=>{if(currentView==='settings')updateCloudSettingsUI()});
initDedicatedAuth();
document.addEventListener('visibilitychange',()=>{const cover=$('#privacyCover');if(!cover)return;if(document.hidden&&state.discreet)cover.classList.add('show');else if(!document.hidden)setTimeout(()=>cover.classList.remove('show'),90)});
window.addEventListener('pagehide',()=>{if(state.discreet)$('#privacyCover')?.classList.add('show')});
window.addEventListener('pageshow',()=>$('#privacyCover')?.classList.remove('show'));
if('serviceWorker' in navigator)window.addEventListener('load',async()=>{try{const reg=await navigator.serviceWorker.register('./sw.js?v=36',{updateViaCache:'none'});await reg.update()}catch{}});
