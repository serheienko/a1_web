// @ts-nocheck
// app/game-map/game-map.tsx -- игровая карта A1 (прототип, 02.10.2026).
//
// Александр: «Давай попробуем сделать реальную карту, опубликовать на сайт
// и там уже решим, оставляем или нет». Карта рисуется на <canvas>: фон
// (день/вечер) + здания-спрайты по координатам городов. Размер здания --
// от числа сотрудников, цвет флага -- от отрасли (флаг в спрайте белый,
// красится в рантайме по маске). Рисуем только то, что в кадре; вдали
// мелкие компании сжимаются в точки (оптимизация, см. правила проекта).
//
// ДАННЫЕ ПОКА ДЕМО: названия вымышленные (COMPANIES ниже). Следующий шаг --
// подмена на настоящие компании из бэкенда (число сотрудников, город).
// Картинки: public/game-map/map/*, суммарно около 2 МБ, грузятся только на
// этой странице.
"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-this-alias */
import { useEffect, useRef } from "react";

const ASSETS: Record<string, string> = {
 "f6": "/game-map/map/f6.png",
 "bn6": "/game-map/map/bn6.webp",
 "b1": "/game-map/map/b1.webp",
 "f7": "/game-map/map/f7.png",
 "f8": "/game-map/map/f8.png",
 "f3": "/game-map/map/f3.png",
 "tn_capital": "/game-map/map/tn_capital.webp",
 "b2": "/game-map/map/b2.webp",
 "b3": "/game-map/map/b3.webp",
 "b7": "/game-map/map/b7.webp",
 "b8": "/game-map/map/b8.webp",
 "mk1": "/game-map/map/mk1.webp",
 "c6": "/game-map/map/c6.webp",
 "bn2": "/game-map/map/bn2.webp",
 "c2": "/game-map/map/c2.webp",
 "bn4": "/game-map/map/bn4.webp",
 "bn1": "/game-map/map/bn1.webp",
 "veil": "/game-map/map/veil.png",
 "bn7": "/game-map/map/bn7.webp",
 "f2": "/game-map/map/f2.png",
 "tf_capital": "/game-map/map/tf_capital.png",
 "c4": "/game-map/map/c4.webp",
 "b5": "/game-map/map/b5.webp",
 "f4": "/game-map/map/f4.png",
 "day": "/game-map/map/day.webp",
 "b4": "/game-map/map/b4.webp",
 "bn3": "/game-map/map/bn3.webp",
 "bn8": "/game-map/map/bn8.webp",
 "f5": "/game-map/map/f5.png",
 "tn_village": "/game-map/map/tn_village.webp",
 "c8": "/game-map/map/c8.webp",
 "mascot": "/game-map/map/mascot.webp",
 "night": "/game-map/map/night.webp",
 "c5": "/game-map/map/c5.webp",
 "c7": "/game-map/map/c7.webp",
 "c3": "/game-map/map/c3.webp",
 "b6": "/game-map/map/b6.webp",
 "f1": "/game-map/map/f1.png",
 "t_village": "/game-map/map/t_village.webp",
 "c1": "/game-map/map/c1.webp",
 "bn5": "/game-map/map/bn5.webp",
 "t_capital": "/game-map/map/t_capital.webp",
 "tf_village": "/game-map/map/tf_village.png"
};
const CITIES: Record<string, number[]> = {"Kyiv": [0.49245810588110894, 0.446304823885544], "Lviv": [0.3892743182638744, 0.4613987347686526], "Odesa": [0.4954145485713056, 0.5932112617619651], "Kharkiv": [0.5828825393212391, 0.4591450007776911], "Dnipro": [0.5661848387991609, 0.5173651373309227], "Zaporizhzhia": [0.5684752741472805, 0.5401485924332379], "Uzhhorod": [0.3583444194890909, 0.5020295952968942], "Chernivtsi": [0.4170560799657719, 0.5221758966258376], "Simferopol": [0.5541524544648181, 0.6482308783044339], "Vinnytsia": [0.45926668930887915, 0.49048720173642013], "Poltava": [0.5567365115244647, 0.47620896593124507]};

export function GameMap() {
  const rootRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current as HTMLDivElement;
    const cleanup: Array<() => void> = [];
    
var A=ASSETS, C=CITIES;
var cv=cvRef.current as HTMLCanvasElement, ctx=cv.getContext('2d') as CanvasRenderingContext2D;
var MW=1536, MH=1024; // map px
var img:any={}, loaded=0, total=0;
function load(k,src){total++;var i=new Image();i.onload=function(){loaded++;if(loaded===total)start()};i.src=src;img[k]=i}
Object.keys(A).forEach(function(k){load(k,A[k])});
var INDS={it:['IT і софт','#3b82f6'],game:['Ігри','#f97316'],fin:['Фінтех','#22c55e'],ai:['AI','#a855f7'],ecom:['E-commerce','#ec4899'],edu:['Освіта','#14b8a6'],med:['Медицина','#ef4444'],prod:['Продукт','#eab308']};
var COS=[];
var names=[['Лісовий Код','it','Kyiv',[-.012,.004],1400],['Дніпровські Ігри','game','Kyiv',[.008,-.006],620],['Золотий Колос Фін','fin','Kyiv',[.014,.012],240],['Нейрон Степ','ai','Kyiv',[-.02,-.012],85],['Карпатський Софт','it','Lviv',[0,0],410],['Бескид Лабс','ai','Lviv',[.012,.01],60],['Гуцул Геймс','game','Lviv',[-.012,.012],24],['Чорне Море Пей','fin','Odesa',[0,0],180],['Маяк Шоп','ecom','Odesa',[.014,-.01],45],['Харків Тех','it','Kharkiv',[0,0],760],['Слобода Мед','med','Kharkiv',[.014,.012],95],['Дніпро Індастрі','prod','Dnipro',[0,0],320],['Хортиця Дата','ai','Zaporizhzhia',[0,0],130],['Поділля Лернінг','edu','Vinnytsia',[0,0],38],['Полтавський Хутір','ecom','Poltava',[0,0],12],['Буковина Дев','it','Chernivtsi',[0,0],7],['Ужгород Блок','fin','Uzhhorod',[0,0],3],['Кримський Бриз','prod','Simferopol',[0,0],56],['Київ Хаб Столиця','it','Kyiv',[.0,.03],2600]];
names.forEach(function(n,i){var c=C[n[2]];COS.push({id:i,name:n[0],ind:n[1],city:n[2],x:(c[0]+n[3][0]*2.2)*MW,y:(c[1]+n[3][1]*2.2)*MH,emp:n[4],hiring:(i*7)%3!==0,fast:(i%4===1),ally:false})});
var PEOPLE=[['Оля','Frontend',[.51,.455],1],['Тарас','Backend',[.40,.47],2],['Марта','QA',[.575,.50],3],['Ігор','Data',[.50,.585],4],['Софія','Design',[.46,.50],5],['Макс','DevOps',[.555,.465],6],['Дана','PM',[.435,.51],7],['Юра','Mobile',[.57,.545],8]].map(function(p,i){return{name:p[0],role:p[1],x:p[2][0]*MW,y:p[2][1]*MH,cat:p[3]}});
function level(n){return n<5?1:n<15?2:n<40?3:n<100?4:n<250?5:n<600?6:n<1500?7:8}
var LBL=['Шалаш','Будиночок','Дім','Садиба','Ратуша','Гільдія','Замок','Цитадель'];
var night=false,view={x:0,y:0,s:1},sel=null,tab='co',W=0,H=0,dpr=1,minS=1;
function resize(){dpr=Math.min(2,window.devicePixelRatio||1);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;minS=Math.max(W/MW,H/MH)*1.0;if(view.s<minS)view.s=minS;clamp();draw()}
function clamp(){var w=MW*view.s,h=MH*view.s;view.x=w<=W?(W-w)/2:Math.min(0,Math.max(W-w,view.x));view.y=h<=H?(H-h)/2:Math.min(0,Math.max(H-h,view.y))}
var cache={};
function tinted(prefix,lvl,color){var key=prefix+lvl+color+night;if(cache[key])return cache[key];
 var base=img[(night?(prefix==='b'?'bn':'tn_'):(prefix==='b'?'b':'t_'))+lvl],mask=img[(prefix==='b'?'f':'tf_')+lvl];
 var c=document.createElement('canvas');c.width=base.width;c.height=base.height;var x=c.getContext('2d');x.drawImage(base,0,0);
 var m=document.createElement('canvas');m.width=base.width;m.height=base.height;var mx=m.getContext('2d');mx.drawImage(mask,0,0,base.width,base.height);
 mx.globalCompositeOperation='source-in';mx.fillStyle=color;mx.fillRect(0,0,m.width,m.height);
 x.globalAlpha=.85;x.drawImage(m,0,0);cache[key]=c;return c}
function sizeFor(co){var l=level(co.emp);return {l:l,w:[30,34,40,46,54,62,72,84][l-1]}}
function draw(){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0b3a4a';ctx.fillRect(0,0,W,H);
 ctx.save();ctx.translate(view.x,view.y);ctx.scale(view.s,view.s);
 ctx.drawImage(night?img.night:img.day,0,0,MW,MH);ctx.drawImage(img.veil,0,0,MW,MH);ctx.restore();
 var z=view.s/minS;
 if(tab==='co'){
  var far=z<1.5;
  var list=COS.slice().sort(function(a,b){return a.y-b.y});
  list.forEach(function(co){var sx=co.x*view.s+view.x,sy=co.y*view.s+view.y;if(sx<-120||sy<-120||sx>W+120||sy>H+120)return;
   var s=sizeFor(co),col=INDS[co.ind][1];
   if(far&&s.l<5){dot(sx,sy,col,co);return}
   var spr=tinted('b',s.l,col),k=Math.min(2.4,Math.max(.7,z*.75)),w=s.w*k*(far?.85:1),h=w*spr.height/spr.width;
   ctx.drawImage(spr,sx-w/2,sy-h*.82,w,h);
   if(co.ally){flagAlly(sx+w*.32,sy-h*.8)}
   if(sel===co){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(sx,sy,w*.5,w*.2,0,0,6.3);ctx.stroke()}
   if(z>2.2){ctx.font='600 11px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(20,15,10,.8)';ctx.strokeText(co.name,sx,sy+13);ctx.fillStyle='#fff';ctx.fillText(co.name,sx,sy+13)}
   co._r={x:sx,y:sy-h*.4,w:w,h:h};
  });
 } else {
  PEOPLE.forEach(function(p){var sx=p.x*view.s+view.x,sy=p.y*view.s+view.y;var im=img['c'+p.cat],k=Math.min(1.4,Math.max(.5,z*.45)),w=46*k,h=w*im.height/im.width;
   ctx.drawImage(im,sx-w/2,sy-h,w,h);p._r={x:sx,y:sy-h/2,w:w,h:h}});
 }
}
function dot(x,y,col,co){ctx.beginPath();ctx.arc(x,y,5.5,0,6.3);ctx.fillStyle=col;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();co._r={x:x,y:y,w:16,h:16}}
function flagAlly(x,y){ctx.fillStyle='#ffd34d';ctx.strokeStyle='#5a3b10';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y+18);ctx.lineTo(x,y);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+14,y+4);ctx.lineTo(x,y+9);ctx.closePath();ctx.fill()}
// input
var pts={},drag=null,pinch=null,moved=0;
cv.addEventListener('pointerdown',function(e){cv.setPointerCapture(e.pointerId);pts[e.pointerId]={x:e.clientX,y:e.clientY};moved=0;if(Object.keys(pts).length===1)drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y};else{drag=null;var a=Object.values(pts);pinch={d:dist(a[0],a[1]),s:view.s}}});
cv.addEventListener('pointermove',function(e){if(!pts[e.pointerId])return;pts[e.pointerId]={x:e.clientX,y:e.clientY};var a=Object.values(pts);
 if(a.length>=2&&pinch){var d=dist(a[0],a[1]);zoomAt((a[0].x+a[1].x)/2-cv.getBoundingClientRect().left,(a[0].y+a[1].y)/2-cv.getBoundingClientRect().top,pinch.s*d/pinch.d);moved=9}
 else if(drag){var dx=e.clientX-drag.x,dy=e.clientY-drag.y;moved=Math.max(moved,Math.abs(dx)+Math.abs(dy));view.x=drag.vx+dx;view.y=drag.vy+dy;clamp();draw()}});
cv.addEventListener('pointerup',function(e){var wasTap=moved<6&&Object.keys(pts).length===1;delete pts[e.pointerId];if(Object.keys(pts).length<2)pinch=null;if(wasTap){var r=cv.getBoundingClientRect();tap(e.clientX-r.left,e.clientY-r.top)}drag=null});
cv.addEventListener('pointercancel',function(e){delete pts[e.pointerId];pinch=null;drag=null});
cv.addEventListener('wheel',function(e){e.preventDefault();var r=cv.getBoundingClientRect();zoomAt(e.clientX-r.left,e.clientY-r.top,view.s*Math.exp(-e.deltaY*.0015))},{passive:false});
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function zoomAt(px,py,ns){ns=Math.max(minS,Math.min(minS*5,ns));var mx=(px-view.x)/view.s,my=(py-view.y)/view.s;view.s=ns;view.x=px-mx*ns;view.y=py-my*ns;clamp();draw()}
function tap(px,py){var best=null,bd=1e9;(tab==='co'?COS:PEOPLE).forEach(function(o){if(!o._r)return;var dx=px-o._r.x,dy=py-o._r.y;var hit=Math.abs(dx)<Math.max(14,o._r.w*.5)&&Math.abs(dy)<Math.max(14,o._r.h*.5);if(hit){var d=dx*dx+dy*dy;if(d<bd){bd=d;best=o}}});
 sel=best;card();draw()}
function el(id:string){return root.querySelector('#'+id) as HTMLElement}
function card(){var c=el('card');if(!sel){c.classList.remove('on');return}
 if(tab==='co'){var l=level(sel.emp);c.innerHTML='<div class="h"><b>'+sel.name+'</b><button class="x" aria-label="Закрити" data-act="close">×</button></div><div class="s">'+INDS[sel.ind][0]+' · '+sel.city+'</div><div class="r"><span>🐱 '+sel.emp+' співробітників</span><span>'+LBL[l-1]+'</span></div><div class="ch">'+(sel.hiring?'<span class="g">Шукає людей</span>':'')+(sel.fast?'<span class="y">⚡ Швидко відповідає</span>':'')+'<span>Рівень '+l+'</span></div><div class="bt"><button class="p" data-act="ally">'+(sel.ally?'✓ Ваш союзник':'+ Add as ally')+'</button><button>Профіль</button></div>'}
 else{c.innerHTML='<div class="h"><b>'+sel.name+'</b><button class="x" aria-label="Закрити" data-act="close">×</button></div><div class="s">'+sel.role+' · відкритий до пропозицій</div><div class="bt"><button class="p">Написати</button><button>Профіль</button></div>'}
 c.classList.add('on')}
const GMX:any={close:function(){sel=null;card();draw()},ally:function(){sel.ally=!sel.ally;card();draw()},night:function(){night=!night;root.classList.toggle('night',night);el('nb').textContent=night?'☀ День':'☾ Вечір';draw()},tab:function(t){tab=t;sel=null;card();el('t1').classList.toggle('on',t==='co');el('t2').classList.toggle('on',t==='pp');draw()},zoom:function(f){zoomAt(W/2,H/2,view.s*f)}};
function start(){el('load').style.display='none';window.addEventListener('resize',resize);cleanup.push(function(){window.removeEventListener('resize',resize)});resize();view.s=minS*1.9;view.x=-(.52*MW*view.s-W/2);view.y=-(.5*MH*view.s-H/2);clamp();draw()}

    root.addEventListener("click", onRootClick);
    cleanup.push(() => root.removeEventListener("click", onRootClick));
    function onRootClick(e: Event) {
      const t = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
      if (!t) return;
      const a = t.getAttribute("data-act");
      if (a === "close") GMX.close();
      else if (a === "ally") GMX.ally();
      else if (a === "night") GMX.night();
      else if (a === "co") GMX.tab("co");
      else if (a === "pp") GMX.tab("pp");
      else if (a === "zin") GMX.zoom(1.4);
      else if (a === "zout") GMX.zoom(1 / 1.4);
    }
    return () => cleanup.forEach((f) => f());
  }, []);

  return (
    <div ref={rootRef} className="gm">
      <style>{CSS}</style>
      <canvas ref={cvRef} id="cv" />
      <div className="top">
        <div className="tabs">
          <button id="t1" className="on" data-act="co">Компанії</button>
          <button id="t2" data-act="pp">Люди</button>
        </div>
        <button id="nb" className="nb" data-act="night">☾ Вечір</button>
      </div>
      <div className="zoom">
        <button data-act="zin" aria-label="Приблизити">+</button>
        <button data-act="zout" aria-label="Віддалити">−</button>
      </div>
      <div id="card" />
      <div id="load">Завантаження карти…</div>
    </div>
  );
}

const CSS = `
.gm{--fg:#2b2114;--card:#fbf5e6;--line:#d9c9a3;--acc:#a8571f;position:relative;height:calc(100dvh - 140px);min-height:460px;overflow:hidden;border-radius:16px;border:1px solid var(--line);color:var(--fg);font:15px/1.4 system-ui,sans-serif}
.gm canvas{width:100%;height:100%;display:block;touch-action:none;cursor:grab}
.gm .top{position:absolute;left:12px;right:12px;top:12px;display:flex;gap:8px;align-items:center;justify-content:space-between;pointer-events:none}.gm .top>*{pointer-events:auto}
.gm .tabs{display:flex;background:rgba(251,245,230,.92);border-radius:99px;padding:3px;box-shadow:0 2px 8px #0004}
.gm .tabs button{border:0;background:none;padding:8px 14px;border-radius:99px;font:600 14px system-ui;color:#5a4630;min-height:36px;cursor:pointer}.gm .tabs button.on{background:#a8571f;color:#fff}
.gm .nb{border:0;border-radius:99px;padding:9px 14px;font:600 14px system-ui;background:rgba(251,245,230,.92);color:#5a4630;box-shadow:0 2px 8px #0004;min-height:38px;cursor:pointer}
.gm .zoom{position:absolute;right:12px;bottom:12px;display:flex;flex-direction:column;gap:6px}.gm .zoom button{width:40px;height:40px;border-radius:12px;border:0;background:rgba(251,245,230,.92);font:600 20px system-ui;color:#5a4630;box-shadow:0 2px 8px #0004;cursor:pointer}
.gm #card{position:absolute;left:12px;right:64px;bottom:12px;max-width:420px;background:var(--card);border:2px solid #b98a4a;border-radius:16px;padding:12px 14px;box-shadow:0 8px 24px #0006;transform:translateY(130%);visibility:hidden;transition:transform .22s ease,visibility 0s .22s;display:flex;flex-direction:column;gap:7px}
.gm #card.on{transform:none;visibility:visible;transition:transform .22s ease}.gm.night #card{border-color:#6a74c8}
.gm .h{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;font-size:17px}.gm .x{border:0;background:none;font-size:24px;line-height:1;color:var(--fg);padding:0 4px;cursor:pointer}
.gm .s{font-size:13px;opacity:.75}.gm .r{display:flex;gap:8px 14px;flex-wrap:wrap;font-size:14px}.gm .ch{display:flex;gap:5px;flex-wrap:wrap}
.gm .ch span{font-size:12px;padding:2px 8px;border-radius:99px;background:rgba(150,110,50,.18)}.gm .ch .g{background:#2f7a4d33}.gm .ch .y{background:#eab30833}
.gm .bt{display:flex;gap:8px}.gm .bt button{border:1px solid var(--acc);background:none;color:var(--acc);padding:8px 12px;border-radius:10px;font:600 13px system-ui;min-height:36px;cursor:pointer}.gm .bt .p{background:var(--acc);color:#fff}
.gm #load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#0b3a4a;color:#fff}
`;
