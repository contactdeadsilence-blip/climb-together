import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {sfx,initAudio,setWind,setVol} from './audio.js';

const $=id=>document.getElementById(id);const Q=new URLSearchParams(location.search);
const settings=Object.assign({sens:5,qual:2,vol:7},JSON.parse(localStorage.ct_set||'{}'));
// ---------- renderer ----------
const renderer=new THREE.WebGLRenderer({antialias:settings.qual<2,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,settings.qual==2?1.5:1));renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=settings.qual>0;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
const vig=document.createElement('div');vig.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:5;background:radial-gradient(ellipse at center,transparent 55%,rgba(20,10,40,.45))';document.body.append(vig);
const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,900);
const HORIZON=new THREE.Color('#ffd9b0');scene.fog=new THREE.Fog(HORIZON,70,330);
let composer=null;
if(settings.qual>0){composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(innerWidth,innerHeight,{samples:settings.qual==2?4:0,type:THREE.HalfFloatType}));
 composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth/2,innerHeight/2),.35,.55,.82));composer.addPass(new OutputPass());}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer&&composer.setSize(innerWidth,innerHeight)});
// ---------- lights / sky ----------
scene.add(new THREE.HemisphereLight('#bfe3ff','#7a5a3a',1.1));
const sun=new THREE.DirectionalLight('#fff1d6',2.4);sun.castShadow=true;const SM=settings.qual==2?2048:1024;sun.shadow.mapSize.set(SM,SM);
Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:160});sun.shadow.bias=-.0005;sun.shadow.normalBias=.04;sun.shadow.radius=4;
scene.add(sun,sun.target);const SUNDIR=new THREE.Vector3(-.5,.8,-.45).normalize();
const sky=new THREE.Mesh(new THREE.SphereGeometry(700,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
 uniforms:{top:{value:new THREE.Color('#3d8fff')},hor:{value:HORIZON},sd:{value:SUNDIR}},
 vertexShader:'varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform vec3 top,hor,sd;varying vec3 v;void main(){float h=max(v.y,0.);vec3 c=mix(hor,top,pow(h,.55));float s=max(dot(v,sd),0.);c+=vec3(1.,.85,.6)*(pow(s,600.)*4.+pow(s,8.)*.25);gl_FragColor=vec4(c,1.);}'}));
scene.add(sky);
// ---------- helpers ----------
const rnd=(s=>()=>(s=(s*16807)%2147483647)/2147483647)(1337);
const noise=(x,y,z)=>{const s=Math.sin(x*1.7+y*3.1+z*2.3)*43758.5453;return (s-Math.floor(s))-.5};
const mat=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85,flatShading:true},o));
const shade=m=>{m.castShadow=m.receiveShadow=settings.qual>0;return m};
// ---------- level ----------
export const BLOCKS=[{z:10,top:16,w:22,back:80},{z:22,top:36,w:18,back:78},{z:34,top:58,w:14,back:74},{z:46,top:82,w:10,back:64}];
const BIOME=[{wall:'#c98e5a',top:'#7fd35b',name:'MEADOW'},{wall:'#b77c55',top:'#9bbf5e',name:'ROCKY CLIFFS'},{wall:'#8a92b2',top:'#f4f8ff',name:'FROST RIDGE'},{wall:'#a9c4e6',top:'#ffffff',name:'SNOWY PEAK'}];
const COLL=[{x0:-200,x1:200,y0:-10,y1:0,z0:-200,z1:200}];
BLOCKS.forEach(b=>COLL.push({x0:-b.w,x1:b.w,y0:-10,y1:b.top,z0:b.z,z1:b.back,b}));
export const CPS=[new THREE.Vector3(0,.5,-4)];BLOCKS.forEach((b,i)=>CPS.push(new THREE.Vector3(0,b.top+.5,b.z+3.5)));
function rockBlock(b,i,prevTop){
 const W=b.w*2,H=b.top+10,D=b.back-b.z;
 let g=new THREE.BoxGeometry(W,H,D,Math.ceil(W/1.6),Math.ceil(H/1.6),Math.ceil(D/2.5)).toNonIndexed();
 g.translate(0,H/2-10,b.z+D/2);
 const p=g.attributes.position,col=[],cw=new THREE.Color(BIOME[i].wall),ct=new THREE.Color(BIOME[i].top),c=new THREE.Color();
 for(let k=0;k<p.count;k++){let x=p.getX(k),y=p.getY(k),z=p.getZ(k);
  const amp=y>b.top-.01?.25:.55;x+=noise(x,y,z)*amp;z+=noise(z,x,y)*amp*(z<=b.z+.01?.8:1);y+=y>b.top-.01?noise(x,z,1)*.15:noise(y,x,z)*amp;
  if(z<b.z)z=b.z-Math.abs(noise(x,y,9))*.5;p.setXYZ(k,x,y,z);}
 g.computeVertexNormals();const n=g.attributes.normal;
 for(let k=0;k<p.count;k+=3){const y=p.getY(k),ny=n.getY(k);
  if(ny>.6)c.copy(ct).offsetHSL(0,0,noise(p.getX(k),y,p.getZ(k))*.08);
  else{c.copy(cw).offsetHSL(noise(k,1,2)*.03,0,noise(p.getX(k),y,p.getZ(k))*.12+((y|0)%5==0?-.03:0));
   const ao=THREE.MathUtils.clamp((y-prevTop)/2.5,0,1);c.multiplyScalar(.55+.45*ao);
   if(i>=2&&noise(p.getX(k)*.3,y*.3,3)>.25)c.lerp(new THREE.Color('#f2f6ff'),.85);}
  for(let j=0;j<3;j++)col.push(c.r,c.g,c.b);}
 g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 scene.add(shade(new THREE.Mesh(g,mat('#fff',{vertexColors:true}))));
}
const HOLDS=[],OVER=[];let holdMesh;
function buildLevel(){
 // ground
 const gg=new THREE.PlaneGeometry(600,600,90,90).toNonIndexed();gg.rotateX(-Math.PI/2);const gp=gg.attributes.position;
 for(let k=0;k<gp.count;k++){const x=gp.getX(k),z=gp.getZ(k);const d=Math.max(0,Math.hypot(x,z+10)-45);gp.setY(k,noise(x,0,z)*.6+d*d*.002+Math.sin(x*.05)*d*.05)}
 gg.computeVertexNormals();const gc=[],c=new THREE.Color();
 for(let k=0;k<gp.count;k+=3){c.set('#6fcf4f').offsetHSL(noise(gp.getX(k),1,gp.getZ(k))*.05,0,noise(gp.getZ(k),2,gp.getX(k))*.1);for(let j=0;j<3;j++)gc.push(c.r,c.g,c.b)}
 gg.setAttribute('color',new THREE.Float32BufferAttribute(gc,3));const gm=shade(new THREE.Mesh(gg,mat('#fff',{vertexColors:true})));gm.castShadow=false;scene.add(gm);
 let prev=0;BLOCKS.forEach((b,i)=>{rockBlock(b,i,prev);prev=b.top});
 // holds: lanes of routes with leap gaps; crumble (biome 2+) and ice (biome 3+)
 const hg=new THREE.IcosahedronGeometry(.26,0);holdMesh=new THREE.InstancedMesh(hg,mat('#fff',{roughness:.6,emissive:'#221100',emissiveIntensity:.4}),700);const q=new THREE.Quaternion(),pal=['#ffcf3a','#ff7a4a','#ff5fa2','#5fe0c0'];
 const addH=(x,y,bi,type)=>{if(HOLDS.length>=700)return;const b=BLOCKS[bi],v=new THREE.Vector3(x,y,b.z-.18);q.setFromEuler(new THREE.Euler(rnd()*3,rnd()*3,0));
  const m4=new THREE.Matrix4().compose(v,q,new THREE.Vector3(1.3,.85,1).multiplyScalar(.9+rnd()*.4));const h={v,bi,type,m4,broken:0,held:0,i:HOLDS.length};HOLDS.push(h);holdMesh.setMatrixAt(h.i,m4);
  holdMesh.setColorAt(h.i,new THREE.Color(type=='c'?'#8a6a4a':type=='i'?'#bfefff':pal[(rnd()*4)|0]))};
 prev=0;BLOCKS.forEach((b,i)=>{const sp=b.w*.55,lanes=[-sp,0,sp];
  if(i>=1){const ox=sp/2*(i%2?1:-1),ow=Math.max(2.4,sp-3.2),oy=prev+(b.top-prev)*.5;OVER.push({x0:ox-ow/2,x1:ox+ow/2,y0:oy,y1:oy+1.1,z0:b.z-2.4,z1:b.z,b:i})}
  lanes.forEach(L=>{L+=(rnd()-.5)*1.2;let y=prev+1.3,k=0;while(y<b.top-.6){const x=THREE.MathUtils.clamp(L+(rnd()-.5)*1.4,-b.w+1,b.w-1);
    const t=k>1&&i>=1&&rnd()<.16?'c':k>0&&i>=2&&rnd()<.3?'i':'n';addH(x,y,i,t);k++;
    y+=k>1&&rnd()<(i==0?.15:.25+.08*i)?2.6+rnd()*.6:1.3+rnd()*.8}
   addH(THREE.MathUtils.clamp(L,-b.w+1,b.w-1),b.top-.4,i,'n')});
  for(let k=0;k<b.w*.8;k++)addH((rnd()*2-1)*(b.w-1),prev+1+rnd()*(b.top-prev-2),i,i>=1&&rnd()<.4?'c':'n');prev=b.top});
 holdMesh.count=HOLDS.length;shade(holdMesh);scene.add(holdMesh);
 OVER.forEach(o=>{const m=shade(new THREE.Mesh(new THREE.BoxGeometry(o.x1-o.x0,o.y1-o.y0,o.z1-o.z0),mat(BIOME[o.b].wall)));m.position.set((o.x0+o.x1)/2,(o.y0+o.y1)/2,(o.z0+o.z1)/2);scene.add(m);COLL.push(o)});
 const m4=new THREE.Matrix4();
 // trees, rocks, flowers
 const trunk=mat('#8a5a3a'),leaf=[mat('#3fae4a'),mat('#5cc85a'),mat('#2f9a5a')],snowLeaf=mat('#e8f2ff');
 const tree=(x,y,z,s,snow)=>{const t=new THREE.Group();t.add(shade(new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,1.2,6),trunk)));t.children[0].position.y=.6;
  for(let k=0;k<3;k++){const cn=shade(new THREE.Mesh(new THREE.ConeGeometry(1.3-k*.3,1.6,7),snow&&k==2?snowLeaf:leaf[(rnd()*3)|0]));cn.position.y=1.5+k*.85;cn.rotation.y=rnd()*3;t.add(cn)}
  t.position.set(x,y,z);t.scale.setScalar(s);scene.add(t)};
 for(let k=0;k<70;k++){const a=rnd()*Math.PI*2,r=14+rnd()*70;const x=Math.cos(a)*r,z=Math.sin(a)*r-12;if(z>8&&Math.abs(x)<26)continue;tree(x,0,z,.8+rnd()*1.1)}
 for(let k=0;k<6;k++)tree(-b0w()+2+rnd()*8*(k%2?1:-1)+(k%2?2*b0w()-12:0),16,11+rnd()*9,.8+rnd()*.4,false);
 for(let k=0;k<5;k++)tree((rnd()*2-1)*14,36,23.5+rnd()*8,.7+rnd()*.4,true);
 const rk=mat('#9a9aa6');for(let k=0;k<40;k++){const r=shade(new THREE.Mesh(new THREE.DodecahedronGeometry(.4+rnd()*1.2,0),rk));const a=rnd()*6.28,d=8+rnd()*40;r.position.set(Math.cos(a)*d,.2,Math.sin(a)*d-14);if(r.position.z>8)continue;r.rotation.set(rnd(),rnd(),rnd());scene.add(r)}
 const fl=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.12,0),new THREE.MeshStandardMaterial({emissiveIntensity:.25}),500);const fp=['#fff27a','#ff8fd1','#ffffff','#9fd8ff'];
 for(let k=0;k<500;k++){const x=(rnd()*2-1)*40,z=-rnd()*40+8;m4.makeTranslation(x,.12,z);fl.setMatrixAt(k,m4);fl.setColorAt(k,new THREE.Color(fp[k%4]))}scene.add(fl);
 // distant mountains
 const mm=mat('#7d8fc4'),sn=mat('#fbfdff');
 for(let k=0;k<16;k++){const a=k/16*Math.PI*2+rnd()*.2,r=230+rnd()*80,h=80+rnd()*110;const g=new THREE.Group();
  const m=new THREE.Mesh(new THREE.ConeGeometry(h*.9,h,7,3),mm);m.position.y=h/2;const s=new THREE.Mesh(new THREE.ConeGeometry(h*.9*.28,h*.28,7),sn);s.position.y=h*.86;g.add(m,s);g.position.set(Math.cos(a)*r,-5,Math.sin(a)*r);g.rotation.y=rnd()*3;scene.add(g)}
 // peak behind summit
 const pk=new THREE.Group();const pm=shade(new THREE.Mesh(new THREE.ConeGeometry(16,40,8,3),mat('#b9cbe8')));pm.position.set(0,82+18,76);pk.add(pm);scene.add(pk);
 // summit flag
 const pole=shade(new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,5),mat('#ddd',{metalness:.6,roughness:.3})));pole.position.set(0,84.5,52);scene.add(pole);
 flag=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.6,12,4),mat('#ff3a3a',{side:THREE.DoubleSide,flatShading:false,emissive:'#5a0000'}));flag.position.set(1.3,86.2,52);scene.add(flag);
 // clouds
 const cm=mat('#ffffff',{roughness:1,emissive:'#ffffff',emissiveIntensity:.15});
 for(let k=0;k<18;k++){const g=new THREE.Group();for(let j=0;j<5;j++){const s=new THREE.Mesh(new THREE.IcosahedronGeometry(3+rnd()*4,1),cm);s.position.set(j*4-8,rnd()*2,rnd()*3);g.add(s)}
  g.position.set((rnd()*2-1)*200,40+rnd()*70,(rnd()*2-1)*200);g.scale.y=.6;clouds.push(g);scene.add(g)}
 // campfires
 CPS.forEach((p,i)=>{const g=new THREE.Group();g.position.copy(p).add(new THREE.Vector3(3,-.5,0));
  for(let k=0;k<7;k++){const s=shade(new THREE.Mesh(new THREE.DodecahedronGeometry(.22,0),mat('#8c8c96')));s.position.set(Math.cos(k*.9)*.6,.1,Math.sin(k*.9)*.6);g.add(s)}
  for(let k=0;k<3;k++){const l=shade(new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,1,5),trunk));l.rotation.set(Math.PI/2,k*1.05,0);l.position.y=.15;g.add(l)}
  const fl=new THREE.Mesh(new THREE.ConeGeometry(.35,.9,6),new THREE.MeshBasicMaterial({color:'#ffb030'}));fl.position.y=.6;fl.visible=i==0;g.add(fl);
  const fi=new THREE.Mesh(new THREE.ConeGeometry(.2,.55,6),new THREE.MeshBasicMaterial({color:'#fff1a0'}));fi.position.y=.5;fl.add(fi);fi.position.y=-.1;
  fires.push({g,fl});scene.add(g)});
}
const b0w=()=>BLOCKS[0].w;let flag;const clouds=[],fires=[];
buildLevel();
const fireLight=new THREE.PointLight('#ff9a40',8,12,1.6);scene.add(fireLight);
// ---------- particles ----------
const SN=settings.qual==0?300:900,snowG=new THREE.BufferGeometry(),snowP=new Float32Array(SN*3);for(let k=0;k<SN*3;k++)snowP[k]=(Math.random()-.5)*40;
snowG.setAttribute('position',new THREE.BufferAttribute(snowP,3));const snow=new THREE.Points(snowG,new THREE.PointsMaterial({color:'#fff',size:.14,transparent:true,opacity:.9,depthWrite:false}));scene.add(snow);
const DN=120,dustG=new THREE.BufferGeometry(),dustP=new Float32Array(DN*3).fill(-999),dustV=new Float32Array(DN*3),dustL=new Float32Array(DN);let dustI=0;
dustG.setAttribute('position',new THREE.BufferAttribute(dustP,3));const dust=new THREE.Points(dustG,new THREE.PointsMaterial({color:'#e8d7b8',size:.35,transparent:true,opacity:.7,depthWrite:false}));scene.add(dust);
function puff(p,n=10,col){for(let k=0;k<n;k++){const i=dustI++%DN;dustP[i*3]=p.x;dustP[i*3+1]=p.y;dustP[i*3+2]=p.z;dustV[i*3]=(Math.random()-.5)*4;dustV[i*3+1]=Math.random()*2.5;dustV[i*3+2]=(Math.random()-.5)*4;dustL[i]=.6+Math.random()*.4}}
// ---------- characters ----------
const SKIN=mat('#ffd3a8',{flatShading:false,roughness:.6});
function makeDude(color){const g=new THREE.Group(),body=new THREE.Group();g.add(body);const cm=mat(color,{flatShading:false,roughness:.55});
 const torso=shade(new THREE.Mesh(new THREE.CapsuleGeometry(.4,.35,6,14),cm));torso.position.y=.62;body.add(torso);
 const belly=new THREE.Mesh(new THREE.SphereGeometry(.3,12,10),mat('#fff4e0',{flatShading:false}));belly.scale.set(1,1.1,.5);belly.position.set(0,.55,.25);body.add(belly);
 const head=shade(new THREE.Mesh(new THREE.SphereGeometry(.38,18,14),SKIN));head.position.y=1.28;body.add(head);
 const eyeM=new THREE.MeshBasicMaterial({color:'#1a1020'}),hi=new THREE.MeshBasicMaterial({color:'#fff'});
 [-1,1].forEach(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.07,8,8),eyeM);e.scale.y=1.4;e.position.set(s*.13,1.32,.34);body.add(e);const h=new THREE.Mesh(new THREE.SphereGeometry(.025,6,6),hi);h.position.set(s*.13+.02,1.36,.4);body.add(h);
  const ch=new THREE.Mesh(new THREE.SphereGeometry(.06,8,6),new THREE.MeshBasicMaterial({color:'#ff9a9a',transparent:true,opacity:.6}));ch.position.set(s*.24,1.2,.3);ch.scale.z=.3;body.add(ch)});
 const hat=shade(new THREE.Mesh(new THREE.SphereGeometry(.4,16,8,0,Math.PI*2,0,Math.PI/2),cm));hat.position.y=1.36;hat.scale.y=.8;body.add(hat);
 const band=new THREE.Mesh(new THREE.TorusGeometry(.38,.07,6,18),mat('#fff4e0',{flatShading:false}));band.rotation.x=Math.PI/2;band.position.y=1.38;body.add(band);
 const pom=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),mat('#fff4e0'));pom.position.y=1.72;body.add(pom);
 const pack=shade(new THREE.Mesh(new THREE.BoxGeometry(.5,.55,.25),mat('#7a4a2a')));pack.position.set(0,.7,-.42);body.add(pack);
 const roll=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.56,8),mat('#e05a3a'));roll.rotation.z=Math.PI/2;roll.position.set(0,1.02,-.42);body.add(roll);
 const hands=[-1,1].map(s=>{const h=shade(new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),SKIN));h.position.set(s*.5,.6,.1);g.add(h);return h});
 const feet=[-1,1].map(s=>{const f=shade(new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),mat('#5a3a2a',{flatShading:false})));f.scale.set(1,.7,1.4);f.position.set(s*.18,.08,.05);body.add(f);return f});
 g.userData={body,hands,feet,lean:new THREE.Vector2(),lv:new THREE.Vector2(),sq:1,sqv:0};scene.add(g);return g}
function animDude(d,dt,st){// st:{vel,grip,ground,t}
 const u=d.userData,t=st.t;const sp=Math.hypot(st.vel.x,st.vel.z);
 // spring wobble
 const tl=new THREE.Vector2(THREE.MathUtils.clamp(-st.acc.z*.02,-.4,.4),THREE.MathUtils.clamp(st.acc.x*.02,-.4,.4));
 u.lv.addScaledVector(tl.sub(u.lean),dt*90);u.lv.multiplyScalar(Math.pow(.02,dt));u.lean.addScaledVector(u.lv,dt);
 u.body.rotation.x=u.lean.x+(st.grip?-.15:sp*.03);u.body.rotation.z=u.lean.y;
 const tsq=st.ground?1:THREE.MathUtils.clamp(1+st.vel.y*.015,.85,1.15);u.sqv+=(tsq-u.sq)*dt*200;u.sqv*=Math.pow(.004,dt);u.sq+=u.sqv*dt;
 u.body.scale.set(1/Math.sqrt(u.sq),u.sq,1/Math.sqrt(u.sq));
 const w=st.ground?Math.sin(t*12)*Math.min(sp/5,1):0;u.feet[0].position.z=.05+w*.25;u.feet[1].position.z=.05-w*.25;u.body.position.y=st.ground?Math.abs(w)*.08:0;
 u.hands.forEach((h,i)=>{const s=i?1:-1;let tx,ty,tz;
  if(st.grip&&st.hands[i]){tx=s*.42;ty=1.5+(i==(Math.floor(t*3)%2)&&st.climbing?.15:0);tz=.45}
  else if(!st.ground){tx=s*.6;ty=1.3+Math.sin(t*10+i)*.15;tz=.1}else{tx=s*.52;ty=.6;tz=.1-w*s*.3}
  h.position.lerp(new THREE.Vector3(tx,ty,tz),Math.min(1,dt*14))})}
// ---------- input ----------
const keys={},mouse={l:false,r:false};let yaw=Math.PI,pitch=.25,locked=false;
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code=='Space')e.preventDefault();if(game&&/Digit[1-4]/.test(e.code))emote(+e.code[5]-1)});addEventListener('keyup',e=>keys[e.code]=false);
renderer.domElement.addEventListener('mousedown',e=>{if(!game)return;if(!locked){renderer.domElement.requestPointerLock?.();}if(e.button==0)mouse.l=true;if(e.button==2)mouse.r=true});
addEventListener('mouseup',e=>{if(e.button==0)mouse.l=false;if(e.button==2)mouse.r=false});addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('pointerlockchange',()=>locked=document.pointerLockElement==renderer.domElement);
addEventListener('mousemove',e=>{if(!locked)return;const s=settings.sens*.0005;yaw-=e.movementX*s;pitch=THREE.MathUtils.clamp(pitch+e.movementY*s,-.6,1.2)});
function readInput(dt){let mx=(keys.KeyD?1:0)-(keys.KeyA?1:0),my=(keys.KeyW?1:0)-(keys.KeyS?1:0),jump=!!keys.Space,gl=mouse.l||!!keys.KeyQ,gr=mouse.r||!!keys.KeyE;
 const gp=navigator.getGamepads?.()[0];if(gp){const dz=v=>Math.abs(v)>.15?v:0;mx+=dz(gp.axes[0]);my-=dz(gp.axes[1]);const ls=settings.sens/5;yaw-=dz(gp.axes[2])*2.8*ls*dt;pitch=THREE.MathUtils.clamp(pitch+dz(gp.axes[3])*1.9*ls*dt,-.6,1.2);
  jump=jump||(gp.buttons[0]?.pressed&&!uiEat);gl=gl||gp.buttons[6]?.value>.3||gp.buttons[4]?.pressed;gr=gr||gp.buttons[7]?.value>.3||gp.buttons[5]?.pressed;}
 return {mx:THREE.MathUtils.clamp(mx,-1,1),my:THREE.MathUtils.clamp(my,-1,1),jump,gl,gr}}
// ---------- game state ----------
let game=null;const R=.45,ROPE=5.5;
function newPlayer(idx){return {pos:CPS[0].clone().add(new THREE.Vector3((idx-1.5)*1.6,0,0)),vel:new THREE.Vector3(),acc:new THREE.Vector3(),prev:CPS[0].clone().add(new THREE.Vector3((idx-1.5)*1.6,0,0)),stam:100,grip:false,hands:[0,0],ground:false,noGrip:0,cp:0,charge:-1,jumpHeld:false,face:0,wasAir:0,wall:null,climbing:false,t:0}}
function collide(p){p.ground=false;p.wall=null;const c=new THREE.Vector3();
 for(const b of COLL){c.set(THREE.MathUtils.clamp(p.pos.x,b.x0,b.x1),THREE.MathUtils.clamp(p.pos.y,b.y0,b.y1),THREE.MathUtils.clamp(p.pos.z,b.z0,b.z1));
  const d=p.pos.clone().sub(c),l=d.length();if(l<R){const n=l>1e-5?d.divideScalar(l):new THREE.Vector3(0,1,0);p.pos.addScaledVector(n,R-l);const vn=p.vel.dot(n);if(vn<0)p.vel.addScaledVector(n,-vn);if(n.y>.6)p.ground=true;}}}
function nearHold(x,y,bi,rng){let best=null,bd=rng;for(const h of HOLDS){if(h.broken>0||h.bi!=bi)continue;const d=Math.hypot(h.v.x-x,h.v.y-y);if(d<bd){bd=d;best=h}}return best}
const windAt=y=>y>36?(Math.sin(T*.35)*.6+Math.sin(T*1.3+1)*.4)*(y>58?2.4:1.3):0;
function wallAt(p){for(const b of BLOCKS)if(Math.abs(p.pos.z-(b.z-R))<.55&&Math.abs(p.pos.x)<b.w-.2&&p.pos.y<b.top+.3&&p.pos.y>0)return b;return null}
function step(p,inp,dt){p.t+=dt;p.noGrip-=dt;const f=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),r=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));const v0=p.vel.clone();
 if(p.mantle){const m=p.mantle;m.t+=dt/.3;p.pos.lerpVectors(m.a,m.b,Math.min(1,m.t)).y+=Math.sin(Math.min(1,m.t)*Math.PI)*.35;if(m.t>=1){p.mantle=null;p.vel.set(0,0,1.2)}p.acc.set(0,0,0);return}
 const wantGrip=(inp.gl||inp.gr)&&p.noGrip<=0&&p.stam>0;const wb=wallAt(p),bi=BLOCKS.indexOf(wb);const wind=windAt(p.pos.y);p.slipT=(p.slipT||0)-dt;
 if(wantGrip&&wb&&!p.grip){const h=nearHold(p.pos.x,p.pos.y+.9,bi,1.0);
  if(h&&Math.abs(p.vel.y)<9){p.grip=true;p.hold=h;p.vel.set(0,0,0);sfx('grab');puff(h.v.clone(),5)}
  else if(h&&p.slipT<=0){p.slipT=.5;sfx('slip');flash('TOO FAST!')}}
 if(p.grip&&(!wantGrip||!wb||!nearHold(p.pos.x,p.pos.y+.9,bi,1.25)))p.grip=false;
 p.hands=[inp.gl?1:0,inp.gr?1:0];
 let tension=0;
 if(p.grip){const sx=inp.mx*Math.sign(r.x||1),mv=Math.hypot(inp.mx,inp.my)>.1;p.climbing=mv;
  const both=inp.gl&&inp.gr;const sp=both?2.2:1.5;let dx=sx*sp*dt+(both?0:wind*.5*dt),dy=inp.my*sp*dt;
  // can only move while a hold stays within reach
  if(!nearHold(p.pos.x+dx,p.pos.y+dy+.9,bi,1.2)){if(nearHold(p.pos.x+dx,p.pos.y+.9,bi,1.2))dy=0;else if(nearHold(p.pos.x,p.pos.y+dy+.9,bi,1.2))dx=0;else dx=dy=0}
  p.pos.x+=dx;p.pos.y+=dy;p.pos.z=wb.z-R;
  const h=nearHold(p.pos.x,p.pos.y+.9,bi,1.25);p.hold=h;
  if(h&&h.type=='c'){h.held+=dt;if(h.held>1.3){h.broken=7;h.held=0;holdMesh.setMatrixAt(h.i,new THREE.Matrix4().makeScale(0,0,0));holdMesh.instanceMatrix.needsUpdate=true;puff(h.v.clone(),14);sfx('slip');flash('IT CRUMBLED!')}}
  p.stam-=dt*((both?2.2:6)+(mv?(both?3:5):0))*(h&&h.type=='i'?1.7:1)*(both?1:1+Math.abs(wind)*.25);
  if(inp.jump){if(p.charge<0)p.charge=0;p.charge=Math.min(p.charge+dt,.8)}
  else if(p.charge>=0){const c=p.charge/.8,cost=10+c*15;p.charge=-1;if(p.stam>4){p.grip=false;p.noGrip=.2;p.stam-=cost;p.vel.set(sx*(2.5+c*3),7+c*8,-.6);sfx('leap',c);puff(p.pos,6)}}
  if(p.pos.y>wb.top-.25&&inp.my>-.1){p.grip=false;p.mantle={a:p.pos.clone(),b:new THREE.Vector3(p.pos.x,wb.top+R+.05,wb.z+.7),t:0};sfx('mantle')}
  if(p.stam<=0){p.stam=0;p.grip=false;p.noGrip=1.2;sfx('slip')}
  p.face=0;
 }else{p.climbing=false;p.charge=-1;p.hold=null;
  const wish=f.clone().multiplyScalar(inp.my).addScaledVector(r,inp.mx);if(wish.lengthSq()>1)wish.normalize();
  const ctl=p.ground?14:2.5;p.vel.x+=(wish.x*6.5-p.vel.x)*Math.min(1,ctl*dt);p.vel.z+=(wish.z*6.5-p.vel.z)*Math.min(1,ctl*dt);
  if(!p.ground)p.vel.x+=wind*dt*2.2;
  if(wish.lengthSq()>.01)p.face=Math.atan2(wish.x,wish.z);
  p.vel.y-=24*dt;if(p.vel.y<-40)p.vel.y=-40;
  if(inp.jump&&!p.jumpHeld&&p.ground){p.vel.y=8.2;sfx('jump')}
  if(p.ground)p.stam=Math.min(100,p.stam+dt*30);}
 p.jumpHeld=inp.jump;
 // rope to neighbours
 if(game.players.length>1){const i=game.myIdx;[i-1,i+1].forEach(j=>{const o=game.players[j];if(!o||!o.pos)return;const d=o.pos.clone().sub(p.pos),l=d.length();
  if(l>ROPE){d.divideScalar(l);const ex=l-ROPE;
   if(p.grip){if(o.pos.y<p.pos.y-.5&&!o.grip){tension+=ex;p.stam-=dt*ex*7}}
   else{const rv=p.vel.clone().sub(o.vel||new THREE.Vector3()).dot(d);p.vel.addScaledVector(d,Math.min(ex*16-rv*4,30)*dt);if(l>ROPE*2.2)p.pos.addScaledVector(d,Math.min(l-ROPE*2.2,4*dt))}}})}
 p.pos.addScaledVector(p.vel,dt);const wasG=p.ground;const vy=p.vel.y;collide(p);
 if(p.ground&&!wasG&&vy<-7){sfx('land',Math.min(1,-vy/25));puff(p.pos.clone().setY(p.pos.y-R),12)}
 p.acc.copy(p.vel).sub(v0).divideScalar(Math.max(dt,1e-3));p.tension=tension;
 // checkpoints
 for(let k=p.cp+1;k<CPS.length;k++)if(p.pos.y>CPS[k].y-1&&p.pos.z>BLOCKS[k-1].z){p.cp=k;fires[k].fl.visible=true;sfx('cp');flash(k==CPS.length-1?'':'CHECKPOINT · '+BIOME[Math.min(k,3)].name)}
 if(p.pos.y<CPS[p.cp].y-8||p.pos.y<-5){respawn(p)}
 if(p.cp==CPS.length-1&&p.pos.z>47&&!game.won)win();
}
function tickHolds(dt){for(const h of HOLDS)if(h.broken>0&&(h.broken-=dt)<=0){holdMesh.setMatrixAt(h.i,h.m4);holdMesh.instanceMatrix.needsUpdate=true}}
function respawn(p){p.pos.copy(CPS[p.cp]).add(new THREE.Vector3((game.myIdx-1.5)*1.2,1,0));p.vel.set(0,0,0);p.prev.copy(p.pos);p.mantle=null;p.grip=false;p.stam=100;sfx('slip');flash('BACK TO CAMP')}
let flashT;function flash(t){if(!t)return;$('msg').textContent=t;$('msg').style.opacity=1;clearTimeout(flashT);flashT=setTimeout(()=>$('msg').style.opacity=0,1800)}
// ---------- rope render ----------
const ropeMat=mat('#ffb347',{flatShading:false,roughness:.7});const ropes=[];
function drawRopes(){ropes.forEach(m=>{scene.remove(m);m.geometry.dispose()});ropes.length=0;if(!game)return;const P=game.players;
 for(let i=0;i<P.length-1;i++){const a=P[i].rp,b=P[i+1].rp;if(!a||!b)continue;const A=a.clone().add(new THREE.Vector3(0,.2,-.1)),B=b.clone().add(new THREE.Vector3(0,.2,-.1));
  const l=A.distanceTo(B),sag=Math.max(0,ROPE-l)*.45+.08;const pts=[];for(let k=0;k<=14;k++){const t=k/14;pts.push(A.clone().lerp(B,t).add(new THREE.Vector3(0,-sag*4*t*(1-t),0)))}
  const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),20,.055,5),ropeMat);m.castShadow=settings.qual>0;scene.add(m);ropes.push(m)}}
// ---------- net ----------
let ws=null,myId=0,hostId=0,roster=[];
function net(cb){if(ws&&ws.readyState==1)return cb();ws=new WebSocket((location.protocol=='https:'?'wss://':'ws://')+location.host+'/ws');ws.onopen=cb;
 ws.onmessage=e=>{const m=JSON.parse(e.data);
  if(m.t=='err'){$('jerr').textContent=m.e}
  if(m.t=='joined'){myId=m.id;hostId=m.host;$('lcode').textContent=m.code;showMenu('lobby')}
  if(m.t=='roster'){roster=m.pl;hostId=m.host;renderLobby();if(game&&m.left){const o=game.players.find(p=>p.id==m.left);if(o){o.left=true;o.dude&&scene.remove(o.dude);o.tag&&o.tag.remove()}}}
  if(m.t=='start')startGame(m.pl);
  if(m.t=='s'&&game){const o=game.players.find(p=>p.id==m.id);if(o){o.tp=new THREE.Vector3(...m.p);o.face=m.r;o.grip=!!m.g;o.hands=[m.g&1,m.g&2?1:0];o.vel=new THREE.Vector3(...m.v);if(!o.pos){o.pos=o.tp.clone()}}}
  if(m.t=='e'&&game){const o=game.players.find(p=>p.id==m.id);o&&showEmote(o,m.k)}
  if(m.t=='win'&&game){const o=game.players.find(p=>p.id==m.id);o&&flash(o.name+' REACHED THE SUMMIT!')}};
 ws.onclose=()=>{if(game&&game.online)flash('DISCONNECTED')}}
function renderLobby(){$('lpl').innerHTML=roster.map(p=>`<div class="pl" style="color:${p.color}">● ${p.name}${p.id==hostId?' (host)':''}</div>`).join('');
 $('lmode').textContent=['','SOLO','DUO','TRIO','QUADS'][roster.length]+' · '+roster.length+'/4 climbers';$('bstart').style.display=myId==hostId?'':'none';
 if(myId!=hostId)$('lmode').textContent+=' · waiting for host'}
const EMO=['HELP!','PULL ME UP!','NICE!','WAIT UP!'];
function emote(k){const me=game.players[game.myIdx];showEmote(me,k);ws&&game.online&&ws.send(JSON.stringify({t:'e',k}))}
function showEmote(o,k){o.emo=EMO[k];o.emoT=2.5;sfx('emote')}
// ---------- flow ----------
function showMenu(which){setFocus(null);$('menu').classList.add('on');['main','join','lobby','set'].forEach(k=>$('m-'+k).style.display=k==which?(k=='main'?'flex':''):'none')}
function startGame(pl){const local=pl.findIndex(p=>p.id==myId);fires.forEach((f,i)=>f.fl.visible=i==0);
 game={online:pl.length>1||!!ws,myIdx:Math.max(0,local),players:pl.map((p,i)=>({id:p.id,name:p.name,color:p.color})),t0:performance.now(),won:false,sendT:0};
 game.players.forEach((p,i)=>{p.dude=makeDude(p.color);if(i==game.myIdx){Object.assign(p,newPlayer(i));p.rp=p.pos.clone()}else{const t=document.createElement('div');t.className='tag';t.style.color=p.color;document.body.append(t);p.tag=t}});
 $('menu').classList.remove('on');$('win').classList.remove('on');$('hud').style.display='block';yaw=Math.PI;pitch=.25;
 $('altdots').innerHTML=game.players.map((p,i)=>`<div id="ad${i}" style="background:${p.color}"></div>`).join('');flash(BIOME[0].name);sfx('cp')}
function endGame(){if(!game)return;game.players.forEach(p=>{p.dude&&scene.remove(p.dude);p.tag&&p.tag.remove()});game=null;drawRopes();$('hud').style.display='none';document.exitPointerLock?.()}
function win(){game.won=true;const s=(performance.now()-game.t0)/1000;$('wtime').textContent='TIME '+fmt(s)+(game.players.length>1?' · '+['','SOLO','DUO','TRIO','QUADS'][game.players.length]:'');
 $('win').classList.add('on');setFocus(null);sfx('win');document.exitPointerLock?.();ws&&game.online&&ws.send(JSON.stringify({t:'win',time:s}))}
const fmt=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
document.addEventListener('click',e=>{initAudio();setVol(settings.vol/10);if(e.target.dataset?.k){sfx('ui');oskKey(e.target.dataset.k);return}const a=e.target.dataset?.a;if(!a)return;sfx('ui');const nm=()=>($('nm').value||localStorage.ct_nm||'Climber').toUpperCase();
 if(a=='solo'){myId=0;ws&&ws.close();ws=null;startGame([{id:0,name:'YOU',color:'#ff6b4a'}])}
 if(a=='host')net(()=>ws.send(JSON.stringify({t:'host',name:nm()})));
 if(a=='join'){showMenu('join');oskT=$('code');setTgt()}if(a=='resume')setPause(false);if(a=='pset')showMenu('set');if(a=='set')showMenu('set');if(a=='back'){if(game){$('menu').classList.remove('on');setFocus(null)}else showMenu('main')}
 if(a=='dojoin'){localStorage.ct_nm=$('nm').value;net(()=>ws.send(JSON.stringify({t:'join',code:$('code').value,name:nm()})))}
 if(a=='start')ws.send(JSON.stringify({t:'start'}));if(a=='leave'){ws&&ws.close();ws=null;showMenu('main')}
 if(a=='again'){const pl=game.players.map(p=>({id:p.id,name:p.name,color:p.color}));endGame();startGame(pl)}
 if(a=='tomenu'){paused=false;$('pause').classList.remove('on');endGame();ws&&ws.close();ws=null;showMenu('main')}});
['sens','qual','vol'].forEach(k=>{$(k).value=settings[k];$(k).onchange=()=>{settings[k]=+$(k).value;localStorage.ct_set=JSON.stringify(settings);setVol(settings.vol/10);if(k=='qual')location.reload()}});
const endSplash=()=>{if(!$('splash').classList.contains('on'))return;$('splash').classList.remove('on');if(!game)showMenu('main')};
$('splash').onclick=endSplash;setTimeout(endSplash,Q.has('nosplash')?0:2900);
// ---------- pause + controller UI ----------
let paused=false,uiEat=false,oskT=null;
function setPause(v){if(!game||game.won)return;paused=v;$('pause').classList.toggle('on',v);if(v)document.exitPointerLock?.()}
addEventListener('keydown',e=>{if(e.code=='Escape'&&game&&!$('menu').classList.contains('on'))setPause(!paused)});
const OSK='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
$('osk').innerHTML=[...OSK].map(c=>`<button class="key" data-k="${c}">${c}</button>`).join('')+'<button class="key w" data-k="DEL">DEL</button><button class="key w" data-k="OK">OK</button>';
['code','nm'].forEach(k=>$(k).addEventListener('focus',()=>{oskT=$(k);document.querySelectorAll('#code,#nm').forEach(e=>e.classList.toggle('tgt',e==oskT))}));
function oskKey(k){const t=oskT||$('code');if(k=='DEL')t.value=t.value.slice(0,-1);else if(k=='OK'){if(t.id=='code'){oskT=$('nm');setTgt()}else document.querySelector('[data-a=dojoin]').click()}else if(t.value.length<(+t.maxLength||10))t.value+=k;setTgt()}
function setTgt(){document.querySelectorAll('#code,#nm').forEach(e=>e.classList.toggle('tgt',e==(oskT||$('code'))))}
function uiRoot(){if($('splash').classList.contains('on'))return $('splash');if($('menu').classList.contains('on'))return [...$('menu').children].find(e=>e.id!='brand'&&e.offsetParent);
 if($('win').classList.contains('on'))return $('win');if(paused)return $('pause');return null}
let fEl=null;
function focusables(root){return [...root.querySelectorAll('button,input,select')].filter(e=>e.offsetParent&&e.style.display!='none')}
function setFocus(e){fEl&&fEl.classList.remove('f');fEl=e;if(e){e.classList.add('f');e.scrollIntoView?.({block:'nearest'})}}
function nav(dx,dy){const root=uiRoot();if(!root||root.id=='splash')return;const L=focusables(root);if(!L.length)return;
 if(!fEl||!L.includes(fEl)){setFocus(L[0]);return}
 if(dx&&(fEl.type=='range'||fEl.tagName=='SELECT')){if(fEl.type=='range')fEl.value=+fEl.value+dx*(+fEl.step||1);else fEl.selectedIndex=THREE.MathUtils.clamp(fEl.selectedIndex+dx,0,fEl.options.length-1);fEl.dispatchEvent(new Event('change'));sfx('ui');return}
 const a=fEl.getBoundingClientRect(),ax=a.x+a.width/2,ay=a.y+a.height/2;let best=null,bs=1e9;
 for(const e of L){if(e==fEl)continue;const b=e.getBoundingClientRect(),ex=b.x+b.width/2-ax,ey=b.y+b.height/2-ay;const along=ex*dx+ey*dy;if(along<=4)continue;const perp=Math.abs(ex*dy)+Math.abs(ey*dx);const sc=along+perp*2.5;if(sc<bs){bs=sc;best=e}}
 if(best){setFocus(best);sfx('ui')}}
function uiA(){const root=uiRoot();if(!root)return;if(root.id=='splash'){endSplash();return}if(!fEl||!focusables(root).includes(fEl)){nav(0,1);return}
 if(fEl.tagName=='INPUT'&&fEl.type!='range'){fEl.focus();setFocus(document.querySelector('#osk .key'));return}fEl.click()}
function uiB(){const root=uiRoot();if(!root||root.id=='splash')return;if(document.activeElement==$('code')||document.activeElement==$('nm'))document.activeElement.blur();
 const b=root.querySelector('[data-a=back],[data-a=leave],[data-a=resume]');b&&b.click()}
const pb={},rep_={t:0,d:''};
function pollPad(dt){const gp=navigator.getGamepads?.()[0];uiEat=false;if(!gp)return;const B=k=>!!gp.buttons[k]?.pressed;const edge=k=>{const v=B(k),w=!pb[k]&&v;pb[k]=v;return w};
 const root=uiRoot();
 if(edge(9)){if(game&&!$('menu').classList.contains('on'))setPause(!paused);else if(!game)uiA()}
 const a=edge(0),b=edge(1);
 if(!root){if(B(0))uiEat=uiEat;return}
 uiEat=true;let dx=(B(15)?1:0)-(B(14)?1:0),dy=(B(13)?1:0)-(B(12)?1:0);if(!dx&&!dy){const x=gp.axes[0],y=gp.axes[1];if(Math.abs(x)>.55)dx=Math.sign(x);else if(Math.abs(y)>.55)dy=Math.sign(y)}
 const d=dx+','+dy;if(dx||dy){if(d!=rep_.d){rep_.d=d;rep_.t=.38;nav(dx,dy)}else if((rep_.t-=dt)<=0){rep_.t=.13;nav(dx,dy)}}else rep_.d='';
 if(a)uiA();if(b)uiB()}
// ---------- loop ----------
const clock=new THREE.Clock();let camPos=new THREE.Vector3(0,30,-60),camF=null,T=0,accT=0;const H=1/120;
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.1);T+=dt;pollPad(dt);
 let focus;
 if(game){const me=game.players[game.myIdx];let inp=readInput(dt);if(paused){inp={mx:0,my:0,jump:false,gl:me.grip,gr:me.grip};}
  if(!game.won&&!(paused&&!game.online)){accT+=dt;tickHolds(dt);while(accT>=H){me.prev.copy(me.pos);step(me,inp,H);accT-=H}}me.rp.lerpVectors(me.prev,me.pos,accT/H);
  game.players.forEach((p,i)=>{if(!p.pos||p.left)return;if(i!=game.myIdx){if(p.pos.distanceTo(p.tp)>6)p.pos.copy(p.tp);p.pos.lerp(p.tp,1-Math.exp(-dt*10));p.rp=p.pos.clone();p.acc=p.acc||new THREE.Vector3();p.t=(p.t||0)+dt}
   const d=p.dude,rp=i==game.myIdx?p.rp:p.pos;d.position.copy(rp).setY(rp.y-R);let da=(p.face-d.rotation.y)%(Math.PI*2);if(da>Math.PI)da-=Math.PI*2;if(da<-Math.PI)da+=Math.PI*2;d.rotation.y+=da*Math.min(1,dt*12);
   animDude(d,dt,{vel:p.vel||new THREE.Vector3(),acc:p.acc,grip:p.grip,hands:p.hands||[0,0],ground:i==game.myIdx?p.ground:!p.grip&&Math.abs(p.vel?.y||0)<.5,t:p.t,climbing:p.climbing??p.grip});
   if(p.tag){const v=p.pos.clone().add(new THREE.Vector3(0,1.8,0)).project(camera);p.tag.style.display=v.z<1?'':'none';p.tag.style.left=(v.x+1)/2*innerWidth+'px';p.tag.style.top=(1-v.y)/2*innerHeight+'px';p.tag.innerHTML=(p.emoT>0?'<b>'+p.emo+'</b>':'')+p.name}
   if(p.emoT>0)p.emoT-=dt;const ad=$('ad'+i);ad&&(ad.style.top=(110+innerHeight*.5*(1-THREE.MathUtils.clamp(p.pos.y/82,0,1))-9)+'px')});
  if(me.emoT>0&&!me.tag){me.tag=document.createElement('div');me.tag.className='tag';document.body.append(me.tag)}
  drawRopes();
  if(game.online&&ws&&ws.readyState==1&&(game.sendT-=dt)<0){game.sendT=1/15;ws.send(JSON.stringify({t:'s',p:me.pos.toArray().map(v=>+v.toFixed(2)),v:me.vel.toArray().map(v=>+v.toFixed(1)),r:+me.face.toFixed(2),g:(me.grip?(me.hands[0]|(me.hands[1]<<1)||1):0)}))}
  $('stamf').style.width=me.stam+'%';$('stamf').style.background=me.stam<25?'linear-gradient(90deg,#ff4a4a,#ff9a3a)':'linear-gradient(90deg,#7cf05a,#d9ff5a)';
  $('charge').style.display=me.charge>=0?'block':'none';$('chargef').style.width=Math.max(0,me.charge/.8*100)+'%';
  $('alt').firstChild.textContent=Math.max(0,Math.round(me.pos.y*12))+'m';if(!game.won)$('tm').textContent=fmt((performance.now()-game.t0)/1000);
  const fT=me.rp.clone().add(new THREE.Vector3(0,1.1,0));if(!camF||camF.distanceTo(fT)>12)camF=fT.clone();camF.lerp(fT,1-Math.exp(-dt*16));focus=camF.clone();const dist=me.grip?7.5:6.5;
  const want=focus.clone().add(new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(dist));
  for(const b of BLOCKS)if(want.z>b.z-.6&&want.z<b.back&&want.y<b.top+.5&&Math.abs(want.x)<b.w+.5)want.z=b.z-.6;if(want.y<.6)want.y=.6;
  if(camPos.distanceTo(want)>25)camPos.copy(want);camPos.lerp(want,1-Math.exp(-dt*9));camera.position.copy(camPos);camera.lookAt(focus);
  setWind(THREE.MathUtils.clamp(me.pos.y/82,0,1)*.6+.1);
  const cf=CPS[me.cp];fireLight.position.copy(cf).add(new THREE.Vector3(3,.6,0));fireLight.intensity=6+Math.sin(T*17)*1.2+Math.sin(T*7)*1.5;
 }else{const a=T*.06;focus=new THREE.Vector3(0,34,30);camera.position.set(Math.sin(a)*60,32+Math.sin(T*.1)*6,-50+Math.cos(a)*22);camera.lookAt(focus);setWind(.15)}
 fires.forEach(f=>{if(f.fl.visible){f.fl.scale.set(1+Math.sin(T*13)*.1,1+Math.sin(T*9)*.2,1);f.fl.rotation.y+=dt*3}});
 const fp=flag.geometry.attributes.position;for(let k=0;k<fp.count;k++){const x=fp.getX(k)+1.3;fp.setZ(k,Math.sin(x*2.5-T*6)*.18*x)}fp.needsUpdate=true;
 clouds.forEach(c=>{c.position.x+=dt*1.5;if(c.position.x>220)c.position.x=-220});
 sun.position.copy(focus).addScaledVector(SUNDIR,80);sun.target.position.copy(focus);
 // snow follows camera above frost line
 snow.visible=focus.y>30;if(snow.visible){snow.position.copy(camera.position);for(let k=0;k<SN;k++){snowP[k*3+1]-=dt*(2+(k%5)*.4);snowP[k*3]+=Math.sin(T+k)*dt*.6;if(snowP[k*3+1]<-20)snowP[k*3+1]=20}snowG.attributes.position.needsUpdate=true}
 for(let i=0;i<DN;i++)if(dustL[i]>0){dustL[i]-=dt;dustV[i*3+1]-=dt*3;for(let j=0;j<3;j++)dustP[i*3+j]+=dustV[i*3+j]*dt;if(dustL[i]<=0)dustP[i*3+1]=-999}dustG.attributes.position.needsUpdate=true;
 composer?composer.render():renderer.render(scene,camera)}
frame();
window.__ct={route(){let prev=0;return BLOCKS.map((b,i)=>{const hs=HOLDS.filter(h=>h.bi==i&&!OVER.some(o=>h.v.x>o.x0-.5&&h.v.x<o.x1+.5&&h.v.y>o.y0-1.4&&h.v.y<o.y1+.3));const seen=new Set(hs.filter(h=>h.v.y<prev+1.5));const q=[...seen];while(q.length){const a=q.pop();for(const h of hs)if(!seen.has(h)){const dx=Math.abs(h.v.x-a.v.x),dy=h.v.y-a.v.y;if(Math.hypot(dx,dy)<=2.4||(dy>0&&dy<=3.6&&dx<=2.5)){seen.add(h);q.push(h)}}}const ok=[...seen].some(h=>h.v.y>=b.top-.6);prev=b.top;return ok})},pause:()=>paused,get game(){return game},tp(x,y,z,grip){const p=game.players[game.myIdx];p.pos.set(x,y,z);p.vel.set(0,0,0);if(grip){mouse.l=mouse.r=true}},look(y,p){yaw=y;pitch=p},release(){mouse.l=mouse.r=false},setCp(k){game.players[game.myIdx].cp=k},net:()=>ws};
