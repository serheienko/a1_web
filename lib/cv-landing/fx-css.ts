// lib/cv-landing/fx-css.ts -- CSS анимаций CV Builder (28.10.2026).
// Отдельный обычный модуль: строки из файлов с "use client" сервер получает
// как заглушку, а не как текст, и стили не попадали на страницу.

export const CV_FX_CSS = `
@keyframes cvl-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes cvl-pop{0%{opacity:0;transform:scale(.6)}70%{transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
@keyframes cvl-type{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes cvl-caret{50%{border-color:transparent}}
@keyframes cvl-bar{from{width:0}}
@keyframes cvl-cell{from{background:#EDF0FA}}
@keyframes cvl-print{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes cvl-scanline{0%,100%{transform:translateY(0)}50%{transform:translateY(80%)}}
@keyframes cvl-phone{0%,12%{transform:translate(78%,30%) rotate(10deg)}30%,78%{transform:translate(8%,2%) rotate(-3deg)}92%,100%{transform:translate(78%,30%) rotate(10deg)}}
@keyframes cvl-screen{0%,30%{opacity:0}38%,76%{opacity:1}84%,100%{opacity:0}}
@keyframes cvl-flash{0%,29%{opacity:0}31%{opacity:.85}38%,100%{opacity:0}}
@keyframes cvl-wave{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
@keyframes cvl-draw{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
@keyframes cvl-gradmove{to{background-position:300% 0}}
.cvl-grad{position:relative;overflow:hidden;isolation:isolate;background:linear-gradient(90deg,#335EF7,#6A4BF5,#A63DF2,#6A4BF5,#335EF7);background-size:300% 100%;animation:cvl-gradmove 6s linear infinite}
@keyframes cvl-shine{0%,55%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(320%) skewX(-20deg)}}
.cvl-grad::after{content:'';position:absolute;top:0;bottom:0;left:0;width:35%;z-index:-1;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);animation:cvl-shine 3.2s ease-in-out infinite}
.cvl-grad:hover{box-shadow:0 14px 40px -10px rgba(166,61,242,.8)}
@keyframes cvl-strike{from{background-size:0 2px}to{background-size:100% 2px}}
.cvl-sheet .cvl-a{opacity:0;animation:cvl-fade .55s cubic-bezier(.2,.8,.2,1) forwards}
.cvl-sheet .cvl-photo{opacity:0;animation:cvl-pop .6s cubic-bezier(.2,.8,.2,1) forwards}
.cvl-sheet .cvl-name{display:inline-block;clip-path:inset(0 100% 0 0);animation:cvl-type .9s steps(9,end) .45s forwards}
.cvl-sheet .cvl-bar{animation:cvl-bar 1s cubic-bezier(.2,.8,.2,1) both}
.cvl-sheet .cvl-cell{animation:cvl-cell .5s ease-out both}
.cvl-sheet .cvl-qr{clip-path:inset(0 0 100% 0);animation:cvl-print 1.1s steps(12,end) 2.6s forwards}
.cvl-tilt{transform:perspective(1100px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .25s ease-out;will-change:transform}
.cvl-glare{background:radial-gradient(circle at var(--gx,50%) var(--gy,0%),rgba(255,255,255,.45),transparent 45%);opacity:var(--go,0);transition:opacity .3s}
.cvl-phone{animation:cvl-phone 6s cubic-bezier(.45,.05,.25,1) infinite}
.cvl-screen{animation:cvl-screen 6s linear infinite}
.cvl-flash{animation:cvl-flash 6s linear infinite}
.cvl-scan{animation:cvl-scanline 1.6s ease-in-out infinite}
.cvl-w{transform-origin:bottom;animation:cvl-wave .9s ease-in-out infinite}
.cvl-row .cvl-check path{stroke-dasharray:24;stroke-dashoffset:24}
.cvl-row.cvl-in .cvl-check path{animation:cvl-draw .45s ease-out forwards;animation-delay:var(--d,0s)}
.cvl-row .cvl-them{background:linear-gradient(currentColor,currentColor) no-repeat 0 55%/0 2px}
.cvl-row.cvl-in .cvl-them{animation:cvl-strike .45s ease-out forwards;animation-delay:calc(var(--d,0s) + .2s)}
.cvl-row .cvl-us{opacity:.25;transition:opacity .4s}
.cvl-row.cvl-in .cvl-us{opacity:1;transition-delay:var(--d,0s)}
@media (prefers-reduced-motion:reduce){
  .cvl-grad,.cvl-grad::after,.cvl-sheet *,.cvl-phone,.cvl-screen,.cvl-flash,.cvl-scan,.cvl-w,.cvl-row *{animation:none!important;transition:none!important;opacity:1!important;clip-path:none!important}
  .cvl-row .cvl-check path{stroke-dashoffset:0}
  .cvl-row .cvl-them{background-size:100% 2px}
  .cvl-tilt{transform:none!important}
}
`;

export const CV_FX2_CSS = `
.cvl-words .cvl-wd{display:inline-block;opacity:0;transform:translateY(.45em);filter:blur(4px);transition:opacity .55s ease,transform .55s cubic-bezier(.2,.8,.2,1),filter .55s ease;transition-delay:calc(var(--i)*70ms)}
.cvl-words.cvl-in .cvl-wd{opacity:1;transform:none;filter:none}
.cvl-steps .cvl-line{transform:scaleX(0);transform-origin:left;transition:transform 1.2s cubic-bezier(.65,0,.35,1) .15s}
.cvl-steps.cvl-in .cvl-line{transform:scaleX(1)}
.cvl-steps .cvl-step{opacity:0;transform:translateY(14px);transition:opacity .5s ease,transform .5s cubic-bezier(.2,.8,.2,1);transition-delay:calc(.2s + var(--i)*.35s)}
.cvl-steps.cvl-in .cvl-step{opacity:1;transform:none}
.cvl-steps .cvl-dot{transition:box-shadow .4s ease;transition-delay:calc(.35s + var(--i)*.35s)}
.cvl-steps.cvl-in .cvl-dot{box-shadow:0 0 0 6px rgba(51,94,247,.15)}
@keyframes cvl-ic-blink{0%,100%{opacity:1}50%{opacity:.15}}
@keyframes cvl-ic-grow{0%{transform:scaleY(.2)}60%{transform:scaleY(1.08)}100%{transform:scaleY(1)}}
@keyframes cvl-ic-slide{0%,100%{transform:translateX(0)}50%{transform:translateX(var(--dx,3px))}}
@keyframes cvl-ic-draw{from{stroke-dashoffset:14}to{stroke-dashoffset:0}}
@keyframes cvl-ic-wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-12deg)}75%{transform:rotate(12deg)}}
@keyframes cvl-ic-wave{0%{opacity:.9;transform:scale(.7)}100%{opacity:0;transform:scale(1.35)}}
.cvl-ic *{transform-box:fill-box}
.cvl-ic .b1,.cvl-ic .b2,.cvl-ic .b3{transform-origin:bottom}
.cvl-card:hover .cvl-ic .q1,.cvl-in .cvl-ic .q1{animation:cvl-ic-blink 1.2s ease-in-out 2}
.cvl-card:hover .cvl-ic .q2,.cvl-in .cvl-ic .q2{animation:cvl-ic-blink 1.2s ease-in-out .3s 2}
.cvl-card:hover .cvl-ic .b1,.cvl-in .cvl-ic .b1{animation:cvl-ic-grow .7s ease-out}
.cvl-card:hover .cvl-ic .b2,.cvl-in .cvl-ic .b2{animation:cvl-ic-grow .7s ease-out .12s both}
.cvl-card:hover .cvl-ic .b3,.cvl-in .cvl-ic .b3{animation:cvl-ic-grow .7s ease-out .24s both}
.cvl-card:hover .cvl-ic .k1,.cvl-in .cvl-ic .k1{--dx:6px;animation:cvl-ic-slide 1s ease-in-out}
.cvl-card:hover .cvl-ic .k2,.cvl-in .cvl-ic .k2{--dx:-5px;animation:cvl-ic-slide 1s ease-in-out .1s}
.cvl-card:hover .cvl-ic .k3,.cvl-in .cvl-ic .k3{--dx:4px;animation:cvl-ic-slide 1s ease-in-out .2s}
.cvl-ic .t1,.cvl-ic .t2,.cvl-ic .t3{stroke-dasharray:14}
.cvl-card:hover .cvl-ic .t1,.cvl-in .cvl-ic .t1{animation:cvl-ic-draw .5s ease-out both}
.cvl-card:hover .cvl-ic .t2,.cvl-in .cvl-ic .t2{animation:cvl-ic-draw .5s ease-out .15s both}
.cvl-card:hover .cvl-ic .t3,.cvl-in .cvl-ic .t3{animation:cvl-ic-draw .5s ease-out .3s both}
.cvl-ic .lk{transform-origin:center}
.cvl-card:hover .cvl-ic .lk,.cvl-in .cvl-ic .lk{animation:cvl-ic-wiggle .6s ease-in-out}
.cvl-ic .w1,.cvl-ic .w2{transform-origin:center;opacity:0}
.cvl-card:hover .cvl-ic .w1,.cvl-in .cvl-ic .w1{animation:cvl-ic-wave 1.1s ease-out 2}
.cvl-card:hover .cvl-ic .w2,.cvl-in .cvl-ic .w2{animation:cvl-ic-wave 1.1s ease-out .35s 2}
.cvl-card{transition:transform .25s ease,box-shadow .25s ease}
.cvl-card:hover{transform:translateY(-3px);box-shadow:0 18px 40px -22px rgba(51,94,247,.45)}
@keyframes cvl-gh{0%,100%{opacity:.08}50%{opacity:var(--o,.5)}}
.cvl-ghbg i{animation:cvl-gh var(--t,4s) ease-in-out var(--d,0s) infinite}
@media (prefers-reduced-motion:reduce){
  .cvl-words .cvl-wd,.cvl-steps .cvl-step{opacity:1!important;transform:none!important;filter:none!important;transition:none!important}
  .cvl-steps .cvl-line{transform:none!important;transition:none!important}
  .cvl-ic *,.cvl-ghbg i{animation:none!important}
  .cvl-card:hover{transform:none}
}
`;
