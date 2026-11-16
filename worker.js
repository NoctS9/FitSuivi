export default{async fetch(req,env){
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type,x-app-key","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
const J={...H,"Content-Type":"application/json"};
if(req.method=="OPTIONS")return new Response(null,{headers:H});
const u=new URL(req.url);
if(u.pathname=="/photo"){const r=await fetch("https://pixabay.com/api/?image_type=photo&category=food&safesearch=true&per_page=3&q="+encodeURIComponent(u.searchParams.get("q")||"")+"&key="+env.PIXABAY_KEY);const j=await r.json();const l=j.hits?.[0]?.webformatURL;
if(!l)return new Response("{\"url\":\"\"}",{headers:J});const b=new Uint8Array(await(await fetch(l)).arrayBuffer());let s="";for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));
return new Response(JSON.stringify({url:"data:image/jpeg;base64,"+btoa(s)}),{headers:J})}
if(req.headers.get("x-app-key")!=env.APP_KEY)return new Response("no",{status:401,headers:H});
const{prompt,images=[]}=await req.json();
const model=env.MODEL||"gemini-2.5-flash";
const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:"POST",headers:{"x-goog-api-key":env.AQ.Ab8RN6J8OkA757a8fTdxGh4ZQTWHaNwXOaI7Wjdj7JytLIWUbQ,"content-type":"application/json"},
body:JSON.stringify({systemInstruction:{parts:[{text:"Réponds uniquement par un objet JSON valide, sans texte autour ni balises."}]},
contents:[{role:"user",parts:[...images.map(d=>({inline_data:{mime_type:"image/jpeg",data:d}})),{text:prompt}]}],generationConfig:{responseMimeType:"application/json"}})});
const j=await r.json();const t=(j.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("").replace(/```json|```/g,"").trim();
return new Response(t||JSON.stringify({error:j.error?.message||"vide"}),{status:r.ok&&t?200:502,headers:J})}}
