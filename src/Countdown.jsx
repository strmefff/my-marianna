import {useState,useEffect,useRef} from 'react';
import {CONFIG} from './config';
import {sfx} from './sound';

/* Gate before the site: countdown to CONFIG.unlockAt, then heart fireworks and a button.
   Test links: add ?demo (9 second countdown) or ?skip (no gate) to the address. */

const PINK="#ff8fb8";
const SOUND=import.meta.env.BASE_URL+"sounds/shiftcomplete.mp3"; // plays once when the countdown ends
const pad=n=>String(n).padStart(2,"0");
const COLORS=["#ff4d8d","#ff7aa8","#ff2d55","#ffd1e1","#ffd166","#c084fc","#ffffff","#7dd3fc"];

function Fireworks(){
  const ref=useRef(null);
  useEffect(()=>{
    const cv=ref.current,ctx=cv.getContext("2d");
    let w=0,h=0,raf=0,last=performance.now(),next=.5,rockets=[],parts=[];
    const resize=()=>{
      const dpr=Math.min(window.devicePixelRatio||1,2);
      w=window.innerWidth;h=window.innerHeight;
      cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.fillStyle="#080307";ctx.fillRect(0,0,w,h);
    };
    const heart=(x,y,s,rot)=>{
      ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(s,s);
      ctx.beginPath();ctx.moveTo(0,.6);
      ctx.bezierCurveTo(-1.1,-.1,-.6,-1,0,-.4);
      ctx.bezierCurveTo(.6,-1,1.1,-.1,0,.6);
      ctx.fill();ctx.restore();
    };
    const pick=()=>COLORS[Math.floor(Math.random()*COLORS.length)];
    const launch=()=>{
      const ty=h*(.16+Math.random()*.32);
      rockets.push({x:w*(.12+Math.random()*.76),y:h+8,ty,vy:-(h-ty)/(.85+Math.random()*.3),c:pick()});
    };
    const LAMBDA=2.2; // drag per second: a particle travels v0/LAMBDA in total
    const explode=(x,y,c)=>{
      const R=Math.min(w,h)*(.17+Math.random()*.1);
      const N=56;
      for(let i=0;i<N;i++){ // the burst is a heart: velocities follow the heart curve
        const t=i/N*Math.PI*2;
        const hx=16*Math.sin(t)**3,hy=-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t));
        parts.push({x,y,vx:hx/16*R*LAMBDA,vy:hy/16*R*LAMBDA,life:0,max:1.5+Math.random()*.5,c,s:4+Math.random()*3,rot:(Math.random()-.5)*.8,spin:(Math.random()-.5)*2});
      }
      for(let i=0;i<18;i++){ // small sparkles
        const a=Math.random()*Math.PI*2,v=(.15+Math.random()*.9)*R*LAMBDA*.9;
        parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:0,max:1+Math.random()*.9,c:Math.random()<.5?"#ffd166":"#ffffff",s:2.5+Math.random()*2,rot:Math.random()*6,spin:(Math.random()-.5)*5});
      }
    };
    resize();
    for(let i=0;i<5;i++)setTimeout(launch,i*170); // opening salvo
    const frame=now=>{
      const dt=Math.min(now-last,50)/1000;last=now;
      ctx.globalCompositeOperation="source-over";
      ctx.fillStyle="rgba(8,3,7,.26)";ctx.fillRect(0,0,w,h);
      ctx.globalCompositeOperation="lighter";
      next-=dt;
      if(next<=0){launch();if(Math.random()<.3)launch();next=.45+Math.random()*.7}
      for(const r of rockets){
        r.y+=r.vy*dt;
        ctx.fillStyle=r.c;
        ctx.globalAlpha=.95;ctx.beginPath();ctx.arc(r.x,r.y,2.2,0,6.283);ctx.fill();
        ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(r.x,r.y+9,1.7,0,6.283);ctx.fill();
        if(r.y<=r.ty){r.dead=true;explode(r.x,r.y,r.c)}
      }
      rockets=rockets.filter(r=>!r.dead);
      const f=Math.exp(-LAMBDA*dt);
      for(const p of parts){
        p.life+=dt;p.vx*=f;p.vy=p.vy*f+90*dt;
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.spin*dt;
        const a=Math.max(0,1-p.life/p.max);
        ctx.fillStyle=p.c;
        ctx.globalAlpha=a*.35;heart(p.x,p.y,p.s*1.9,p.rot);
        ctx.globalAlpha=a;heart(p.x,p.y,p.s,p.rot);
      }
      parts=parts.filter(p=>p.life<p.max);
      ctx.globalAlpha=1;
      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
    window.addEventListener("resize",resize);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize)};
  },[]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" style={{zIndex:1}}/>;
}

export default function Countdown({onEnter}){
  const target=useRef(null);
  if(target.current===null){
    const demo=/[?&]demo\b/.test(window.location.search);
    target.current=demo?Date.now()+9000:Date.parse(CONFIG.unlockAt);
  }
  const [now,setNow]=useState(Date.now());
  const [flash,setFlash]=useState(false);
  const [btn,setBtn]=useState(false);
  const [forced,setForced]=useState(false); // debug: jump to the end of the countdown
  const seq=useRef({n:0,t:0});
  const left=target.current-now,done=left<=0||forced;
  const wasDone=useRef(done);

  useEffect(()=>{
    const f=()=>setNow(Date.now());
    const iv=setInterval(f,200);
    document.addEventListener("visibilitychange",f);
    return()=>{clearInterval(iv);document.removeEventListener("visibilitychange",f)};
  },[]);

  useEffect(()=>{
    if(!done)return;
    if(!wasDone.current){setFlash(true);setTimeout(()=>setFlash(false),1700)}
    const t=setTimeout(()=>setBtn(true),1700);
    return()=>clearTimeout(t);
  },[done]);

  const tap=c=>{ // secret combo: top-left x3, then bottom-left x1
    const q=seq.current,t=performance.now(),need=["tl","tl","tl","bl"];
    if(t-q.t>2500)q.n=0;
    q.t=t;
    if(c===need[q.n]){q.n++;if(q.n===need.length){q.n=0;setForced(true)}}
    else q.n=c==="tl"?1:0;
  };

  /* sound on the [ ACCESS GRANTED ] screen; if the browser blocks autoplay, the first tap plays it.
     It is not stopped when the site opens, so it can finish. */
  const [heard,setHeard]=useState(false);
  const [bad,setBad]=useState(false);
  const snd=useRef(null),got=useRef(false);
  useEffect(()=>{
    if(!done)return;
    if(!snd.current){
      const a=new Audio(SOUND);
      a.preload="auto";a.muted=sfx.isMuted();
      try{a.volume=sfx.getVolume()}catch(e){}
      a.addEventListener("error",()=>setBad(true));
      snd.current=a;
    }
    const go=()=>{
      if(got.current)return;
      snd.current.play().then(()=>{got.current=true;setHeard(true)}).catch(()=>{});
    };
    go();
    document.addEventListener("pointerdown",go);
    return()=>document.removeEventListener("pointerdown",go);
  },[done]);

  const s=Math.max(0,Math.ceil(left/1000));
  const d=Math.floor(s/86400),hh=Math.floor(s%86400/3600),mm=Math.floor(s%3600/60),ss=s%60;
  const units=[...(d?[[d,"DAYS"]]:[]),[hh,"HRS"],[mm,"MIN"],[ss,"SEC"]];
  const loc=new Date((target.current||0)+5*3600e3); // shown in GMT+5
  const label=`${pad(loc.getUTCDate())}.${pad(loc.getUTCMonth()+1)}.${loc.getUTCFullYear()} · ${pad(loc.getUTCHours())}:${pad(loc.getUTCMinutes())} (GMT+5)`;
  const big="clamp(44px,11vw,120px)",gap="clamp(8px,2.4vw,26px)";

  return(
    <div className="fixed inset-0 overflow-hidden mono select-none" style={{zIndex:100,color:PINK,background:"radial-gradient(circle at 50% 50%,#1c0912,#080307)"}}>
      {!done&&<div onPointerDown={()=>tap("tl")} style={{position:"absolute",left:0,top:0,width:80,height:80,zIndex:5}}/>}
      {!done&&<div onPointerDown={()=>tap("bl")} style={{position:"absolute",left:0,bottom:0,width:80,height:80,zIndex:5}}/>}
      {done&&<Fireworks/>}
      {flash&&<div className="cd-flash absolute inset-0 pointer-events-none" style={{zIndex:3}}/>}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4" style={{zIndex:2}}>
        {!done?(
          <>
            <div style={{letterSpacing:".35em",fontSize:13,opacity:.75}}>[ ACCESS LOCKED ]</div>
            <div className="flex items-start justify-center" style={{marginTop:28,gap}}>
              {units.map(([v,l],i)=>(
                <div key={l} className="flex items-start" style={{gap}}>
                  {i>0&&<span className="cd-colon" style={{fontSize:big,lineHeight:1,fontWeight:700}}>:</span>}
                  <div>
                    <div style={{fontSize:big,lineHeight:1,fontWeight:700,textShadow:"0 0 28px rgba(255,105,160,.6)"}}>{pad(v)}</div>
                    <div style={{marginTop:12,fontSize:12,letterSpacing:".3em",opacity:.6}}>{l}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginTop:46,fontSize:12,letterSpacing:".22em",opacity:.55}}>UNLOCKS {label}</div>
          </>
        ):(
          <>
            <div style={{letterSpacing:".35em",fontSize:13,opacity:.85}}>[ ACCESS GRANTED ]</div>
            <button onClick={onEnter} className="cd-btn" style={{opacity:btn?1:0,transform:btn?"none":"translateY(14px)",pointerEvents:btn?"auto":"none"}}>
              <span className="cd-btn-in">
                <svg className="cd-heart" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <span className="serif">Перейти на сайт</span>
                <span className="cd-arrow">→</span>
              </span>
            </button>
            {!heard&&!bad&&<div style={{marginTop:24,fontSize:11,letterSpacing:".25em",opacity:btn?.55:0,transition:"opacity .9s"}}>♪ TAP ANYWHERE FOR SOUND</div>}
          </>
        )}
      </div>
    </div>
  );
}