export default{async fetch(req,env){
const H={"Access-Control-Allow-Origin":env.ORIGIN,"Access-Control-Allow-Headers":"Content-Type,x-app-key","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
if(req.method=="OPTIONS")return new Response(null,{headers:H});
const u=new URL(req.url);
if(u.pathname=="/photo"){const r=await fetch("https://api.pexels.com/v1/search?per_page=1&orientation=landscape&query="+encodeURIComponent(u.searchParams.get("q")+" food"),{headers:{Authorization:env.PEXELS_KEY}});const j=await r.json();
return new Response(JSON.stringify({url:j.photos?.[0]?.src?.large||""}),{headers:{...H,"Content-Type":"application/json"}})}
if(req.headers.get("x-app-key")!=env.APP_KEY)return new Response("no",{status:401,headers:H});
const{prompt,images=[]}=await req.json();
const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":env.ANTHROPIC_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},
body:JSON.stringify({model:"claude-sonnet-5-5",max_tokens:4000,system:"Réponds uniquement par un objet JSON valide, sans texte autour ni balises.",messages:[{role:"user",content:[...images.map(d=>({type:"image",source:{type:"base64",media_type:"image/jpeg",data:d}})),{type:"text",text:prompt}]}]})});
const j=await r.json();const t=(j.content||[]).map(c=>c.text||"").join("").replace(/```json|```/g,"").trim();
return new Response(t||"{}",{status:r.ok?200:502,headers:{...H,"Content-Type":"application/json"}})}}
