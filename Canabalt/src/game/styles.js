export const styles = `
:host { display:block; container-type:inline-size; font-family:"Avenir Next", Avenir, "Segoe UI", sans-serif; color:#edf2ef; --accent:#ace3c5; }
* { box-sizing:border-box; }
button { font:inherit; cursor:pointer; touch-action:manipulation; }
button:focus-visible,.stage:focus-visible { outline:2px solid var(--accent); outline-offset:-5px; }
.runner { border:1px solid #3a4b50; border-radius:8px; overflow:hidden; background:#1c2b34; }
.stage { position:relative; outline:none; overflow:hidden; touch-action:manipulation; -webkit-user-select:none; user-select:none; }
canvas { width:100%; height:clamp(340px, calc(100svh - 340px), 560px); display:block; touch-action:none; }
.hud { position:absolute; inset:0 0 auto; display:flex; align-items:start; justify-content:space-between; padding:25px 29px; pointer-events:none; }
.distance-label,.best-label { display:block; font:9px/1.5 ui-monospace,monospace; letter-spacing:1.8px; color:#b0bfbd; }
.distance { font:500 32px/1.35 ui-monospace,monospace; letter-spacing:-1.5px; font-variant-numeric:tabular-nums; }
.unit { font:12px ui-monospace,monospace; color:#a4b6b4; margin-left:7px; }
.hud-right { position:relative; z-index:2; display:flex; gap:27px; align-items:center; }
.best { text-align:right; }
.best-value { font:15px/1.8 ui-monospace,monospace; color:#d4dfd9; }
.sound-toggle { width:44px; height:44px; border:1px solid #5d6e70; border-radius:5px; background:#1c2b34; color:#dce9e1; pointer-events:auto; display:grid; place-items:center; }
.sound-toggle:disabled { opacity:.35; cursor:default; }
.sound-toggle svg { display:block; width:23px; height:23px; flex:none; }
.sound-toggle .sound-off { display:none; }
.sound-toggle[aria-pressed="false"] .sound-on { display:none; }
.sound-toggle[aria-pressed="false"] .sound-off { display:block; }
.pause { width:44px; height:44px; border:1px solid #5d6e70; border-radius:5px; background:#1c2b34; color:#dae5e0; pointer-events:auto; display:grid; place-items:center; }
.pause:disabled { opacity:.35; cursor:default; }
.pause-lines { width:10px; height:12px; border-left:3px solid currentColor; border-right:3px solid currentColor; }
.overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:70px 20px 95px; background:linear-gradient(180deg,rgba(20,32,39,.12),rgba(20,32,39,.38) 55%,transparent); text-align:center; }
.overlay[hidden] { display:none; }
.eyebrow { color:#b3c6bd; font:10px/1.5 ui-monospace,monospace; letter-spacing:3px; margin:0 0 16px; }
.game-title { font-size:clamp(54px, 11cqw, 100px); font-weight:750; letter-spacing:-.065em; }
.touch-hint { display:none; }
h2 { font-size:clamp(30px,4vw,50px); font-weight:600; letter-spacing:-2px; line-height:1.05; margin:0; color:#eaf3eb; }
.message { color:#beccc7; font-size:13px; line-height:1.6; margin:16px 0 23px; max-width:340px; }
.primary { min-height:46px; flex-shrink:0; white-space:nowrap; padding:0 25px; border:0; border-radius:4px; background:var(--accent); color:#203c30; font-size:13px; font-weight:650; display:flex; align-items:center; gap:27px; }
.primary:hover { background:#c1eed5; }
.primary:active { transform:translateY(1px); }
.primary:focus-visible { outline:2px solid #e8f4ec; outline-offset:4px; }
.start-hint { color:#aabdb7; font-size:10px; margin:14px 0 0; }
.game-caption { position:absolute; bottom:17px; right:24px; color:#8da2a3; font:9px/1.4 ui-monospace,monospace; letter-spacing:1.5px; pointer-events:none; }
.controls { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:10px 25px; border-top:1px solid #3c4d50; background:#1b282e; color:#bccac6; }
.keys { display:flex; align-items:center; gap:8px; font-size:11px; }
kbd { font:10px ui-monospace,monospace; border:1px solid #586968; box-shadow:0 2px 0 #344346; border-radius:3px; padding:5px 8px; color:#e0e9e2; }
.controls-hint { font-size:11px; color:#a2b4ae; }
.jump-button { display:none; min-height:44px; flex-shrink:0; white-space:nowrap; padding:0 18px; color:#203c30; background:var(--accent); border:0; border-radius:4px; touch-action:none; }
.fullscreen { min-height:44px; padding:0 12px; border:1px solid #5d6e70; border-radius:4px; background:transparent; color:#dce9e1; font-size:11px; white-space:nowrap; }
.fullscreen[hidden] { display:none; }
.fullscreen:hover,.sound-toggle:hover,.pause:not(:disabled):hover { background:#31474e; }
:host(:fullscreen) { width:100%; height:100%; background:#1c2b34; }
:host(:fullscreen) .runner { height:100%; display:flex; flex-direction:column; border:0; border-radius:0; }
:host(:fullscreen) .stage { flex:1; min-height:0; }
:host(:fullscreen) canvas { position:absolute; inset:0; width:100%; height:100%; min-height:0; aspect-ratio:auto; }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
@container (max-width:600px) {
  canvas { height:auto; min-height:370px; aspect-ratio:1.05; }
  .hud { padding:16px; } .hud-right { gap:9px; } .distance { font-size:26px; }
  .overlay { padding:85px 16px 45px; } h2 { font-size:32px; }
  .game-title { font-size:64px; }
  .eyebrow { font-size:9px; margin-bottom:12px; }
  .message { max-width:260px; font-size:12px; margin:14px 0 18px; }
  .controls { padding:10px 12px; gap:8px; } .keys { display:none; }
  .jump-button { display:block; } .controls-hint { max-width:155px; font-size:10px; line-height:1.6; }
  .game-caption { font-size:8px; bottom:13px; right:16px; } .best-label { font-size:8px; }
  .fullscreen { padding:0 8px; font-size:10px; }
}
@container (max-width:360px) { .hud { padding:12px; } .best-label { letter-spacing:.5px; } .controls-hint { max-width:110px; } }
@media (prefers-reduced-motion:reduce) { *,*::before,*::after { animation:none !important; transition:none !important; } }
:host([data-embedded]) { height:100%; }
:host([data-embedded]) .runner { height:100%; display:flex; flex-direction:column; border:0; border-radius:0; }
:host([data-embedded]) .stage { flex:1; min-height:0; }
:host([data-embedded]) canvas { position:absolute; inset:0; width:100%; height:100%; min-height:0; aspect-ratio:auto; }
:host([data-embedded]) .controls { flex-shrink:0; padding-bottom:max(10px, env(safe-area-inset-bottom)); }
@media (max-height:450px) {
  :host([data-embedded]) .hud { padding:10px 16px; }
  :host([data-embedded]) .distance { font-size:23px; }
  :host([data-embedded]) .overlay { padding:65px 16px 12px; }
  :host([data-embedded]) .eyebrow, :host([data-embedded]) .start-hint, :host([data-embedded]) .game-caption { display:none; }
  :host([data-embedded]) h2 { font-size:28px; }
  :host([data-embedded]) .game-title { font-size:46px; }
  :host([data-embedded]) .message { margin:8px 0 12px; font-size:12px; }
  :host([data-embedded]) .controls { padding:6px 16px; }
}
@media (pointer:coarse) { .jump-button { display:block; min-width:88px; } .keys,.keyboard-hint { display:none; } .touch-hint { display:inline; } }
`;
