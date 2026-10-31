import {useState,useEffect,useRef,useCallback} from 'react';
import {sfx} from './sound';
import {PLAYLIST} from './content/playlist';

/* First-gen iPod: LCD + click wheel. Pops out of the speaker button.
   Track 1 is the synthesized background music; other tracks are mp3 files (content/playlist.js). */

const STEPS=16;
const BASE=import.meta.env.BASE_URL;
const fmt=s=>{s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};

const PlayIco=({s=10})=><svg width={s} height={s} viewBox="0 0 10 10" fill="currentColor"><path d="M1 0.5 9.5 5 1 9.5z"/></svg>;
const PauseIco=({s=10})=><svg width={s} height={s} viewBox="0 0 10 10" fill="currentColor"><rect x="1.2" y="0.5" width="2.8" height="9"/><rect x="6" y="0.5" width="2.8" height="9"/></svg>;
const Battery=()=><svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor"><rect x="0.5" y="0.5" width="18" height="9"/><rect x="19.5" y="3" width="2" height="4" fill="currentColor"/><rect x="2" y="2" width="13" height="6" fill="currentColor" stroke="none"/></svg>;
const Speaker=()=><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M0 4h3l4-3v10L3 8H0z"/><path d="M8.5 3.5a3.5 3.5 0 0 1 0 5" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>;
const Prev=()=><svg width="22" height="14" viewBox="0 0 22 14" fill="currentColor"><rect x="1" y="1" width="2.6" height="12"/><path d="M12 1v12L4.5 7zM21 1v12L13.5 7z"/></svg>;
const Next=()=><svg width="22" height="14" viewBox="0 0 22 14" fill="currentColor"><rect x="18.4" y="1" width="2.6" height="12"/><path d="M1 1v12l7.5-6zM10 1v12l7.5-6z"/></svg>;

export default function Player({open,onMute}){
  const [screen,setScreen]=useState("now");   // "now" | "songs"
  const [idx,setIdx]=useState(0);              // current track
  const [sel,setSel]=useState(0);              // highlighted row in the list
  const [playing,setPlaying]=useState(true);   // background music starts on its own
  const [pos,setPos]=useState(0);
  const [dur,setDur]=useState(0);
  const [volT,setVolT]=useState(0);            // shows the volume bar for a moment
  const [k,setK]=useState(1);                  // fit the player to the screen height
  const [bad,setBad]=useState(false);           // mp3 failed to load
  const audio=useRef(null),wheel=useRef(null),drag=useRef(null),nextRef=useRef(()=>{}),ctl=useRef({});
  const track=PLAYLIST[idx];

  useEffect(()=>{
    const fit=()=>setK(Math.max(.4,Math.min(1,(window.innerHeight-84)/500,(window.innerWidth-24)/300)));
    fit();window.addEventListener("resize",fit);
    return()=>window.removeEventListener("resize",fit);
  },[]);

  /* mp3 tracks play through an <audio> element */
  useEffect(()=>{
    const a=new Audio();a.preload="auto";audio.current=a;
    const tu=()=>{setPos(a.currentTime);setDur(isFinite(a.duration)?a.duration:0)};
    const en=()=>nextRef.current();
    const er=()=>{if(!a.getAttribute("src"))return;setBad(true);setPlaying(false)};
    a.addEventListener("timeupdate",tu);a.addEventListener("loadedmetadata",tu);
    a.addEventListener("ended",en);a.addEventListener("error",er);
    return()=>{a.pause();a.removeEventListener("timeupdate",tu);a.removeEventListener("loadedmetadata",tu);a.removeEventListener("ended",en);a.removeEventListener("error",er)};
  },[]);

  /* elapsed time of the synthesized track */
  useEffect(()=>{
    if(!playing||track.kind!=="synth")return;
    const iv=setInterval(()=>setPos(p=>p+1),1000);
    return()=>clearInterval(iv);
  },[playing,track.kind]);

  /* lock screen / control center: title and play, pause, prev, next buttons */
  useEffect(()=>{
    if(!("mediaSession" in navigator))return;
    try{
      navigator.mediaSession.metadata=new MediaMetadata({title:track.title,artist:track.artist,album:track.album});
      navigator.mediaSession.playbackState=playing?"playing":"paused";
    }catch(e){}
  },[idx,playing]);
  useEffect(()=>{
    if(!("mediaSession" in navigator))return;
    const set=(n,f)=>{try{navigator.mediaSession.setActionHandler(n,f)}catch(e){}};
    set("play",()=>ctl.current.play());set("pause",()=>ctl.current.pause());
    set("previoustrack",()=>ctl.current.prev());set("nexttrack",()=>ctl.current.next());
    return()=>["play","pause","previoustrack","nexttrack"].forEach(n=>set(n,null));
  },[]);

  useEffect(()=>{
    if(!volT)return;
    const t=setTimeout(()=>setVolT(0),1600);
    return()=>clearTimeout(t);
  },[volT]);

  const start=useCallback(i=>{
    const t=PLAYLIST[i],a=audio.current;
    setIdx(i);setSel(i);setPos(0);setDur(0);setPlaying(true);setBad(false);
    if(t.kind==="file"){
      sfx.musicPause(true);
      a.src=BASE+t.src.replace(/^\//,"");
      a.muted=sfx.isMuted();a.volume=sfx.getVolume();
      a.play().catch(()=>{});
    }else{
      a.pause();
      sfx.musicPause(false);
    }
  },[]);

  const toggle=()=>{
    if(bad){start(idx);return}
    if(playing){
      if(track.kind==="file")audio.current.pause();else sfx.musicPause(true);
      setPlaying(false);
    }else{
      if(track.kind==="file")audio.current.play().catch(()=>{});else sfx.musicPause(false);
      setPlaying(true);
    }
  };
  const step=d=>start((idx+d+PLAYLIST.length)%PLAYLIST.length);
  nextRef.current=()=>step(1);
  const prev=()=>{ // like the real one: restart if already 3 seconds in
    if(pos>3||PLAYLIST.length===1){start(idx)}else step(-1);
  };

  ctl.current={play:()=>{if(!playing)toggle()},pause:()=>{if(playing)toggle()},prev,next:()=>step(1)};

  const turn=d=>{
    sfx.click();
    if(screen==="songs"){setSel(s=>Math.max(0,Math.min(PLAYLIST.length-1,s+d)));return}
    const cur=sfx.isMuted()?0:Math.round(sfx.getVolume()*STEPS);
    const n=Math.max(0,Math.min(STEPS,cur+d))/STEPS;
    sfx.setVolume(n);
    if(audio.current){audio.current.volume=sfx.getVolume();audio.current.muted=sfx.isMuted()}
    onMute&&onMute(sfx.isMuted());
    setVolT(Date.now());
  };
  const pressMenu=()=>{sfx.click();setSel(idx);setScreen(s=>s==="now"?"songs":"now")};
  const pressPlay=()=>{sfx.click();toggle()};
  const pickRow=i=>{
    sfx.click();setScreen("now");
    if(i!==idx)start(i);else if(!playing)toggle();
  };
  const pressCenter=()=>{
    if(screen==="songs")pickRow(sel);else{sfx.click();toggle()}
  };

  /* click wheel: drag around the ring to scroll, tap the four labels as buttons */
  const angleOf=e=>{
    const r=wheel.current.getBoundingClientRect();
    return Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2))*180/Math.PI;
  };
  const down=e=>{
    e.currentTarget.setPointerCapture(e.pointerId);
    const a=angleOf(e);
    drag.current={a0:a,last:a,acc:0,moved:0,t:performance.now()};
  };
  const move=e=>{
    const d=drag.current;if(!d)return;
    const a=angleOf(e);
    let da=a-d.last;if(da>180)da-=360;if(da<-180)da+=360;
    d.last=a;d.moved+=Math.abs(da);d.acc+=da;
    while(d.acc>=24){d.acc-=24;turn(1)}
    while(d.acc<=-24){d.acc+=24;turn(-1)}
  };
  const up=()=>{
    const d=drag.current;drag.current=null;if(!d)return;
    if(d.moved<8&&performance.now()-d.t<600){
      const a=d.a0; // 0 = right, 90 = bottom, -90 = top
      if(a>-135&&a<=-45)pressMenu();
      else if(a>-45&&a<=45){sfx.click();step(1)}
      else if(a>45&&a<=135)pressPlay();
      else{sfx.click();prev()}
    }
  };

  const shown=sfx.isMuted()?0:Math.round(sfx.getVolume()*STEPS);
  const pct=dur?Math.min(100,pos/dur*100):0;

  return(
    <div className="ipod-wrap" style={{transform:`scale(${k})`}} aria-hidden={!open}>
      <div className={`ipod${open?" open":""}`}>
        <div className="ipod-screen">
          <div className="ipod-lcd">
            <div className="ipod-bar">
              <span style={{width:26,display:"flex"}}>{playing?<PlayIco/>:<PauseIco/>}</span>
              <span>{screen==="now"?"Now Playing":"Songs"}</span>
              <span style={{width:26,display:"flex",justifyContent:"flex-end"}}><Battery/></span>
            </div>
            {screen==="now"?(
              <div className="ipod-now">
                <div className="ipod-t1">{track.title}</div>
                <div className="ipod-t2">{track.artist}</div>
                <div className="ipod-t3">{track.album}</div>
                {bad?<div className="ipod-err">Файл не найден:<br/>{track.src}</div>:<div className={`ipod-eq${playing?"":" off"}`}>{[0,1,2,3,4,5,6].map(i=><i key={i} style={{animationDelay:`${-i*.23}s`,animationDuration:`${.7+(i%4)*.18}s`}}/>)}</div>}
                {volT?(
                  <div className="ipod-pb">
                    <div className="ipod-vol"><Speaker/><div>{Array.from({length:STEPS},(_,i)=><b key={i} className={i<shown?"on":""}/>)}</div></div>
                  </div>
                ):(
                  <div className="ipod-pb">
                    <div className="ipod-track">{track.kind==="file"?<div style={{width:pct+"%"}}/>:<div className={`ipod-stripe${playing?"":" off"}`}/>}</div>
                    <div className="ipod-times"><span>{fmt(pos)}</span><span>{track.kind==="file"?"-"+fmt(Math.max(0,dur-pos)):"∞"}</span></div>
                  </div>
                )}
              </div>
            ):(
              <div className="ipod-list">
                {PLAYLIST.map((t,i)=>(
                  <div key={i} className={`ipod-row${i===sel?" sel":""}`} onClick={()=>pickRow(i)}>
                    <span className="truncate">{t.title}</span>
                    <span>{i===idx?(playing?<PlayIco s={9}/>:<PauseIco s={9}/>):"›"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div ref={wheel} className="ipod-wheel" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{drag.current=null}} onContextMenu={e=>e.preventDefault()}>
          <span className="ipod-lbl" style={{left:"50%",top:17,transform:"translateX(-50%)"}}>MENU</span>
          <span className="ipod-lbl" style={{left:20,top:"50%",transform:"translateY(-50%)"}}><Prev/></span>
          <span className="ipod-lbl" style={{right:20,top:"50%",transform:"translateY(-50%)"}}><Next/></span>
          <span className="ipod-lbl" style={{left:"50%",bottom:16,transform:"translateX(-50%)",display:"flex",gap:3,alignItems:"center"}}><PlayIco s={11}/><PauseIco s={11}/></span>
          <button data-nosound className="ipod-center" aria-label="Select" onPointerDown={e=>e.stopPropagation()} onClick={pressCenter}/>
        </div>
      </div>
    </div>
  );
}