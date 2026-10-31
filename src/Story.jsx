import { useEffect, useRef, useState } from 'react';
import Mole from './Mole';
import { STORY_SCENES as SCENES, QUIZ, UI } from './content/dialogues';
import { sfx } from './sound';

/* Dialogue script. type: say (default) | dig | text | video | word */
const SCENE_SFX = { q1_ok: 'ok', q1_bad: 'oops', q2_video: 'ok', dig_done: 'key', q3_end: 'key', word_done: 'key', end: 'fanfare' };
const MOLE_REACT = {
  intro: 'oh', intro_yes: 'giggle', intro_who: 'squeak', who_he: 'hum', help: 'hum', nohelp: 'whimper',
  dig_intro: 'sigh', dig_done: 'cheer', q_intro: 'hum', q1: 'hum', q1_ok: 'cheer', q1_bad: 'hum',
  q2: 'squeak', q2_after: 'giggle', q3: 'oh', q3_sushi: 'giggle', q3_pizza: 'giggle', q3_choc: 'giggle',
  q3_end: 'cheer', key3: 'hum', word_done: 'giggle', end: 'cheer',
};
const KEY_AT = { dig_done: 1, q3_end: 2, word_done: 3 };

export function Bubble({ text, onTyping, onDone }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    onTyping(true);
    const iv = setInterval(() => setN((v) => v + 1), 28);
    return () => clearInterval(iv);
  }, [text]);
  useEffect(() => {
    if (n > 0 && n <= text.length && n % 2 === 0 && text[n - 1] !== ' ') sfx.talk();
  }, [n]);
  useEffect(() => {
    if (n >= text.length) { onTyping(false); onDone && onDone(); }
  }, [n, text]);
  return (
    <div onClick={() => setN(text.length)} className="relative rounded-3xl px-6 py-5 text-rose-900 text-xl md:text-2xl leading-snug"
      style={{ background: 'var(--bubble-bg)', boxShadow: 'var(--bubble-shadow)', minHeight: 110, maxWidth: 680, width: '88vw' }}>
      {text.slice(0, n)}
      <div className="absolute left-1/2 -bottom-3 w-6 h-6 rotate-45" style={{ background: 'var(--bubble-bg)', marginLeft: -12 }} />
    </div>
  );
}

export function Btn({ children, onClick, wide }) {
  return (
    <button onClick={onClick} className={`min-h-[56px] px-7 rounded-full bg-rose-500 text-white text-lg md:text-xl font-bold active:scale-95 transition-transform ${wide ? 'w-full' : ''}`}
      style={{ boxShadow: '0 8px 20px -6px rgba(225,29,72,.5)' }}>{children}</button>
  );
}

function Dig({ onDone }) {
  const NEED = 8;
  const [taps, setTaps] = useState(0);
  const [parts, setParts] = useState([]);
  const id = useRef(0);
  const done = taps >= NEED;
  const tap = () => {
    if (done) return;
    const t = taps + 1;
    sfx.thump();
    setTaps(t);
    const add = Array.from({ length: 6 }, () => ({ id: id.current++, dx: (Math.random() - 0.5) * 160, dy: -30 - Math.random() * 90 }));
    setParts((p) => [...p, ...add]);
    setTimeout(() => setParts((p) => p.filter((x) => !add.includes(x))), 700);
    if (t >= NEED) { setTimeout(sfx.pop, 150); setTimeout(onDone, 1400); }
  };
  return (
    <div className="flex flex-col items-center">
      <p className="text-rose-900 text-xl mb-4">{done ? UI.digDone : UI.digHint}</p>
      <div className="relative" style={{ width: 280, height: 170 }}>
        {done && <div className="absolute left-1/2 text-6xl" style={{ top: -10, marginLeft: -30, animation: 'hop .7s ease-in-out infinite' }}>🪨</div>}
        <button data-nosound onPointerDown={tap} key={taps} aria-label="dig" className="absolute bottom-0 left-0 right-0"
          style={{ height: done ? 70 : 150 - taps * 8, background: '#8d6e63', border: '6px solid #5d4037', borderRadius: '140px 140px 0 0', boxShadow: 'inset 0 -14px 0 rgba(0,0,0,.18)', animation: 'hit .25s', transition: 'height .2s', touchAction: 'manipulation' }} />
        {parts.map((p) => (
          <div key={p.id} className="absolute pointer-events-none" style={{ left: '50%', bottom: 90, width: 10, height: 10, background: '#6d4c41', '--dx': p.dx + 'px', '--dy': p.dy + 'px', animation: 'dirt .7s ease-out forwards' }} />
        ))}
      </div>
      <div className="mt-4 rounded-full overflow-hidden" style={{ width: 240, height: 14, background: 'rgba(255,255,255,.7)' }}>
        <div style={{ width: (taps / NEED) * 100 + '%', height: '100%', background: '#f43f5e', transition: 'width .2s' }} />
      </div>
    </div>
  );
}

export default function Story({ onDone }) {
  const [scene, setScene] = useState('intro');
  const [typing, setTyping] = useState(true);
  const [ready, setReady] = useState(false);
  const [val, setVal] = useState('');
  const [fails, setFails] = useState(0);
  const [keys, setKeys] = useState(0);
  const S = SCENES[scene];

  useEffect(() => { setReady(false); setVal(''); }, [scene]);
  useEffect(() => { const m = SCENE_SFX[scene]; if (m) sfx[m](); }, [scene]);
  useEffect(() => { const r = MOLE_REACT[scene]; if (r) sfx.react(r); }, [scene]);
  const [idleTick, setIdleTick] = useState(0);
  useEffect(() => {
    if (typing || !S.say) return;
    const t = setTimeout(() => { sfx.idle(); setIdleTick((n) => n + 1); }, 5000 + Math.random() * 4000);
    return () => clearTimeout(t);
  }, [typing, scene, idleTick]);
  useEffect(() => { if (KEY_AT[scene]) setKeys((k) => Math.max(k, KEY_AT[scene])); }, [scene]);

  const go = (id) => (id === '__finish' ? onDone() : setScene(id));
  const scale = typeof innerHeight !== 'undefined' && innerHeight < 700 ? 3 : 4;

  const submitText = (e) => {
    e.preventDefault();
    const v = val.trim().toLowerCase();
    if (!v) return;
    if (v.includes(QUIZ.secretWord.slice(0, 5))) { go('q2_video'); return; }
    sfx.oops();
    setFails((f) => f + 1);
    setVal('');
  };
  const submitWord = (e) => {
    e.preventDefault();
    if (!val.trim()) return;
    try { localStorage.setItem('marianna_word', val.trim()); } catch (err) {}
    go('word_done');
  };

  const inputCls = 'flex-1 min-h-[56px] rounded-full px-6 text-xl text-[#881337] outline-none bg-white/90 border-2 border-rose-300 focus:border-rose-500';
  const inputStyle = { userSelect: 'text', WebkitUserSelect: 'text' };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-between py-5 fade">
      <div className="flex gap-3 text-4xl" aria-label="keys">
        {[1, 2, 3].map((n) => (
          <div key={n} className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
            style={{ background: keys >= n ? '#fff' : 'rgba(255,255,255,.35)', boxShadow: keys >= n ? '0 0 20px rgba(244,63,94,.5)' : 'none', filter: keys >= n ? 'none' : 'grayscale(1) opacity(.4)' }}>🪨</div>
        ))}
      </div>

      {S.type === 'dig' && <Dig onDone={() => go(S.next)} />}

      {S.type === 'video' && (
        <div className="flex flex-col items-center gap-4 pop px-4">
          <div className="text-rose-900 text-2xl font-bold">{UI.rightAnswer}</div>
          <video src={`${import.meta.env.BASE_URL}${QUIZ.video}`} controls playsInline loop preload="auto"
            className="rounded-3xl" style={{ maxHeight: '50vh', maxWidth: '88vw', boxShadow: '0 20px 40px -12px rgba(190,24,93,.4)', border: '6px solid #fff' }} />
          <Btn onClick={() => go(S.next)}>Дальше</Btn>
        </div>
      )}

      {S.say && (
        <>
          <Bubble key={scene} text={S.say} onTyping={setTyping} onDone={() => setReady(true)} />
          <Mole anim={typing ? 'talk' : 'idle'} frames={4} fps={typing ? 8 : 5} scale={scale} />
          <div className="w-full flex flex-wrap justify-center gap-3 px-6" style={{ minHeight: 70, maxWidth: 720, opacity: ready ? 1 : 0, pointerEvents: ready ? 'auto' : 'none', transition: 'opacity .3s' }}>
            {S.choices && S.choices.map(([label, next]) => <Btn key={label} onClick={() => go(next)}>{label}</Btn>)}
            {S.type === 'text' && (
              <form onSubmit={submitText} className="w-full flex flex-col items-center gap-3">
                {fails > 0 && <div className="text-rose-900 text-lg">{fails < 2 ? UI.wrongAnswer : UI.hint}</div>}
                <div className="w-full flex gap-3">
                  <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={UI.wordPlaceholder} autoComplete="off" autoCapitalize="none" spellCheck="false" enterKeyHint="go" className={inputCls} style={inputStyle} />
                  <Btn onClick={submitText}>OK</Btn>
                </div>
                {fails >= 3 && <button type="button" onClick={() => go('q2_video')} className="min-h-[52px] px-5 text-rose-900/70 underline">{UI.giveUp}</button>}
              </form>
            )}
            {S.type === 'word' && (
              <form onSubmit={submitWord} className="w-full flex gap-3">
                <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={UI.wishPlaceholder} autoComplete="off" spellCheck="false" enterKeyHint="go" maxLength={80} className={inputCls} style={inputStyle} />
                <Btn onClick={submitWord}>{UI.hideButton}</Btn>
              </form>
            )}
          </div>
        </>
      )}

      <button onClick={onDone} className="absolute right-4 bottom-3 min-h-[44px] px-4 rounded-full text-rose-900/40 text-sm active:bg-white/40" aria-label="Skip">skip ›</button>
    </div>
  );
}
