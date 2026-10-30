import express from 'express';import {WebSocketServer} from 'ws';import http from 'http';import path from 'path';import {fileURLToPath} from 'url';
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','dist');
const app=express();app.use(express.static(dir));app.get('/health',(q,r)=>r.send('ok'));
const server=http.createServer(app);const wss=new WebSocketServer({server,path:'/ws'});
const rooms=new Map();const COLORS=['#ff6b4a','#3fb5ff','#ffd23f','#9b6bff'];
const mk=()=>{let c;do c=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random()*24|0]).join('');while(rooms.has(c));return c};
const roster=r=>r.players.map((p,i)=>({id:p.id,name:p.name,color:COLORS[i]}));
const bc=(r,m,ex)=>{const s=JSON.stringify(m);r.players.forEach(p=>p!==ex&&p.ws.readyState===1&&p.ws.send(s))};
let nid=1;
wss.on('connection',ws=>{const me={ws,id:nid++,name:'Climber'};let room=null;
 const send=m=>ws.send(JSON.stringify(m));
 ws.on('message',d=>{let m;try{m=JSON.parse(d)}catch{return}
  if(m.t==='host'||m.t==='join'){me.name=String(m.name||'Climber').slice(0,10);
   if(m.t==='host'){room={code:mk(),players:[],host:me.id,started:false};rooms.set(room.code,room)}
   else{const r=rooms.get(String(m.code||'').toUpperCase());if(!r)return send({t:'err',e:'Room not found'});if(r.players.length>=4)return send({t:'err',e:'Room full'});if(r.started)return send({t:'err',e:'Climb already started'});room=r}
   room.players.push(me);send({t:'joined',code:room.code,id:me.id,host:room.host});bc(room,{t:'roster',pl:roster(room),host:room.host})}
  else if(!room)return;
  else if(m.t==='start'&&me.id===room.host){room.started=true;bc(room,{t:'start',pl:roster(room),seed:Date.now()})}
  else if(m.t==='s'){m.id=me.id;bc(room,m,me)}
  else if(m.t==='e'||m.t==='win'){m.id=me.id;bc(room,m,me)}
 });
 ws.on('close',()=>{if(!room)return;room.players=room.players.filter(p=>p!==me);if(!room.players.length)rooms.delete(room.code);else{if(room.host===me.id)room.host=room.players[0].id;bc(room,{t:'roster',pl:roster(room),host:room.host,left:me.id})}});
});
const PORT=process.env.PORT||3000;server.listen(PORT,()=>console.log('Climb Together on :'+PORT));
