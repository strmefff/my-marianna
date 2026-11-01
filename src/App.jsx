import {useState,useEffect,useRef} from 'react';
import {CONFIG} from './config';
import Story from './Story';
import Adventure from './Adventure';
import Player from './Player';
import Countdown from './Countdown';
import {sfx,initSound} from './sound';
import {ARCHIVE} from './content/archive';



const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function useTyper(lines,speed=22,onDone){
  const [out,setOut]=useState([]);
  useEffect(()=>{
    let dead=false;
    (async()=>{
      for(let i=0;i<lines.length;i++){
        for(let c=1;c<=lines[i].length;c++){
          if(dead)return;
          if(c%2===0)sfx.tick();
          setOut(p=>{const n=p.slice(0,i);n[i]=lines[i].slice(0,c);return n});
          await sleep(speed);
        }
        await sleep(280);
      }
      if(!dead&&onDone)onDone();
    })();
    return()=>{dead=true};
  },[]);
  return out;
}

function Lines({lines,cls="text-green-400"}){
  return lines.map((l,i)=><div key={i} className={`${cls} ${i===lines.length-1?"cur":""}`}>{l}</div>);
}

/* STAGE 0: singularity */
function Singularity({onDone}){
  const [prog,setProg]=useState(0);
  const [rips,setRips]=useState([]);
  const timer=useRef(null),start=useRef(0),rid=useRef(0),pos=useRef({x:0,y:0});
  const spawn=()=>{
    const id=rid.current++;
    setRips(r=>[...r,{id,...pos.current}]);
    setTimeout(()=>setRips(r=>r.filter(x=>x.id!==id)),1600);
  };
  const down=e=>{
    pos.current={x:e.clientX,y:e.clientY};
    sfx.holdStart();
    start.current=performance.now();spawn();
    let last=0;
    const tick=()=>{
      const p=Math.min((performance.now()-start.current)/1800,1);
      setProg(p);
      if(performance.now()-last>350){last=performance.now();spawn()}
      if(p>=1){sfx.holdEnd();sfx.boot();onDone();return}
      timer.current=requestAnimationFrame(tick);
    };
    timer.current=requestAnimationFrame(tick);
  };
  const up=()=>{cancelAnimationFrame(timer.current);setProg(0);sfx.holdEnd()};
  return(
    <div className="h-full flex flex-col items-center justify-center mono relative">
      {rips.map(r=><div key={r.id} className="fixed rounded-full border-2 border-cyan-300 pointer-events-none" style={{left:r.x,top:r.y,width:520,height:520,animation:"ripple 1.5s ease-out forwards"}}/>)}
      <div onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} onContextMenu={e=>e.preventDefault()}
        className="relative w-40 h-40 flex items-center justify-center cursor-pointer" style={{touchAction:"none"}}>
        <svg className="absolute inset-0" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="289" strokeDashoffset={289*(1-prog)} transform="rotate(-90 50 50)" style={{filter:"drop-shadow(0 0 4px #22d3ee)"}}/></svg>
        <div className="w-3 h-3 rounded-full bg-white" style={{animation:"pulse 2.4s ease-in-out infinite",boxShadow:"0 0 25px 10px rgba(255,255,255,.35),0 0 80px 30px rgba(34,211,238,.2)"}}/>
      </div>
      <p className="absolute bottom-[14%] text-cyan-300/80 text-sm md:text-base tracking-widest">[ TAP &amp; HOLD TO INITIALIZE ]</p>
    </div>
  );
}

/* STAGE 1: terminal */
function Fingerprint({size=72}){
  return(<svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M12 26a20 20 0 0 1 40 0"/><path d="M18 52c-2-6-2-12-2-18a16 16 0 0 1 32 0c0 6 1 10 3 14"/>
    <path d="M24 56c-2-6-3-12-3-22a11 11 0 0 1 22 0c0 8 1 12 3 16"/><path d="M32 58c-2-6-3-14-3-24a3 3 0 0 1 6 0c0 8 1 14 3 18"/><path d="M26 34c0 8 1 12 2 16"/></svg>);
}

function Terminal({onDone,onFlash}){
  const [step,setStep]=useState("boot");
  const [val,setVal]=useState("");
  const [msg,setMsg]=useState([]);
  const [err,setErr]=useState(false);
  const [scan,setScan]=useState(false);
  const bottom=useRef(null);
  const boot=useTyper(["> SYSTEM INITIALIZED.","> SEARCHING FOR CORE MEMORY MODULE...","> SECURITY PROTOCOL: ACTIVE.","> RESTRICTED ACCESS: AUTHORIZED PERSONNEL ONLY."],20,()=>setStep("name"));
  useEffect(()=>{bottom.current&&bottom.current.scrollIntoView({behavior:"smooth"})},[step,msg,boot]);
  const deny=text=>{sfx.deny();setMsg([text]);setErr(true);setTimeout(()=>setErr(false),550)};
  const submit=async e=>{
    e&&e.preventDefault();
    const v=val.trim();if(!v)return;
    if(step==="name"){
      const l=v.toLowerCase();
      if(l==="marianna"){sfx.grant();setMsg(["[ ACCESS GRANTED: USER IDENTIFIED ]"]);setStep("busy");await sleep(1300);setMsg([]);setVal("");setStep("date")}
      else if(["my love","princess","mari"].includes(l)){sfx.sparkle();setMsg(["[ MATCH CONFIRMED: 100% THE PRETTIEST HUMAN DETECTED ]"]);setStep("busy");await sleep(2000);setMsg([]);setVal("");setStep("date")}
      else deny("[ ACCESS DENIED: THIS ARCHIVE IS STRICTLY FOR MARIANNA ]");
    }else if(step==="date"){
      if(v===CONFIG.secretDate){sfx.grant();setMsg(["> PASSCODE ACCEPTED. DECRYPTING FILES..."]);setStep("busy");await sleep(1500);setMsg([]);setStep("finger")}
      else deny("[ ACCESS DENIED: WRONG CODE ] "+CONFIG.hint);
    }
  };
  const press=async()=>{
    if(scan||step!=="finger")return;
    setScan(true);sfx.scan();await sleep(2200);setScan(false);setStep("busy");
    const lines=["> BIOMETRIC MATCH: 100% MARIANNA.","> WELCOME BACK, MY LOVE.","> UNLOCKING OUR STORY..."];
    for(let i=1;i<=3;i++){setMsg(lines.slice(0,i));sfx.beep(i===3);await sleep(900)}
    await sleep(500);
    onFlash();
    onDone();
  };
  const showInput=step==="name"||step==="date";
  return(
    <div id="term" className="h-full overflow-auto mono px-6 md:px-16 py-10 text-lg md:text-2xl leading-relaxed" style={{textShadow:"0 0 8px currentColor"}}>
      <div className="max-w-4xl mx-auto">
        <Lines lines={step==="boot"?boot:boot.map(s=>s)} cls="text-green-400"/>
        {step!=="boot"&&<div className="mt-6 text-cyan-300">{step==="name"||(step==="busy"&&!msg.length)?"> ENTER AUTHORIZED USERNAME:":step==="date"?"> ENTER THE SECRET DATE OR CODEWORD (DD.MM.YYYY):":""}</div>}
        {showInput&&(
          <form onSubmit={submit} className={`mt-4 flex gap-3 ${err?"shake":""}`}>
            <span className={err?"text-red-500":"text-white"}>{">"}</span>
            <input autoFocus key={step} value={val} onChange={e=>setVal(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck="false" enterKeyHint="go"
              className={`flex-1 bg-black/60 border-b-2 outline-none px-3 py-3 min-h-[56px] text-white ${err?"border-red-500":"border-cyan-400"}`} style={{userSelect:"text",WebkitUserSelect:"text"}}/>
            <button className="min-w-[64px] min-h-[56px] px-5 border border-cyan-400 text-cyan-300 active:bg-cyan-400/30 rounded">GO</button>
          </form>
        )}
        {msg.map((m,i)=><div key={i} className={`mt-4 ${err?"text-red-500 shake":m.includes("DENIED")?"text-red-500":m.includes("PRETTIEST")||m.includes("WELCOME")||m.includes("UNLOCKING")?"text-pink-400":"text-green-300"}`}>{m}</div>)}
        {(step==="finger"||(scan))&&(
          <div className="mt-10 flex flex-col items-center">
            <button data-nosound onPointerDown={press} className="relative w-44 h-44 rounded-2xl border border-cyan-400/60 text-cyan-300 flex items-center justify-center overflow-hidden active:scale-95 transition-transform" style={{boxShadow:"0 0 40px rgba(34,211,238,.25)"}}>
              <Fingerprint size={96}/>
              {scan&&<div className="absolute left-0 right-0 h-1 bg-cyan-300" style={{animation:"sweep .55s ease-in-out infinite alternate",boxShadow:"0 0 18px 8px rgba(34,211,238,.8)"}}/>}
            </button>
            <p className="mt-6 text-cyan-300 text-base md:text-xl tracking-wider text-center">{scan?"SCANNING...":"[ PLACE FINGER PRINT TO AUTHORIZE DECRYPTION ]"}</p>
          </div>
        )}
        <div ref={bottom}/>
      </div>
    </div>
  );
}

/* STAGE 2: circle wipe, black window -> pink window */
const PINK="#fcd9e6";
function Reveal({onDone,dark}){
  const [go,setGo]=useState(false);
  useEffect(()=>{
    sfx.droneOff();sfx.whoosh();sfx.music(true);
    const a=requestAnimationFrame(()=>requestAnimationFrame(()=>setGo(true)));
    const t=setTimeout(onDone,1700);
    return()=>{cancelAnimationFrame(a);clearTimeout(t)};
  },[]);
  return <div className="fixed inset-0 pointer-events-none" style={{zIndex:5,background:dark?NIGHT:PINK,clipPath:go?"circle(110% at 50% 50%)":"circle(0% at 50% 50%)",transition:"clip-path 1.5s cubic-bezier(.7,0,.3,1)"}}/>;
}

/* night sky: gradient + animated canvas stars (twinkle, slow drift, shooting stars) */
const NIGHT="radial-gradient(ellipse at 18% 112%,rgba(236,72,153,.30),transparent 55%),radial-gradient(ellipse at 88% -10%,rgba(124,58,237,.38),transparent 52%),linear-gradient(180deg,#060a1e 0%,#140d33 60%,#24103f 100%)";

function makeSprite(rgb){
  const s=64,c=document.createElement("canvas");c.width=c.height=s;
  const x=c.getContext("2d"),g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  g.addColorStop(0,`rgba(${rgb},1)`);g.addColorStop(.18,`rgba(${rgb},.85)`);g.addColorStop(.45,`rgba(${rgb},.18)`);g.addColorStop(1,`rgba(${rgb},0)`);
  x.fillStyle=g;x.fillRect(0,0,s,s);return c;
}

function Stars({active}){
  const ref=useRef(null);
  useEffect(()=>{
    if(!active)return;
    const cv=ref.current,ctx=cv.getContext("2d");
    const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cool=makeSprite("214,226,255"),warm=makeSprite("255,214,170");
    let w=0,h=0,stars=[],shoots=[],raf=0,last=0,nextShoot=1800,t=0;
    const build=()=>{
      const dpr=Math.min(window.devicePixelRatio||1,2);
      w=window.innerWidth;h=window.innerHeight;
      cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const n=Math.min(240,Math.round(w*h/6000));
      stars=Array.from({length:n},()=>{
        const z=Math.random()**1.6; // depth: most stars are small and far
        return{x:Math.random()*w,y:Math.random()*h,z,r:1.2+z*4.2,tw:.7+Math.random()*1.6,ph:Math.random()*6.283,warm:Math.random()<.22};
      });
    };
    const draw=()=>{
      ctx.clearRect(0,0,w,h);
      for(const s of stars){
        const a=.3+.7*(.5+.5*Math.sin(t*s.tw+s.ph));
        ctx.globalAlpha=a*(.45+.55*s.z);
        const d=s.r*2.6;
        ctx.drawImage(s.warm?warm:cool,s.x-d/2,s.y-d/2,d,d);
      }
      ctx.globalAlpha=1;
      for(const m of shoots){
        const k=m.life/m.max,al=Math.sin(Math.PI*Math.min(1,k));
        const tx=m.x-m.vx*.16,ty=m.y-m.vy*.16;
        const g=ctx.createLinearGradient(tx,ty,m.x,m.y);
        g.addColorStop(0,"rgba(255,255,255,0)");g.addColorStop(1,`rgba(255,240,220,${.9*al})`);
        ctx.strokeStyle=g;ctx.lineWidth=2;ctx.lineCap="round";
        ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(m.x,m.y);ctx.stroke();
      }
    };
    const frame=now=>{
      const dt=Math.min(now-last,60)/1000;last=now;t+=dt;
      for(const s of stars){ // slow drift to the left, nearer stars move faster
        s.x-=(2+s.z*9)*dt;
        if(s.x<-10){s.x=w+10;s.y=Math.random()*h}
      }
      nextShoot-=dt*1000;
      if(nextShoot<=0&&shoots.length<2){
        nextShoot=4500+Math.random()*6500;
        const sp=620+Math.random()*320;
        shoots.push({x:w*(.35+Math.random()*.6),y:Math.random()*h*.35,vx:-sp,vy:sp*.42,life:0,max:.85+Math.random()*.4});
      }
      for(const m of shoots){m.x+=m.vx*dt;m.y+=m.vy*dt;m.life+=dt}
      shoots=shoots.filter(m=>m.life<m.max);
      draw();
      raf=requestAnimationFrame(frame);
    };
    const onResize=()=>{build();if(reduce)draw()};
    const onVis=()=>{cancelAnimationFrame(raf);if(!document.hidden&&!reduce){last=performance.now();raf=requestAnimationFrame(frame)}};
    build();
    if(reduce){draw()}else{last=performance.now();raf=requestAnimationFrame(frame)}
    window.addEventListener("resize",onResize);
    document.addEventListener("visibilitychange",onVis);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",onResize);document.removeEventListener("visibilitychange",onVis)};
  },[active]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none"/>;
}

function Background({dark}){
  const fade={opacity:dark?1:0,transition:"opacity .9s ease"};
  return(
    <div className="fixed inset-0 overflow-hidden" style={{background:PINK}}>
      <div className="absolute inset-0" style={{background:NIGHT,...fade}}/>
      <div className="absolute inset-0" style={fade}><Stars active={dark}/></div>
    </div>
  );
}

/* STAGE 4: archive (content: src/content/archive.js) */
const asset=p=>/^(https?:|data:|blob:)/.test(p)?p:import.meta.env.BASE_URL+p.replace(/^\//,"");
const gradOf=c=>{const k=c.colors||["#f472b6","#c084fc"];return `linear-gradient(135deg,${k[0]},${k[1]})`};

function Cover({card,className,emojiCls="text-6xl"}){
  return <div className={`${className} flex items-center justify-center ${emojiCls}`} style={{background:gradOf(card)}}>{card.emoji}</div>;
}

function Gallery({card}){
  const photos=card.photos||[];
  const [i,setI]=useState(0);
  const [bad,setBad]=useState({});
  if(!photos.length||bad[i]&&photos.length===1)return <Cover card={{...card,photos:[]}} className="rounded-2xl h-48 md:h-72 md:w-1/2 shrink-0" emojiCls="text-8xl"/>;
  const step=d=>{setI((i+d+photos.length)%photos.length);sfx.pop()};
  return(
    <div className="relative rounded-2xl overflow-hidden h-56 md:h-80 md:w-1/2 shrink-0 bg-rose-100" onClick={()=>photos.length>1&&step(1)}>
      {bad[i]?<div className="w-full h-full flex items-center justify-center text-8xl" style={{background:gradOf(card)}}>{card.emoji}</div>
        :<img key={i} src={asset(photos[i])} onError={()=>setBad(b=>({...b,[i]:true}))} draggable={false} alt="" className="w-full h-full object-cover fade"/>}
      {photos.length>1&&(<>
        <button onClick={e=>{e.stopPropagation();step(-1)}} className="absolute left-2 top-1/2 -translate-y-1/2 w-[52px] h-[52px] rounded-full bg-white/70 text-2xl text-[#881337]" aria-label="Prev">‹</button>
        <button onClick={e=>{e.stopPropagation();step(1)}} className="absolute right-2 top-1/2 -translate-y-1/2 w-[52px] h-[52px] rounded-full bg-white/70 text-2xl text-[#881337]" aria-label="Next">›</button>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 pointer-events-none">{photos.map((_,k)=><span key={k} className="w-2.5 h-2.5 rounded-full" style={{background:k===i?"#f43f5e":"rgba(255,255,255,.8)"}}/>)}</div>
      </>)}
    </div>
  );
}

function Archive({onLetter}){
  const [ch,setCh]=useState(0);
  const [open,setOpen]=useState(null);
  const chap=ARCHIVE.chapters[ch];
  return(
    <div className="fixed inset-0 fade">
      <div className="absolute top-6 left-0 right-0 text-center pointer-events-none">
        <h1 className="serif text-rose-900 text-3xl md:text-5xl">{chap.label}</h1>
        <p className="mono text-rose-700/70 text-xs mt-2 tracking-widest">TAP A MEMORY</p>
      </div>
      <div key={ch} className="absolute left-0 right-0 overflow-y-auto fade" style={{top:110,bottom:100}}>
        <div className="min-h-full flex flex-wrap justify-center content-center gap-6 md:gap-10 p-4">
          {chap.cards.map((c,i)=>(
            <div key={i} style={{animation:`drift ${7+(i%3)*1.5}s ease-in-out ${-i*2}s infinite`}}>
              <button onClick={()=>{sfx.pop();setOpen(c)}} className="glass rounded-3xl w-[26vw] min-w-[230px] max-w-[340px] p-4 text-left text-rose-900 active:scale-95 transition-transform" style={{transform:`rotate(${[-3,2,-2,3][i%4]}deg)`,animationDelay:`${-i*1.7}s`}}>
                <Cover card={c} className="rounded-2xl h-32 md:h-44"/>
                <div className="serif text-xl md:text-2xl mt-3">{c.title}</div>
                <div className="text-rose-800/70 text-sm mt-1">{c.date?c.date+" · ":""}Tap to open →</div>
              </button>
            </div>
          ))}
        </div>
      </div>
      <nav className="absolute bottom-5 left-0 right-0 flex justify-center px-3">
        <div className="glass rounded-full p-2 flex gap-1 md:gap-2 max-w-full overflow-x-auto">
          {ARCHIVE.chapters.map((c,i)=>(
            <button key={c.id} onClick={()=>setCh(i)} className={`min-h-[52px] px-4 md:px-7 rounded-full text-sm md:text-lg whitespace-nowrap transition-colors ${i===ch?"bg-rose-500 text-white font-bold":"text-rose-900 active:bg-white/50"}`}>{c.label}</button>
          ))}
          <button onClick={onLetter} className="min-h-[52px] min-w-[52px] px-4 md:px-6 rounded-full bg-pink-500 text-white text-sm md:text-lg font-bold active:scale-95">💌 Letter</button>
        </div>
      </nav>
      {open&&(
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 md:p-6 fade" style={{background:"var(--overlay)"}} onClick={()=>setOpen(null)}>
          <div className="glass pop rounded-3xl max-w-4xl w-full p-5 md:p-8 text-rose-900 relative flex flex-col md:flex-row gap-5 md:gap-6 overflow-y-auto" style={{background:"var(--modal-bg)",maxHeight:"90vh"}} onClick={e=>e.stopPropagation()}>
            <Gallery card={open}/>
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <h2 className="serif text-3xl md:text-4xl pr-12">{open.title}</h2>
              {open.date&&<div className="mono text-rose-700/70 text-sm mt-1">{open.date}</div>}
              <p className="mt-4 text-lg md:text-xl text-rose-900/85 leading-relaxed whitespace-pre-line overflow-y-auto" style={{maxHeight:"45vh",userSelect:"text"}}>{open.text}</p>
            </div>
            <button onClick={()=>setOpen(null)} className="absolute top-3 right-3 w-[52px] h-[52px] rounded-full bg-rose-200 text-2xl active:bg-rose-300" style={{zIndex:5}} aria-label="Close">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* STAGE 5: envelope */
function Letter({onBack}){
  const [op,setOp]=useState(false);
  const [text,setText]=useState("");
  useEffect(()=>{
    if(!op)return;
    let i=0,iv;
    const t0=setTimeout(()=>{
      sfx.pencilStart();
      iv=setInterval(()=>{
        i++;
        const ch=ARCHIVE.letter[i-1];
        if(!sfx.pencilActive()&&ch&&ch.trim())sfx.pencil();
        setText(ARCHIVE.letter.slice(0,i));
        if(i>=ARCHIVE.letter.length){clearInterval(iv);sfx.pencilStop()}
      },35);
    },900);
    return()=>{clearTimeout(t0);clearInterval(iv);sfx.pencilStop()};
  },[op]);
  return(
    <div className="fixed inset-0 flex flex-col items-center justify-center fade px-4">
      <div className="relative" style={{width:"min(88vw,640px)",height:"min(60vh,420px)",perspective:1200}}>
        <div className="env-glow absolute inset-0 rounded-2xl" style={{background:"linear-gradient(135deg,#f9a8d4,#c084fc)",boxShadow:"0 30px 80px rgba(0,0,0,.5)"}}/>
        <div className="absolute left-4 right-4 rounded-xl p-6 md:p-8 overflow-auto text-purple-950 serif whitespace-pre-line text-base md:text-xl leading-relaxed"
          style={{background:"#fff7fb",top:op?"-22%":"6%",bottom:"6%",transition:"top 1.1s cubic-bezier(.2,.8,.2,1) .5s",zIndex:op?3:1,boxShadow:"0 10px 30px rgba(0,0,0,.25)",height:op?"112%":"auto"}}>{text}</div>
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{zIndex:op?2:4,background:"linear-gradient(135deg,transparent 49.5%,rgba(255,255,255,.25) 50%) , linear-gradient(225deg,transparent 49.5%,rgba(255,255,255,.2) 50%)",clipPath:"polygon(0 100%,100% 100%,100% 0,50% 55%,0 0)",backgroundColor:"#e879f9",opacity:.95}}/>
        <div className="absolute left-0 right-0 top-0 h-1/2" style={{zIndex:op?1:5,transformOrigin:"top",transform:op?"rotateX(180deg)":"rotateX(0)",transition:"transform .9s ease",background:"linear-gradient(#f472b6,#d946ef)",clipPath:"polygon(0 0,100% 0,50% 100%)",borderRadius:"16px 16px 0 0"}}/>
        {!op&&<button onClick={()=>{sfx.letter();sfx.pencilPrime();setOp(true)}} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-red-500 text-white text-4xl flex items-center justify-center active:scale-90 transition-transform" style={{zIndex:6,boxShadow:"0 0 40px rgba(244,63,94,.8)",animation:"pulse 2s infinite"}} aria-label="Open letter">❤</button>}
      </div>
      <button onClick={onBack} className="glass mt-8 min-h-[52px] px-8 rounded-full text-rose-900 text-lg active:scale-95">← Back to memories</button>
    </div>
  );
}

function App(){
  const [muted,setMuted]=useState(sfx.isMuted());
  const [dark,setDark]=useState(()=>{try{return localStorage.getItem("theme")==="dark"}catch(e){return false}});
  useEffect(()=>{
    document.documentElement.classList.toggle("dark",dark);
    try{localStorage.setItem("theme",dark?"dark":"light")}catch(e){}
  },[dark]);
  useEffect(()=>{initSound()},[]);
  const toggleMute=()=>{const m=!sfx.isMuted();sfx.setMuted(m);setMuted(m)};
  const [playerOpen,setPlayerOpen]=useState(false);
  const [currentStage,setStage]=useState(()=>{try{const n=parseInt(sessionStorage.getItem("marianna_stage"));return n>=3&&n<=6?n:0}catch(e){return 0}});
  useEffect(()=>{try{sessionStorage.setItem("marianna_stage",String(currentStage))}catch(e){}},[currentStage]);
  useEffect(()=>{if(currentStage>=3)sfx.music(true)},[]); // page restored after a reload: music resumes on the first tap
  // gate: countdown, then fireworks + button; ?demo shows a 9 second countdown, ?skip opens the site at once
  const [entered,setEntered]=useState(()=>{
    try{
      const q=window.location.search;
      if(/[?&]demo\b/.test(q))return false;
      return /[?&]skip\b/.test(q)||sessionStorage.getItem("marianna_entered")==="1"||parseInt(sessionStorage.getItem("marianna_stage"))>=3;
    }catch(e){return false}
  });
  // 0 singularity,1 terminal,2 circle reveal,3 story (Кротик),4 adventure,5 archive,6 letter
  if(!entered)return <Countdown onEnter={()=>{try{sessionStorage.setItem("marianna_entered","1")}catch(e){}setEntered(true)}}/>;
  return(
    <div className="fixed inset-0 overflow-hidden text-white">
      <button onClick={()=>currentStage>=3?setPlayerOpen(o=>!o):toggleMute()} aria-label={currentStage>=3?"Player":"Toggle sound"} aria-expanded={currentStage>=3?playerOpen:undefined} className="fixed top-3 right-3 w-[52px] h-[52px] rounded-full bg-black/25 text-2xl flex items-center justify-center active:scale-90" style={{zIndex:50,boxShadow:currentStage>=3&&playerOpen?"0 0 0 3px rgba(255,255,255,.6)":"none",transition:"box-shadow .3s"}}>{muted?"🔇":"🔊"}</button>
      {currentStage>=3&&<Player open={playerOpen} onMute={setMuted}/>}
      {currentStage>=3&&<Background dark={dark}/>}
      {currentStage>=3&&<button onClick={()=>{sfx.pop();setDark(d=>!d)}} aria-label="Toggle theme" className="fixed top-3 w-[52px] h-[52px] rounded-full text-2xl flex items-center justify-center active:scale-90" style={{zIndex:50,right:72,background:dark?"rgba(255,214,170,.18)":"rgba(0,0,0,.25)",boxShadow:dark?"0 0 18px rgba(255,190,120,.45)":"none",transition:"background .4s,box-shadow .4s"}}>{dark?"☀️":"🌙"}</button>}
      {currentStage<3&&<div className="fixed inset-0" style={{background:"radial-gradient(circle at 50% 50%,#0a0a0a,#050505)"}}/>}
      {currentStage===0&&<div className="absolute inset-0"><Singularity onDone={()=>setStage(1)}/></div>}
      {(currentStage===1||currentStage===2)&&<div className="absolute inset-0"><Terminal onFlash={()=>{}} onDone={()=>setStage(2)}/></div>}
      {currentStage===2&&<Reveal dark={dark} onDone={()=>setStage(3)}/>}
            {currentStage===3&&<Story onDone={()=>setStage(4)}/>}
      {currentStage===4&&<Adventure onDone={()=>setStage(5)}/>}
      {currentStage===5&&<Archive onLetter={()=>setStage(6)}/>}
      {currentStage===6&&<Letter onBack={()=>setStage(5)}/>}
    </div>
  );
}

export default App;