/* Экран для всех устройств, кроме iPad */
export default function DeviceNotice(){
  return(
    <div className="fixed inset-0 flex flex-col items-center justify-center text-center px-6 mono select-none overflow-hidden"
         style={{color:"#ff8fb8",background:"radial-gradient(circle at 50% 45%,#1c0912,#080307)"}}>
      <svg className="dn-float" width="190" height="150" viewBox="0 0 190 150" fill="none" aria-hidden="true">
        <rect x="6" y="14" width="178" height="122" rx="18" stroke="#ff8fb8" strokeWidth="3" fill="rgba(255,105,160,.06)"/>
        <rect x="18" y="26" width="154" height="98" rx="7" stroke="rgba(255,143,184,.35)" strokeWidth="1.5"/>
        <circle cx="12" cy="75" r="2" fill="#ff8fb8"/>
        <path className="dn-beat" d="M95 100 C70 82 72 58 85 56 C91 55 95 59 95 63 C95 59 99 55 105 56 C118 58 120 82 95 100 Z" fill="#ff4d8d"/>
      </svg>
      <div style={{marginTop:34,letterSpacing:".35em",fontSize:12,opacity:.7}}>[ DEVICE NOT SUPPORTED ]</div>
      <div className="serif" style={{marginTop:18,fontSize:"clamp(26px,5vw,44px)",lineHeight:1.2,color:"#ffdce9"}}>Сайт адаптирован только под iPad</div>
      <div style={{marginTop:16,fontSize:14,opacity:.65,maxWidth:420,lineHeight:1.6}}>Открой эту ссылку на iPad, чтобы всё выглядело и работало как задумано.</div>
    </div>
  );
}