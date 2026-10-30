let ac,master,windG,windF;
export function initAudio(){if(ac)return;ac=new (window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=.7;
 const comp=ac.createDynamicsCompressor();master.connect(comp);comp.connect(ac.destination);
 const b=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){l=(l+.02*(Math.random()*2-1))/1.02;d[i]=l*3.5}
 const n=ac.createBufferSource();n.buffer=b;n.loop=true;windF=ac.createBiquadFilter();windF.type='bandpass';windF.frequency.value=500;windF.Q.value=.6;windG=ac.createGain();windG.gain.value=0;n.connect(windF);windF.connect(windG);windG.connect(master);n.start()}
export const setVol=v=>master&&(master.gain.value=v);
export function setWind(v){if(!ac)return;windG.gain.setTargetAtTime(v*.5,ac.currentTime,.5);windF.frequency.setTargetAtTime(300+v*900+Math.sin(ac.currentTime*.7)*150,ac.currentTime,.3)}
function tone(f,f2,dur,type='sine',vol=.25,delay=0){const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f2,t+dur);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.05)}
function noise(dur,freq,vol=.3){const t=ac.currentTime,s=ac.createBufferSource(),b=ac.createBuffer(1,ac.sampleRate*dur,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;s.buffer=b;
 const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;const g=ac.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(master);s.start()}
export function sfx(k,x=0){if(!ac)return;
 ({grab:()=>{noise(.08,1800,.25);tone(220,140,.08,'triangle',.15)},jump:()=>tone(300,600,.18,'square',.08),leap:()=>{tone(250,700+x*500,.3,'sawtooth',.08);noise(.3,900,.15)},
  mantle:()=>tone(400,800,.15,'triangle',.15),land:()=>{tone(120,50,.2,'sine',.4*x+.1);noise(.15,400,.2*x+.05)},slip:()=>tone(600,150,.4,'triangle',.18),
  cp:()=>[523,659,784,1046].forEach((f,i)=>tone(f,f,.25,'triangle',.15,i*.09)),win:()=>[523,659,784,1046,784,1046,1318].forEach((f,i)=>tone(f,f*1.01,.35,'square',.08,i*.13)),
  emote:()=>tone(880,1200,.1,'sine',.12),ui:()=>tone(660,880,.06,'triangle',.12)})[k]?.()}
