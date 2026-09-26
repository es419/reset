const SYSTEM_PROMPT = `
אתה מאמן שיחה אישי בתוך אפליקציית שינוי הרגלים.
המטרה שלך היא להיות בן שיח טבעי, ישיר, לא שיפוטי ולא מטיף.
דבר בעברית כברירת מחדל, אלא אם המשתמש מדבר בשפה אחרת.
אל תהפוך כל הודעה לתרגיל. קודם כל תקשיב, תבין ותענה כמו בשיחה אמיתית.
כשהמשתמש מתאר דחף חזק, עזור לו לעבור את הרגע בצעדים פשוטים וקונקרטיים.
אחרי מעידה, אל תבייש ואל תבטל את המשמעות שלה; עזור להבין מה קרה ומה אפשר לשנות בפעם הבאה.
אל תציג את עצמך כאדם ואל תטען שיש לך זיכרון מעבר להודעות שנשלחו אליך בשיחה.
שמור תשובות יחסית קצרות, טבעיות ומותאמות למה שנכתב.
`;

const APPWRITE_ENDPOINT='https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT='6ab7db6c002620a88131';
const ALLOWED_ORIGIN='https://es419.github.io';

function cors(origin){
  return {
    'Access-Control-Allow-Origin': origin===ALLOWED_ORIGIN?origin:ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers':'Content-Type, Authorization',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Vary':'Origin'
  };
}
async function verifyUser(jwt){
  if(!jwt)return false;
  const r=await fetch(APPWRITE_ENDPOINT+'/account',{
    headers:{'X-Appwrite-Project':APPWRITE_PROJECT,'X-Appwrite-JWT':jwt}
  });
  return r.ok;
}
export default {
  async fetch(request,env){
    const origin=request.headers.get('Origin')||'';
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
    const url=new URL(request.url);
    if(url.pathname!='/chat')return new Response('Not found',{status:404});
    if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:cors(origin)});
    if(origin!==ALLOWED_ORIGIN)return Response.json({error:'Origin not allowed'},{status:403,headers:cors(origin)});

    const auth=request.headers.get('Authorization')||'';
    const jwt=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!(await verifyUser(jwt)))return Response.json({error:'צריך להתחבר לחשבון באפליקציה'},{status:401,headers:cors(origin)});
    if(!env.OPENAI_API_KEY)return Response.json({error:'OPENAI_API_KEY לא הוגדר בשרת'},{status:503,headers:cors(origin)});

    let body;
    try{body=await request.json()}catch{return Response.json({error:'בקשה לא תקינה'},{status:400,headers:cors(origin)})}
    const messages=Array.isArray(body.messages)?body.messages.slice(-20):[];
    if(!messages.length)return Response.json({error:'אין הודעה לשליחה'},{status:400,headers:cors(origin)});

    const input=messages.map(m=>({
      role:m.role==='assistant'?'assistant':'user',
      content:[{type:'input_text',text:String(m.content||'').slice(0,5000)}]
    }));

    const upstream=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:env.OPENAI_MODEL||'gpt-5.6-luna',
        instructions:SYSTEM_PROMPT,
        input,
        stream:true
      })
    });

    if(!upstream.ok){
      console.error('OpenAI error',upstream.status,await upstream.text());
      return Response.json({error:'שירות ה-AI לא זמין כרגע'},{status:502,headers:cors(origin)});
    }

    const headers=new Headers(upstream.headers);
    Object.entries(cors(origin)).forEach(([k,v])=>headers.set(k,v));
    headers.set('Cache-Control','no-store');
    return new Response(upstream.body,{status:200,headers});
  }
};
