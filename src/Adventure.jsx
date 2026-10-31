import { useEffect, useRef, useState } from 'react';
import Mole from './Mole';
import { Bubble, Btn } from './Story';
import { CONFIG } from './config';
import { ADVENTURE_SCENES as SCENES, DARK_ITEMS as ITEMS, LOVE_REASONS, UI } from './content/dialogues';
import { sfx } from './sound';

/* After the three keys: door -> dark room -> puzzle -> hearts -> goodbye */
const MOLE_REACT = {
  a_intro: 'cheer', a_door_open: 'oh', a_scared: 'whimper', a_dark_intro: 'hum', a_dark_done: 'oh',
  a_puzzle_done: 'sniffle', a_hearts_intro: 'hum', a_hearts_done: 'cheer', bye1: 'sigh', bye2: 'hum',
  bye3: 'sniffle', bye_hug: ['sniffle', 'whimper'],
};
const SCENE_SFX = { a_door_open: 'ok', a_dark_done: 'ok', a_puzzle_done: 'key', a_hearts_done: 'fanfare' };

/* ---------- 1. Door with three locks ---------- */
function Door({ onDone }) {
  const [keys, setKeys] = useState([0, 1, 2].map(() => ({ dx: 0, dy: 0, slot: null, drag: false })));
  const [open, setOpen] = useState(false);
  const start = useRef({});
  const slotEls = useRef([]);
  const upd = (k, patch) => setKeys((ks) => ks.map((x, i) => (i === k ? { ...x, ...patch } : x)));

  const down = (k, e) => {
    if (keys[k].slot !== null || open) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current[k] = { x: e.clientX - keys[k].dx, y: e.clientY - keys[k].dy };
    upd(k, { drag: true });
    sfx.pop();
  };
  const move = (k, e) => {
    const s = start.current[k];
    if (!s || !keys[k].drag) return;
    upd(k, { dx: e.clientX - s.x, dy: e.clientY - s.y });
  };
  const up = (k, e) => {
    if (!keys[k].drag) return;
    const r = e.currentTarget.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const taken = keys.map((x) => x.slot);
    let best = null, bd = 90;
    slotEls.current.forEach((el, i) => {
      if (!el || taken.includes(i)) return;
      const q = el.getBoundingClientRect();
      const d = Math.hypot(q.left + q.width / 2 - cx, q.top + q.height / 2 - cy);
      if (d < bd) { bd = d; best = i; }
    });
    if (best === null) { upd(k, { dx: 0, dy: 0, drag: false }); sfx.oops(); return; }
    const q = slotEls.current[best].getBoundingClientRect();
    upd(k, { dx: keys[k].dx + (q.left + q.width / 2 - cx), dy: keys[k].dy + (q.top + q.height / 2 - cy), slot: best, drag: false });
    sfx.thump();
  };

  useEffect(() => {
    if (!keys.every((k) => k.slot !== null)) return;
    const t1 = setTimeout(() => { setOpen(true); sfx.whoosh(); sfx.thump(); }, 600);
    const t2 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [keys]);

  const half = { position: 'absolute', top: 0, bottom: 0, width: '50%', background: 'linear-gradient(#9a9aa8,#6f6f80)', border: '6px solid #4a4a5a', transition: 'transform 1.8s cubic-bezier(.6,0,.3,1)', boxShadow: 'inset 0 -20px 0 rgba(0,0,0,.15)' };
  return (
    <div className="flex flex-col items-center gap-8 fade">
      <p className="text-rose-900 text-xl">{open ? UI.doorOpening : UI.doorHint}</p>
      <div className="relative" style={{ width: 280, height: 320 }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle,#fff3c4,#f9a8d4)', borderRadius: '140px 140px 0 0', border: '6px solid #4a4a5a' }} />
        <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: '140px 140px 0 0' }}>
          <div style={{ ...half, left: 0, transform: open ? 'translateX(-100%)' : 'none' }} />
          <div style={{ ...half, right: 0, transform: open ? 'translateX(100%)' : 'none' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none" style={{ opacity: open ? 0 : 1, transition: 'opacity .6s' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} ref={(el) => (slotEls.current[i] = el)} className="rounded-full" style={{ width: 64, height: 64, background: 'rgba(0,0,0,.45)', border: '4px solid #2c2c38', boxShadow: 'inset 0 4px 10px rgba(0,0,0,.6)' }} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-8" style={{ opacity: open ? 0 : 1, transition: 'opacity .6s' }}>
        {keys.map((k, i) => (
          <div key={i} onPointerDown={(e) => down(i, e)} onPointerMove={(e) => move(i, e)} onPointerUp={(e) => up(i, e)} onPointerCancel={(e) => up(i, e)}
            className="rounded-full bg-white flex items-center justify-center text-5xl"
            style={{ width: 76, height: 76, touchAction: 'none', cursor: 'grab', zIndex: 10, transform: `translate(${k.dx}px,${k.dy}px) scale(${k.drag ? 1.15 : k.slot !== null ? 0.8 : 1})`, transition: k.drag ? 'none' : 'transform .25s', boxShadow: '0 0 20px rgba(244,63,94,.5)' }}>🪨</div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 2. Dark room with flashlight ---------- */
function Dark({ onDone }) {
  const [light, setLight] = useState({ x: innerWidth / 2, y: innerHeight / 2 });
  const [found, setFound] = useState([]);
  const [toast, setToast] = useState(UI.darkStart);
  const ref = useRef([]);
  const check = (x, y) => {
    ITEMS.forEach((it, i) => {
      if (ref.current.includes(i)) return;
      if (i === 4 && ref.current.length < 4) return;
      if (Math.hypot(it.x * innerWidth - x, it.y * innerHeight - y) < 60) {
        ref.current = [...ref.current, i];
        setFound(ref.current);
        setToast(i === 3 ? it.l + UI.darkLetterHint : it.l);
        if (i === 4) { sfx.key(); setTimeout(onDone, 2400); } else sfx.pop();
      }
    });
  };
  const move = (e) => { setLight({ x: e.clientX, y: e.clientY }); check(e.clientX, e.clientY); };
  return (
    <div className="fixed inset-0" style={{ touchAction: 'none' }} onPointerDown={move} onPointerMove={move}>
      {ITEMS.map((it, i) => !found.includes(i) && (i < 4 || found.length >= 4) && (
        <div key={i} className="absolute text-6xl" style={{ left: it.x * 100 + '%', top: it.y * 100 + '%', transform: 'translate(-50%,-50%)' }}>{it.e}</div>
      ))}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle 150px at ${light.x}px ${light.y}px, rgba(8,4,16,0) 0, rgba(8,4,16,0) 40%, rgba(8,4,16,.97) 100%)` }} />
      <div className="absolute top-4 left-0 right-0 flex flex-col items-center gap-3 pointer-events-none px-4">
        <div className="flex gap-2 text-4xl">{found.map((i) => <span key={i} className="pop">{ITEMS[i].e}</span>)}</div>
        <div key={toast} className="pop rounded-full px-6 py-3 text-lg md:text-xl text-center" style={{ background: 'rgba(255,255,255,.9)', color: '#881337' }}>{toast}</div>
      </div>
    </div>
  );
}

/* ---------- 3. Photo puzzle (tap two pieces to swap) ---------- */
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f472b6"/><stop offset=".5" stop-color="#c084fc"/><stop offset="1" stop-color="#60a5fa"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/><text x="300" y="340" font-size="260" text-anchor="middle">❤</text><text x="300" y="500" font-size="46" text-anchor="middle" fill="#fff" font-family="Georgia,serif">здесь будет ваше фото</text><circle cx="90" cy="90" r="40" fill="#fff" opacity=".4"/><circle cx="520" cy="110" r="24" fill="#fff" opacity=".4"/></svg>');
function useUsPhoto() {
  const [src, setSrc] = useState(PLACEHOLDER);
  useEffect(() => {
    const im = new Image();
    im.onload = () => {
      try { // center-crop to a square so the 3x3 pieces fit
        const s = Math.min(im.width, im.height), c = document.createElement('canvas');
        c.width = c.height = 800;
        c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 800, 800);
        setSrc(c.toDataURL('image/jpeg', 0.9));
      } catch (e) { setSrc(im.src); }
    };
    im.src = import.meta.env.BASE_URL + CONFIG.puzzlePhoto;
  }, []);
  return src;
}
function Puzzle({ onDone }) {
  const N = 3, src = useUsPhoto();
  const [order, setOrder] = useState(() => {
    let o;
    do { o = [...Array(N * N).keys()].sort(() => Math.random() - 0.5); } while (o.every((v, k) => v === k));
    return o;
  });
  const [sel, setSel] = useState(null);
  const [solved, setSolved] = useState(false);
  const size = Math.min(innerWidth * 0.8, innerHeight * 0.62, 460);
  const right = order.filter((v, k) => v === k).length;
  const tap = (i) => {
    if (solved) return;
    if (sel === null) { setSel(i); sfx.pop(); return; }
    if (sel === i) { setSel(null); return; }
    const o = [...order];
    [o[sel], o[i]] = [o[i], o[sel]];
    setOrder(o); setSel(null); sfx.tap();
    if (o.every((v, k) => v === k)) { setSolved(true); sfx.key(); setTimeout(onDone, 2800); }
  };
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 fade">
      <p className="text-rose-900 text-lg md:text-xl text-center px-4">{solved ? UI.puzzleDone : `${UI.puzzleHint} · ${right}/${N * N}`}</p>
      <div className="grid" style={{ width: size, height: size, gap: solved ? 0 : 4, gridTemplateColumns: `repeat(${N},1fr)`, gridTemplateRows: `repeat(${N},1fr)`, borderRadius: 16, overflow: 'hidden', boxShadow: solved ? '0 0 50px rgba(244,63,94,.6)' : '0 20px 40px -12px rgba(190,24,93,.35)', transition: 'all .5s' }}>
        {order.map((v, i) => (
          <button key={i} data-nosound onClick={() => tap(i)} aria-label="piece"
            style={{ backgroundImage: `url("${src}")`, backgroundSize: `${N * 100}% ${N * 100}%`, backgroundPosition: `${((v % N) / (N - 1)) * 100}% ${(Math.floor(v / N) / (N - 1)) * 100}%`, border: sel === i ? '4px solid #f43f5e' : 'none', transform: sel === i ? 'scale(.93)' : 'none', transition: 'transform .15s', touchAction: 'manipulation' }} />
        ))}
      </div>
    </div>
  );
}

/* ---------- 4. Catch the hearts ---------- */
function Hearts({ onDone }) {
  const NEED = 10;
  const [hs, setHs] = useState([]);
  const [caught, setCaught] = useState(0);
  const [msg, setMsg] = useState('');
  const [mx, setMx] = useState(innerWidth / 2);
  const mxRef = useRef(innerWidth / 2);
  const st = useRef({ list: [], id: 0, last: 0, spawn: 0.3, caught: 0, done: false });
  const setX = (e) => { mxRef.current = e.clientX; setMx(e.clientX); };

  useEffect(() => {
    let raf;
    const loop = (t) => {
      const s = st.current;
      const dt = Math.min(0.05, (t - (s.last || t)) / 1000);
      s.last = t;
      s.spawn -= dt;
      if (s.spawn <= 0 && !s.done) {
        s.list.push({ id: s.id++, x: 40 + Math.random() * (innerWidth - 80), y: -40, v: 210 + Math.random() * 120, e: ['❤️', '💖', '💗', '💕'][Math.floor(Math.random() * 4)] });
        s.spawn = 0.5 + Math.random() * 0.35;
      }
      s.list.forEach((h) => { h.y += h.v * dt; });
      s.list = s.list.filter((h) => {
        if (h.y > innerHeight - 190 && h.y < innerHeight - 40 && Math.abs(h.x - mxRef.current) < 90 && !s.done) {
          s.caught++;
          setCaught(s.caught);
          setMsg(LOVE_REASONS[(s.caught - 1) % LOVE_REASONS.length]);
          if (s.caught >= NEED) { s.done = true; sfx.fanfare(); setTimeout(onDone, 2200); } else { sfx.chirp(); sfx.sparkle(); }
          return false;
        }
        return h.y < innerHeight + 40;
      });
      setHs([...s.list]);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ touchAction: 'none' }} onPointerDown={setX} onPointerMove={setX}>
      <div className="absolute top-4 left-0 right-0 flex flex-col items-center gap-3 pointer-events-none px-4">
        <div className="text-rose-900 text-2xl font-bold">❤ {caught}/{NEED}</div>
        {msg ? <div key={caught} className="pop serif text-rose-900 text-2xl md:text-4xl text-center" style={{ textShadow: '0 2px 12px #fff' }}>{msg}</div>
          : <div className="text-rose-900/80 text-lg">{UI.heartsHint}</div>}
      </div>
      {hs.map((h) => <div key={h.id} className="absolute text-5xl pointer-events-none" style={{ left: h.x, top: h.y, transform: 'translate(-50%,-50%)' }}>{h.e}</div>)}
      <div className="absolute pointer-events-none" style={{ left: mx, bottom: 10, transform: 'translateX(-50%)', transition: 'left .06s linear' }}>
        <Mole anim="idle" frames={4} fps={8} scale={3} />
      </div>
    </div>
  );
}

/* ---------- Scene engine ---------- */
export default function Adventure({ onDone }) {
  const [scene, setScene] = useState('a_intro');
  const [typing, setTyping] = useState(true);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const S = SCENES[scene];
  const scale = typeof innerHeight !== 'undefined' && innerHeight < 700 ? 3 : 4;

  useEffect(() => { setReady(false); }, [scene]);
  useEffect(() => { const m = SCENE_SFX[scene]; if (m) sfx[m](); }, [scene]);
  useEffect(() => { const r = MOLE_REACT[scene]; if (r) sfx.react(r); }, [scene]);
  const [idleTick, setIdleTick] = useState(0);
  useEffect(() => {
    if (typing || !S.say || leaving) return;
    const t = setTimeout(() => { sfx.idle(); setIdleTick((n) => n + 1); }, 5000 + Math.random() * 4000);
    return () => clearTimeout(t);
  }, [typing, scene, idleTick, leaving]);

  const go = (id) => {
    if (id !== '__finish') { setScene(id); return; }
    setLeaving(true); sfx.thump(); sfx.squeak();
    setTimeout(() => sfx.whoosh(), 400);
    setTimeout(onDone, 1500);
  };
  const next = () => go(S.next);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-between py-5 fade">
      {S.type === 'door' && <div className="m-auto"><Door onDone={next} /></div>}
      {S.type === 'dark' && <Dark onDone={next} />}
      {S.type === 'puzzle' && <Puzzle onDone={next} />}
      {S.type === 'hearts' && <Hearts onDone={next} />}

      {S.say && (
        <>
          <div style={{ height: 52 }} />
          <Bubble key={scene} text={S.say} onTyping={setTyping} onDone={() => setReady(true)} />
          <div style={{ transition: 'transform 1.1s ease-in, opacity 1.1s', transform: leaving ? 'translateY(140px) scale(.2)' : 'none', opacity: leaving ? 0 : 1 }}>
            <Mole anim={typing ? 'talk' : 'idle'} frames={4} fps={typing ? 8 : 5} scale={scale} />
          </div>
          <div className="w-full flex flex-wrap justify-center gap-3 px-6" style={{ minHeight: 70, maxWidth: 720, opacity: ready && !leaving ? 1 : 0, pointerEvents: ready && !leaving ? 'auto' : 'none', transition: 'opacity .3s' }}>
            {S.choices.map(([label, to]) => <Btn key={label} onClick={() => go(to)}>{label}</Btn>)}
          </div>
        </>
      )}
      <button onClick={onDone} className="absolute right-4 bottom-3 min-h-[44px] px-4 rounded-full text-rose-900/40 text-sm active:bg-white/40" style={{ zIndex: 40 }} aria-label="Skip">skip ›</button>
    </div>
  );
}
