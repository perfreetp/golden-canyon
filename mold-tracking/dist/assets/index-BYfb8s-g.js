(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function e(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(r){if(r.ep)return;r.ep=!0;const s=e(r);fetch(r.href,s)}})();const Hh=!1,Vh=(i,t)=>i===t,qn=Symbol("solid-proxy"),ys=Symbol("solid-track"),Ms={equals:Vh};let xc=Tc;const Jn=1,bs=2,Sc={owned:null,cleanups:null,context:null,owner:null};var be=null;let us=null,Gh=null,ge=null,Ie=null,Ln=null,Bs=0;function ds(i,t){const e=ge,n=be,r=i.length===0,s=t===void 0?n:t,a=r?Sc:{owned:null,cleanups:null,context:s?s.context:null,owner:s},o=r?i:()=>i(Wh(a));be=a,ge=null;try{return ur(o,!0)}finally{ge=e,be=n}}function Wh(i){return()=>Yn(()=>Cr(i))}function jt(i,t){t=t?Object.assign({},Ms,t):Ms;const e={value:i,observers:null,observerSlots:null,comparator:t.equals||void 0},n=r=>(typeof r=="function"&&(r=r(e.value)),Ec(e,r));return[bc.bind(e),n]}function zt(i,t,e){const n=wo(i,t,!1,Jn);Lr(n)}function wr(i,t,e){xc=jh;const n=wo(i,t,!1,Jn);n.user=!0,Ln?Ln.push(n):Lr(n)}function re(i,t,e){e=e?Object.assign({},Ms,e):Ms;const n=wo(i,t,!0,0);return n.observers=null,n.observerSlots=null,n.comparator=e.equals||void 0,Lr(n),bc.bind(n)}function Xh(i){return ur(i,!1)}function Yn(i){if(ge===null)return i();const t=ge;ge=null;try{return i()}finally{ge=t}}function yc(i){wr(()=>Yn(i))}function Ao(i){return be===null||(be.cleanups===null?be.cleanups=[i]:be.cleanups.push(i)),i}function Ua(){return ge}function Mc(i){i.observerSlots=i.observers.map((t,e)=>{const n=t.sources;if(!n)return-1;for(let r=n.length-1;r>=0;r--)if(n[r]===i&&t.sourceSlots&&t.sourceSlots[r]===e)return r;return n.lastIndexOf(i)})}function bc(){if(this.sources&&this.state)if(this.state===Jn)Lr(this);else{const i=Ie;Ie=null,ur(()=>Ts(this),!1),Ie=i}if(ge){const i=this.observers;if(!i||i[i.length-1]!==ge){const t=i?i.length:0;if(ge.sources)ge.sources.push(this),ge.sourceSlots.push(t);else{const e=[this],n=[t];ge.sources=e,ge.sourceSlots=n}if(i)(!this.observerSlots||this.observerSlots.length!==i.length)&&Mc(this),i.push(ge),this.observerSlots.push(ge.sources.length-1);else{const e=[ge],n=[ge.sources.length-1];this.observers=e,this.observerSlots=n}}}return this.value}function Ec(i,t,e){let n=i.value;return(!i.comparator||!i.comparator(n,t))&&(i.value=t,i.observers&&i.observers.length&&ur(()=>{for(let r=0;r<i.observers.length;r+=1){const s=i.observers[r],a=us&&us.running;a&&us.disposed.has(s),(a?!s.tState:!s.state)&&(s.pure?Ie.push(s):Ln.push(s),s.observers&&Ac(s)),a||(s.state=Jn)}if(Ie.length>1e6)throw Ie=[],new Error},!1)),t}function Lr(i){if(!i.fn)return;Cr(i,!0);const t=Bs;qh(i,i.value,t)}function qh(i,t,e){let n;const r=be,s=ge;ge=be=i;try{n=i.fn(t)}catch(a){return i.pure&&(i.state=Jn,i.owned&&i.owned.forEach(o=>Cr(o)),i.owned=null),i.updatedAt=e+1,wc(a)}finally{ge=s,be=r}(!i.updatedAt||i.updatedAt<=e)&&(i.updatedAt!=null&&"observers"in i?Ec(i,n):i.value=n,i.updatedAt=e)}function wo(i,t,e,n=Jn,r){const s={fn:i,state:n,updatedAt:null,owned:null,sources:null,sourceSlots:null,cleanups:null,value:t,owner:be,context:be?be.context:null,pure:e};return be===null||be!==Sc&&(be.owned?be.owned.push(s):be.owned=[s]),s}function Es(i){if(i.state===0)return;if(i.state===bs)return Ts(i);if(i.suspense&&Yn(i.suspense.inFallback))return i.suspense.effects.push(i);const t=[i];for(;(i=i.owner)&&(!i.updatedAt||i.updatedAt<Bs);)i.state&&t.push(i);for(let e=t.length-1;e>=0;e--)if(i=t[e],i.state===Jn)Lr(i);else if(i.state===bs){const n=Ie;Ie=null,ur(()=>Ts(i,t[0]),!1),Ie=n}}function ur(i,t){if(Ie)return i();let e=!1;t||(Ie=[]),Ln?e=!0:Ln=[],Bs++;try{const n=i();return Yh(e),n}catch(n){e||(Ln=null),Ie=null,wc(n)}}function Yh(i){if(Ie&&(Tc(Ie),Ie=null),i)return;const t=Ln;Ln=null,t.length&&ur(()=>xc(t),!1)}function Tc(i){for(let t=0;t<i.length;t++)Es(i[t])}function jh(i){let t,e=0;for(t=0;t<i.length;t++){const n=i[t];n.user?i[e++]=n:Es(n)}for(t=0;t<e;t++)Es(i[t])}function Ts(i,t){i.state=0;for(let e=0;e<i.sources.length;e+=1){const n=i.sources[e];if(n.sources){const r=n.state;r===Jn?n!==t&&(!n.updatedAt||n.updatedAt<Bs)&&Es(n):r===bs&&Ts(n,t)}}}function Ac(i){for(let t=0;t<i.observers.length;t+=1){const e=i.observers[t];e.state||(e.state=bs,e.pure?Ie.push(e):Ln.push(e),e.observers&&Ac(e))}}function Cr(i,t){let e;if(i.sources)for(;i.sources.length;){const n=i.sources.pop(),r=i.sourceSlots.pop(),s=n.observers;if(s&&s.length){(!n.observerSlots||n.observerSlots.length!==s.length)&&Mc(n);const a=s.pop(),o=n.observerSlots.pop();r<s.length&&(a.sourceSlots[o]=r,s[r]=a,n.observerSlots[r]=o)}!t&&(!s||s.length)}if(i.tOwned){for(e=i.tOwned.length-1;e>=0;e--)Cr(i.tOwned[e]);delete i.tOwned}if(i.owned){for(e=i.owned.length-1;e>=0;e--)Cr(i.owned[e]);i.owned=null}if(i.cleanups){for(e=i.cleanups.length-1;e>=0;e--)i.cleanups[e]();i.cleanups=null}i.state=0}function Kh(i){return i instanceof Error?i:new Error(typeof i=="string"?i:"Unknown error",{cause:i})}function wc(i,t=be){throw Kh(i)}const Zh=Symbol("fallback");function Jo(i){for(let t=0;t<i.length;t++)i[t]()}function Jh(i,t,e={}){let n=[],r=[],s=[],a=0,o=t.length>1?[]:null;return Ao(()=>Jo(s)),()=>{let l=i()||[],c=l.length,h,d;return l[ys],Yn(()=>{let f,_,g,m,u,A,T,M,L;if(c===0)a!==0&&(Jo(s),s=[],n=[],r=[],a=0,o&&(o=[])),e.fallback&&(n=[Zh],r[0]=ds(R=>(s[0]=R,e.fallback())),a=1);else if(a===0){for(r=new Array(c),d=0;d<c;d++)n[d]=l[d],r[d]=ds(p);a=c}else{for(g=new Array(c),m=new Array(c),o&&(u=new Array(c)),A=0,T=Math.min(a,c);A<T&&n[A]===l[A];A++);for(T=a-1,M=c-1;T>=A&&M>=A&&n[T]===l[M];T--,M--)g[M]=r[T],m[M]=s[T],o&&(u[M]=o[T]);for(f=new Map,_=new Array(M+1),d=M;d>=A;d--)L=l[d],h=f.get(L),_[d]=h===void 0?-1:h,f.set(L,d);for(h=A;h<=T;h++)L=n[h],d=f.get(L),d!==void 0&&d!==-1?(g[d]=r[h],m[d]=s[h],o&&(u[d]=o[h]),d=_[d],f.set(L,d)):s[h]();for(d=A;d<c;d++)d in g?(r[d]=g[d],s[d]=m[d],o&&(o[d]=u[d],o[d](d))):r[d]=ds(p);r=r.slice(0,a=c),n=l.slice(0)}return r});function p(f){if(s[d]=f,o){const[_,g]=jt(d);return o[d]=g,t(l[d],_)}return t(l[d])}}}function K(i,t){return Yn(()=>i(t||{}))}const Qh=i=>`Stale read from <${i}>.`;function oe(i){const t="fallback"in i&&{fallback:()=>i.fallback};return re(Jh(()=>i.each,i.children,t||void 0))}function Bt(i){const t=i.keyed,e=re(()=>i.when,void 0,void 0),n=t?e:re(e,void 0,{equals:(r,s)=>!r==!s});return re(()=>{const r=n();if(r){const s=i.children;return typeof s=="function"&&s.length>0?Yn(()=>s(t?r:()=>{if(!Yn(n))throw Qh("Show");return e()})):s}return i.fallback},void 0,void 0)}const Co=i=>re(()=>i());function tu(i,t,e){let n=e.length,r=t.length,s=n,a=0,o=0,l=t[r-1].nextSibling,c=null;for(;a<r||o<s;){if(t[a]===e[o]){a++,o++;continue}for(;t[r-1]===e[s-1];)r--,s--;if(r===a){const h=s<n?o?e[o-1].nextSibling:e[s-o]:l;for(;o<s;)i.insertBefore(e[o++],h)}else if(s===o)for(;a<r;)(!c||!c.has(t[a]))&&t[a].remove(),a++;else if(t[a]===e[s-1]&&e[o]===t[r-1]){const h=t[--r].nextSibling;i.insertBefore(e[o++],t[a++].nextSibling),i.insertBefore(e[--s],h),t[r]=e[s]}else{if(!c){c=new Map;let d=o;for(;d<s;)c.set(e[d],d++)}const h=c.get(t[a]);if(h!=null)if(o<h&&h<s){let d=a,p=1,f;for(;++d<r&&d<s&&!((f=c.get(t[d]))==null||f!==h+p);)p++;if(p>h-o){const _=t[a];for(;o<h;)i.insertBefore(e[o++],_)}else i.replaceChild(e[o++],t[a++])}else a++;else t[a++].remove()}}}const Qo="_$DX_DELEGATE";function eu(i,t,e,n={}){let r;return ds(s=>{r=s,t===document?i():y(t,i(),t.firstChild?null:void 0,e)},n.owner),()=>{r(),t.textContent=""}}function st(i,t,e,n){let r;const s=()=>{const o=document.createElement("template");return o.innerHTML=i,o.content.firstChild},a=()=>(r||(r=s())).cloneNode(!0);return a.cloneNode=a,a}function vi(i,t=window.document){const e=t[Qo]||(t[Qo]=new Set);for(let n=0,r=i.length;n<r;n++){const s=i[n];e.has(s)||(e.add(s),t.addEventListener(s,nu))}}function tl(i,t,e){e==null?i.removeAttribute(t):i.setAttribute(t,e)}function xe(i,t){t==null?i.removeAttribute("class"):i.className=t}function Cc(i,t,e,n){Array.isArray(e)?(i[`$$${t}`]=e[0],i[`$$${t}Data`]=e[1]):i[`$$${t}`]=e}function Rc(i,t,e={}){const n=Object.keys(t||{}),r=Object.keys(e);let s,a;for(s=0,a=r.length;s<a;s++){const o=r[s];!o||o==="undefined"||t[o]||(el(i,o,!1),delete e[o])}for(s=0,a=n.length;s<a;s++){const o=n[s],l=!!t[o];!o||o==="undefined"||e[o]===l||!l||(el(i,o,!0),e[o]=l)}return e}function pi(i,t,e){e!=null?i.style.setProperty(t,e):i.style.removeProperty(t)}function Pc(i,t,e){return Yn(()=>i(t,e))}function y(i,t,e,n){if(e!==void 0&&!n&&(n=[]),typeof t!="function")return As(i,t,n,e);zt(r=>As(i,t(),r,e),n)}function el(i,t,e){const n=t.trim().split(/\s+/);for(let r=0,s=n.length;r<s;r++)i.classList.toggle(n[r],e)}function nu(i){let t=i.target;const e=`$$${i.type}`,n=i.target,r=i.currentTarget,s=l=>Object.defineProperty(i,"target",{configurable:!0,value:l}),a=()=>{const l=t[e];if(l&&!t.disabled){const c=t[`${e}Data`];if(c!==void 0?l.call(t,c,i):l.call(t,i),i.cancelBubble)return}return t.host&&typeof t.host!="string"&&!t.host._$host&&t.contains(i.target)&&s(t.host),!0},o=()=>{for(;a()&&(t=t._$host||t.parentNode||t.host););};Object.defineProperty(i,"currentTarget",{configurable:!0,get(){return t||document}});try{if(i.composedPath){const l=i.composedPath();s(l[0]);for(let c=0;c<l.length-2&&(t=l[c],!!a());c++){if(t._$host){t=t._$host,o();break}if(t.parentNode===r)break}}else o();s(n)}finally{i=t=null}}function As(i,t,e,n,r){for(;typeof e=="function";)e=e();if(t===e)return e;const s=typeof t,a=n!==void 0;if(i=a&&e[0]&&e[0].parentNode||i,s==="string"||s==="number"){if(s==="number"&&(t=t.toString(),t===e))return e;if(a){let o=e[0];o&&o.nodeType===3?o.data!==t&&(o.data=t):o=document.createTextNode(t),e=Mi(i,e,n,o)}else e!==""&&typeof e=="string"?e=i.firstChild.data=t:e=i.textContent=t}else if(t==null||s==="boolean")e=Mi(i,e,n);else{if(s==="function")return zt(()=>{let o=t();for(;typeof o=="function";)o=o();e=As(i,o,e,n)}),()=>e;if(Array.isArray(t)){const o=[],l=e&&Array.isArray(e);if(Na(o,t,e,r))return zt(()=>e=As(i,o,e,n,!0)),()=>e;if(o.length===0){if(e=Mi(i,e,n),a)return e}else l?e.length===0?nl(i,o,n):tu(i,e,o):(e&&Mi(i),nl(i,o));e=o}else if(t.nodeType){if(Array.isArray(e)){if(a)return e=Mi(i,e,n,t);Mi(i,e,null,t)}else e==null||e===""||!i.firstChild?i.appendChild(t):i.replaceChild(t,i.firstChild);e=t}}return e}function Na(i,t,e,n){let r=!1;for(let s=0,a=t.length;s<a;s++){let o=t[s],l=e&&e[i.length],c;if(!(o==null||o===!0||o===!1))if((c=typeof o)=="object"&&o.nodeType)i.push(o);else if(Array.isArray(o))r=Na(i,o,l)||r;else if(c==="function")if(n){for(;typeof o=="function";)o=o();r=Na(i,Array.isArray(o)?o:[o],Array.isArray(l)?l:[l])||r}else i.push(o),r=!0;else{const h=String(o);l&&l.nodeType===3&&l.data===h?i.push(l):i.push(document.createTextNode(h))}}return r}function nl(i,t,e=null){for(let n=0,r=t.length;n<r;n++)i.insertBefore(t[n],e)}function Mi(i,t,e,n){if(e===void 0)return i.textContent="";const r=n||document.createTextNode("");if(t.length){let s=!1;for(let a=t.length-1;a>=0;a--){const o=t[a];if(r!==o){const l=o.parentNode===i;!s&&!a?l?i.replaceChild(r,o):i.insertBefore(r,e):l&&o.remove()}else s=!0}}else i.insertBefore(r,e);return[r]}const ws=Symbol("store-raw"),di=Symbol("store-node"),pn=Symbol("store-has"),Lc=Symbol("store-self");function Dc(i){let t=i[qn];if(!t&&(Object.defineProperty(i,qn,{value:t=new Proxy(i,su)}),!Array.isArray(i))){const e=Object.keys(i),n=Object.getOwnPropertyDescriptors(i),r=Object.getPrototypeOf(i),s=r!==null&&i!==null&&typeof i=="object"&&!Array.isArray(i)&&r!==Object.prototype;if(s){const a=Object.getOwnPropertyDescriptors(r);e.push(...Object.keys(a)),Object.assign(n,a)}for(let a=0,o=e.length;a<o;a++){const l=e[a];s&&l==="constructor"||n[l].get&&Object.defineProperty(i,l,{configurable:!0,enumerable:n[l].enumerable,get:n[l].get.bind(t)})}}return t}function Qi(i){let t;return i!=null&&typeof i=="object"&&(i[qn]||!(t=Object.getPrototypeOf(i))||t===Object.prototype||Array.isArray(i))}function tr(i,t=new Set){let e,n,r,s;if(e=i!=null&&i[ws])return e;if(!Qi(i)||t.has(i))return i;if(Array.isArray(i)){Object.isFrozen(i)?i=i.slice(0):t.add(i);for(let a=0,o=i.length;a<o;a++)r=i[a],(n=tr(r,t))!==r&&(i[a]=n)}else{Object.isFrozen(i)?i=Object.assign({},i):t.add(i);const a=Object.keys(i),o=Object.getOwnPropertyDescriptors(i);for(let l=0,c=a.length;l<c;l++)s=a[l],!o[s].get&&(r=i[s],(n=tr(r,t))!==r&&(i[s]=n))}return i}function Cs(i,t){let e=i[t];return e||Object.defineProperty(i,t,{value:e=Object.create(null)}),e}function Rr(i,t,e){if(i[t])return i[t];const[n,r]=jt(e,{equals:!1,internal:!0});return n.$=r,i[t]=n}function iu(i,t){const e=Reflect.getOwnPropertyDescriptor(i,t);return!e||e.get||!e.configurable||t===qn||t===di||(delete e.value,delete e.writable,e.get=()=>i[qn][t]),e}function Ic(i){Ua()&&Rr(Cs(i,di),Lc)()}function ru(i){return Ic(i),Reflect.ownKeys(i)}const su={get(i,t,e){if(t===ws)return i;if(t===qn)return e;if(t===ys)return Ic(i),e;const n=Cs(i,di),r=n[t];let s=r?r():i[t];if(t===di||t===pn||t==="__proto__")return s;if(!r){const a=Object.getOwnPropertyDescriptor(i,t);Ua()&&(typeof s!="function"||Object.prototype.hasOwnProperty.call(i,t))&&!(a&&a.get)&&(s=Rr(n,t,s)())}return Qi(s)?Dc(s):s},has(i,t){return t===ws||t===qn||t===ys||t===di||t===pn||t==="__proto__"?!0:(Ua()&&Rr(Cs(i,pn),t)(),t in i)},set(){return!0},deleteProperty(){return!0},ownKeys:ru,getOwnPropertyDescriptor:iu};function er(i,t,e,n=!1){if(t==="__proto__"||!n&&i[t]===e)return;const r=i[t],s=i.length;e===void 0?(delete i[t],i[pn]&&i[pn][t]&&r!==void 0&&i[pn][t].$()):(i[t]=e,i[pn]&&i[pn][t]&&r===void 0&&i[pn][t].$());let a=Cs(i,di),o;if((o=Rr(a,t,r))&&o.$(()=>e),Array.isArray(i)&&i.length!==s){for(let l=i.length;l<s;l++)(o=a[l])&&o.$();(o=Rr(a,"length",s))&&o.$(i.length)}(o=a[Lc])&&o.$()}function Uc(i,t){const e=Object.keys(t);for(let n=0;n<e.length;n+=1){const r=e[n];Nc(r)||er(i,r,t[r])}}function Nc(i){return i==="__proto__"||i==="constructor"||i==="prototype"}function au(i,t){if(typeof t=="function"&&(t=t(i)),t=tr(t),Array.isArray(t)){if(i===t)return;let e=0,n=t.length;for(;e<n;e++){const r=t[e];i[e]!==r&&er(i,e,r)}er(i,"length",n)}else Uc(i,t)}function br(i,t,e=[]){let n,r=i;if(t.length>1){n=t.shift();const a=typeof n,o=Array.isArray(i);if(a==="string"&&(n==="__proto__"||t.length>1&&Nc(n)))return;if(Array.isArray(n)){for(let l=0;l<n.length;l++)br(i,[n[l]].concat(t),e);return}else if(o&&a==="function"){for(let l=0;l<i.length;l++)n(i[l],l)&&br(i,[l].concat(t),e);return}else if(o&&a==="object"){const{from:l=0,to:c=i.length-1,by:h=1}=n;for(let d=l;d<=c;d+=h)br(i,[d].concat(t),e);return}else if(t.length>1){br(i[n],t,[n].concat(e));return}r=i[n],e=[n].concat(e)}let s=t[0];typeof s=="function"&&(s=s(r,e),s===r)||n===void 0&&s==null||(s=tr(s),n===void 0||Qi(r)&&Qi(s)&&!Array.isArray(s)?Uc(r,s):er(i,n,s))}function ou(...[i,t]){const e=tr(i||{}),n=Array.isArray(e),r=Dc(e);function s(...a){Xh(()=>{n&&a.length===1?au(e,a[0]):br(e,a)})}return[r,s]}const Rs=new WeakMap,Fc={get(i,t){if(t===ws)return i;const e=i[t];if(t===qn||t===ys||t===di||t===pn||t==="__proto__")return e;let n;return Qi(e)?Rs.get(e)||(Rs.set(e,n=new Proxy(e,Fc)),n):e},set(i,t,e){return er(i,t,tr(e)),!0},deleteProperty(i,t){return er(i,t,void 0,!0),!0}};function dr(i){return t=>{if(Qi(t)){let e;(e=Rs.get(t))||Rs.set(t,e=new Proxy(t,Fc)),i(e)}return t}}function $s(i="id"){return`${i}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`}function sn(){return new Date().toISOString().slice(0,10)}function lu(){return new Date().toTimeString().slice(0,5)}function cu(i,t){const e=new Date(t).getTime()-new Date(i).getTime();return Math.round(e/864e5)}function nr(i,t){return t==="released"?!1:cu(sn(),i)<0}function vn(i,t){return t?(i/t*100).toFixed(1):"0.0"}function hu(i,t=720,e=.72){return new Promise((n,r)=>{const s=new FileReader;s.onerror=()=>r(new Error("文件读取失败")),s.onload=()=>{const a=new Image;a.onerror=()=>r(new Error("图片解析失败")),a.onload=()=>{const o=Math.min(1,t/Math.max(a.width,a.height)),l=Math.round(a.width*o),c=Math.round(a.height*o),h=document.createElement("canvas");h.width=l,h.height=c,h.getContext("2d").drawImage(a,0,0,l,c),n(h.toDataURL("image/jpeg",e))},a.src=s.result},s.readAsDataURL(i)})}function il(i){const t=i==null?"":String(i);return/[",\n]/.test(t)?`"${t.replace(/"/g,'""')}"`:t}function Oc(i,t,e){const n=[t.map(il).join(","),...e.map(o=>o.map(il).join(","))],r=new Blob(["\uFEFF"+n.join(`\r
`)],{type:"text/csv;charset=utf-8"}),s=URL.createObjectURL(r),a=document.createElement("a");a.href=s,a.download=i,a.click(),setTimeout(()=>URL.revokeObjectURL(s),1e3)}function Ps(i){return i?i.slice(0,10):"—"}const Bc="mold-tracking-v1",Ls=3e5,uu=.1;function Fr(i,t){const e=document.createElement("canvas");e.width=360,e.height=240;const n=e.getContext("2d");return n.fillStyle="#2b2f36",n.fillRect(0,0,360,240),n.fillStyle=t,n.fillRect(28,28,304,160),n.fillStyle="rgba(0,0,0,.35)",n.fillRect(28,150,304,38),n.fillStyle="#fff",n.font="bold 20px sans-serif",n.fillText(i,42,176),n.font="13px sans-serif",n.fillText("试模缺陷留样（演示数据）",42,216),e.toDataURL("image/jpeg",.7)}function $c(){const i=[{id:"c1",name:"星辉潮玩",account:"xh"},{id:"c2",name:"次元造物",account:"cy"}],t=[{id:"s1",code:"XH-2026-018",name:"机甲少女·零式",customerId:"c1"},{id:"s2",code:"XH-2026-021",name:"森林精灵盲盒",customerId:"c1"},{id:"s3",code:"CY-2026-007",name:"巨兽哥莫拉",customerId:"c2"}],e=[{id:"p1",styleId:"s1",name:"头部前壳",color:"#f2d7b6",shape:"sphere",pos:[0,2.15,.18],rot:[0,0,0],scale:[.62,.55,.5],status:"mold_ready",repairCount:1,moldId:"o1"},{id:"p2",styleId:"s1",name:"头部后壳",color:"#e8c8a5",shape:"sphere",pos:[0,2.15,-.22],rot:[0,Math.PI,0],scale:[.6,.53,.45],status:"mold_ready",repairCount:0,moldId:"o2"},{id:"p3",styleId:"s1",name:"躯干主壳",color:"#d94f4f",shape:"box",pos:[0,1.15,0],rot:[0,0,0],scale:[1.05,1.25,.62],status:"trial_pending",repairCount:2,moldId:"o3"},{id:"p4",styleId:"s1",name:"左臂护甲",color:"#3d6fb4",shape:"capsule",pos:[-.95,1.2,0],rot:[0,0,.25],scale:[.28,.85,.28],status:"repairing",repairCount:3,moldId:"o4"},{id:"p5",styleId:"s1",name:"右臂护甲",color:"#3d6fb4",shape:"capsule",pos:[.95,1.2,0],rot:[0,0,-.25],scale:[.28,.85,.28],status:"mold_ready",repairCount:0,moldId:"o5"},{id:"p6",styleId:"s1",name:"左腿件",color:"#5a5f6e",shape:"cylinder",pos:[-.38,0,0],rot:[0,0,0],scale:[.32,.95,.32],status:"mold_ready",repairCount:1,moldId:"o6"},{id:"p7",styleId:"s1",name:"右腿件",color:"#5a5f6e",shape:"cylinder",pos:[.38,0,0],rot:[0,0,0],scale:[.32,.95,.32],status:"pending_mold",repairCount:0},{id:"p8",styleId:"s1",name:"背包环",color:"#c9a227",shape:"torus",pos:[0,1.35,-.55],rot:[Math.PI/2,0,0],scale:[.5,.5,.5],status:"mold_ready",repairCount:0,moldId:"o8"},{id:"p9",styleId:"s2",name:"精灵身体",color:"#7fcf8e",shape:"sphere",pos:[0,.9,0],rot:[0,0,0],scale:[.7,.85,.6],status:"mold_ready",repairCount:0,moldId:"o9"},{id:"p10",styleId:"s2",name:"底座",color:"#8a6f4d",shape:"cylinder",pos:[0,-.15,0],rot:[0,0,0],scale:[.9,.18,.9],status:"mold_ready",repairCount:0,moldId:"o10"},{id:"p11",styleId:"s3",name:"哥莫拉躯干",color:"#4a5d4a",shape:"box",pos:[0,1.1,0],rot:[0,0,0],scale:[1.5,1.1,.85],status:"mold_ready",repairCount:1,moldId:"o11"},{id:"p12",styleId:"s3",name:"尾部组件",color:"#3a4d3a",shape:"capsule",pos:[-1.4,1.2,-.3],rot:[0,0,1.1],scale:[.3,1.1,.3],status:"trial_pending",repairCount:1,moldId:"o12"}],n=(h,d,p,f,_,g,m,u,A,T="")=>({id:h,no:d,partId:p,styleId:f,moldNo:_,cavities:g,material:m,colorCode:u,lifeTotal:Ls,lifeUsed:A,createdAt:"2026-09-12",remark:T}),r=[n("o1","MO-260901","p1","s1","M-A018-01",4,"ABS","#f2d7b6",86e3),n("o2","MO-260902","p2","s1","M-A018-02",4,"ABS","#e8c8a5",79200),n("o3","MO-260903","p3","s1","M-A018-03",2,"PC+ABS","#d94f4f",12e3,"试模缩水，需调浇口"),n("o4","MO-260904","p4","s1","M-A018-04",2,"ABS","#3d6fb4",9500,"飞边反复，配合面修模"),n("o5","MO-260905","p5","s1","M-A018-05",2,"ABS","#3d6fb4",28e4,"镀层磨损，计划开新模替代"),n("o6","MO-260906","p6","s1","M-A018-06",4,"POM","#5a5f6e",134e3),n("o8","MO-260908","p8","s1","M-A018-08",6,"ABS","#c9a227",45600),n("o9","MO-260909","p9","s2","M-B021-01",8,"PVC","#7fcf8e",21e4),n("o10","MO-260910","p10","s2","M-B021-02",2,"PP","#8a6f4d",168e3),n("o11","MO-260911","p11","s3","M-C007-01",1,"ABS","#4a5d4a",58e3),n("o12","MO-260912","p12","s3","M-C007-02",2,"ABS","#3a4d3a",8e3)],s=[{id:"m1",no:"IM-01",name:"1号注塑机",tonnage:120},{id:"m2",no:"IM-02",name:"2号注塑机",tonnage:160},{id:"m3",no:"IM-03",name:"3号注塑机",tonnage:200},{id:"m4",no:"IM-04",name:"4号注塑机",tonnage:260},{id:"m5",no:"IM-05",name:"5号注塑机",tonnage:380},{id:"m6",no:"IM-06",name:"6号注塑机",tonnage:500}],a=sn(),o=[{id:"b1",no:"BN-261101",orderId:"o1",partId:"p1",styleId:"s1",machineId:"m1",qty:2e4,goodQty:18400,defectQty:320,status:"injecting",createdAt:"2026-11-10",scheduledAt:a,dueDate:"2026-11-18"},{id:"b2",no:"BN-261102",orderId:"o2",partId:"p2",styleId:"s1",machineId:"m2",qty:16e3,goodQty:15600,defectQty:180,status:"pending_inspect",createdAt:"2026-11-08",scheduledAt:"2026-11-11",dueDate:"2026-11-14"},{id:"b3",no:"BN-261103",orderId:"o9",partId:"p9",styleId:"s2",machineId:"m3",qty:4e4,goodQty:39200,defectQty:410,status:"released",createdAt:"2026-11-01",scheduledAt:"2026-11-03",dueDate:"2026-11-10",inspectionNote:"抽检 AQL 2.5，合格放行"},{id:"b4",no:"BN-261104",orderId:"o11",partId:"p11",styleId:"s3",qty:5e3,goodQty:0,defectQty:0,status:"pending_schedule",createdAt:"2026-11-12",dueDate:"2026-11-10"},{id:"b5",no:"BN-261105",orderId:"o5",partId:"p5",styleId:"s1",qty:8e3,goodQty:0,defectQty:0,status:"pending_schedule",createdAt:"2026-11-13",dueDate:"2026-11-20"},{id:"b6",no:"BN-261106",orderId:"o6",partId:"p6",styleId:"s1",machineId:"m4",qty:12e3,goodQty:9800,defectQty:760,status:"rework",createdAt:"2026-11-06",scheduledAt:"2026-11-09",dueDate:"2026-11-13",inspectionNote:"顶白超标，返工挑拣后复检"}],l=[{id:"sl1",date:a,machineId:"m1",batchId:"b1",shots:1200,pieces:4800,defect:96,time:"08:30"},{id:"sl2",date:a,machineId:"m1",batchId:"b1",shots:1450,pieces:5800,defect:87,time:"11:20"},{id:"sl3",date:a,machineId:"m2",batchId:"b2",shots:900,pieces:3600,defect:40,time:"09:05"},{id:"sl4",date:a,machineId:"m4",batchId:"b6",shots:1100,pieces:4400,defect:310,time:"10:15"},{id:"sl5",date:a,machineId:"m3",batchId:"b3",shots:600,pieces:4800,defect:22,time:"07:50"}],c=[{id:"t1",partId:"p1",round:1,date:"2026-09-20",passed:!1,operator:"周工艺",defects:[{partId:"p1",type:"缩水",desc:"头顶正面靠近浇口处缩痕明显",photo:Fr("头部前壳·缩水","#b88f6a")}],repairPlan:"浇口截面加大 0.3mm，保压压力上调 15bar，模温降低 5℃。"},{id:"t2",partId:"p1",round:2,date:"2026-09-25",passed:!0,operator:"周工艺",defects:[{partId:"p1",type:"飞边",desc:"分型面轻微飞边，已在公差边缘",photo:Fr("头部前壳·飞边","#c9a381")}]},{id:"t3",partId:"p4",round:1,date:"2026-10-02",passed:!1,operator:"李工艺",defects:[{partId:"p4",type:"飞边",desc:"护甲配合面周圈飞边 0.2mm",photo:Fr("左臂护甲·飞边","#6f8fc4")},{partId:"p4",type:"顶白",desc:"顶针位顶白，脱模阻力偏大",photo:Fr("左臂护甲·顶白","#8aa6cf")}],repairPlan:"配合面减胶 0.05mm，顶针区域加大脱模斜度至 1.5°，抛光型腔。"}];return{role:"engineer",currentCustomerId:null,customers:i,styles:t,parts:e,orders:r,trials:c,batches:o,machines:s,shotLogs:l}}function du(){try{const i=localStorage.getItem(Bc);if(i)return JSON.parse(i)}catch{}return $c()}const[Be,Nn]=ou(du());let rl;wr(()=>{JSON.stringify(Be),clearTimeout(rl),rl=setTimeout(()=>{try{localStorage.setItem(Bc,JSON.stringify(Be))}catch{alert("本地存储已满，请导出数据后清理旧缺陷照片")}},200)});const kt=Be;function ke(i){return Be.orders.find(t=>t.partId===i)}function Re(i){return Be.parts.find(t=>t.id===i)}function je(i){return Be.styles.find(t=>t.id===i)}function In(i){return Math.max(0,i.lifeTotal-i.lifeUsed)}function Ze(i){return In(i)/i.lifeTotal}function Ye(i){return Ze(i)<uu}function Wi(i){return Be.trials.filter(t=>t.partId===i).sort((t,e)=>t.round-e.round)}function Xi(i){const t=i.goodQty+i.defectQty;return t?i.defectQty/t:0}function Ks(i,t=null){Nn({role:i,currentCustomerId:i==="customer"?t:null})}function fu(){confirm("确定恢复全套演示数据？当前录入内容将被清空。")&&Nn($c())}function pu(i){const t=Re(i.partId);if(!t)return{ok:!1,msg:"分件不存在"};if(Be.orders.some(n=>n.moldNo===i.moldNo.trim()))return{ok:!1,msg:"模号已存在，模号必须唯一"};const e={id:$s("o"),no:`MO-${sn().slice(2).replace(/-/g,"")}-${String(Be.orders.length+1).padStart(2,"0")}`,partId:i.partId,styleId:t.styleId,moldNo:i.moldNo.trim(),cavities:i.cavities,material:i.material,colorCode:i.colorCode,lifeTotal:i.lifeTotal||Ls,lifeUsed:0,createdAt:sn(),remark:i.remark};return Nn(dr(n=>{n.orders.push(e);const r=n.parts.find(s=>s.id===i.partId);r.moldId=e.id,r.orderId=e.id,r.status="trial_pending"})),{ok:!0}}function mu(i,t){var r;if(!t.defects.length)return{ok:!1,msg:"至少登记一条缺陷记录"};if(t.defects.some(s=>!s.photo))return{ok:!1,msg:"每条缺陷都必须上传缺陷照片，否则不能提交"};if(!t.passed&&!((r=t.repairPlan)!=null&&r.trim()))return{ok:!1,msg:"试模不通过必须填写修模方案"};const e=Wi(i).length+1,n={id:$s("t"),partId:i,round:e,date:sn(),passed:t.passed,defects:t.defects,repairPlan:t.passed?void 0:t.repairPlan,operator:t.operator};return Nn(dr(s=>{s.trials.push(n);const a=s.parts.find(o=>o.id===i);t.passed?a.status="mold_ready":(a.status="repairing",a.repairCount+=1)})),{ok:!0}}function _u(i){Nn("parts",t=>t.id===i,"status","trial_pending")}function gu(i){const t=Be.orders.find(n=>n.id===i.orderId);if(!t)return{ok:!1,msg:"请选择开模单"};const e={id:$s("b"),no:`BN-${sn().slice(2).replace(/-/g,"")}-${String(Be.batches.length+1).padStart(2,"0")}`,orderId:t.id,partId:t.partId,styleId:t.styleId,qty:i.qty,goodQty:0,defectQty:0,status:"pending_schedule",createdAt:sn(),dueDate:i.dueDate};return Nn(dr(n=>{n.batches.push(e)})),{ok:!0}}function vu(i,t){const e=Be.batches.find(r=>r.id===i);if(!e)return{ok:!1,msg:"批次不存在"};const n=Be.orders.find(r=>r.id===e.orderId);return Ye(n)?{ok:!1,msg:`模具 ${n.moldNo} 剩余寿命仅 ${(Ze(n)*100).toFixed(1)}%（${In(n).toLocaleString()} 模次），低于 10% 红线，已拦截排产，请先开新模。`}:(Nn(dr(r=>{const s=r.batches.find(a=>a.id===i);s.machineId=t,s.status="injecting",s.scheduledAt=sn()})),{ok:!0})}function xu(i,t,e){const n=Be.batches.find(a=>a.id===i);if(!n||n.status!=="injecting")return{ok:!1,msg:"只有注塑中的批次可以登记打模"};const r=Be.orders.find(a=>a.id===n.orderId),s=t*r.cavities;return e>s?{ok:!1,msg:"不良件数不能超过本次出件数"}:t>In(r)?{ok:!1,msg:`打模数超过模具剩余寿命（${In(r)} 模次）`}:(Nn(dr(a=>{const o=a.orders.find(c=>c.id===n.orderId);o.lifeUsed+=t;const l=a.batches.find(c=>c.id===i);l.goodQty+=s-e,l.defectQty+=e,a.shotLogs.push({id:$s("sl"),date:sn(),machineId:l.machineId,batchId:i,shots:t,pieces:s,defect:e,time:lu()})})),{ok:!0})}function Zs(i,t,e){Nn(dr(n=>{const r=n.batches.find(s=>s.id===i);r.status=t,e!==void 0&&(r.inspectionNote=e)}))}var Su=st("<div class=modal-foot>"),yu=st("<div class=modal-mask><div><div class=modal-head><h3></h3><button class=x>×</button></div><div class=modal-body>"),zc=st("<span>"),Mu=st('<div class="flex items-center gap-2"><div class="progress flex-1"><i></i></div><span style=font-size:12px;white-space:nowrap>余 <!>%'),bu=st("<div style=position:fixed;z-index:99;top:70px;right:24px;max-width:420px><div><span></span><span>"),Eu=st("<div class=empty>📭 ");function fi(i){return(()=>{var t=yu(),e=t.firstChild,n=e.firstChild,r=n.firstChild,s=r.nextSibling,a=n.nextSibling;return t.$$click=o=>o.target===o.currentTarget&&i.onClose(),y(r,()=>i.title),Cc(s,"click",i.onClose),y(a,()=>i.children),y(e,K(Bt,{get when(){return i.footer},get children(){var o=Su();return y(o,()=>i.footer),o}}),null),zt(()=>xe(e,`modal${i.wide?" wide":""}`)),t})()}const Tu={pending_mold:{label:"待开模",cls:"gray"},trial_pending:{label:"待试模",cls:"amber"},repairing:{label:"修模中",cls:"red"},mold_ready:{label:"模具合格",cls:"green"},scrapped:{label:"已报废",cls:"gray"}};function qi(i){const t=Tu[i.status];return(()=>{var e=zc();return y(e,()=>t.label),zt(()=>xe(e,`badge ${t.cls}`)),e})()}const Au={pending_schedule:{label:"待排产",cls:"gray"},injecting:{label:"注塑中",cls:"blue"},pending_inspect:{label:"待检验",cls:"amber"},rework:{label:"返工",cls:"red"},released:{label:"放行",cls:"green"}};function Yi(i){const t=Au[i.status];return(()=>{var e=zc();return y(e,()=>t.label),zt(()=>xe(e,`badge ${t.cls}`)),e})()}function ir(i){const t=1-i.pct,e=i.pct<.1?"danger":i.pct<.25?"warn":"ok";return(()=>{var n=Mu(),r=n.firstChild,s=r.firstChild,a=r.nextSibling,o=a.firstChild,l=o.nextSibling;return l.nextSibling,xe(s,e),pi(s,"width",`${t*100}%`),y(a,()=>(i.pct*100).toFixed(1),l),zt(()=>xe(a,i.pct<.1?"err":"muted")),n})()}function zs(){const[i,t]=jt(null);let e;return{flash:(s,a)=>{t({type:s,text:a}),clearTimeout(e),e=setTimeout(()=>t(null),4200)},FlashBox:()=>K(Bt,{get when(){return i()},get children(){var s=bu(),a=s.firstChild,o=a.firstChild,l=o.nextSibling;return y(o,(()=>{var c=Co(()=>i().type==="ok");return()=>c()?"✅":i().type==="warn"?"⚠️":"⛔"})()),y(l,()=>i().text),zt(()=>xe(a,i().type==="ok"?"toast-ok":i().type==="warn"?"toast-warn":"toast-danger")),s}})}}function rn(i){return(()=>{var t=Eu();return t.firstChild,y(t,()=>i.text,null),t})()}vi(["click"]);var wu=st('<div class="toast-danger mb-2"><span style=font-size:18px>⛔</span><div><b>排产拦截：<!> 副模具剩余寿命低于 10% 红线</b><div class="mt-2 flex flex-wrap gap-3">'),Cu=st("<table class=tbl><thead><tr><th>模号</th><th>分件</th><th style=width:190px>寿命进度</th><th>已用 / 总额</th></tr></thead><tbody>"),Ru=st("<table class=tbl><thead><tr><th>批次号</th><th>分件</th><th>状态</th><th>交期</th></tr></thead><tbody>"),Pu=st("<table class=tbl><thead><tr><th>批次</th><th class=num>良品</th><th class=num>不良</th><th class=num>不良率</th></tr></thead><tbody>"),Lu=st('<div class="flex-col gap-4"><div class="grid grid-4"><div class="card stat accent"><div class=v><small> 副模具</small></div><div class=k>开模单 / 模号台账</div></div><div class="card stat warn"><div class=v><small> 个分件未量产</small></div><div class=k>待开模 <!> · 待试模 <!> · 修模中 </div></div><div class="card stat"><div class=v><small> 个批次</small></div><div class=k>注塑中 <!> · 待检 <!> · 超期 </div></div><div class="card stat danger"><div class=v><small> %</small></div><div class=k>累计综合不良率（不良 <!> / 出件 <!>）</div></div></div><div class="grid grid-2"><div class=card><h3>⚠️ 寿命预警（剩余 &lt; 25%）</h3></div><div class=card><h3>⏰ 超期未放行批次</h3></div></div><div class="grid grid-2"><div class=card><h3>🔧 修模中的分件（修模次数累计入档）</h3></div><div class=card><h3>📈 注塑中批次实时质量'),Du=st('<span class="chip chip-danger">（<!>）仅剩 <!> 模次 / <!>% → 请开新模'),Iu=st("<tr><td><b></b></td><td><div class=hint></div></td><td></td><td class=num> / "),Uu=st('<div class="badge red mt-2">已拦截'),Nu=st('<tr><td><b></b></td><td></td><td></td><td><span class="badge red">'),Fu=st('<div class="flex items-center gap-3 mb-3"style="border-bottom:1px solid #eef1f5;padding-bottom:10px"><span class=big-num></span><div class=flex-1><b></b><div class=hint> · '),Ou=st("<tr><td><b></b><div class=hint></div></td><td class=num></td><td class=num></td><td class=num><span style=font-weight:700px>%");function Bu(){const i=()=>kt.orders.filter(Ye),t=()=>kt.orders.filter(o=>!Ye(o)&&Ze(o)<.25),e=()=>kt.batches.filter(o=>nr(o.dueDate,o.status)),n=()=>kt.batches.filter(o=>o.status==="injecting"),r=()=>kt.batches.reduce((o,l)=>o+l.defectQty,0),s=()=>kt.batches.reduce((o,l)=>o+l.goodQty+l.defectQty,0),a=()=>kt.parts.filter(o=>o.status==="repairing");return(()=>{var o=Lu(),l=o.firstChild,c=l.firstChild,h=c.firstChild,d=h.firstChild,p=c.nextSibling,f=p.firstChild,_=f.firstChild,g=f.nextSibling,m=g.firstChild,u=m.nextSibling,A=u.nextSibling,T=A.nextSibling;T.nextSibling;var M=p.nextSibling,L=M.firstChild,R=L.firstChild,C=L.nextSibling,I=C.firstChild,b=I.nextSibling,x=b.nextSibling,P=x.nextSibling;P.nextSibling;var G=M.nextSibling,B=G.firstChild,Z=B.firstChild,rt=B.nextSibling,W=rt.firstChild,at=W.nextSibling,V=at.nextSibling,_t=V.nextSibling;_t.nextSibling;var tt=l.nextSibling,xt=tt.firstChild;xt.firstChild;var Nt=xt.nextSibling;Nt.firstChild;var bt=tt.nextSibling,q=bt.firstChild;q.firstChild;var H=q.nextSibling;return H.firstChild,y(h,()=>kt.orders.length,d),y(f,()=>kt.parts.filter(X=>X.status!=="mold_ready"&&X.status!=="scrapped").length,_),y(g,()=>kt.parts.filter(X=>X.status==="pending_mold").length,u),y(g,()=>kt.parts.filter(X=>X.status==="trial_pending").length,T),y(g,()=>a().length,null),y(L,()=>kt.batches.length,R),y(C,()=>n().length,b),y(C,()=>kt.batches.filter(X=>X.status==="pending_inspect").length,P),y(C,()=>e().length,null),y(B,()=>vn(r(),s()),Z),y(rt,()=>r().toLocaleString(),at),y(rt,()=>s().toLocaleString(),_t),y(o,K(Bt,{get when(){return i().length},get children(){var X=wu(),O=X.firstChild,D=O.nextSibling,U=D.firstChild,Q=U.firstChild,ot=Q.nextSibling;ot.nextSibling;var ut=U.nextSibling;return y(U,()=>i().length,ot),y(ut,K(oe,{get each(){return i()},children:dt=>(()=>{var w=Du(),Et=w.firstChild,vt=Et.nextSibling,mt=vt.nextSibling,ct=mt.nextSibling,St=ct.nextSibling,pt=St.nextSibling;return pt.nextSibling,y(w,()=>dt.moldNo,Et),y(w,()=>{var E;return(E=Re(dt.partId))==null?void 0:E.name},vt),y(w,()=>In(dt).toLocaleString(),ct),y(w,()=>(Ze(dt)*100).toFixed(1),pt),w})()})),X}}),tt),y(xt,K(Bt,{get when(){return i().length+t().length},get fallback(){return K(rn,{text:"暂无寿命预警"})},get children(){var X=Cu(),O=X.firstChild,D=O.firstChild,U=D.firstChild,Q=U.nextSibling;Q.nextSibling;var ot=O.nextSibling;return y(ot,K(oe,{get each(){return[...i(),...t()]},children:ut=>(()=>{var dt=Iu(),w=dt.firstChild,Et=w.firstChild,vt=w.nextSibling,mt=vt.firstChild,ct=vt.nextSibling,St=ct.nextSibling,pt=St.firstChild;return y(Et,()=>ut.moldNo),y(w,(()=>{var E=Co(()=>!!Ye(ut));return()=>E()&&Uu()})(),null),y(vt,()=>{var E;return(E=Re(ut.partId))==null?void 0:E.name},mt),y(mt,()=>{var E;return(E=je(ut.styleId))==null?void 0:E.code}),y(ct,K(ir,{get pct(){return Ze(ut)}})),y(St,()=>ut.lifeUsed.toLocaleString(),pt),y(St,()=>ut.lifeTotal.toLocaleString(),null),dt})()})),X}}),null),y(Nt,K(Bt,{get when(){return e().length},get fallback(){return K(rn,{text:"无超期批次"})},get children(){var X=Ru(),O=X.firstChild,D=O.nextSibling;return y(D,K(oe,{get each(){return e()},children:U=>(()=>{var Q=Nu(),ot=Q.firstChild,ut=ot.firstChild,dt=ot.nextSibling,w=dt.nextSibling,Et=w.nextSibling,vt=Et.firstChild;return y(ut,()=>U.no),y(dt,()=>{var mt;return(mt=Re(U.partId))==null?void 0:mt.name}),y(w,K(Yi,{get status(){return U.status}})),y(vt,()=>U.dueDate),Q})()})),X}}),null),y(q,K(Bt,{get when(){return a().length},get fallback(){return K(rn,{text:"当前无修模任务"})},get children(){return K(oe,{get each(){return a()},children:X=>(()=>{var O=Fu(),D=O.firstChild,U=D.nextSibling,Q=U.firstChild,ot=Q.nextSibling,ut=ot.firstChild;return y(D,()=>X.repairCount),y(Q,()=>X.name),y(ot,()=>{var dt;return(dt=je(X.styleId))==null?void 0:dt.name},ut),y(ot,()=>{var dt;return(dt=ke(X.id))==null?void 0:dt.moldNo},null),y(O,K(qi,{get status(){return X.status}}),null),zt(()=>D.classList.toggle("err",X.repairCount>=3)),O})()})}}),null),y(H,K(Bt,{get when(){return n().length},get fallback(){return K(rn,{text:"暂无注塑中的批次"})},get children(){var X=Pu(),O=X.firstChild,D=O.nextSibling;return y(D,K(oe,{get each(){return n()},children:U=>(()=>{var Q=Ou(),ot=Q.firstChild,ut=ot.firstChild,dt=ut.nextSibling,w=ot.nextSibling,Et=w.nextSibling,vt=Et.nextSibling,mt=vt.firstChild,ct=mt.firstChild;return y(ut,()=>U.no),y(dt,()=>{var St;return(St=Re(U.partId))==null?void 0:St.name}),y(w,()=>U.goodQty.toLocaleString()),y(Et,()=>U.defectQty.toLocaleString()),y(mt,()=>vn(U.defectQty,U.goodQty+U.defectQty),ct),zt(()=>xe(mt,Xi(U)>.05?"err":"")),Q})()})),X}}),null),o})()}/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Ro="172",ji={ROTATE:0,DOLLY:1,PAN:2},Hi={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},$u=0,sl=1,zu=2,kc=1,Hc=2,wn=3,jn=0,He=1,Cn=2,Gn=0,Ki=1,al=2,ol=3,ll=4,ku=5,li=100,Hu=101,Vu=102,Gu=103,Wu=104,Xu=200,qu=201,Yu=202,ju=203,Fa=204,Oa=205,Ku=206,Zu=207,Ju=208,Qu=209,td=210,ed=211,nd=212,id=213,rd=214,Ba=0,$a=1,za=2,rr=3,ka=4,Ha=5,Va=6,Ga=7,Vc=0,sd=1,ad=2,Wn=0,od=1,ld=2,cd=3,hd=4,ud=5,dd=6,fd=7,Gc=300,sr=301,ar=302,Wa=303,Xa=304,ks=306,qa=1e3,hi=1001,Ya=1002,dn=1003,pd=1004,Or=1005,gn=1006,Js=1007,ui=1008,Un=1009,Wc=1010,Xc=1011,Pr=1012,Po=1013,mi=1014,Rn=1015,Dr=1016,Lo=1017,Do=1018,or=1020,qc=35902,Yc=1021,jc=1022,un=1023,Kc=1024,Zc=1025,Zi=1026,lr=1027,Jc=1028,Io=1029,Qc=1030,Uo=1031,No=1033,fs=33776,ps=33777,ms=33778,_s=33779,ja=35840,Ka=35841,Za=35842,Ja=35843,Qa=36196,to=37492,eo=37496,no=37808,io=37809,ro=37810,so=37811,ao=37812,oo=37813,lo=37814,co=37815,ho=37816,uo=37817,fo=37818,po=37819,mo=37820,_o=37821,gs=36492,go=36494,vo=36495,th=36283,xo=36284,So=36285,yo=36286,md=3200,_d=3201,eh=0,gd=1,Vn="",en="srgb",cr="srgb-linear",Ds="linear",ce="srgb",bi=7680,cl=519,vd=512,xd=513,Sd=514,nh=515,yd=516,Md=517,bd=518,Ed=519,Mo=35044,hl="300 es",Pn=2e3,Is=2001;class xi{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const n=this._listeners;return n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const r=this._listeners[t];if(r!==void 0){const s=r.indexOf(e);s!==-1&&r.splice(s,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const n=this._listeners[t.type];if(n!==void 0){t.target=this;const r=n.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,t);t.target=null}}}const Le=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],vs=Math.PI/180,bo=180/Math.PI;function Xn(){const i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Le[i&255]+Le[i>>8&255]+Le[i>>16&255]+Le[i>>24&255]+"-"+Le[t&255]+Le[t>>8&255]+"-"+Le[t>>16&15|64]+Le[t>>24&255]+"-"+Le[e&63|128]+Le[e>>8&255]+"-"+Le[e>>16&255]+Le[e>>24&255]+Le[n&255]+Le[n>>8&255]+Le[n>>16&255]+Le[n>>24&255]).toLowerCase()}function Jt(i,t,e){return Math.max(t,Math.min(e,i))}function Td(i,t){return(i%t+t)%t}function Qs(i,t,e){return(1-e)*i+e*t}function _n(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function he(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const Ad={DEG2RAD:vs};class Rt{constructor(t=0,e=0){Rt.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6],this.y=r[1]*e+r[4]*n+r[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Jt(this.x,t.x,e.x),this.y=Jt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Jt(this.x,t,e),this.y=Jt(this.y,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Jt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Jt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),r=Math.sin(e),s=this.x-t.x,a=this.y-t.y;return this.x=s*n-a*r+t.x,this.y=s*r+a*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Kt{constructor(t,e,n,r,s,a,o,l,c){Kt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,r,s,a,o,l,c)}set(t,e,n,r,s,a,o,l,c){const h=this.elements;return h[0]=t,h[1]=r,h[2]=o,h[3]=e,h[4]=s,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,r=e.elements,s=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],d=n[7],p=n[2],f=n[5],_=n[8],g=r[0],m=r[3],u=r[6],A=r[1],T=r[4],M=r[7],L=r[2],R=r[5],C=r[8];return s[0]=a*g+o*A+l*L,s[3]=a*m+o*T+l*R,s[6]=a*u+o*M+l*C,s[1]=c*g+h*A+d*L,s[4]=c*m+h*T+d*R,s[7]=c*u+h*M+d*C,s[2]=p*g+f*A+_*L,s[5]=p*m+f*T+_*R,s[8]=p*u+f*M+_*C,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],r=t[2],s=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8];return e*a*h-e*o*c-n*s*h+n*o*l+r*s*c-r*a*l}invert(){const t=this.elements,e=t[0],n=t[1],r=t[2],s=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],d=h*a-o*c,p=o*l-h*s,f=c*s-a*l,_=e*d+n*p+r*f;if(_===0)return this.set(0,0,0,0,0,0,0,0,0);const g=1/_;return t[0]=d*g,t[1]=(r*c-h*n)*g,t[2]=(o*n-r*a)*g,t[3]=p*g,t[4]=(h*e-r*l)*g,t[5]=(r*s-o*e)*g,t[6]=f*g,t[7]=(n*l-c*e)*g,t[8]=(a*e-n*s)*g,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,r,s,a,o){const l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*a+c*o)+a+t,-r*c,r*l,-r*(-c*a+l*o)+o+e,0,0,1),this}scale(t,e){return this.premultiply(ta.makeScale(t,e)),this}rotate(t){return this.premultiply(ta.makeRotation(-t)),this}translate(t,e){return this.premultiply(ta.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let r=0;r<9;r++)if(e[r]!==n[r])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const ta=new Kt;function ih(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function Us(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function wd(){const i=Us("canvas");return i.style.display="block",i}const ul={};function ki(i){i in ul||(ul[i]=!0,console.warn(i))}function Cd(i,t,e){return new Promise(function(n,r){function s(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:r();break;case i.TIMEOUT_EXPIRED:setTimeout(s,e);break;default:n()}}setTimeout(s,e)})}function Rd(i){const t=i.elements;t[2]=.5*t[2]+.5*t[3],t[6]=.5*t[6]+.5*t[7],t[10]=.5*t[10]+.5*t[11],t[14]=.5*t[14]+.5*t[15]}function Pd(i){const t=i.elements;t[11]===-1?(t[10]=-t[10]-1,t[14]=-t[14]):(t[10]=-t[10],t[14]=-t[14]+1)}const dl=new Kt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),fl=new Kt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Ld(){const i={enabled:!0,workingColorSpace:cr,spaces:{},convert:function(r,s,a){return this.enabled===!1||s===a||!s||!a||(this.spaces[s].transfer===ce&&(r.r=Dn(r.r),r.g=Dn(r.g),r.b=Dn(r.b)),this.spaces[s].primaries!==this.spaces[a].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===ce&&(r.r=Ji(r.r),r.g=Ji(r.g),r.b=Ji(r.b))),r},fromWorkingColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},toWorkingColorSpace:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===Vn?Ds:this.spaces[r].transfer},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,a){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[cr]:{primaries:t,whitePoint:n,transfer:Ds,toXYZ:dl,fromXYZ:fl,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:en},outputColorSpaceConfig:{drawingBufferColorSpace:en}},[en]:{primaries:t,whitePoint:n,transfer:ce,toXYZ:dl,fromXYZ:fl,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:en}}}),i}const ie=Ld();function Dn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Ji(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Ei;class Dd{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{Ei===void 0&&(Ei=Us("canvas")),Ei.width=t.width,Ei.height=t.height;const n=Ei.getContext("2d");t instanceof ImageData?n.putImageData(t,0,0):n.drawImage(t,0,0,t.width,t.height),e=Ei}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=Us("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const r=n.getImageData(0,0,t.width,t.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=Dn(s[a]/255)*255;return n.putImageData(r,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Dn(e[n]/255)*255):e[n]=Dn(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let Id=0;class rh{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Id++}),this.uuid=Xn(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(ea(r[a].image)):s.push(ea(r[a]))}else s=ea(r);n.url=s}return e||(t.images[this.uuid]=n),n}}function ea(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Dd.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Ud=0;class Oe extends xi{constructor(t=Oe.DEFAULT_IMAGE,e=Oe.DEFAULT_MAPPING,n=hi,r=hi,s=gn,a=ui,o=un,l=Un,c=Oe.DEFAULT_ANISOTROPY,h=Vn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Ud++}),this.uuid=Xn(),this.name="",this.source=new rh(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new Rt(0,0),this.repeat=new Rt(1,1),this.center=new Rt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Kt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Gc)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case qa:t.x=t.x-Math.floor(t.x);break;case hi:t.x=t.x<0?0:1;break;case Ya:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case qa:t.y=t.y-Math.floor(t.y);break;case hi:t.y=t.y<0?0:1;break;case Ya:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}Oe.DEFAULT_IMAGE=null;Oe.DEFAULT_MAPPING=Gc;Oe.DEFAULT_ANISOTROPY=1;class ve{constructor(t=0,e=0,n=0,r=1){ve.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=r}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,r){return this.x=t,this.y=e,this.z=n,this.w=r,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,r=this.z,s=this.w,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*r+a[12]*s,this.y=a[1]*e+a[5]*n+a[9]*r+a[13]*s,this.z=a[2]*e+a[6]*n+a[10]*r+a[14]*s,this.w=a[3]*e+a[7]*n+a[11]*r+a[15]*s,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,r,s;const l=t.elements,c=l[0],h=l[4],d=l[8],p=l[1],f=l[5],_=l[9],g=l[2],m=l[6],u=l[10];if(Math.abs(h-p)<.01&&Math.abs(d-g)<.01&&Math.abs(_-m)<.01){if(Math.abs(h+p)<.1&&Math.abs(d+g)<.1&&Math.abs(_+m)<.1&&Math.abs(c+f+u-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const T=(c+1)/2,M=(f+1)/2,L=(u+1)/2,R=(h+p)/4,C=(d+g)/4,I=(_+m)/4;return T>M&&T>L?T<.01?(n=0,r=.707106781,s=.707106781):(n=Math.sqrt(T),r=R/n,s=C/n):M>L?M<.01?(n=.707106781,r=0,s=.707106781):(r=Math.sqrt(M),n=R/r,s=I/r):L<.01?(n=.707106781,r=.707106781,s=0):(s=Math.sqrt(L),n=C/s,r=I/s),this.set(n,r,s,e),this}let A=Math.sqrt((m-_)*(m-_)+(d-g)*(d-g)+(p-h)*(p-h));return Math.abs(A)<.001&&(A=1),this.x=(m-_)/A,this.y=(d-g)/A,this.z=(p-h)/A,this.w=Math.acos((c+f+u-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Jt(this.x,t.x,e.x),this.y=Jt(this.y,t.y,e.y),this.z=Jt(this.z,t.z,e.z),this.w=Jt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Jt(this.x,t,e),this.y=Jt(this.y,t,e),this.z=Jt(this.z,t,e),this.w=Jt(this.w,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Jt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Nd extends xi{constructor(t=1,e=1,n={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new ve(0,0,t,e),this.scissorTest=!1,this.viewport=new ve(0,0,t,e);const r={width:t,height:e,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:gn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);const s=new Oe(r,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);s.flipY=!1,s.generateMipmaps=n.generateMipmaps,s.internalFormat=n.internalFormat,this.textures=[];const a=n.count;for(let o=0;o<a;o++)this.textures[o]=s.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=t,this.textures[r].image.height=e,this.textures[r].image.depth=n;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let n=0,r=t.textures.length;n<r;n++)this.textures[n]=t.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0,this.textures[n].renderTarget=this;const e=Object.assign({},t.texture.image);return this.texture.source=new rh(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class _i extends Nd{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class sh extends Oe{constructor(t=null,e=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:r},this.magFilter=dn,this.minFilter=dn,this.wrapR=hi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class Fd extends Oe{constructor(t=null,e=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:r},this.magFilter=dn,this.minFilter=dn,this.wrapR=hi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class gi{constructor(t=0,e=0,n=0,r=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=r}static slerpFlat(t,e,n,r,s,a,o){let l=n[r+0],c=n[r+1],h=n[r+2],d=n[r+3];const p=s[a+0],f=s[a+1],_=s[a+2],g=s[a+3];if(o===0){t[e+0]=l,t[e+1]=c,t[e+2]=h,t[e+3]=d;return}if(o===1){t[e+0]=p,t[e+1]=f,t[e+2]=_,t[e+3]=g;return}if(d!==g||l!==p||c!==f||h!==_){let m=1-o;const u=l*p+c*f+h*_+d*g,A=u>=0?1:-1,T=1-u*u;if(T>Number.EPSILON){const L=Math.sqrt(T),R=Math.atan2(L,u*A);m=Math.sin(m*R)/L,o=Math.sin(o*R)/L}const M=o*A;if(l=l*m+p*M,c=c*m+f*M,h=h*m+_*M,d=d*m+g*M,m===1-o){const L=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=L,c*=L,h*=L,d*=L}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,r,s,a){const o=n[r],l=n[r+1],c=n[r+2],h=n[r+3],d=s[a],p=s[a+1],f=s[a+2],_=s[a+3];return t[e]=o*_+h*d+l*f-c*p,t[e+1]=l*_+h*p+c*d-o*f,t[e+2]=c*_+h*f+o*p-l*d,t[e+3]=h*_-o*d-l*p-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,r){return this._x=t,this._y=e,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,r=t._y,s=t._z,a=t._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(r/2),d=o(s/2),p=l(n/2),f=l(r/2),_=l(s/2);switch(a){case"XYZ":this._x=p*h*d+c*f*_,this._y=c*f*d-p*h*_,this._z=c*h*_+p*f*d,this._w=c*h*d-p*f*_;break;case"YXZ":this._x=p*h*d+c*f*_,this._y=c*f*d-p*h*_,this._z=c*h*_-p*f*d,this._w=c*h*d+p*f*_;break;case"ZXY":this._x=p*h*d-c*f*_,this._y=c*f*d+p*h*_,this._z=c*h*_+p*f*d,this._w=c*h*d-p*f*_;break;case"ZYX":this._x=p*h*d-c*f*_,this._y=c*f*d+p*h*_,this._z=c*h*_-p*f*d,this._w=c*h*d+p*f*_;break;case"YZX":this._x=p*h*d+c*f*_,this._y=c*f*d+p*h*_,this._z=c*h*_-p*f*d,this._w=c*h*d-p*f*_;break;case"XZY":this._x=p*h*d-c*f*_,this._y=c*f*d-p*h*_,this._z=c*h*_+p*f*d,this._w=c*h*d+p*f*_;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,r=Math.sin(n);return this._x=t.x*r,this._y=t.y*r,this._z=t.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],r=e[4],s=e[8],a=e[1],o=e[5],l=e[9],c=e[2],h=e[6],d=e[10],p=n+o+d;if(p>0){const f=.5/Math.sqrt(p+1);this._w=.25/f,this._x=(h-l)*f,this._y=(s-c)*f,this._z=(a-r)*f}else if(n>o&&n>d){const f=2*Math.sqrt(1+n-o-d);this._w=(h-l)/f,this._x=.25*f,this._y=(r+a)/f,this._z=(s+c)/f}else if(o>d){const f=2*Math.sqrt(1+o-n-d);this._w=(s-c)/f,this._x=(r+a)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+d-n-o);this._w=(a-r)/f,this._x=(s+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<Number.EPSILON?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Jt(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const r=Math.min(1,e/n);return this.slerp(t,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,r=t._y,s=t._z,a=t._w,o=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+a*o+r*c-s*l,this._y=r*h+a*l+s*o-n*c,this._z=s*h+a*c+n*l-r*o,this._w=a*h-n*o-r*l-s*c,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const n=this._x,r=this._y,s=this._z,a=this._w;let o=a*t._w+n*t._x+r*t._y+s*t._z;if(o<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,o=-o):this.copy(t),o>=1)return this._w=a,this._x=n,this._y=r,this._z=s,this;const l=1-o*o;if(l<=Number.EPSILON){const f=1-e;return this._w=f*a+e*this._w,this._x=f*n+e*this._x,this._y=f*r+e*this._y,this._z=f*s+e*this._z,this.normalize(),this}const c=Math.sqrt(l),h=Math.atan2(c,o),d=Math.sin((1-e)*h)/c,p=Math.sin(e*h)/c;return this._w=a*d+this._w*p,this._x=n*d+this._x*p,this._y=r*d+this._y*p,this._z=s*d+this._z*p,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(r*Math.sin(t),r*Math.cos(t),s*Math.sin(e),s*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class F{constructor(t=0,e=0,n=0){F.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(pl.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(pl.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,r=this.z,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6]*r,this.y=s[1]*e+s[4]*n+s[7]*r,this.z=s[2]*e+s[5]*n+s[8]*r,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,r=this.z,s=t.elements,a=1/(s[3]*e+s[7]*n+s[11]*r+s[15]);return this.x=(s[0]*e+s[4]*n+s[8]*r+s[12])*a,this.y=(s[1]*e+s[5]*n+s[9]*r+s[13])*a,this.z=(s[2]*e+s[6]*n+s[10]*r+s[14])*a,this}applyQuaternion(t){const e=this.x,n=this.y,r=this.z,s=t.x,a=t.y,o=t.z,l=t.w,c=2*(a*r-o*n),h=2*(o*e-s*r),d=2*(s*n-a*e);return this.x=e+l*c+a*d-o*h,this.y=n+l*h+o*c-s*d,this.z=r+l*d+s*h-a*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,r=this.z,s=t.elements;return this.x=s[0]*e+s[4]*n+s[8]*r,this.y=s[1]*e+s[5]*n+s[9]*r,this.z=s[2]*e+s[6]*n+s[10]*r,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Jt(this.x,t.x,e.x),this.y=Jt(this.y,t.y,e.y),this.z=Jt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Jt(this.x,t,e),this.y=Jt(this.y,t,e),this.z=Jt(this.z,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Jt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,r=t.y,s=t.z,a=e.x,o=e.y,l=e.z;return this.x=r*l-s*o,this.y=s*a-n*l,this.z=n*o-r*a,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return na.copy(this).projectOnVector(t),this.sub(na)}reflect(t){return this.sub(na.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Jt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,r=this.z-t.z;return e*e+n*n+r*r}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const r=Math.sin(e)*t;return this.x=r*Math.sin(n),this.y=Math.cos(e)*t,this.z=r*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),r=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=r,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const na=new F,pl=new gi;class Ir{constructor(t=new F(1/0,1/0,1/0),e=new F(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(ln.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(ln.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=ln.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const s=n.getAttribute("position");if(e===!0&&s!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,ln):ln.fromBufferAttribute(s,a),ln.applyMatrix4(t.matrixWorld),this.expandByPoint(ln);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Br.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Br.copy(n.boundingBox)),Br.applyMatrix4(t.matrixWorld),this.union(Br)}const r=t.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,ln),ln.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(mr),$r.subVectors(this.max,mr),Ti.subVectors(t.a,mr),Ai.subVectors(t.b,mr),wi.subVectors(t.c,mr),Fn.subVectors(Ai,Ti),On.subVectors(wi,Ai),ei.subVectors(Ti,wi);let e=[0,-Fn.z,Fn.y,0,-On.z,On.y,0,-ei.z,ei.y,Fn.z,0,-Fn.x,On.z,0,-On.x,ei.z,0,-ei.x,-Fn.y,Fn.x,0,-On.y,On.x,0,-ei.y,ei.x,0];return!ia(e,Ti,Ai,wi,$r)||(e=[1,0,0,0,1,0,0,0,1],!ia(e,Ti,Ai,wi,$r))?!1:(zr.crossVectors(Fn,On),e=[zr.x,zr.y,zr.z],ia(e,Ti,Ai,wi,$r))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,ln).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(ln).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Mn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Mn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Mn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Mn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Mn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Mn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Mn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Mn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Mn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const Mn=[new F,new F,new F,new F,new F,new F,new F,new F],ln=new F,Br=new Ir,Ti=new F,Ai=new F,wi=new F,Fn=new F,On=new F,ei=new F,mr=new F,$r=new F,zr=new F,ni=new F;function ia(i,t,e,n,r){for(let s=0,a=i.length-3;s<=a;s+=3){ni.fromArray(i,s);const o=r.x*Math.abs(ni.x)+r.y*Math.abs(ni.y)+r.z*Math.abs(ni.z),l=t.dot(ni),c=e.dot(ni),h=n.dot(ni);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}const Od=new Ir,_r=new F,ra=new F;class Hs{constructor(t=new F,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):Od.setFromPoints(t).getCenter(n);let r=0;for(let s=0,a=t.length;s<a;s++)r=Math.max(r,n.distanceToSquared(t[s]));return this.radius=Math.sqrt(r),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;_r.subVectors(t,this.center);const e=_r.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),r=(n-this.radius)*.5;this.center.addScaledVector(_r,r/n),this.radius+=r}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(ra.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(_r.copy(t.center).add(ra)),this.expandByPoint(_r.copy(t.center).sub(ra))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const bn=new F,sa=new F,kr=new F,Bn=new F,aa=new F,Hr=new F,oa=new F;class Vs{constructor(t=new F,e=new F(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,bn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=bn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(bn.copy(this.origin).addScaledVector(this.direction,e),bn.distanceToSquared(t))}distanceSqToSegment(t,e,n,r){sa.copy(t).add(e).multiplyScalar(.5),kr.copy(e).sub(t).normalize(),Bn.copy(this.origin).sub(sa);const s=t.distanceTo(e)*.5,a=-this.direction.dot(kr),o=Bn.dot(this.direction),l=-Bn.dot(kr),c=Bn.lengthSq(),h=Math.abs(1-a*a);let d,p,f,_;if(h>0)if(d=a*l-o,p=a*o-l,_=s*h,d>=0)if(p>=-_)if(p<=_){const g=1/h;d*=g,p*=g,f=d*(d+a*p+2*o)+p*(a*d+p+2*l)+c}else p=s,d=Math.max(0,-(a*p+o)),f=-d*d+p*(p+2*l)+c;else p=-s,d=Math.max(0,-(a*p+o)),f=-d*d+p*(p+2*l)+c;else p<=-_?(d=Math.max(0,-(-a*s+o)),p=d>0?-s:Math.min(Math.max(-s,-l),s),f=-d*d+p*(p+2*l)+c):p<=_?(d=0,p=Math.min(Math.max(-s,-l),s),f=p*(p+2*l)+c):(d=Math.max(0,-(a*s+o)),p=d>0?s:Math.min(Math.max(-s,-l),s),f=-d*d+p*(p+2*l)+c);else p=a>0?-s:s,d=Math.max(0,-(a*p+o)),f=-d*d+p*(p+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),r&&r.copy(sa).addScaledVector(kr,p),f}intersectSphere(t,e){bn.subVectors(t.center,this.origin);const n=bn.dot(this.direction),r=bn.dot(bn)-n*n,s=t.radius*t.radius;if(r>s)return null;const a=Math.sqrt(s-r),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,e):this.at(o,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,r,s,a,o,l;const c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,p=this.origin;return c>=0?(n=(t.min.x-p.x)*c,r=(t.max.x-p.x)*c):(n=(t.max.x-p.x)*c,r=(t.min.x-p.x)*c),h>=0?(s=(t.min.y-p.y)*h,a=(t.max.y-p.y)*h):(s=(t.max.y-p.y)*h,a=(t.min.y-p.y)*h),n>a||s>r||((s>n||isNaN(n))&&(n=s),(a<r||isNaN(r))&&(r=a),d>=0?(o=(t.min.z-p.z)*d,l=(t.max.z-p.z)*d):(o=(t.max.z-p.z)*d,l=(t.min.z-p.z)*d),n>l||o>r)||((o>n||n!==n)&&(n=o),(l<r||r!==r)&&(r=l),r<0)?null:this.at(n>=0?n:r,e)}intersectsBox(t){return this.intersectBox(t,bn)!==null}intersectTriangle(t,e,n,r,s){aa.subVectors(e,t),Hr.subVectors(n,t),oa.crossVectors(aa,Hr);let a=this.direction.dot(oa),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;Bn.subVectors(this.origin,t);const l=o*this.direction.dot(Hr.crossVectors(Bn,Hr));if(l<0)return null;const c=o*this.direction.dot(aa.cross(Bn));if(c<0||l+c>a)return null;const h=-o*Bn.dot(oa);return h<0?null:this.at(h/a,s)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class fe{constructor(t,e,n,r,s,a,o,l,c,h,d,p,f,_,g,m){fe.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,r,s,a,o,l,c,h,d,p,f,_,g,m)}set(t,e,n,r,s,a,o,l,c,h,d,p,f,_,g,m){const u=this.elements;return u[0]=t,u[4]=e,u[8]=n,u[12]=r,u[1]=s,u[5]=a,u[9]=o,u[13]=l,u[2]=c,u[6]=h,u[10]=d,u[14]=p,u[3]=f,u[7]=_,u[11]=g,u[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new fe().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,n=t.elements,r=1/Ci.setFromMatrixColumn(t,0).length(),s=1/Ci.setFromMatrixColumn(t,1).length(),a=1/Ci.setFromMatrixColumn(t,2).length();return e[0]=n[0]*r,e[1]=n[1]*r,e[2]=n[2]*r,e[3]=0,e[4]=n[4]*s,e[5]=n[5]*s,e[6]=n[6]*s,e[7]=0,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,r=t.y,s=t.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(r),c=Math.sin(r),h=Math.cos(s),d=Math.sin(s);if(t.order==="XYZ"){const p=a*h,f=a*d,_=o*h,g=o*d;e[0]=l*h,e[4]=-l*d,e[8]=c,e[1]=f+_*c,e[5]=p-g*c,e[9]=-o*l,e[2]=g-p*c,e[6]=_+f*c,e[10]=a*l}else if(t.order==="YXZ"){const p=l*h,f=l*d,_=c*h,g=c*d;e[0]=p+g*o,e[4]=_*o-f,e[8]=a*c,e[1]=a*d,e[5]=a*h,e[9]=-o,e[2]=f*o-_,e[6]=g+p*o,e[10]=a*l}else if(t.order==="ZXY"){const p=l*h,f=l*d,_=c*h,g=c*d;e[0]=p-g*o,e[4]=-a*d,e[8]=_+f*o,e[1]=f+_*o,e[5]=a*h,e[9]=g-p*o,e[2]=-a*c,e[6]=o,e[10]=a*l}else if(t.order==="ZYX"){const p=a*h,f=a*d,_=o*h,g=o*d;e[0]=l*h,e[4]=_*c-f,e[8]=p*c+g,e[1]=l*d,e[5]=g*c+p,e[9]=f*c-_,e[2]=-c,e[6]=o*l,e[10]=a*l}else if(t.order==="YZX"){const p=a*l,f=a*c,_=o*l,g=o*c;e[0]=l*h,e[4]=g-p*d,e[8]=_*d+f,e[1]=d,e[5]=a*h,e[9]=-o*h,e[2]=-c*h,e[6]=f*d+_,e[10]=p-g*d}else if(t.order==="XZY"){const p=a*l,f=a*c,_=o*l,g=o*c;e[0]=l*h,e[4]=-d,e[8]=c*h,e[1]=p*d+g,e[5]=a*h,e[9]=f*d-_,e[2]=_*d-f,e[6]=o*h,e[10]=g*d+p}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Bd,t,$d)}lookAt(t,e,n){const r=this.elements;return We.subVectors(t,e),We.lengthSq()===0&&(We.z=1),We.normalize(),$n.crossVectors(n,We),$n.lengthSq()===0&&(Math.abs(n.z)===1?We.x+=1e-4:We.z+=1e-4,We.normalize(),$n.crossVectors(n,We)),$n.normalize(),Vr.crossVectors(We,$n),r[0]=$n.x,r[4]=Vr.x,r[8]=We.x,r[1]=$n.y,r[5]=Vr.y,r[9]=We.y,r[2]=$n.z,r[6]=Vr.z,r[10]=We.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,r=e.elements,s=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],d=n[5],p=n[9],f=n[13],_=n[2],g=n[6],m=n[10],u=n[14],A=n[3],T=n[7],M=n[11],L=n[15],R=r[0],C=r[4],I=r[8],b=r[12],x=r[1],P=r[5],G=r[9],B=r[13],Z=r[2],rt=r[6],W=r[10],at=r[14],V=r[3],_t=r[7],tt=r[11],xt=r[15];return s[0]=a*R+o*x+l*Z+c*V,s[4]=a*C+o*P+l*rt+c*_t,s[8]=a*I+o*G+l*W+c*tt,s[12]=a*b+o*B+l*at+c*xt,s[1]=h*R+d*x+p*Z+f*V,s[5]=h*C+d*P+p*rt+f*_t,s[9]=h*I+d*G+p*W+f*tt,s[13]=h*b+d*B+p*at+f*xt,s[2]=_*R+g*x+m*Z+u*V,s[6]=_*C+g*P+m*rt+u*_t,s[10]=_*I+g*G+m*W+u*tt,s[14]=_*b+g*B+m*at+u*xt,s[3]=A*R+T*x+M*Z+L*V,s[7]=A*C+T*P+M*rt+L*_t,s[11]=A*I+T*G+M*W+L*tt,s[15]=A*b+T*B+M*at+L*xt,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],r=t[8],s=t[12],a=t[1],o=t[5],l=t[9],c=t[13],h=t[2],d=t[6],p=t[10],f=t[14],_=t[3],g=t[7],m=t[11],u=t[15];return _*(+s*l*d-r*c*d-s*o*p+n*c*p+r*o*f-n*l*f)+g*(+e*l*f-e*c*p+s*a*p-r*a*f+r*c*h-s*l*h)+m*(+e*c*d-e*o*f-s*a*d+n*a*f+s*o*h-n*c*h)+u*(-r*o*h-e*l*d+e*o*p+r*a*d-n*a*p+n*l*h)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const r=this.elements;return t.isVector3?(r[12]=t.x,r[13]=t.y,r[14]=t.z):(r[12]=t,r[13]=e,r[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],r=t[2],s=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],d=t[9],p=t[10],f=t[11],_=t[12],g=t[13],m=t[14],u=t[15],A=d*m*c-g*p*c+g*l*f-o*m*f-d*l*u+o*p*u,T=_*p*c-h*m*c-_*l*f+a*m*f+h*l*u-a*p*u,M=h*g*c-_*d*c+_*o*f-a*g*f-h*o*u+a*d*u,L=_*d*l-h*g*l-_*o*p+a*g*p+h*o*m-a*d*m,R=e*A+n*T+r*M+s*L;if(R===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const C=1/R;return t[0]=A*C,t[1]=(g*p*s-d*m*s-g*r*f+n*m*f+d*r*u-n*p*u)*C,t[2]=(o*m*s-g*l*s+g*r*c-n*m*c-o*r*u+n*l*u)*C,t[3]=(d*l*s-o*p*s-d*r*c+n*p*c+o*r*f-n*l*f)*C,t[4]=T*C,t[5]=(h*m*s-_*p*s+_*r*f-e*m*f-h*r*u+e*p*u)*C,t[6]=(_*l*s-a*m*s-_*r*c+e*m*c+a*r*u-e*l*u)*C,t[7]=(a*p*s-h*l*s+h*r*c-e*p*c-a*r*f+e*l*f)*C,t[8]=M*C,t[9]=(_*d*s-h*g*s-_*n*f+e*g*f+h*n*u-e*d*u)*C,t[10]=(a*g*s-_*o*s+_*n*c-e*g*c-a*n*u+e*o*u)*C,t[11]=(h*o*s-a*d*s-h*n*c+e*d*c+a*n*f-e*o*f)*C,t[12]=L*C,t[13]=(h*g*r-_*d*r+_*n*p-e*g*p-h*n*m+e*d*m)*C,t[14]=(_*o*r-a*g*r-_*n*l+e*g*l+a*n*m-e*o*m)*C,t[15]=(a*d*r-h*o*r+h*n*l-e*d*l-a*n*p+e*o*p)*C,this}scale(t){const e=this.elements,n=t.x,r=t.y,s=t.z;return e[0]*=n,e[4]*=r,e[8]*=s,e[1]*=n,e[5]*=r,e[9]*=s,e[2]*=n,e[6]*=r,e[10]*=s,e[3]*=n,e[7]*=r,e[11]*=s,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],r=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,r))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),r=Math.sin(e),s=1-n,a=t.x,o=t.y,l=t.z,c=s*a,h=s*o;return this.set(c*a+n,c*o-r*l,c*l+r*o,0,c*o+r*l,h*o+n,h*l-r*a,0,c*l-r*o,h*l+r*a,s*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,r,s,a){return this.set(1,n,s,0,t,1,a,0,e,r,1,0,0,0,0,1),this}compose(t,e,n){const r=this.elements,s=e._x,a=e._y,o=e._z,l=e._w,c=s+s,h=a+a,d=o+o,p=s*c,f=s*h,_=s*d,g=a*h,m=a*d,u=o*d,A=l*c,T=l*h,M=l*d,L=n.x,R=n.y,C=n.z;return r[0]=(1-(g+u))*L,r[1]=(f+M)*L,r[2]=(_-T)*L,r[3]=0,r[4]=(f-M)*R,r[5]=(1-(p+u))*R,r[6]=(m+A)*R,r[7]=0,r[8]=(_+T)*C,r[9]=(m-A)*C,r[10]=(1-(p+g))*C,r[11]=0,r[12]=t.x,r[13]=t.y,r[14]=t.z,r[15]=1,this}decompose(t,e,n){const r=this.elements;let s=Ci.set(r[0],r[1],r[2]).length();const a=Ci.set(r[4],r[5],r[6]).length(),o=Ci.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),t.x=r[12],t.y=r[13],t.z=r[14],cn.copy(this);const c=1/s,h=1/a,d=1/o;return cn.elements[0]*=c,cn.elements[1]*=c,cn.elements[2]*=c,cn.elements[4]*=h,cn.elements[5]*=h,cn.elements[6]*=h,cn.elements[8]*=d,cn.elements[9]*=d,cn.elements[10]*=d,e.setFromRotationMatrix(cn),n.x=s,n.y=a,n.z=o,this}makePerspective(t,e,n,r,s,a,o=Pn){const l=this.elements,c=2*s/(e-t),h=2*s/(n-r),d=(e+t)/(e-t),p=(n+r)/(n-r);let f,_;if(o===Pn)f=-(a+s)/(a-s),_=-2*a*s/(a-s);else if(o===Is)f=-a/(a-s),_=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=c,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=h,l[9]=p,l[13]=0,l[2]=0,l[6]=0,l[10]=f,l[14]=_,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,n,r,s,a,o=Pn){const l=this.elements,c=1/(e-t),h=1/(n-r),d=1/(a-s),p=(e+t)*c,f=(n+r)*h;let _,g;if(o===Pn)_=(a+s)*d,g=-2*d;else if(o===Is)_=s*d,g=-1*d;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-p,l[1]=0,l[5]=2*h,l[9]=0,l[13]=-f,l[2]=0,l[6]=0,l[10]=g,l[14]=-_,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let r=0;r<16;r++)if(e[r]!==n[r])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}const Ci=new F,cn=new fe,Bd=new F(0,0,0),$d=new F(1,1,1),$n=new F,Vr=new F,We=new F,ml=new fe,_l=new gi;class xn{constructor(t=0,e=0,n=0,r=xn.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=r}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,r=this._order){return this._x=t,this._y=e,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const r=t.elements,s=r[0],a=r[4],o=r[8],l=r[1],c=r[5],h=r[9],d=r[2],p=r[6],f=r[10];switch(e){case"XYZ":this._y=Math.asin(Jt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(p,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Jt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,s),this._z=0);break;case"ZXY":this._x=Math.asin(Jt(p,-1,1)),Math.abs(p)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-Jt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(p,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(Jt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,s)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-Jt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(p,c),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-h,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return ml.makeRotationFromQuaternion(t),this.setFromRotationMatrix(ml,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return _l.setFromEuler(this),this.setFromQuaternion(_l,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}xn.DEFAULT_ORDER="XYZ";class Fo{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let zd=0;const gl=new F,Ri=new gi,En=new fe,Gr=new F,gr=new F,kd=new F,Hd=new gi,vl=new F(1,0,0),xl=new F(0,1,0),Sl=new F(0,0,1),yl={type:"added"},Vd={type:"removed"},Pi={type:"childadded",child:null},la={type:"childremoved",child:null};class Ee extends xi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:zd++}),this.uuid=Xn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Ee.DEFAULT_UP.clone();const t=new F,e=new xn,n=new gi,r=new F(1,1,1);function s(){n.setFromEuler(e,!1)}function a(){e.setFromQuaternion(n,void 0,!1)}e._onChange(s),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new fe},normalMatrix:{value:new Kt}}),this.matrix=new fe,this.matrixWorld=new fe,this.matrixAutoUpdate=Ee.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Ee.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Fo,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Ri.setFromAxisAngle(t,e),this.quaternion.multiply(Ri),this}rotateOnWorldAxis(t,e){return Ri.setFromAxisAngle(t,e),this.quaternion.premultiply(Ri),this}rotateX(t){return this.rotateOnAxis(vl,t)}rotateY(t){return this.rotateOnAxis(xl,t)}rotateZ(t){return this.rotateOnAxis(Sl,t)}translateOnAxis(t,e){return gl.copy(t).applyQuaternion(this.quaternion),this.position.add(gl.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(vl,t)}translateY(t){return this.translateOnAxis(xl,t)}translateZ(t){return this.translateOnAxis(Sl,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(En.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Gr.copy(t):Gr.set(t,e,n);const r=this.parent;this.updateWorldMatrix(!0,!1),gr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?En.lookAt(gr,Gr,this.up):En.lookAt(Gr,gr,this.up),this.quaternion.setFromRotationMatrix(En),r&&(En.extractRotation(r.matrixWorld),Ri.setFromRotationMatrix(En),this.quaternion.premultiply(Ri.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(yl),Pi.child=t,this.dispatchEvent(Pi),Pi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Vd),la.child=t,this.dispatchEvent(la),la.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),En.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),En.multiply(t.parent.matrixWorld)),t.applyMatrix4(En),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(yl),Pi.child=t,this.dispatchEvent(Pi),Pi.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,r=this.children.length;n<r;n++){const a=this.children[n].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(gr,t,kd),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(gr,Hd,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,r=e.length;n<r;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,r=e.length;n<r;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,r=e.length;n<r;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function s(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(t.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const d=l[c];s(t.shapes,d)}else s(t.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(t.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(s(t.materials,this.material[l]));r.material=o}else r.material=s(t.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];r.animations.push(s(t.animations,l))}}if(e){const o=a(t.geometries),l=a(t.materials),c=a(t.textures),h=a(t.images),d=a(t.shapes),p=a(t.skeletons),f=a(t.animations),_=a(t.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),p.length>0&&(n.skeletons=p),f.length>0&&(n.animations=f),_.length>0&&(n.nodes=_)}return n.object=r,n;function a(o){const l=[];for(const c in o){const h=o[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const r=t.children[n];this.add(r.clone())}return this}}Ee.DEFAULT_UP=new F(0,1,0);Ee.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ee.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const hn=new F,Tn=new F,ca=new F,An=new F,Li=new F,Di=new F,Ml=new F,ha=new F,ua=new F,da=new F,fa=new ve,pa=new ve,ma=new ve;class nn{constructor(t=new F,e=new F,n=new F){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,r){r.subVectors(n,e),hn.subVectors(t,e),r.cross(hn);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(t,e,n,r,s){hn.subVectors(r,e),Tn.subVectors(n,e),ca.subVectors(t,e);const a=hn.dot(hn),o=hn.dot(Tn),l=hn.dot(ca),c=Tn.dot(Tn),h=Tn.dot(ca),d=a*c-o*o;if(d===0)return s.set(0,0,0),null;const p=1/d,f=(c*l-o*h)*p,_=(a*h-o*l)*p;return s.set(1-f-_,_,f)}static containsPoint(t,e,n,r){return this.getBarycoord(t,e,n,r,An)===null?!1:An.x>=0&&An.y>=0&&An.x+An.y<=1}static getInterpolation(t,e,n,r,s,a,o,l){return this.getBarycoord(t,e,n,r,An)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,An.x),l.addScaledVector(a,An.y),l.addScaledVector(o,An.z),l)}static getInterpolatedAttribute(t,e,n,r,s,a){return fa.setScalar(0),pa.setScalar(0),ma.setScalar(0),fa.fromBufferAttribute(t,e),pa.fromBufferAttribute(t,n),ma.fromBufferAttribute(t,r),a.setScalar(0),a.addScaledVector(fa,s.x),a.addScaledVector(pa,s.y),a.addScaledVector(ma,s.z),a}static isFrontFacing(t,e,n,r){return hn.subVectors(n,e),Tn.subVectors(t,e),hn.cross(Tn).dot(r)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,r){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[r]),this}setFromAttributeAndIndices(t,e,n,r){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,r),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return hn.subVectors(this.c,this.b),Tn.subVectors(this.a,this.b),hn.cross(Tn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return nn.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return nn.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,r,s){return nn.getInterpolation(t,this.a,this.b,this.c,e,n,r,s)}containsPoint(t){return nn.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return nn.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,r=this.b,s=this.c;let a,o;Li.subVectors(r,n),Di.subVectors(s,n),ha.subVectors(t,n);const l=Li.dot(ha),c=Di.dot(ha);if(l<=0&&c<=0)return e.copy(n);ua.subVectors(t,r);const h=Li.dot(ua),d=Di.dot(ua);if(h>=0&&d<=h)return e.copy(r);const p=l*d-h*c;if(p<=0&&l>=0&&h<=0)return a=l/(l-h),e.copy(n).addScaledVector(Li,a);da.subVectors(t,s);const f=Li.dot(da),_=Di.dot(da);if(_>=0&&f<=_)return e.copy(s);const g=f*c-l*_;if(g<=0&&c>=0&&_<=0)return o=c/(c-_),e.copy(n).addScaledVector(Di,o);const m=h*_-f*d;if(m<=0&&d-h>=0&&f-_>=0)return Ml.subVectors(s,r),o=(d-h)/(d-h+(f-_)),e.copy(r).addScaledVector(Ml,o);const u=1/(m+g+p);return a=g*u,o=p*u,e.copy(n).addScaledVector(Li,a).addScaledVector(Di,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const ah={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},zn={h:0,s:0,l:0},Wr={h:0,s:0,l:0};function _a(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}class Qt{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const r=t;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=en){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,ie.toWorkingColorSpace(this,e),this}setRGB(t,e,n,r=ie.workingColorSpace){return this.r=t,this.g=e,this.b=n,ie.toWorkingColorSpace(this,r),this}setHSL(t,e,n,r=ie.workingColorSpace){if(t=Td(t,1),e=Jt(e,0,1),n=Jt(n,0,1),e===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+e):n+e-n*e,a=2*n-s;this.r=_a(a,s,t+1/3),this.g=_a(a,s,t),this.b=_a(a,s,t-1/3)}return ie.toWorkingColorSpace(this,r),this}setStyle(t,e=en){function n(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(t)){let s;const a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,e);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,e);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(t)){const s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(s,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=en){const n=ah[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Dn(t.r),this.g=Dn(t.g),this.b=Dn(t.b),this}copyLinearToSRGB(t){return this.r=Ji(t.r),this.g=Ji(t.g),this.b=Ji(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=en){return ie.fromWorkingColorSpace(De.copy(this),t),Math.round(Jt(De.r*255,0,255))*65536+Math.round(Jt(De.g*255,0,255))*256+Math.round(Jt(De.b*255,0,255))}getHexString(t=en){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=ie.workingColorSpace){ie.fromWorkingColorSpace(De.copy(this),e);const n=De.r,r=De.g,s=De.b,a=Math.max(n,r,s),o=Math.min(n,r,s);let l,c;const h=(o+a)/2;if(o===a)l=0,c=0;else{const d=a-o;switch(c=h<=.5?d/(a+o):d/(2-a-o),a){case n:l=(r-s)/d+(r<s?6:0);break;case r:l=(s-n)/d+2;break;case s:l=(n-r)/d+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=ie.workingColorSpace){return ie.fromWorkingColorSpace(De.copy(this),e),t.r=De.r,t.g=De.g,t.b=De.b,t}getStyle(t=en){ie.fromWorkingColorSpace(De.copy(this),t);const e=De.r,n=De.g,r=De.b;return t!==en?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(r*255)})`}offsetHSL(t,e,n){return this.getHSL(zn),this.setHSL(zn.h+t,zn.s+e,zn.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(zn),t.getHSL(Wr);const n=Qs(zn.h,Wr.h,e),r=Qs(zn.s,Wr.s,e),s=Qs(zn.l,Wr.l,e);return this.setHSL(n,r,s),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,r=this.b,s=t.elements;return this.r=s[0]*e+s[3]*n+s[6]*r,this.g=s[1]*e+s[4]*n+s[7]*r,this.b=s[2]*e+s[5]*n+s[8]*r,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const De=new Qt;Qt.NAMES=ah;let Gd=0;class Si extends xi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Gd++}),this.uuid=Xn(),this.name="",this.type="Material",this.blending=Ki,this.side=jn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Fa,this.blendDst=Oa,this.blendEquation=li,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Qt(0,0,0),this.blendAlpha=0,this.depthFunc=rr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=cl,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=bi,this.stencilZFail=bi,this.stencilZPass=bi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const r=this[e];if(r===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Ki&&(n.blending=this.blending),this.side!==jn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Fa&&(n.blendSrc=this.blendSrc),this.blendDst!==Oa&&(n.blendDst=this.blendDst),this.blendEquation!==li&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==rr&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==cl&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==bi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==bi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==bi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(s){const a=[];for(const o in s){const l=s[o];delete l.metadata,a.push(l)}return a}if(e){const s=r(t.textures),a=r(t.images);s.length>0&&(n.textures=s),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const r=e.length;n=new Array(r);for(let s=0;s!==r;++s)n[s]=e[s].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class oh extends Si{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Qt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new xn,this.combine=Vc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const ye=new F,Xr=new Rt;class fn{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Mo,this.updateRanges=[],this.gpuType=Rn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[t+r]=e.array[n+r];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)Xr.fromBufferAttribute(this,e),Xr.applyMatrix3(t),this.setXY(e,Xr.x,Xr.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)ye.fromBufferAttribute(this,e),ye.applyMatrix3(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)ye.fromBufferAttribute(this,e),ye.applyMatrix4(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)ye.fromBufferAttribute(this,e),ye.applyNormalMatrix(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)ye.fromBufferAttribute(this,e),ye.transformDirection(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=_n(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=he(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=_n(e,this.array)),e}setX(t,e){return this.normalized&&(e=he(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=_n(e,this.array)),e}setY(t,e){return this.normalized&&(e=he(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=_n(e,this.array)),e}setZ(t,e){return this.normalized&&(e=he(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=_n(e,this.array)),e}setW(t,e){return this.normalized&&(e=he(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=he(e,this.array),n=he(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,r){return t*=this.itemSize,this.normalized&&(e=he(e,this.array),n=he(n,this.array),r=he(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=r,this}setXYZW(t,e,n,r,s){return t*=this.itemSize,this.normalized&&(e=he(e,this.array),n=he(n,this.array),r=he(r,this.array),s=he(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=r,this.array[t+3]=s,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Mo&&(t.usage=this.usage),t}}class lh extends fn{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class ch extends fn{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class me extends fn{constructor(t,e,n){super(new Float32Array(t),e,n)}}let Wd=0;const tn=new fe,ga=new Ee,Ii=new F,Xe=new Ir,vr=new Ir,we=new F;class Ve extends xi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Wd++}),this.uuid=Xn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(ih(t)?ch:lh)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new Kt().getNormalMatrix(t);n.applyNormalMatrix(s),n.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(t),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return tn.makeRotationFromQuaternion(t),this.applyMatrix4(tn),this}rotateX(t){return tn.makeRotationX(t),this.applyMatrix4(tn),this}rotateY(t){return tn.makeRotationY(t),this.applyMatrix4(tn),this}rotateZ(t){return tn.makeRotationZ(t),this.applyMatrix4(tn),this}translate(t,e,n){return tn.makeTranslation(t,e,n),this.applyMatrix4(tn),this}scale(t,e,n){return tn.makeScale(t,e,n),this.applyMatrix4(tn),this}lookAt(t){return ga.lookAt(t),ga.updateMatrix(),this.applyMatrix4(ga.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ii).negate(),this.translate(Ii.x,Ii.y,Ii.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let r=0,s=t.length;r<s;r++){const a=t[r];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new me(n,3))}else{const n=Math.min(t.length,e.count);for(let r=0;r<n;r++){const s=t[r];e.setXYZ(r,s.x,s.y,s.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ir);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new F(-1/0,-1/0,-1/0),new F(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,r=e.length;n<r;n++){const s=e[n];Xe.setFromBufferAttribute(s),this.morphTargetsRelative?(we.addVectors(this.boundingBox.min,Xe.min),this.boundingBox.expandByPoint(we),we.addVectors(this.boundingBox.max,Xe.max),this.boundingBox.expandByPoint(we)):(this.boundingBox.expandByPoint(Xe.min),this.boundingBox.expandByPoint(Xe.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Hs);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new F,1/0);return}if(t){const n=this.boundingSphere.center;if(Xe.setFromBufferAttribute(t),e)for(let s=0,a=e.length;s<a;s++){const o=e[s];vr.setFromBufferAttribute(o),this.morphTargetsRelative?(we.addVectors(Xe.min,vr.min),Xe.expandByPoint(we),we.addVectors(Xe.max,vr.max),Xe.expandByPoint(we)):(Xe.expandByPoint(vr.min),Xe.expandByPoint(vr.max))}Xe.getCenter(n);let r=0;for(let s=0,a=t.count;s<a;s++)we.fromBufferAttribute(t,s),r=Math.max(r,n.distanceToSquared(we));if(e)for(let s=0,a=e.length;s<a;s++){const o=e[s],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)we.fromBufferAttribute(o,c),l&&(Ii.fromBufferAttribute(t,c),we.add(Ii)),r=Math.max(r,n.distanceToSquared(we))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,r=e.normal,s=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new fn(new Float32Array(4*n.count),4));const a=this.getAttribute("tangent"),o=[],l=[];for(let I=0;I<n.count;I++)o[I]=new F,l[I]=new F;const c=new F,h=new F,d=new F,p=new Rt,f=new Rt,_=new Rt,g=new F,m=new F;function u(I,b,x){c.fromBufferAttribute(n,I),h.fromBufferAttribute(n,b),d.fromBufferAttribute(n,x),p.fromBufferAttribute(s,I),f.fromBufferAttribute(s,b),_.fromBufferAttribute(s,x),h.sub(c),d.sub(c),f.sub(p),_.sub(p);const P=1/(f.x*_.y-_.x*f.y);isFinite(P)&&(g.copy(h).multiplyScalar(_.y).addScaledVector(d,-f.y).multiplyScalar(P),m.copy(d).multiplyScalar(f.x).addScaledVector(h,-_.x).multiplyScalar(P),o[I].add(g),o[b].add(g),o[x].add(g),l[I].add(m),l[b].add(m),l[x].add(m))}let A=this.groups;A.length===0&&(A=[{start:0,count:t.count}]);for(let I=0,b=A.length;I<b;++I){const x=A[I],P=x.start,G=x.count;for(let B=P,Z=P+G;B<Z;B+=3)u(t.getX(B+0),t.getX(B+1),t.getX(B+2))}const T=new F,M=new F,L=new F,R=new F;function C(I){L.fromBufferAttribute(r,I),R.copy(L);const b=o[I];T.copy(b),T.sub(L.multiplyScalar(L.dot(b))).normalize(),M.crossVectors(R,b);const P=M.dot(l[I])<0?-1:1;a.setXYZW(I,T.x,T.y,T.z,P)}for(let I=0,b=A.length;I<b;++I){const x=A[I],P=x.start,G=x.count;for(let B=P,Z=P+G;B<Z;B+=3)C(t.getX(B+0)),C(t.getX(B+1)),C(t.getX(B+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new fn(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let p=0,f=n.count;p<f;p++)n.setXYZ(p,0,0,0);const r=new F,s=new F,a=new F,o=new F,l=new F,c=new F,h=new F,d=new F;if(t)for(let p=0,f=t.count;p<f;p+=3){const _=t.getX(p+0),g=t.getX(p+1),m=t.getX(p+2);r.fromBufferAttribute(e,_),s.fromBufferAttribute(e,g),a.fromBufferAttribute(e,m),h.subVectors(a,s),d.subVectors(r,s),h.cross(d),o.fromBufferAttribute(n,_),l.fromBufferAttribute(n,g),c.fromBufferAttribute(n,m),o.add(h),l.add(h),c.add(h),n.setXYZ(_,o.x,o.y,o.z),n.setXYZ(g,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let p=0,f=e.count;p<f;p+=3)r.fromBufferAttribute(e,p+0),s.fromBufferAttribute(e,p+1),a.fromBufferAttribute(e,p+2),h.subVectors(a,s),d.subVectors(r,s),h.cross(d),n.setXYZ(p+0,h.x,h.y,h.z),n.setXYZ(p+1,h.x,h.y,h.z),n.setXYZ(p+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)we.fromBufferAttribute(t,e),we.normalize(),t.setXYZ(e,we.x,we.y,we.z)}toNonIndexed(){function t(o,l){const c=o.array,h=o.itemSize,d=o.normalized,p=new c.constructor(l.length*h);let f=0,_=0;for(let g=0,m=l.length;g<m;g++){o.isInterleavedBufferAttribute?f=l[g]*o.data.stride+o.offset:f=l[g]*h;for(let u=0;u<h;u++)p[_++]=c[f++]}return new fn(p,h,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new Ve,n=this.index.array,r=this.attributes;for(const o in r){const l=r[o],c=t(l,n);e.setAttribute(o,c)}const s=this.morphAttributes;for(const o in s){const l=[],c=s[o];for(let h=0,d=c.length;h<d;h++){const p=c[h],f=t(p,n);l.push(f)}e.morphAttributes[o]=l}e.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const l in n){const c=n[l];t.data.attributes[l]=c.toJSON(t.data)}const r={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let d=0,p=c.length;d<p;d++){const f=c[d];h.push(f.toJSON(t.data))}h.length>0&&(r[l]=h,s=!0)}s&&(t.data.morphAttributes=r,t.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(t.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone(e));const r=t.attributes;for(const c in r){const h=r[c];this.setAttribute(c,h.clone(e))}const s=t.morphAttributes;for(const c in s){const h=[],d=s[c];for(let p=0,f=d.length;p<f;p++)h.push(d[p].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;const a=t.groups;for(let c=0,h=a.length;c<h;c++){const d=a[c];this.addGroup(d.start,d.count,d.materialIndex)}const o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const bl=new fe,ii=new Vs,qr=new Hs,El=new F,Yr=new F,jr=new F,Kr=new F,va=new F,Zr=new F,Tl=new F,Jr=new F;class Ke extends Ee{constructor(t=new Ve,e=new oh){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const r=e[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(t,e){const n=this.geometry,r=n.attributes.position,s=n.morphAttributes.position,a=n.morphTargetsRelative;e.fromBufferAttribute(r,t);const o=this.morphTargetInfluences;if(s&&o){Zr.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const h=o[l],d=s[l];h!==0&&(va.fromBufferAttribute(d,t),a?Zr.addScaledVector(va,h):Zr.addScaledVector(va.sub(e),h))}e.add(Zr)}return e}raycast(t,e){const n=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),qr.copy(n.boundingSphere),qr.applyMatrix4(s),ii.copy(t.ray).recast(t.near),!(qr.containsPoint(ii.origin)===!1&&(ii.intersectSphere(qr,El)===null||ii.origin.distanceToSquared(El)>(t.far-t.near)**2))&&(bl.copy(s).invert(),ii.copy(t.ray).applyMatrix4(bl),!(n.boundingBox!==null&&ii.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,ii)))}_computeIntersections(t,e,n){let r;const s=this.geometry,a=this.material,o=s.index,l=s.attributes.position,c=s.attributes.uv,h=s.attributes.uv1,d=s.attributes.normal,p=s.groups,f=s.drawRange;if(o!==null)if(Array.isArray(a))for(let _=0,g=p.length;_<g;_++){const m=p[_],u=a[m.materialIndex],A=Math.max(m.start,f.start),T=Math.min(o.count,Math.min(m.start+m.count,f.start+f.count));for(let M=A,L=T;M<L;M+=3){const R=o.getX(M),C=o.getX(M+1),I=o.getX(M+2);r=Qr(this,u,t,n,c,h,d,R,C,I),r&&(r.faceIndex=Math.floor(M/3),r.face.materialIndex=m.materialIndex,e.push(r))}}else{const _=Math.max(0,f.start),g=Math.min(o.count,f.start+f.count);for(let m=_,u=g;m<u;m+=3){const A=o.getX(m),T=o.getX(m+1),M=o.getX(m+2);r=Qr(this,a,t,n,c,h,d,A,T,M),r&&(r.faceIndex=Math.floor(m/3),e.push(r))}}else if(l!==void 0)if(Array.isArray(a))for(let _=0,g=p.length;_<g;_++){const m=p[_],u=a[m.materialIndex],A=Math.max(m.start,f.start),T=Math.min(l.count,Math.min(m.start+m.count,f.start+f.count));for(let M=A,L=T;M<L;M+=3){const R=M,C=M+1,I=M+2;r=Qr(this,u,t,n,c,h,d,R,C,I),r&&(r.faceIndex=Math.floor(M/3),r.face.materialIndex=m.materialIndex,e.push(r))}}else{const _=Math.max(0,f.start),g=Math.min(l.count,f.start+f.count);for(let m=_,u=g;m<u;m+=3){const A=m,T=m+1,M=m+2;r=Qr(this,a,t,n,c,h,d,A,T,M),r&&(r.faceIndex=Math.floor(m/3),e.push(r))}}}}function Xd(i,t,e,n,r,s,a,o){let l;if(t.side===He?l=n.intersectTriangle(a,s,r,!0,o):l=n.intersectTriangle(r,s,a,t.side===jn,o),l===null)return null;Jr.copy(o),Jr.applyMatrix4(i.matrixWorld);const c=e.ray.origin.distanceTo(Jr);return c<e.near||c>e.far?null:{distance:c,point:Jr.clone(),object:i}}function Qr(i,t,e,n,r,s,a,o,l,c){i.getVertexPosition(o,Yr),i.getVertexPosition(l,jr),i.getVertexPosition(c,Kr);const h=Xd(i,t,e,n,Yr,jr,Kr,Tl);if(h){const d=new F;nn.getBarycoord(Tl,Yr,jr,Kr,d),r&&(h.uv=nn.getInterpolatedAttribute(r,o,l,c,d,new Rt)),s&&(h.uv1=nn.getInterpolatedAttribute(s,o,l,c,d,new Rt)),a&&(h.normal=nn.getInterpolatedAttribute(a,o,l,c,d,new F),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const p={a:o,b:l,c,normal:new F,materialIndex:0};nn.getNormal(Yr,jr,Kr,p.normal),h.face=p,h.barycoord=d}return h}class Kn extends Ve{constructor(t=1,e=1,n=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:r,heightSegments:s,depthSegments:a};const o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);const l=[],c=[],h=[],d=[];let p=0,f=0;_("z","y","x",-1,-1,n,e,t,a,s,0),_("z","y","x",1,-1,n,e,-t,a,s,1),_("x","z","y",1,1,t,n,e,r,a,2),_("x","z","y",1,-1,t,n,-e,r,a,3),_("x","y","z",1,-1,t,e,n,r,s,4),_("x","y","z",-1,-1,t,e,-n,r,s,5),this.setIndex(l),this.setAttribute("position",new me(c,3)),this.setAttribute("normal",new me(h,3)),this.setAttribute("uv",new me(d,2));function _(g,m,u,A,T,M,L,R,C,I,b){const x=M/C,P=L/I,G=M/2,B=L/2,Z=R/2,rt=C+1,W=I+1;let at=0,V=0;const _t=new F;for(let tt=0;tt<W;tt++){const xt=tt*P-B;for(let Nt=0;Nt<rt;Nt++){const bt=Nt*x-G;_t[g]=bt*A,_t[m]=xt*T,_t[u]=Z,c.push(_t.x,_t.y,_t.z),_t[g]=0,_t[m]=0,_t[u]=R>0?1:-1,h.push(_t.x,_t.y,_t.z),d.push(Nt/C),d.push(1-tt/I),at+=1}}for(let tt=0;tt<I;tt++)for(let xt=0;xt<C;xt++){const Nt=p+xt+rt*tt,bt=p+xt+rt*(tt+1),q=p+(xt+1)+rt*(tt+1),H=p+(xt+1)+rt*tt;l.push(Nt,bt,H),l.push(bt,q,H),V+=6}o.addGroup(f,V,b),f+=V,p+=at}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Kn(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function hr(i){const t={};for(const e in i){t[e]={};for(const n in i[e]){const r=i[e][n];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=r.clone():Array.isArray(r)?t[e][n]=r.slice():t[e][n]=r}}return t}function Fe(i){const t={};for(let e=0;e<i.length;e++){const n=hr(i[e]);for(const r in n)t[r]=n[r]}return t}function qd(i){const t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function hh(i){const t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:ie.workingColorSpace}const Yd={clone:hr,merge:Fe};var jd=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Kd=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Zn extends Si{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=jd,this.fragmentShader=Kd,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=hr(t.uniforms),this.uniformsGroups=qd(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const r in this.uniforms){const a=this.uniforms[r].value;a&&a.isTexture?e.uniforms[r]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[r]={type:"m4",value:a.toArray()}:e.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const r in this.extensions)this.extensions[r]===!0&&(n[r]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}class uh extends Ee{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new fe,this.projectionMatrix=new fe,this.projectionMatrixInverse=new fe,this.coordinateSystem=Pn}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const kn=new F,Al=new Rt,wl=new Rt;class qe extends uh{constructor(t=50,e=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=bo*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(vs*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return bo*2*Math.atan(Math.tan(vs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){kn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(kn.x,kn.y).multiplyScalar(-t/kn.z),kn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(kn.x,kn.y).multiplyScalar(-t/kn.z)}getViewSize(t,e){return this.getViewBounds(t,Al,wl),e.subVectors(wl,Al)}setViewOffset(t,e,n,r,s,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(vs*.5*this.fov)/this.zoom,n=2*e,r=this.aspect*n,s=-.5*r;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,c=a.fullHeight;s+=a.offsetX*r/l,e-=a.offsetY*n/c,r*=a.width/l,n*=a.height/c}const o=this.filmOffset;o!==0&&(s+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,e,e-n,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const Ui=-90,Ni=1;class Zd extends Ee{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new qe(Ui,Ni,t,e);r.layers=this.layers,this.add(r);const s=new qe(Ui,Ni,t,e);s.layers=this.layers,this.add(s);const a=new qe(Ui,Ni,t,e);a.layers=this.layers,this.add(a);const o=new qe(Ui,Ni,t,e);o.layers=this.layers,this.add(o);const l=new qe(Ui,Ni,t,e);l.layers=this.layers,this.add(l);const c=new qe(Ui,Ni,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,r,s,a,o,l]=e;for(const c of e)this.remove(c);if(t===Pn)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Is)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[s,a,o,l,c,h]=this.children,d=t.getRenderTarget(),p=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),_=t.xr.enabled;t.xr.enabled=!1;const g=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,r),t.render(e,s),t.setRenderTarget(n,1,r),t.render(e,a),t.setRenderTarget(n,2,r),t.render(e,o),t.setRenderTarget(n,3,r),t.render(e,l),t.setRenderTarget(n,4,r),t.render(e,c),n.texture.generateMipmaps=g,t.setRenderTarget(n,5,r),t.render(e,h),t.setRenderTarget(d,p,f),t.xr.enabled=_,n.texture.needsPMREMUpdate=!0}}class dh extends Oe{constructor(t,e,n,r,s,a,o,l,c,h){t=t!==void 0?t:[],e=e!==void 0?e:sr,super(t,e,n,r,s,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class Jd extends _i{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},r=[n,n,n,n,n,n];this.texture=new dh(r,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:gn}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Kn(5,5,5),s=new Zn({name:"CubemapFromEquirect",uniforms:hr(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:He,blending:Gn});s.uniforms.tEquirect.value=e;const a=new Ke(r,s),o=e.minFilter;return e.minFilter===ui&&(e.minFilter=gn),new Zd(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e,n,r){const s=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,n,r);t.setRenderTarget(s)}}class fh extends Ee{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new xn,this.environmentIntensity=1,this.environmentRotation=new xn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class Qd{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=Mo,this.updateRanges=[],this.version=0,this.uuid=Xn()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,n){t*=this.stride,n*=e.stride;for(let r=0,s=this.stride;r<s;r++)this.array[t+r]=e.array[n+r];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Xn()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const e=new this.array.constructor(t.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(e,this.stride);return n.setUsage(this.usage),n}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){return t.arrayBuffers===void 0&&(t.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Xn()),t.arrayBuffers[this.array.buffer._uuid]===void 0&&(t.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const Ne=new F;class Ns{constructor(t,e,n,r=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=n,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,n=this.data.count;e<n;e++)Ne.fromBufferAttribute(this,e),Ne.applyMatrix4(t),this.setXYZ(e,Ne.x,Ne.y,Ne.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Ne.fromBufferAttribute(this,e),Ne.applyNormalMatrix(t),this.setXYZ(e,Ne.x,Ne.y,Ne.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Ne.fromBufferAttribute(this,e),Ne.transformDirection(t),this.setXYZ(e,Ne.x,Ne.y,Ne.z);return this}getComponent(t,e){let n=this.array[t*this.data.stride+this.offset+e];return this.normalized&&(n=_n(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=he(n,this.array)),this.data.array[t*this.data.stride+this.offset+e]=n,this}setX(t,e){return this.normalized&&(e=he(e,this.array)),this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.normalized&&(e=he(e,this.array)),this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.normalized&&(e=he(e,this.array)),this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.normalized&&(e=he(e,this.array)),this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(e=_n(e,this.array)),e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(e=_n(e,this.array)),e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(e=_n(e,this.array)),e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(e=_n(e,this.array)),e}setXY(t,e,n){return t=t*this.data.stride+this.offset,this.normalized&&(e=he(e,this.array),n=he(n,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this}setXYZ(t,e,n,r){return t=t*this.data.stride+this.offset,this.normalized&&(e=he(e,this.array),n=he(n,this.array),r=he(r,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=r,this}setXYZW(t,e,n,r,s){return t=t*this.data.stride+this.offset,this.normalized&&(e=he(e,this.array),n=he(n,this.array),r=he(r,this.array),s=he(s,this.array)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=r,this.data.array[t+3]=s,this}clone(t){if(t===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const e=[];for(let n=0;n<this.count;n++){const r=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)e.push(this.data.array[r+s])}return new fn(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new Ns(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const e=[];for(let n=0;n<this.count;n++){const r=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)e.push(this.data.array[r+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}class ph extends Si{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Qt(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}let Fi;const xr=new F,Oi=new F,Bi=new F,$i=new Rt,Sr=new Rt,mh=new fe,ts=new F,yr=new F,es=new F,Cl=new Rt,xa=new Rt,Rl=new Rt;class tf extends Ee{constructor(t=new ph){if(super(),this.isSprite=!0,this.type="Sprite",Fi===void 0){Fi=new Ve;const e=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new Qd(e,5);Fi.setIndex([0,1,2,0,2,3]),Fi.setAttribute("position",new Ns(n,3,0,!1)),Fi.setAttribute("uv",new Ns(n,2,3,!1))}this.geometry=Fi,this.material=t,this.center=new Rt(.5,.5)}raycast(t,e){t.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),Oi.setFromMatrixScale(this.matrixWorld),mh.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),Bi.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Oi.multiplyScalar(-Bi.z);const n=this.material.rotation;let r,s;n!==0&&(s=Math.cos(n),r=Math.sin(n));const a=this.center;ns(ts.set(-.5,-.5,0),Bi,a,Oi,r,s),ns(yr.set(.5,-.5,0),Bi,a,Oi,r,s),ns(es.set(.5,.5,0),Bi,a,Oi,r,s),Cl.set(0,0),xa.set(1,0),Rl.set(1,1);let o=t.ray.intersectTriangle(ts,yr,es,!1,xr);if(o===null&&(ns(yr.set(-.5,.5,0),Bi,a,Oi,r,s),xa.set(0,1),o=t.ray.intersectTriangle(ts,es,yr,!1,xr),o===null))return;const l=t.ray.origin.distanceTo(xr);l<t.near||l>t.far||e.push({distance:l,point:xr.clone(),uv:nn.getInterpolation(xr,ts,yr,es,Cl,xa,Rl,new Rt),face:null,object:this})}copy(t,e){return super.copy(t,e),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}}function ns(i,t,e,n,r,s){$i.subVectors(i,e).addScalar(.5).multiply(n),r!==void 0?(Sr.x=s*$i.x-r*$i.y,Sr.y=r*$i.x+s*$i.y):Sr.copy($i),i.copy(t),i.x+=Sr.x,i.y+=Sr.y,i.applyMatrix4(mh)}const Sa=new F,ef=new F,nf=new Kt;class Hn{constructor(t=new F(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,r){return this.normal.set(t,e,n),this.constant=r,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const r=Sa.subVectors(n,e).cross(ef.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(r,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const n=t.delta(Sa),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const s=-(t.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:e.copy(t.start).addScaledVector(n,s)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||nf.getNormalMatrix(t),r=this.coplanarPoint(Sa).applyMatrix4(t),s=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(s),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const ri=new Hs,is=new F;class Oo{constructor(t=new Hn,e=new Hn,n=new Hn,r=new Hn,s=new Hn,a=new Hn){this.planes=[t,e,n,r,s,a]}set(t,e,n,r,s,a){const o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(n),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Pn){const n=this.planes,r=t.elements,s=r[0],a=r[1],o=r[2],l=r[3],c=r[4],h=r[5],d=r[6],p=r[7],f=r[8],_=r[9],g=r[10],m=r[11],u=r[12],A=r[13],T=r[14],M=r[15];if(n[0].setComponents(l-s,p-c,m-f,M-u).normalize(),n[1].setComponents(l+s,p+c,m+f,M+u).normalize(),n[2].setComponents(l+a,p+h,m+_,M+A).normalize(),n[3].setComponents(l-a,p-h,m-_,M-A).normalize(),n[4].setComponents(l-o,p-d,m-g,M-T).normalize(),e===Pn)n[5].setComponents(l+o,p+d,m+g,M+T).normalize();else if(e===Is)n[5].setComponents(o,d,g,T).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),ri.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),ri.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(ri)}intersectsSprite(t){return ri.center.set(0,0,0),ri.radius=.7071067811865476,ri.applyMatrix4(t.matrixWorld),this.intersectsSphere(ri)}intersectsSphere(t){const e=this.planes,n=t.center,r=-t.radius;for(let s=0;s<6;s++)if(e[s].distanceToPoint(n)<r)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const r=e[n];if(is.x=r.normal.x>0?t.max.x:t.min.x,is.y=r.normal.y>0?t.max.y:t.min.y,is.z=r.normal.z>0?t.max.z:t.min.z,r.distanceToPoint(is)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class _h extends Si{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Qt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}}const Fs=new F,Os=new F,Pl=new fe,Mr=new Vs,rs=new Hs,ya=new F,Ll=new F;class rf extends Ee{constructor(t=new Ve,e=new _h){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,n=[0];for(let r=1,s=e.count;r<s;r++)Fs.fromBufferAttribute(e,r-1),Os.fromBufferAttribute(e,r),n[r]=n[r-1],n[r]+=Fs.distanceTo(Os);t.setAttribute("lineDistance",new me(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(t,e){const n=this.geometry,r=this.matrixWorld,s=t.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),rs.copy(n.boundingSphere),rs.applyMatrix4(r),rs.radius+=s,t.ray.intersectsSphere(rs)===!1)return;Pl.copy(r).invert(),Mr.copy(t.ray).applyMatrix4(Pl);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,h=n.index,p=n.attributes.position;if(h!==null){const f=Math.max(0,a.start),_=Math.min(h.count,a.start+a.count);for(let g=f,m=_-1;g<m;g+=c){const u=h.getX(g),A=h.getX(g+1),T=ss(this,t,Mr,l,u,A);T&&e.push(T)}if(this.isLineLoop){const g=h.getX(_-1),m=h.getX(f),u=ss(this,t,Mr,l,g,m);u&&e.push(u)}}else{const f=Math.max(0,a.start),_=Math.min(p.count,a.start+a.count);for(let g=f,m=_-1;g<m;g+=c){const u=ss(this,t,Mr,l,g,g+1);u&&e.push(u)}if(this.isLineLoop){const g=ss(this,t,Mr,l,_-1,f);g&&e.push(g)}}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const r=e[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}}function ss(i,t,e,n,r,s){const a=i.geometry.attributes.position;if(Fs.fromBufferAttribute(a,r),Os.fromBufferAttribute(a,s),e.distanceSqToSegment(Fs,Os,ya,Ll)>n)return;ya.applyMatrix4(i.matrixWorld);const l=t.ray.origin.distanceTo(ya);if(!(l<t.near||l>t.far))return{distance:l,point:Ll.clone().applyMatrix4(i.matrixWorld),index:r,face:null,faceIndex:null,barycoord:null,object:i}}const Dl=new F,Il=new F;class sf extends rf{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,n=[];for(let r=0,s=e.count;r<s;r+=2)Dl.fromBufferAttribute(e,r),Il.fromBufferAttribute(e,r+1),n[r]=r===0?0:n[r-1],n[r+1]=n[r]+Dl.distanceTo(Il);t.setAttribute("lineDistance",new me(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Vi extends Ee{constructor(){super(),this.isGroup=!0,this.type="Group"}}class af extends Oe{constructor(t,e,n,r,s,a,o,l,c){super(t,e,n,r,s,a,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class gh extends Oe{constructor(t,e,n,r,s,a,o,l,c,h=Zi){if(h!==Zi&&h!==lr)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===Zi&&(n=mi),n===void 0&&h===lr&&(n=or),super(null,r,s,a,o,l,h,n,c),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=o!==void 0?o:dn,this.minFilter=l!==void 0?l:dn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}class Sn{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,r=this.getPoint(0),s=0;e.push(0);for(let a=1;a<=t;a++)n=this.getPoint(a/t),s+=n.distanceTo(r),e.push(s),r=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e){const n=this.getLengths();let r=0;const s=n.length;let a;e?a=e:a=t*n[s-1];let o=0,l=s-1,c;for(;o<=l;)if(r=Math.floor(o+(l-o)/2),c=n[r]-a,c<0)o=r+1;else if(c>0)l=r-1;else{l=r;break}if(r=l,n[r]===a)return r/(s-1);const h=n[r],p=n[r+1]-h,f=(a-h)/p;return(r+f)/(s-1)}getTangent(t,e){let r=t-1e-4,s=t+1e-4;r<0&&(r=0),s>1&&(s=1);const a=this.getPoint(r),o=this.getPoint(s),l=e||(a.isVector2?new Rt:new F);return l.copy(o).sub(a).normalize(),l}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e){const n=new F,r=[],s=[],a=[],o=new F,l=new fe;for(let f=0;f<=t;f++){const _=f/t;r[f]=this.getTangentAt(_,new F)}s[0]=new F,a[0]=new F;let c=Number.MAX_VALUE;const h=Math.abs(r[0].x),d=Math.abs(r[0].y),p=Math.abs(r[0].z);h<=c&&(c=h,n.set(1,0,0)),d<=c&&(c=d,n.set(0,1,0)),p<=c&&n.set(0,0,1),o.crossVectors(r[0],n).normalize(),s[0].crossVectors(r[0],o),a[0].crossVectors(r[0],s[0]);for(let f=1;f<=t;f++){if(s[f]=s[f-1].clone(),a[f]=a[f-1].clone(),o.crossVectors(r[f-1],r[f]),o.length()>Number.EPSILON){o.normalize();const _=Math.acos(Jt(r[f-1].dot(r[f]),-1,1));s[f].applyMatrix4(l.makeRotationAxis(o,_))}a[f].crossVectors(r[f],s[f])}if(e===!0){let f=Math.acos(Jt(s[0].dot(s[t]),-1,1));f/=t,r[0].dot(o.crossVectors(s[0],s[t]))>0&&(f=-f);for(let _=1;_<=t;_++)s[_].applyMatrix4(l.makeRotationAxis(r[_],f*_)),a[_].crossVectors(r[_],s[_])}return{tangents:r,normals:s,binormals:a}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class Bo extends Sn{constructor(t=0,e=0,n=1,r=1,s=0,a=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=r,this.aStartAngle=s,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(t,e=new Rt){const n=e,r=Math.PI*2;let s=this.aEndAngle-this.aStartAngle;const a=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=r;for(;s>r;)s-=r;s<Number.EPSILON&&(a?s=0:s=r),this.aClockwise===!0&&!a&&(s===r?s=-r:s=s-r);const o=this.aStartAngle+t*s;let l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){const h=Math.cos(this.aRotation),d=Math.sin(this.aRotation),p=l-this.aX,f=c-this.aY;l=p*h-f*d+this.aX,c=p*d+f*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class of extends Bo{constructor(t,e,n,r,s,a){super(t,e,n,n,r,s,a),this.isArcCurve=!0,this.type="ArcCurve"}}function $o(){let i=0,t=0,e=0,n=0;function r(s,a,o,l){i=s,t=o,e=-3*s+3*a-2*o-l,n=2*s-2*a+o+l}return{initCatmullRom:function(s,a,o,l,c){r(a,o,c*(o-s),c*(l-a))},initNonuniformCatmullRom:function(s,a,o,l,c,h,d){let p=(a-s)/c-(o-s)/(c+h)+(o-a)/h,f=(o-a)/h-(l-a)/(h+d)+(l-o)/d;p*=h,f*=h,r(a,o,p,f)},calc:function(s){const a=s*s,o=a*s;return i+t*s+e*a+n*o}}}const as=new F,Ma=new $o,ba=new $o,Ea=new $o;class lf extends Sn{constructor(t=[],e=!1,n="centripetal",r=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=r}getPoint(t,e=new F){const n=e,r=this.points,s=r.length,a=(s-(this.closed?0:1))*t;let o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/s)+1)*s:l===0&&o===s-1&&(o=s-2,l=1);let c,h;this.closed||o>0?c=r[(o-1)%s]:(as.subVectors(r[0],r[1]).add(r[0]),c=as);const d=r[o%s],p=r[(o+1)%s];if(this.closed||o+2<s?h=r[(o+2)%s]:(as.subVectors(r[s-1],r[s-2]).add(r[s-1]),h=as),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let _=Math.pow(c.distanceToSquared(d),f),g=Math.pow(d.distanceToSquared(p),f),m=Math.pow(p.distanceToSquared(h),f);g<1e-4&&(g=1),_<1e-4&&(_=g),m<1e-4&&(m=g),Ma.initNonuniformCatmullRom(c.x,d.x,p.x,h.x,_,g,m),ba.initNonuniformCatmullRom(c.y,d.y,p.y,h.y,_,g,m),Ea.initNonuniformCatmullRom(c.z,d.z,p.z,h.z,_,g,m)}else this.curveType==="catmullrom"&&(Ma.initCatmullRom(c.x,d.x,p.x,h.x,this.tension),ba.initCatmullRom(c.y,d.y,p.y,h.y,this.tension),Ea.initCatmullRom(c.z,d.z,p.z,h.z,this.tension));return n.set(Ma.calc(l),ba.calc(l),Ea.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const r=t.points[e];this.points.push(r.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const r=this.points[e];t.points.push(r.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const r=t.points[e];this.points.push(new F().fromArray(r))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function Ul(i,t,e,n,r){const s=(n-t)*.5,a=(r-e)*.5,o=i*i,l=i*o;return(2*e-2*n+s+a)*l+(-3*e+3*n-2*s-a)*o+s*i+e}function cf(i,t){const e=1-i;return e*e*t}function hf(i,t){return 2*(1-i)*i*t}function uf(i,t){return i*i*t}function Tr(i,t,e,n){return cf(i,t)+hf(i,e)+uf(i,n)}function df(i,t){const e=1-i;return e*e*e*t}function ff(i,t){const e=1-i;return 3*e*e*i*t}function pf(i,t){return 3*(1-i)*i*i*t}function mf(i,t){return i*i*i*t}function Ar(i,t,e,n,r){return df(i,t)+ff(i,e)+pf(i,n)+mf(i,r)}class vh extends Sn{constructor(t=new Rt,e=new Rt,n=new Rt,r=new Rt){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=r}getPoint(t,e=new Rt){const n=e,r=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set(Ar(t,r.x,s.x,a.x,o.x),Ar(t,r.y,s.y,a.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class _f extends Sn{constructor(t=new F,e=new F,n=new F,r=new F){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=r}getPoint(t,e=new F){const n=e,r=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set(Ar(t,r.x,s.x,a.x,o.x),Ar(t,r.y,s.y,a.y,o.y),Ar(t,r.z,s.z,a.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class xh extends Sn{constructor(t=new Rt,e=new Rt){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new Rt){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new Rt){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class gf extends Sn{constructor(t=new F,e=new F){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new F){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new F){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Sh extends Sn{constructor(t=new Rt,e=new Rt,n=new Rt){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new Rt){const n=e,r=this.v0,s=this.v1,a=this.v2;return n.set(Tr(t,r.x,s.x,a.x),Tr(t,r.y,s.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class vf extends Sn{constructor(t=new F,e=new F,n=new F){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new F){const n=e,r=this.v0,s=this.v1,a=this.v2;return n.set(Tr(t,r.x,s.x,a.x),Tr(t,r.y,s.y,a.y),Tr(t,r.z,s.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class yh extends Sn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new Rt){const n=e,r=this.points,s=(r.length-1)*t,a=Math.floor(s),o=s-a,l=r[a===0?a:a-1],c=r[a],h=r[a>r.length-2?r.length-1:a+1],d=r[a>r.length-3?r.length-1:a+2];return n.set(Ul(o,l.x,c.x,h.x,d.x),Ul(o,l.y,c.y,h.y,d.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const r=t.points[e];this.points.push(r.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const r=this.points[e];t.points.push(r.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const r=t.points[e];this.points.push(new Rt().fromArray(r))}return this}}var Nl=Object.freeze({__proto__:null,ArcCurve:of,CatmullRomCurve3:lf,CubicBezierCurve:vh,CubicBezierCurve3:_f,EllipseCurve:Bo,LineCurve:xh,LineCurve3:gf,QuadraticBezierCurve:Sh,QuadraticBezierCurve3:vf,SplineCurve:yh});class xf extends Sn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){const t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){const n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Nl[n](e,t))}return this}getPoint(t,e){const n=t*this.getLength(),r=this.getCurveLengths();let s=0;for(;s<r.length;){if(r[s]>=n){const a=r[s]-n,o=this.curves[s],l=o.getLength(),c=l===0?0:1-a/l;return o.getPointAt(c,e)}s++}return null}getLength(){const t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const t=[];let e=0;for(let n=0,r=this.curves.length;n<r;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){const e=[];let n;for(let r=0,s=this.curves;r<s.length;r++){const a=s[r],o=a.isEllipseCurve?t*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?t*a.points.length:t,l=a.getPoints(o);for(let c=0;c<l.length;c++){const h=l[c];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const r=t.curves[e];this.curves.push(r.clone())}return this.autoClose=t.autoClose,this}toJSON(){const t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){const r=this.curves[e];t.curves.push(r.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const r=t.curves[e];this.curves.push(new Nl[r.type]().fromJSON(r))}return this}}class Sf extends xf{constructor(t){super(),this.type="Path",this.currentPoint=new Rt,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){const n=new xh(this.currentPoint.clone(),new Rt(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,r){const s=new Sh(this.currentPoint.clone(),new Rt(t,e),new Rt(n,r));return this.curves.push(s),this.currentPoint.set(n,r),this}bezierCurveTo(t,e,n,r,s,a){const o=new vh(this.currentPoint.clone(),new Rt(t,e),new Rt(n,r),new Rt(s,a));return this.curves.push(o),this.currentPoint.set(s,a),this}splineThru(t){const e=[this.currentPoint.clone()].concat(t),n=new yh(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,r,s,a){const o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+o,e+l,n,r,s,a),this}absarc(t,e,n,r,s,a){return this.absellipse(t,e,n,n,r,s,a),this}ellipse(t,e,n,r,s,a,o,l){const c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+c,e+h,n,r,s,a,o,l),this}absellipse(t,e,n,r,s,a,o,l){const c=new Bo(t,e,n,r,s,a,o,l);if(this.curves.length>0){const d=c.getPoint(0);d.equals(this.currentPoint)||this.lineTo(d.x,d.y)}this.curves.push(c);const h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){const t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}}class zo extends Ve{constructor(t=[new Rt(0,-.5),new Rt(.5,0),new Rt(0,.5)],e=12,n=0,r=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:t,segments:e,phiStart:n,phiLength:r},e=Math.floor(e),r=Jt(r,0,Math.PI*2);const s=[],a=[],o=[],l=[],c=[],h=1/e,d=new F,p=new Rt,f=new F,_=new F,g=new F;let m=0,u=0;for(let A=0;A<=t.length-1;A++)switch(A){case 0:m=t[A+1].x-t[A].x,u=t[A+1].y-t[A].y,f.x=u*1,f.y=-m,f.z=u*0,g.copy(f),f.normalize(),l.push(f.x,f.y,f.z);break;case t.length-1:l.push(g.x,g.y,g.z);break;default:m=t[A+1].x-t[A].x,u=t[A+1].y-t[A].y,f.x=u*1,f.y=-m,f.z=u*0,_.copy(f),f.x+=g.x,f.y+=g.y,f.z+=g.z,f.normalize(),l.push(f.x,f.y,f.z),g.copy(_)}for(let A=0;A<=e;A++){const T=n+A*h*r,M=Math.sin(T),L=Math.cos(T);for(let R=0;R<=t.length-1;R++){d.x=t[R].x*M,d.y=t[R].y,d.z=t[R].x*L,a.push(d.x,d.y,d.z),p.x=A/e,p.y=R/(t.length-1),o.push(p.x,p.y);const C=l[3*R+0]*M,I=l[3*R+1],b=l[3*R+0]*L;c.push(C,I,b)}}for(let A=0;A<e;A++)for(let T=0;T<t.length-1;T++){const M=T+A*t.length,L=M,R=M+t.length,C=M+t.length+1,I=M+1;s.push(L,R,I),s.push(C,I,R)}this.setIndex(s),this.setAttribute("position",new me(a,3)),this.setAttribute("uv",new me(o,2)),this.setAttribute("normal",new me(c,3))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new zo(t.points,t.segments,t.phiStart,t.phiLength)}}class ko extends zo{constructor(t=1,e=1,n=4,r=8){const s=new Sf;s.absarc(0,-e/2,t,Math.PI*1.5,0),s.absarc(0,e/2,t,0,Math.PI*.5),super(s.getPoints(n),r),this.type="CapsuleGeometry",this.parameters={radius:t,length:e,capSegments:n,radialSegments:r}}static fromJSON(t){return new ko(t.radius,t.length,t.capSegments,t.radialSegments)}}class Gs extends Ve{constructor(t=1,e=1,n=1,r=32,s=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:r,heightSegments:s,openEnded:a,thetaStart:o,thetaLength:l};const c=this;r=Math.floor(r),s=Math.floor(s);const h=[],d=[],p=[],f=[];let _=0;const g=[],m=n/2;let u=0;A(),a===!1&&(t>0&&T(!0),e>0&&T(!1)),this.setIndex(h),this.setAttribute("position",new me(d,3)),this.setAttribute("normal",new me(p,3)),this.setAttribute("uv",new me(f,2));function A(){const M=new F,L=new F;let R=0;const C=(e-t)/n;for(let I=0;I<=s;I++){const b=[],x=I/s,P=x*(e-t)+t;for(let G=0;G<=r;G++){const B=G/r,Z=B*l+o,rt=Math.sin(Z),W=Math.cos(Z);L.x=P*rt,L.y=-x*n+m,L.z=P*W,d.push(L.x,L.y,L.z),M.set(rt,C,W).normalize(),p.push(M.x,M.y,M.z),f.push(B,1-x),b.push(_++)}g.push(b)}for(let I=0;I<r;I++)for(let b=0;b<s;b++){const x=g[b][I],P=g[b+1][I],G=g[b+1][I+1],B=g[b][I+1];(t>0||b!==0)&&(h.push(x,P,B),R+=3),(e>0||b!==s-1)&&(h.push(P,G,B),R+=3)}c.addGroup(u,R,0),u+=R}function T(M){const L=_,R=new Rt,C=new F;let I=0;const b=M===!0?t:e,x=M===!0?1:-1;for(let G=1;G<=r;G++)d.push(0,m*x,0),p.push(0,x,0),f.push(.5,.5),_++;const P=_;for(let G=0;G<=r;G++){const Z=G/r*l+o,rt=Math.cos(Z),W=Math.sin(Z);C.x=b*W,C.y=m*x,C.z=b*rt,d.push(C.x,C.y,C.z),p.push(0,x,0),R.x=rt*.5+.5,R.y=W*.5*x+.5,f.push(R.x,R.y),_++}for(let G=0;G<r;G++){const B=L+G,Z=P+G;M===!0?h.push(Z,Z+1,B):h.push(Z+1,Z,B),I+=3}c.addGroup(u,I,M===!0?1:2),u+=I}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Gs(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class Ws extends Ve{constructor(t=1,e=1,n=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:r};const s=t/2,a=e/2,o=Math.floor(n),l=Math.floor(r),c=o+1,h=l+1,d=t/o,p=e/l,f=[],_=[],g=[],m=[];for(let u=0;u<h;u++){const A=u*p-a;for(let T=0;T<c;T++){const M=T*d-s;_.push(M,-A,0),g.push(0,0,1),m.push(T/o),m.push(1-u/l)}}for(let u=0;u<l;u++)for(let A=0;A<o;A++){const T=A+c*u,M=A+c*(u+1),L=A+1+c*(u+1),R=A+1+c*u;f.push(T,M,R),f.push(M,L,R)}this.setIndex(f),this.setAttribute("position",new me(_,3)),this.setAttribute("normal",new me(g,3)),this.setAttribute("uv",new me(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ws(t.width,t.height,t.widthSegments,t.heightSegments)}}class Ho extends Ve{constructor(t=1,e=32,n=16,r=0,s=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:r,phiLength:s,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));const l=Math.min(a+o,Math.PI);let c=0;const h=[],d=new F,p=new F,f=[],_=[],g=[],m=[];for(let u=0;u<=n;u++){const A=[],T=u/n;let M=0;u===0&&a===0?M=.5/e:u===n&&l===Math.PI&&(M=-.5/e);for(let L=0;L<=e;L++){const R=L/e;d.x=-t*Math.cos(r+R*s)*Math.sin(a+T*o),d.y=t*Math.cos(a+T*o),d.z=t*Math.sin(r+R*s)*Math.sin(a+T*o),_.push(d.x,d.y,d.z),p.copy(d).normalize(),g.push(p.x,p.y,p.z),m.push(R+M,1-T),A.push(c++)}h.push(A)}for(let u=0;u<n;u++)for(let A=0;A<e;A++){const T=h[u][A+1],M=h[u][A],L=h[u+1][A],R=h[u+1][A+1];(u!==0||a>0)&&f.push(T,M,R),(u!==n-1||l<Math.PI)&&f.push(M,L,R)}this.setIndex(f),this.setAttribute("position",new me(_,3)),this.setAttribute("normal",new me(g,3)),this.setAttribute("uv",new me(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ho(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class Xs extends Ve{constructor(t=1,e=.4,n=12,r=48,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:r,arc:s},n=Math.floor(n),r=Math.floor(r);const a=[],o=[],l=[],c=[],h=new F,d=new F,p=new F;for(let f=0;f<=n;f++)for(let _=0;_<=r;_++){const g=_/r*s,m=f/n*Math.PI*2;d.x=(t+e*Math.cos(m))*Math.cos(g),d.y=(t+e*Math.cos(m))*Math.sin(g),d.z=e*Math.sin(m),o.push(d.x,d.y,d.z),h.x=t*Math.cos(g),h.y=t*Math.sin(g),p.subVectors(d,h).normalize(),l.push(p.x,p.y,p.z),c.push(_/r),c.push(f/n)}for(let f=1;f<=n;f++)for(let _=1;_<=r;_++){const g=(r+1)*f+_-1,m=(r+1)*(f-1)+_-1,u=(r+1)*(f-1)+_,A=(r+1)*f+_;a.push(g,m,A),a.push(m,u,A)}this.setIndex(a),this.setAttribute("position",new me(o,3)),this.setAttribute("normal",new me(l,3)),this.setAttribute("uv",new me(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Xs(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}}class xs extends Si{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Qt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Qt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=eh,this.normalScale=new Rt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new xn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class yf extends Si{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=md,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class Mf extends Si{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}class Mh extends Ee{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Qt(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}}class bh extends Mh{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Ee.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Qt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}}const Ta=new fe,Fl=new F,Ol=new F;class bf{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Rt(512,512),this.map=null,this.mapPass=null,this.matrix=new fe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Oo,this._frameExtents=new Rt(1,1),this._viewportCount=1,this._viewports=[new ve(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;Fl.setFromMatrixPosition(t.matrixWorld),e.position.copy(Fl),Ol.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Ol),e.updateMatrixWorld(),Ta.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Ta),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Ta)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class Eh extends uh{constructor(t=-1,e=1,n=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=n-t,a=n+t,o=r+e,l=r-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,a=s+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}class Ef extends bf{constructor(){super(new Eh(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Th extends Mh{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Ee.DEFAULT_UP),this.updateMatrix(),this.target=new Ee,this.shadow=new Ef}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}class Tf extends qe{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}const Bl=new fe;class Af{constructor(t,e,n=0,r=1/0){this.ray=new Vs(t,e),this.near=n,this.far=r,this.camera=null,this.layers=new Fo,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,(e.near+e.far)/(e.near-e.far)).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):console.error("THREE.Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return Bl.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Bl),this}intersectObject(t,e=!0,n=[]){return Eo(t,this,n,e),n.sort($l),n}intersectObjects(t,e=!0,n=[]){for(let r=0,s=t.length;r<s;r++)Eo(t[r],this,n,e);return n.sort($l),n}}function $l(i,t){return i.distance-t.distance}function Eo(i,t,e,n){let r=!0;if(i.layers.test(t.layers)&&i.raycast(t,e)===!1&&(r=!1),r===!0&&n===!0){const s=i.children;for(let a=0,o=s.length;a<o;a++)Eo(s[a],t,e,!0)}}class zl{constructor(t=1,e=0,n=0){return this.radius=t,this.phi=e,this.theta=n,this}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=Jt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(Jt(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}class wf extends sf{constructor(t=10,e=10,n=4473924,r=8947848){n=new Qt(n),r=new Qt(r);const s=e/2,a=t/e,o=t/2,l=[],c=[];for(let p=0,f=0,_=-o;p<=e;p++,_+=a){l.push(-o,0,_,o,0,_),l.push(_,0,-o,_,0,o);const g=p===s?n:r;g.toArray(c,f),f+=3,g.toArray(c,f),f+=3,g.toArray(c,f),f+=3,g.toArray(c,f),f+=3}const h=new Ve;h.setAttribute("position",new me(l,3)),h.setAttribute("color",new me(c,3));const d=new _h({vertexColors:!0,toneMapped:!1});super(h,d),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}class Cf extends xi{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(){}disconnect(){}dispose(){}update(){}}function kl(i,t,e,n){const r=Rf(n);switch(e){case Yc:return i*t;case Kc:return i*t;case Zc:return i*t*2;case Jc:return i*t/r.components*r.byteLength;case Io:return i*t/r.components*r.byteLength;case Qc:return i*t*2/r.components*r.byteLength;case Uo:return i*t*2/r.components*r.byteLength;case jc:return i*t*3/r.components*r.byteLength;case un:return i*t*4/r.components*r.byteLength;case No:return i*t*4/r.components*r.byteLength;case fs:case ps:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case ms:case _s:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Ka:case Ja:return Math.max(i,16)*Math.max(t,8)/4;case ja:case Za:return Math.max(i,8)*Math.max(t,8)/2;case Qa:case to:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case eo:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case no:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case io:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case ro:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case so:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case ao:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case oo:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case lo:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case co:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case ho:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case uo:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case fo:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case po:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case mo:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case _o:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case gs:case go:case vo:return Math.ceil(i/4)*Math.ceil(t/4)*16;case th:case xo:return Math.ceil(i/4)*Math.ceil(t/4)*8;case So:case yo:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Rf(i){switch(i){case Un:case Wc:return{byteLength:1,components:1};case Pr:case Xc:case Dr:return{byteLength:2,components:1};case Lo:case Do:return{byteLength:2,components:4};case mi:case Po:case Rn:return{byteLength:4,components:1};case qc:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Ro}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Ro);/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Ah(){let i=null,t=!1,e=null,n=null;function r(s,a){e(s,a),n=i.requestAnimationFrame(r)}return{start:function(){t!==!0&&e!==null&&(n=i.requestAnimationFrame(r),t=!0)},stop:function(){i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(s){e=s},setContext:function(s){i=s}}}function Pf(i){const t=new WeakMap;function e(o,l){const c=o.array,h=o.usage,d=c.byteLength,p=i.createBuffer();i.bindBuffer(l,p),i.bufferData(l,c,h),o.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:p,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:d}}function n(o,l,c){const h=l.array,d=l.updateRanges;if(i.bindBuffer(c,o),d.length===0)i.bufferSubData(c,0,h);else{d.sort((f,_)=>f.start-_.start);let p=0;for(let f=1;f<d.length;f++){const _=d[p],g=d[f];g.start<=_.start+_.count+1?_.count=Math.max(_.count,g.start+g.count-_.start):(++p,d[p]=g)}d.length=p+1;for(let f=0,_=d.length;f<_;f++){const g=d[f];i.bufferSubData(c,g.start*h.BYTES_PER_ELEMENT,h,g.start,g.count)}l.clearUpdateRanges()}l.onUploadCallback()}function r(o){return o.isInterleavedBufferAttribute&&(o=o.data),t.get(o)}function s(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=t.get(o);l&&(i.deleteBuffer(l.buffer),t.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const h=t.get(o);(!h||h.version<o.version)&&t.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const c=t.get(o);if(c===void 0)t.set(o,e(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:r,remove:s,update:a}}var Lf=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Df=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,If=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Uf=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Nf=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Ff=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Of=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Bf=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,$f=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,zf=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,kf=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Hf=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Vf=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Gf=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Wf=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Xf=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,qf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Yf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,jf=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Kf=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Zf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Jf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Qf=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,tp=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,ep=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,np=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,ip=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,rp=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,sp=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,ap=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,op="gl_FragColor = linearToOutputTexel( gl_FragColor );",lp=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,cp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,hp=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,up=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,dp=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,fp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,pp=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,mp=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,_p=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,gp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,vp=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,xp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Sp=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,yp=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Mp=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,bp=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Ep=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Tp=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Ap=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,wp=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Cp=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Rp=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Pp=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Lp=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Dp=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ip=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Up=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Np=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Fp=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Op=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Bp=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,$p=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,zp=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,kp=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Hp=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Vp=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Gp=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Wp=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Xp=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,qp=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Yp=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,jp=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Kp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Zp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Jp=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Qp=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,tm=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,em=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,nm=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,im=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,rm=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,sm=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,am=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,om=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,lm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,cm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,hm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,um=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,dm=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,fm=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,pm=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,mm=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,_m=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,gm=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,vm=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,xm=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Sm=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,ym=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Mm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,bm=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Em=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Tm=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Am=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,wm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Cm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Rm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Pm=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Lm=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Dm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Im=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Um=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Nm=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Fm=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Om=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Bm=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,$m=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,zm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,km=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Hm=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Vm=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Gm=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Wm=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Xm=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,qm=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ym=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,jm=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Km=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Zm=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Jm=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Qm=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,t_=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,e_=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,n_=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,i_=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,r_=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,s_=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,a_=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,o_=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,l_=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,c_=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Zt={alphahash_fragment:Lf,alphahash_pars_fragment:Df,alphamap_fragment:If,alphamap_pars_fragment:Uf,alphatest_fragment:Nf,alphatest_pars_fragment:Ff,aomap_fragment:Of,aomap_pars_fragment:Bf,batching_pars_vertex:$f,batching_vertex:zf,begin_vertex:kf,beginnormal_vertex:Hf,bsdfs:Vf,iridescence_fragment:Gf,bumpmap_pars_fragment:Wf,clipping_planes_fragment:Xf,clipping_planes_pars_fragment:qf,clipping_planes_pars_vertex:Yf,clipping_planes_vertex:jf,color_fragment:Kf,color_pars_fragment:Zf,color_pars_vertex:Jf,color_vertex:Qf,common:tp,cube_uv_reflection_fragment:ep,defaultnormal_vertex:np,displacementmap_pars_vertex:ip,displacementmap_vertex:rp,emissivemap_fragment:sp,emissivemap_pars_fragment:ap,colorspace_fragment:op,colorspace_pars_fragment:lp,envmap_fragment:cp,envmap_common_pars_fragment:hp,envmap_pars_fragment:up,envmap_pars_vertex:dp,envmap_physical_pars_fragment:bp,envmap_vertex:fp,fog_vertex:pp,fog_pars_vertex:mp,fog_fragment:_p,fog_pars_fragment:gp,gradientmap_pars_fragment:vp,lightmap_pars_fragment:xp,lights_lambert_fragment:Sp,lights_lambert_pars_fragment:yp,lights_pars_begin:Mp,lights_toon_fragment:Ep,lights_toon_pars_fragment:Tp,lights_phong_fragment:Ap,lights_phong_pars_fragment:wp,lights_physical_fragment:Cp,lights_physical_pars_fragment:Rp,lights_fragment_begin:Pp,lights_fragment_maps:Lp,lights_fragment_end:Dp,logdepthbuf_fragment:Ip,logdepthbuf_pars_fragment:Up,logdepthbuf_pars_vertex:Np,logdepthbuf_vertex:Fp,map_fragment:Op,map_pars_fragment:Bp,map_particle_fragment:$p,map_particle_pars_fragment:zp,metalnessmap_fragment:kp,metalnessmap_pars_fragment:Hp,morphinstance_vertex:Vp,morphcolor_vertex:Gp,morphnormal_vertex:Wp,morphtarget_pars_vertex:Xp,morphtarget_vertex:qp,normal_fragment_begin:Yp,normal_fragment_maps:jp,normal_pars_fragment:Kp,normal_pars_vertex:Zp,normal_vertex:Jp,normalmap_pars_fragment:Qp,clearcoat_normal_fragment_begin:tm,clearcoat_normal_fragment_maps:em,clearcoat_pars_fragment:nm,iridescence_pars_fragment:im,opaque_fragment:rm,packing:sm,premultiplied_alpha_fragment:am,project_vertex:om,dithering_fragment:lm,dithering_pars_fragment:cm,roughnessmap_fragment:hm,roughnessmap_pars_fragment:um,shadowmap_pars_fragment:dm,shadowmap_pars_vertex:fm,shadowmap_vertex:pm,shadowmask_pars_fragment:mm,skinbase_vertex:_m,skinning_pars_vertex:gm,skinning_vertex:vm,skinnormal_vertex:xm,specularmap_fragment:Sm,specularmap_pars_fragment:ym,tonemapping_fragment:Mm,tonemapping_pars_fragment:bm,transmission_fragment:Em,transmission_pars_fragment:Tm,uv_pars_fragment:Am,uv_pars_vertex:wm,uv_vertex:Cm,worldpos_vertex:Rm,background_vert:Pm,background_frag:Lm,backgroundCube_vert:Dm,backgroundCube_frag:Im,cube_vert:Um,cube_frag:Nm,depth_vert:Fm,depth_frag:Om,distanceRGBA_vert:Bm,distanceRGBA_frag:$m,equirect_vert:zm,equirect_frag:km,linedashed_vert:Hm,linedashed_frag:Vm,meshbasic_vert:Gm,meshbasic_frag:Wm,meshlambert_vert:Xm,meshlambert_frag:qm,meshmatcap_vert:Ym,meshmatcap_frag:jm,meshnormal_vert:Km,meshnormal_frag:Zm,meshphong_vert:Jm,meshphong_frag:Qm,meshphysical_vert:t_,meshphysical_frag:e_,meshtoon_vert:n_,meshtoon_frag:i_,points_vert:r_,points_frag:s_,shadow_vert:a_,shadow_frag:o_,sprite_vert:l_,sprite_frag:c_},Lt={common:{diffuse:{value:new Qt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Kt},alphaMap:{value:null},alphaMapTransform:{value:new Kt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Kt}},envmap:{envMap:{value:null},envMapRotation:{value:new Kt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Kt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Kt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Kt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Kt},normalScale:{value:new Rt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Kt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Kt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Kt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Kt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Qt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Qt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Kt},alphaTest:{value:0},uvTransform:{value:new Kt}},sprite:{diffuse:{value:new Qt(16777215)},opacity:{value:1},center:{value:new Rt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Kt},alphaMap:{value:null},alphaMapTransform:{value:new Kt},alphaTest:{value:0}}},mn={basic:{uniforms:Fe([Lt.common,Lt.specularmap,Lt.envmap,Lt.aomap,Lt.lightmap,Lt.fog]),vertexShader:Zt.meshbasic_vert,fragmentShader:Zt.meshbasic_frag},lambert:{uniforms:Fe([Lt.common,Lt.specularmap,Lt.envmap,Lt.aomap,Lt.lightmap,Lt.emissivemap,Lt.bumpmap,Lt.normalmap,Lt.displacementmap,Lt.fog,Lt.lights,{emissive:{value:new Qt(0)}}]),vertexShader:Zt.meshlambert_vert,fragmentShader:Zt.meshlambert_frag},phong:{uniforms:Fe([Lt.common,Lt.specularmap,Lt.envmap,Lt.aomap,Lt.lightmap,Lt.emissivemap,Lt.bumpmap,Lt.normalmap,Lt.displacementmap,Lt.fog,Lt.lights,{emissive:{value:new Qt(0)},specular:{value:new Qt(1118481)},shininess:{value:30}}]),vertexShader:Zt.meshphong_vert,fragmentShader:Zt.meshphong_frag},standard:{uniforms:Fe([Lt.common,Lt.envmap,Lt.aomap,Lt.lightmap,Lt.emissivemap,Lt.bumpmap,Lt.normalmap,Lt.displacementmap,Lt.roughnessmap,Lt.metalnessmap,Lt.fog,Lt.lights,{emissive:{value:new Qt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Zt.meshphysical_vert,fragmentShader:Zt.meshphysical_frag},toon:{uniforms:Fe([Lt.common,Lt.aomap,Lt.lightmap,Lt.emissivemap,Lt.bumpmap,Lt.normalmap,Lt.displacementmap,Lt.gradientmap,Lt.fog,Lt.lights,{emissive:{value:new Qt(0)}}]),vertexShader:Zt.meshtoon_vert,fragmentShader:Zt.meshtoon_frag},matcap:{uniforms:Fe([Lt.common,Lt.bumpmap,Lt.normalmap,Lt.displacementmap,Lt.fog,{matcap:{value:null}}]),vertexShader:Zt.meshmatcap_vert,fragmentShader:Zt.meshmatcap_frag},points:{uniforms:Fe([Lt.points,Lt.fog]),vertexShader:Zt.points_vert,fragmentShader:Zt.points_frag},dashed:{uniforms:Fe([Lt.common,Lt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Zt.linedashed_vert,fragmentShader:Zt.linedashed_frag},depth:{uniforms:Fe([Lt.common,Lt.displacementmap]),vertexShader:Zt.depth_vert,fragmentShader:Zt.depth_frag},normal:{uniforms:Fe([Lt.common,Lt.bumpmap,Lt.normalmap,Lt.displacementmap,{opacity:{value:1}}]),vertexShader:Zt.meshnormal_vert,fragmentShader:Zt.meshnormal_frag},sprite:{uniforms:Fe([Lt.sprite,Lt.fog]),vertexShader:Zt.sprite_vert,fragmentShader:Zt.sprite_frag},background:{uniforms:{uvTransform:{value:new Kt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Zt.background_vert,fragmentShader:Zt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Kt}},vertexShader:Zt.backgroundCube_vert,fragmentShader:Zt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Zt.cube_vert,fragmentShader:Zt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Zt.equirect_vert,fragmentShader:Zt.equirect_frag},distanceRGBA:{uniforms:Fe([Lt.common,Lt.displacementmap,{referencePosition:{value:new F},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Zt.distanceRGBA_vert,fragmentShader:Zt.distanceRGBA_frag},shadow:{uniforms:Fe([Lt.lights,Lt.fog,{color:{value:new Qt(0)},opacity:{value:1}}]),vertexShader:Zt.shadow_vert,fragmentShader:Zt.shadow_frag}};mn.physical={uniforms:Fe([mn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Kt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Kt},clearcoatNormalScale:{value:new Rt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Kt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Kt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Kt},sheen:{value:0},sheenColor:{value:new Qt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Kt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Kt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Kt},transmissionSamplerSize:{value:new Rt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Kt},attenuationDistance:{value:0},attenuationColor:{value:new Qt(0)},specularColor:{value:new Qt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Kt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Kt},anisotropyVector:{value:new Rt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Kt}}]),vertexShader:Zt.meshphysical_vert,fragmentShader:Zt.meshphysical_frag};const os={r:0,b:0,g:0},si=new xn,h_=new fe;function u_(i,t,e,n,r,s,a){const o=new Qt(0);let l=s===!0?0:1,c,h,d=null,p=0,f=null;function _(T){let M=T.isScene===!0?T.background:null;return M&&M.isTexture&&(M=(T.backgroundBlurriness>0?e:t).get(M)),M}function g(T){let M=!1;const L=_(T);L===null?u(o,l):L&&L.isColor&&(u(L,1),M=!0);const R=i.xr.getEnvironmentBlendMode();R==="additive"?n.buffers.color.setClear(0,0,0,1,a):R==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(i.autoClear||M)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(T,M){const L=_(M);L&&(L.isCubeTexture||L.mapping===ks)?(h===void 0&&(h=new Ke(new Kn(1,1,1),new Zn({name:"BackgroundCubeMaterial",uniforms:hr(mn.backgroundCube.uniforms),vertexShader:mn.backgroundCube.vertexShader,fragmentShader:mn.backgroundCube.fragmentShader,side:He,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(R,C,I){this.matrixWorld.copyPosition(I.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(h)),si.copy(M.backgroundRotation),si.x*=-1,si.y*=-1,si.z*=-1,L.isCubeTexture&&L.isRenderTargetTexture===!1&&(si.y*=-1,si.z*=-1),h.material.uniforms.envMap.value=L,h.material.uniforms.flipEnvMap.value=L.isCubeTexture&&L.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(h_.makeRotationFromEuler(si)),h.material.toneMapped=ie.getTransfer(L.colorSpace)!==ce,(d!==L||p!==L.version||f!==i.toneMapping)&&(h.material.needsUpdate=!0,d=L,p=L.version,f=i.toneMapping),h.layers.enableAll(),T.unshift(h,h.geometry,h.material,0,0,null)):L&&L.isTexture&&(c===void 0&&(c=new Ke(new Ws(2,2),new Zn({name:"BackgroundMaterial",uniforms:hr(mn.background.uniforms),vertexShader:mn.background.vertexShader,fragmentShader:mn.background.fragmentShader,side:jn,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=L,c.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,c.material.toneMapped=ie.getTransfer(L.colorSpace)!==ce,L.matrixAutoUpdate===!0&&L.updateMatrix(),c.material.uniforms.uvTransform.value.copy(L.matrix),(d!==L||p!==L.version||f!==i.toneMapping)&&(c.material.needsUpdate=!0,d=L,p=L.version,f=i.toneMapping),c.layers.enableAll(),T.unshift(c,c.geometry,c.material,0,0,null))}function u(T,M){T.getRGB(os,hh(i)),n.buffers.color.setClear(os.r,os.g,os.b,M,a)}function A(){h!==void 0&&(h.geometry.dispose(),h.material.dispose()),c!==void 0&&(c.geometry.dispose(),c.material.dispose())}return{getClearColor:function(){return o},setClearColor:function(T,M=1){o.set(T),l=M,u(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(T){l=T,u(o,l)},render:g,addToRenderList:m,dispose:A}}function d_(i,t){const e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},r=p(null);let s=r,a=!1;function o(x,P,G,B,Z){let rt=!1;const W=d(B,G,P);s!==W&&(s=W,c(s.object)),rt=f(x,B,G,Z),rt&&_(x,B,G,Z),Z!==null&&t.update(Z,i.ELEMENT_ARRAY_BUFFER),(rt||a)&&(a=!1,M(x,P,G,B),Z!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(Z).buffer))}function l(){return i.createVertexArray()}function c(x){return i.bindVertexArray(x)}function h(x){return i.deleteVertexArray(x)}function d(x,P,G){const B=G.wireframe===!0;let Z=n[x.id];Z===void 0&&(Z={},n[x.id]=Z);let rt=Z[P.id];rt===void 0&&(rt={},Z[P.id]=rt);let W=rt[B];return W===void 0&&(W=p(l()),rt[B]=W),W}function p(x){const P=[],G=[],B=[];for(let Z=0;Z<e;Z++)P[Z]=0,G[Z]=0,B[Z]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:P,enabledAttributes:G,attributeDivisors:B,object:x,attributes:{},index:null}}function f(x,P,G,B){const Z=s.attributes,rt=P.attributes;let W=0;const at=G.getAttributes();for(const V in at)if(at[V].location>=0){const tt=Z[V];let xt=rt[V];if(xt===void 0&&(V==="instanceMatrix"&&x.instanceMatrix&&(xt=x.instanceMatrix),V==="instanceColor"&&x.instanceColor&&(xt=x.instanceColor)),tt===void 0||tt.attribute!==xt||xt&&tt.data!==xt.data)return!0;W++}return s.attributesNum!==W||s.index!==B}function _(x,P,G,B){const Z={},rt=P.attributes;let W=0;const at=G.getAttributes();for(const V in at)if(at[V].location>=0){let tt=rt[V];tt===void 0&&(V==="instanceMatrix"&&x.instanceMatrix&&(tt=x.instanceMatrix),V==="instanceColor"&&x.instanceColor&&(tt=x.instanceColor));const xt={};xt.attribute=tt,tt&&tt.data&&(xt.data=tt.data),Z[V]=xt,W++}s.attributes=Z,s.attributesNum=W,s.index=B}function g(){const x=s.newAttributes;for(let P=0,G=x.length;P<G;P++)x[P]=0}function m(x){u(x,0)}function u(x,P){const G=s.newAttributes,B=s.enabledAttributes,Z=s.attributeDivisors;G[x]=1,B[x]===0&&(i.enableVertexAttribArray(x),B[x]=1),Z[x]!==P&&(i.vertexAttribDivisor(x,P),Z[x]=P)}function A(){const x=s.newAttributes,P=s.enabledAttributes;for(let G=0,B=P.length;G<B;G++)P[G]!==x[G]&&(i.disableVertexAttribArray(G),P[G]=0)}function T(x,P,G,B,Z,rt,W){W===!0?i.vertexAttribIPointer(x,P,G,Z,rt):i.vertexAttribPointer(x,P,G,B,Z,rt)}function M(x,P,G,B){g();const Z=B.attributes,rt=G.getAttributes(),W=P.defaultAttributeValues;for(const at in rt){const V=rt[at];if(V.location>=0){let _t=Z[at];if(_t===void 0&&(at==="instanceMatrix"&&x.instanceMatrix&&(_t=x.instanceMatrix),at==="instanceColor"&&x.instanceColor&&(_t=x.instanceColor)),_t!==void 0){const tt=_t.normalized,xt=_t.itemSize,Nt=t.get(_t);if(Nt===void 0)continue;const bt=Nt.buffer,q=Nt.type,H=Nt.bytesPerElement,X=q===i.INT||q===i.UNSIGNED_INT||_t.gpuType===Po;if(_t.isInterleavedBufferAttribute){const O=_t.data,D=O.stride,U=_t.offset;if(O.isInstancedInterleavedBuffer){for(let Q=0;Q<V.locationSize;Q++)u(V.location+Q,O.meshPerAttribute);x.isInstancedMesh!==!0&&B._maxInstanceCount===void 0&&(B._maxInstanceCount=O.meshPerAttribute*O.count)}else for(let Q=0;Q<V.locationSize;Q++)m(V.location+Q);i.bindBuffer(i.ARRAY_BUFFER,bt);for(let Q=0;Q<V.locationSize;Q++)T(V.location+Q,xt/V.locationSize,q,tt,D*H,(U+xt/V.locationSize*Q)*H,X)}else{if(_t.isInstancedBufferAttribute){for(let O=0;O<V.locationSize;O++)u(V.location+O,_t.meshPerAttribute);x.isInstancedMesh!==!0&&B._maxInstanceCount===void 0&&(B._maxInstanceCount=_t.meshPerAttribute*_t.count)}else for(let O=0;O<V.locationSize;O++)m(V.location+O);i.bindBuffer(i.ARRAY_BUFFER,bt);for(let O=0;O<V.locationSize;O++)T(V.location+O,xt/V.locationSize,q,tt,xt*H,xt/V.locationSize*O*H,X)}}else if(W!==void 0){const tt=W[at];if(tt!==void 0)switch(tt.length){case 2:i.vertexAttrib2fv(V.location,tt);break;case 3:i.vertexAttrib3fv(V.location,tt);break;case 4:i.vertexAttrib4fv(V.location,tt);break;default:i.vertexAttrib1fv(V.location,tt)}}}}A()}function L(){I();for(const x in n){const P=n[x];for(const G in P){const B=P[G];for(const Z in B)h(B[Z].object),delete B[Z];delete P[G]}delete n[x]}}function R(x){if(n[x.id]===void 0)return;const P=n[x.id];for(const G in P){const B=P[G];for(const Z in B)h(B[Z].object),delete B[Z];delete P[G]}delete n[x.id]}function C(x){for(const P in n){const G=n[P];if(G[x.id]===void 0)continue;const B=G[x.id];for(const Z in B)h(B[Z].object),delete B[Z];delete G[x.id]}}function I(){b(),a=!0,s!==r&&(s=r,c(s.object))}function b(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:o,reset:I,resetDefaultState:b,dispose:L,releaseStatesOfGeometry:R,releaseStatesOfProgram:C,initAttributes:g,enableAttribute:m,disableUnusedAttributes:A}}function f_(i,t,e){let n;function r(c){n=c}function s(c,h){i.drawArrays(n,c,h),e.update(h,n,1)}function a(c,h,d){d!==0&&(i.drawArraysInstanced(n,c,h,d),e.update(h,n,d))}function o(c,h,d){if(d===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,h,0,d);let f=0;for(let _=0;_<d;_++)f+=h[_];e.update(f,n,1)}function l(c,h,d,p){if(d===0)return;const f=t.get("WEBGL_multi_draw");if(f===null)for(let _=0;_<c.length;_++)a(c[_],h[_],p[_]);else{f.multiDrawArraysInstancedWEBGL(n,c,0,h,0,p,0,d);let _=0;for(let g=0;g<d;g++)_+=h[g]*p[g];e.update(_,n,1)}}this.setMode=r,this.render=s,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=l}function p_(i,t,e,n){let r;function s(){if(r!==void 0)return r;if(t.has("EXT_texture_filter_anisotropic")===!0){const C=t.get("EXT_texture_filter_anisotropic");r=i.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function a(C){return!(C!==un&&n.convert(C)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(C){const I=C===Dr&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(C!==Un&&n.convert(C)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&C!==Rn&&!I)}function l(C){if(C==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";C="mediump"}return C==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp";const h=l(c);h!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const d=e.logarithmicDepthBuffer===!0,p=e.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),u=i.getParameter(i.MAX_VERTEX_ATTRIBS),A=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),T=i.getParameter(i.MAX_VARYING_VECTORS),M=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),L=_>0,R=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:d,reverseDepthBuffer:p,maxTextures:f,maxVertexTextures:_,maxTextureSize:g,maxCubemapSize:m,maxAttributes:u,maxVertexUniforms:A,maxVaryings:T,maxFragmentUniforms:M,vertexTextures:L,maxSamples:R}}function m_(i){const t=this;let e=null,n=0,r=!1,s=!1;const a=new Hn,o=new Kt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,p){const f=d.length!==0||p||n!==0||r;return r=p,n=d.length,f},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(d,p){e=h(d,p,0)},this.setState=function(d,p,f){const _=d.clippingPlanes,g=d.clipIntersection,m=d.clipShadows,u=i.get(d);if(!r||_===null||_.length===0||s&&!m)s?h(null):c();else{const A=s?0:n,T=A*4;let M=u.clippingState||null;l.value=M,M=h(_,p,T,f);for(let L=0;L!==T;++L)M[L]=e[L];u.clippingState=M,this.numIntersection=g?this.numPlanes:0,this.numPlanes+=A}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(d,p,f,_){const g=d!==null?d.length:0;let m=null;if(g!==0){if(m=l.value,_!==!0||m===null){const u=f+g*4,A=p.matrixWorldInverse;o.getNormalMatrix(A),(m===null||m.length<u)&&(m=new Float32Array(u));for(let T=0,M=f;T!==g;++T,M+=4)a.copy(d[T]).applyMatrix4(A,o),a.normal.toArray(m,M),m[M+3]=a.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=g,t.numIntersection=0,m}}function __(i){let t=new WeakMap;function e(a,o){return o===Wa?a.mapping=sr:o===Xa&&(a.mapping=ar),a}function n(a){if(a&&a.isTexture){const o=a.mapping;if(o===Wa||o===Xa)if(t.has(a)){const l=t.get(a).texture;return e(l,a.mapping)}else{const l=a.image;if(l&&l.height>0){const c=new Jd(l.height);return c.fromEquirectangularTexture(i,a),t.set(a,c),a.addEventListener("dispose",r),e(c.texture,a.mapping)}else return null}}return a}function r(a){const o=a.target;o.removeEventListener("dispose",r);const l=t.get(o);l!==void 0&&(t.delete(o),l.dispose())}function s(){t=new WeakMap}return{get:n,dispose:s}}const Gi=4,Hl=[.125,.215,.35,.446,.526,.582],ci=20,Aa=new Eh,Vl=new Qt;let wa=null,Ca=0,Ra=0,Pa=!1;const oi=(1+Math.sqrt(5))/2,zi=1/oi,Gl=[new F(-oi,zi,0),new F(oi,zi,0),new F(-zi,0,oi),new F(zi,0,oi),new F(0,oi,-zi),new F(0,oi,zi),new F(-1,1,-1),new F(1,1,-1),new F(-1,1,1),new F(1,1,1)];class Wl{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,n=.1,r=100){wa=this._renderer.getRenderTarget(),Ca=this._renderer.getActiveCubeFace(),Ra=this._renderer.getActiveMipmapLevel(),Pa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(t,n,r,s),e>0&&this._blur(s,0,0,e),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Yl(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=ql(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(wa,Ca,Ra),this._renderer.xr.enabled=Pa,t.scissorTest=!1,ls(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===sr||t.mapping===ar?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),wa=this._renderer.getRenderTarget(),Ca=this._renderer.getActiveCubeFace(),Ra=this._renderer.getActiveMipmapLevel(),Pa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:gn,minFilter:gn,generateMipmaps:!1,type:Dr,format:un,colorSpace:cr,depthBuffer:!1},r=Xl(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Xl(t,e,n);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=g_(s)),this._blurMaterial=v_(s,t,e)}return r}_compileMaterial(t){const e=new Ke(this._lodPlanes[0],t);this._renderer.compile(e,Aa)}_sceneToCubeUV(t,e,n,r){const o=new qe(90,1,e,n),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],h=this._renderer,d=h.autoClear,p=h.toneMapping;h.getClearColor(Vl),h.toneMapping=Wn,h.autoClear=!1;const f=new oh({name:"PMREM.Background",side:He,depthWrite:!1,depthTest:!1}),_=new Ke(new Kn,f);let g=!1;const m=t.background;m?m.isColor&&(f.color.copy(m),t.background=null,g=!0):(f.color.copy(Vl),g=!0);for(let u=0;u<6;u++){const A=u%3;A===0?(o.up.set(0,l[u],0),o.lookAt(c[u],0,0)):A===1?(o.up.set(0,0,l[u]),o.lookAt(0,c[u],0)):(o.up.set(0,l[u],0),o.lookAt(0,0,c[u]));const T=this._cubeSize;ls(r,A*T,u>2?T:0,T,T),h.setRenderTarget(r),g&&h.render(_,o),h.render(t,o)}_.geometry.dispose(),_.material.dispose(),h.toneMapping=p,h.autoClear=d,t.background=m}_textureToCubeUV(t,e){const n=this._renderer,r=t.mapping===sr||t.mapping===ar;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Yl()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=ql());const s=r?this._cubemapMaterial:this._equirectMaterial,a=new Ke(this._lodPlanes[0],s),o=s.uniforms;o.envMap.value=t;const l=this._cubeSize;ls(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(a,Aa)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const a=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),o=Gl[(r-s-1)%Gl.length];this._blur(t,s-1,s,a,o)}e.autoClear=n}_blur(t,e,n,r,s){const a=this._pingPongRenderTarget;this._halfBlur(t,a,e,n,r,"latitudinal",s),this._halfBlur(a,t,n,n,r,"longitudinal",s)}_halfBlur(t,e,n,r,s,a,o){const l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,d=new Ke(this._lodPlanes[r],c),p=c.uniforms,f=this._sizeLods[n]-1,_=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*ci-1),g=s/_,m=isFinite(s)?1+Math.floor(h*g):ci;m>ci&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${ci}`);const u=[];let A=0;for(let C=0;C<ci;++C){const I=C/g,b=Math.exp(-I*I/2);u.push(b),C===0?A+=b:C<m&&(A+=2*b)}for(let C=0;C<u.length;C++)u[C]=u[C]/A;p.envMap.value=t.texture,p.samples.value=m,p.weights.value=u,p.latitudinal.value=a==="latitudinal",o&&(p.poleAxis.value=o);const{_lodMax:T}=this;p.dTheta.value=_,p.mipInt.value=T-n;const M=this._sizeLods[r],L=3*M*(r>T-Gi?r-T+Gi:0),R=4*(this._cubeSize-M);ls(e,L,R,3*M,2*M),l.setRenderTarget(e),l.render(d,Aa)}}function g_(i){const t=[],e=[],n=[];let r=i;const s=i-Gi+1+Hl.length;for(let a=0;a<s;a++){const o=Math.pow(2,r);e.push(o);let l=1/o;a>i-Gi?l=Hl[a-i+Gi-1]:a===0&&(l=0),n.push(l);const c=1/(o-2),h=-c,d=1+c,p=[h,h,d,h,d,d,h,h,d,d,h,d],f=6,_=6,g=3,m=2,u=1,A=new Float32Array(g*_*f),T=new Float32Array(m*_*f),M=new Float32Array(u*_*f);for(let R=0;R<f;R++){const C=R%3*2/3-1,I=R>2?0:-1,b=[C,I,0,C+2/3,I,0,C+2/3,I+1,0,C,I,0,C+2/3,I+1,0,C,I+1,0];A.set(b,g*_*R),T.set(p,m*_*R);const x=[R,R,R,R,R,R];M.set(x,u*_*R)}const L=new Ve;L.setAttribute("position",new fn(A,g)),L.setAttribute("uv",new fn(T,m)),L.setAttribute("faceIndex",new fn(M,u)),t.push(L),r>Gi&&r--}return{lodPlanes:t,sizeLods:e,sigmas:n}}function Xl(i,t,e){const n=new _i(i,t,e);return n.texture.mapping=ks,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function ls(i,t,e,n,r){i.viewport.set(t,e,n,r),i.scissor.set(t,e,n,r)}function v_(i,t,e){const n=new Float32Array(ci),r=new F(0,1,0);return new Zn({name:"SphericalGaussianBlur",defines:{n:ci,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Vo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Gn,depthTest:!1,depthWrite:!1})}function ql(){return new Zn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Vo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Gn,depthTest:!1,depthWrite:!1})}function Yl(){return new Zn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Vo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Gn,depthTest:!1,depthWrite:!1})}function Vo(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function x_(i){let t=new WeakMap,e=null;function n(o){if(o&&o.isTexture){const l=o.mapping,c=l===Wa||l===Xa,h=l===sr||l===ar;if(c||h){let d=t.get(o);const p=d!==void 0?d.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==p)return e===null&&(e=new Wl(i)),d=c?e.fromEquirectangular(o,d):e.fromCubemap(o,d),d.texture.pmremVersion=o.pmremVersion,t.set(o,d),d.texture;if(d!==void 0)return d.texture;{const f=o.image;return c&&f&&f.height>0||h&&f&&r(f)?(e===null&&(e=new Wl(i)),d=c?e.fromEquirectangular(o):e.fromCubemap(o),d.texture.pmremVersion=o.pmremVersion,t.set(o,d),o.addEventListener("dispose",s),d.texture):null}}}return o}function r(o){let l=0;const c=6;for(let h=0;h<c;h++)o[h]!==void 0&&l++;return l===c}function s(o){const l=o.target;l.removeEventListener("dispose",s);const c=t.get(l);c!==void 0&&(t.delete(l),c.dispose())}function a(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:a}}function S_(i){const t={};function e(n){if(t[n]!==void 0)return t[n];let r;switch(n){case"WEBGL_depth_texture":r=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=i.getExtension(n)}return t[n]=r,r}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const r=e(n);return r===null&&ki("THREE.WebGLRenderer: "+n+" extension not supported."),r}}}function y_(i,t,e,n){const r={},s=new WeakMap;function a(d){const p=d.target;p.index!==null&&t.remove(p.index);for(const _ in p.attributes)t.remove(p.attributes[_]);p.removeEventListener("dispose",a),delete r[p.id];const f=s.get(p);f&&(t.remove(f),s.delete(p)),n.releaseStatesOfGeometry(p),p.isInstancedBufferGeometry===!0&&delete p._maxInstanceCount,e.memory.geometries--}function o(d,p){return r[p.id]===!0||(p.addEventListener("dispose",a),r[p.id]=!0,e.memory.geometries++),p}function l(d){const p=d.attributes;for(const f in p)t.update(p[f],i.ARRAY_BUFFER)}function c(d){const p=[],f=d.index,_=d.attributes.position;let g=0;if(f!==null){const A=f.array;g=f.version;for(let T=0,M=A.length;T<M;T+=3){const L=A[T+0],R=A[T+1],C=A[T+2];p.push(L,R,R,C,C,L)}}else if(_!==void 0){const A=_.array;g=_.version;for(let T=0,M=A.length/3-1;T<M;T+=3){const L=T+0,R=T+1,C=T+2;p.push(L,R,R,C,C,L)}}else return;const m=new(ih(p)?ch:lh)(p,1);m.version=g;const u=s.get(d);u&&t.remove(u),s.set(d,m)}function h(d){const p=s.get(d);if(p){const f=d.index;f!==null&&p.version<f.version&&c(d)}else c(d);return s.get(d)}return{get:o,update:l,getWireframeAttribute:h}}function M_(i,t,e){let n;function r(p){n=p}let s,a;function o(p){s=p.type,a=p.bytesPerElement}function l(p,f){i.drawElements(n,f,s,p*a),e.update(f,n,1)}function c(p,f,_){_!==0&&(i.drawElementsInstanced(n,f,s,p*a,_),e.update(f,n,_))}function h(p,f,_){if(_===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,s,p,0,_);let m=0;for(let u=0;u<_;u++)m+=f[u];e.update(m,n,1)}function d(p,f,_,g){if(_===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let u=0;u<p.length;u++)c(p[u]/a,f[u],g[u]);else{m.multiDrawElementsInstancedWEBGL(n,f,0,s,p,0,g,0,_);let u=0;for(let A=0;A<_;A++)u+=f[A]*g[A];e.update(u,n,1)}}this.setMode=r,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=d}function b_(i){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,a,o){switch(e.calls++,a){case i.TRIANGLES:e.triangles+=o*(s/3);break;case i.LINES:e.lines+=o*(s/2);break;case i.LINE_STRIP:e.lines+=o*(s-1);break;case i.LINE_LOOP:e.lines+=o*s;break;case i.POINTS:e.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function r(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:r,update:n}}function E_(i,t,e){const n=new WeakMap,r=new ve;function s(a,o,l){const c=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=h!==void 0?h.length:0;let p=n.get(o);if(p===void 0||p.count!==d){let x=function(){I.dispose(),n.delete(o),o.removeEventListener("dispose",x)};var f=x;p!==void 0&&p.texture.dispose();const _=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,m=o.morphAttributes.color!==void 0,u=o.morphAttributes.position||[],A=o.morphAttributes.normal||[],T=o.morphAttributes.color||[];let M=0;_===!0&&(M=1),g===!0&&(M=2),m===!0&&(M=3);let L=o.attributes.position.count*M,R=1;L>t.maxTextureSize&&(R=Math.ceil(L/t.maxTextureSize),L=t.maxTextureSize);const C=new Float32Array(L*R*4*d),I=new sh(C,L,R,d);I.type=Rn,I.needsUpdate=!0;const b=M*4;for(let P=0;P<d;P++){const G=u[P],B=A[P],Z=T[P],rt=L*R*4*P;for(let W=0;W<G.count;W++){const at=W*b;_===!0&&(r.fromBufferAttribute(G,W),C[rt+at+0]=r.x,C[rt+at+1]=r.y,C[rt+at+2]=r.z,C[rt+at+3]=0),g===!0&&(r.fromBufferAttribute(B,W),C[rt+at+4]=r.x,C[rt+at+5]=r.y,C[rt+at+6]=r.z,C[rt+at+7]=0),m===!0&&(r.fromBufferAttribute(Z,W),C[rt+at+8]=r.x,C[rt+at+9]=r.y,C[rt+at+10]=r.z,C[rt+at+11]=Z.itemSize===4?r.w:1)}}p={count:d,texture:I,size:new Rt(L,R)},n.set(o,p),o.addEventListener("dispose",x)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",a.morphTexture,e);else{let _=0;for(let m=0;m<c.length;m++)_+=c[m];const g=o.morphTargetsRelative?1:1-_;l.getUniforms().setValue(i,"morphTargetBaseInfluence",g),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",p.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",p.size)}return{update:s}}function T_(i,t,e,n){let r=new WeakMap;function s(l){const c=n.render.frame,h=l.geometry,d=t.get(l,h);if(r.get(d)!==c&&(t.update(d),r.set(d,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),r.get(l)!==c&&(e.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,i.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){const p=l.skeleton;r.get(p)!==c&&(p.update(),r.set(p,c))}return d}function a(){r=new WeakMap}function o(l){const c=l.target;c.removeEventListener("dispose",o),e.remove(c.instanceMatrix),c.instanceColor!==null&&e.remove(c.instanceColor)}return{update:s,dispose:a}}const wh=new Oe,jl=new gh(1,1),Ch=new sh,Rh=new Fd,Ph=new dh,Kl=[],Zl=[],Jl=new Float32Array(16),Ql=new Float32Array(9),tc=new Float32Array(4);function fr(i,t,e){const n=i[0];if(n<=0||n>0)return i;const r=t*e;let s=Kl[r];if(s===void 0&&(s=new Float32Array(r),Kl[r]=s),t!==0){n.toArray(s,0);for(let a=1,o=0;a!==t;++a)o+=e,i[a].toArray(s,o)}return s}function Te(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function Ae(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function qs(i,t){let e=Zl[t];e===void 0&&(e=new Int32Array(t),Zl[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function A_(i,t){const e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function w_(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Te(e,t))return;i.uniform2fv(this.addr,t),Ae(e,t)}}function C_(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Te(e,t))return;i.uniform3fv(this.addr,t),Ae(e,t)}}function R_(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Te(e,t))return;i.uniform4fv(this.addr,t),Ae(e,t)}}function P_(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(Te(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),Ae(e,t)}else{if(Te(e,n))return;tc.set(n),i.uniformMatrix2fv(this.addr,!1,tc),Ae(e,n)}}function L_(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(Te(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),Ae(e,t)}else{if(Te(e,n))return;Ql.set(n),i.uniformMatrix3fv(this.addr,!1,Ql),Ae(e,n)}}function D_(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(Te(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),Ae(e,t)}else{if(Te(e,n))return;Jl.set(n),i.uniformMatrix4fv(this.addr,!1,Jl),Ae(e,n)}}function I_(i,t){const e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function U_(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Te(e,t))return;i.uniform2iv(this.addr,t),Ae(e,t)}}function N_(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Te(e,t))return;i.uniform3iv(this.addr,t),Ae(e,t)}}function F_(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Te(e,t))return;i.uniform4iv(this.addr,t),Ae(e,t)}}function O_(i,t){const e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function B_(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Te(e,t))return;i.uniform2uiv(this.addr,t),Ae(e,t)}}function $_(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Te(e,t))return;i.uniform3uiv(this.addr,t),Ae(e,t)}}function z_(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Te(e,t))return;i.uniform4uiv(this.addr,t),Ae(e,t)}}function k_(i,t,e){const n=this.cache,r=e.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r);let s;this.type===i.SAMPLER_2D_SHADOW?(jl.compareFunction=nh,s=jl):s=wh,e.setTexture2D(t||s,r)}function H_(i,t,e){const n=this.cache,r=e.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),e.setTexture3D(t||Rh,r)}function V_(i,t,e){const n=this.cache,r=e.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),e.setTextureCube(t||Ph,r)}function G_(i,t,e){const n=this.cache,r=e.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),e.setTexture2DArray(t||Ch,r)}function W_(i){switch(i){case 5126:return A_;case 35664:return w_;case 35665:return C_;case 35666:return R_;case 35674:return P_;case 35675:return L_;case 35676:return D_;case 5124:case 35670:return I_;case 35667:case 35671:return U_;case 35668:case 35672:return N_;case 35669:case 35673:return F_;case 5125:return O_;case 36294:return B_;case 36295:return $_;case 36296:return z_;case 35678:case 36198:case 36298:case 36306:case 35682:return k_;case 35679:case 36299:case 36307:return H_;case 35680:case 36300:case 36308:case 36293:return V_;case 36289:case 36303:case 36311:case 36292:return G_}}function X_(i,t){i.uniform1fv(this.addr,t)}function q_(i,t){const e=fr(t,this.size,2);i.uniform2fv(this.addr,e)}function Y_(i,t){const e=fr(t,this.size,3);i.uniform3fv(this.addr,e)}function j_(i,t){const e=fr(t,this.size,4);i.uniform4fv(this.addr,e)}function K_(i,t){const e=fr(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function Z_(i,t){const e=fr(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function J_(i,t){const e=fr(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function Q_(i,t){i.uniform1iv(this.addr,t)}function tg(i,t){i.uniform2iv(this.addr,t)}function eg(i,t){i.uniform3iv(this.addr,t)}function ng(i,t){i.uniform4iv(this.addr,t)}function ig(i,t){i.uniform1uiv(this.addr,t)}function rg(i,t){i.uniform2uiv(this.addr,t)}function sg(i,t){i.uniform3uiv(this.addr,t)}function ag(i,t){i.uniform4uiv(this.addr,t)}function og(i,t,e){const n=this.cache,r=t.length,s=qs(e,r);Te(n,s)||(i.uniform1iv(this.addr,s),Ae(n,s));for(let a=0;a!==r;++a)e.setTexture2D(t[a]||wh,s[a])}function lg(i,t,e){const n=this.cache,r=t.length,s=qs(e,r);Te(n,s)||(i.uniform1iv(this.addr,s),Ae(n,s));for(let a=0;a!==r;++a)e.setTexture3D(t[a]||Rh,s[a])}function cg(i,t,e){const n=this.cache,r=t.length,s=qs(e,r);Te(n,s)||(i.uniform1iv(this.addr,s),Ae(n,s));for(let a=0;a!==r;++a)e.setTextureCube(t[a]||Ph,s[a])}function hg(i,t,e){const n=this.cache,r=t.length,s=qs(e,r);Te(n,s)||(i.uniform1iv(this.addr,s),Ae(n,s));for(let a=0;a!==r;++a)e.setTexture2DArray(t[a]||Ch,s[a])}function ug(i){switch(i){case 5126:return X_;case 35664:return q_;case 35665:return Y_;case 35666:return j_;case 35674:return K_;case 35675:return Z_;case 35676:return J_;case 5124:case 35670:return Q_;case 35667:case 35671:return tg;case 35668:case 35672:return eg;case 35669:case 35673:return ng;case 5125:return ig;case 36294:return rg;case 36295:return sg;case 36296:return ag;case 35678:case 36198:case 36298:case 36306:case 35682:return og;case 35679:case 36299:case 36307:return lg;case 35680:case 36300:case 36308:case 36293:return cg;case 36289:case 36303:case 36311:case 36292:return hg}}class dg{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=W_(e.type)}}class fg{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=ug(e.type)}}class pg{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const r=this.seq;for(let s=0,a=r.length;s!==a;++s){const o=r[s];o.setValue(t,e[o.id],n)}}}const La=/(\w+)(\])?(\[|\.)?/g;function ec(i,t){i.seq.push(t),i.map[t.id]=t}function mg(i,t,e){const n=i.name,r=n.length;for(La.lastIndex=0;;){const s=La.exec(n),a=La.lastIndex;let o=s[1];const l=s[2]==="]",c=s[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===r){ec(e,c===void 0?new dg(o,i,t):new fg(o,i,t));break}else{let d=e.map[o];d===void 0&&(d=new pg(o),ec(e,d)),e=d}}}class Ss{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){const s=t.getActiveUniform(e,r),a=t.getUniformLocation(e,s.name);mg(s,a,this)}}setValue(t,e,n,r){const s=this.map[e];s!==void 0&&s.setValue(t,n,r)}setOptional(t,e,n){const r=e[n];r!==void 0&&this.setValue(t,n,r)}static upload(t,e,n,r){for(let s=0,a=e.length;s!==a;++s){const o=e[s],l=n[o.id];l.needsUpdate!==!1&&o.setValue(t,l.value,r)}}static seqWithValue(t,e){const n=[];for(let r=0,s=t.length;r!==s;++r){const a=t[r];a.id in e&&n.push(a)}return n}}function nc(i,t,e){const n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}const _g=37297;let gg=0;function vg(i,t){const e=i.split(`
`),n=[],r=Math.max(t-6,0),s=Math.min(t+6,e.length);for(let a=r;a<s;a++){const o=a+1;n.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return n.join(`
`)}const ic=new Kt;function xg(i){ie._getMatrix(ic,ie.workingColorSpace,i);const t=`mat3( ${ic.elements.map(e=>e.toFixed(4))} )`;switch(ie.getTransfer(i)){case Ds:return[t,"LinearTransferOETF"];case ce:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function rc(i,t,e){const n=i.getShaderParameter(t,i.COMPILE_STATUS),r=i.getShaderInfoLog(t).trim();if(n&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const a=parseInt(s[1]);return e.toUpperCase()+`

`+r+`

`+vg(i.getShaderSource(t),a)}else return r}function Sg(i,t){const e=xg(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function yg(i,t){let e;switch(t){case od:e="Linear";break;case ld:e="Reinhard";break;case cd:e="Cineon";break;case hd:e="ACESFilmic";break;case dd:e="AgX";break;case fd:e="Neutral";break;case ud:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const cs=new F;function Mg(){ie.getLuminanceCoefficients(cs);const i=cs.x.toFixed(4),t=cs.y.toFixed(4),e=cs.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function bg(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Er).join(`
`)}function Eg(i){const t=[];for(const e in i){const n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function Tg(i,t){const e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let r=0;r<n;r++){const s=i.getActiveAttrib(t,r),a=s.name;let o=1;s.type===i.FLOAT_MAT2&&(o=2),s.type===i.FLOAT_MAT3&&(o=3),s.type===i.FLOAT_MAT4&&(o=4),e[a]={type:s.type,location:i.getAttribLocation(t,a),locationSize:o}}return e}function Er(i){return i!==""}function sc(i,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function ac(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const Ag=/^[ \t]*#include +<([\w\d./]+)>/gm;function To(i){return i.replace(Ag,Cg)}const wg=new Map;function Cg(i,t){let e=Zt[t];if(e===void 0){const n=wg.get(t);if(n!==void 0)e=Zt[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return To(e)}const Rg=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function oc(i){return i.replace(Rg,Pg)}function Pg(i,t,e,n){let r="";for(let s=parseInt(t);s<parseInt(e);s++)r+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function lc(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function Lg(i){let t="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===kc?t="SHADOWMAP_TYPE_PCF":i.shadowMapType===Hc?t="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===wn&&(t="SHADOWMAP_TYPE_VSM"),t}function Dg(i){let t="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case sr:case ar:t="ENVMAP_TYPE_CUBE";break;case ks:t="ENVMAP_TYPE_CUBE_UV";break}return t}function Ig(i){let t="ENVMAP_MODE_REFLECTION";if(i.envMap)switch(i.envMapMode){case ar:t="ENVMAP_MODE_REFRACTION";break}return t}function Ug(i){let t="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case Vc:t="ENVMAP_BLENDING_MULTIPLY";break;case sd:t="ENVMAP_BLENDING_MIX";break;case ad:t="ENVMAP_BLENDING_ADD";break}return t}function Ng(i){const t=i.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:n,maxMip:e}}function Fg(i,t,e,n){const r=i.getContext(),s=e.defines;let a=e.vertexShader,o=e.fragmentShader;const l=Lg(e),c=Dg(e),h=Ig(e),d=Ug(e),p=Ng(e),f=bg(e),_=Eg(s),g=r.createProgram();let m,u,A=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_].filter(Er).join(`
`),m.length>0&&(m+=`
`),u=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_].filter(Er).join(`
`),u.length>0&&(u+=`
`)):(m=[lc(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Er).join(`
`),u=[lc(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+d:"",p?"#define CUBEUV_TEXEL_WIDTH "+p.texelWidth:"",p?"#define CUBEUV_TEXEL_HEIGHT "+p.texelHeight:"",p?"#define CUBEUV_MAX_MIP "+p.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Wn?"#define TONE_MAPPING":"",e.toneMapping!==Wn?Zt.tonemapping_pars_fragment:"",e.toneMapping!==Wn?yg("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Zt.colorspace_pars_fragment,Sg("linearToOutputTexel",e.outputColorSpace),Mg(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Er).join(`
`)),a=To(a),a=sc(a,e),a=ac(a,e),o=To(o),o=sc(o,e),o=ac(o,e),a=oc(a),o=oc(o),e.isRawShaderMaterial!==!0&&(A=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,u=["#define varying in",e.glslVersion===hl?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===hl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+u);const T=A+m+a,M=A+u+o,L=nc(r,r.VERTEX_SHADER,T),R=nc(r,r.FRAGMENT_SHADER,M);r.attachShader(g,L),r.attachShader(g,R),e.index0AttributeName!==void 0?r.bindAttribLocation(g,0,e.index0AttributeName):e.morphTargets===!0&&r.bindAttribLocation(g,0,"position"),r.linkProgram(g);function C(P){if(i.debug.checkShaderErrors){const G=r.getProgramInfoLog(g).trim(),B=r.getShaderInfoLog(L).trim(),Z=r.getShaderInfoLog(R).trim();let rt=!0,W=!0;if(r.getProgramParameter(g,r.LINK_STATUS)===!1)if(rt=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(r,g,L,R);else{const at=rc(r,L,"vertex"),V=rc(r,R,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(g,r.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+G+`
`+at+`
`+V)}else G!==""?console.warn("THREE.WebGLProgram: Program Info Log:",G):(B===""||Z==="")&&(W=!1);W&&(P.diagnostics={runnable:rt,programLog:G,vertexShader:{log:B,prefix:m},fragmentShader:{log:Z,prefix:u}})}r.deleteShader(L),r.deleteShader(R),I=new Ss(r,g),b=Tg(r,g)}let I;this.getUniforms=function(){return I===void 0&&C(this),I};let b;this.getAttributes=function(){return b===void 0&&C(this),b};let x=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return x===!1&&(x=r.getProgramParameter(g,_g)),x},this.destroy=function(){n.releaseStatesOfProgram(this),r.deleteProgram(g),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=gg++,this.cacheKey=t,this.usedTimes=1,this.program=g,this.vertexShader=L,this.fragmentShader=R,this}let Og=0;class Bg{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,r=this._getShaderStage(e),s=this._getShaderStage(n),a=this._getShaderCacheForMaterial(t);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new $g(t),e.set(t,n)),n}}class $g{constructor(t){this.id=Og++,this.code=t,this.usedTimes=0}}function zg(i,t,e,n,r,s,a){const o=new Fo,l=new Bg,c=new Set,h=[],d=r.logarithmicDepthBuffer,p=r.vertexTextures;let f=r.precision;const _={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(b){return c.add(b),b===0?"uv":`uv${b}`}function m(b,x,P,G,B){const Z=G.fog,rt=B.geometry,W=b.isMeshStandardMaterial?G.environment:null,at=(b.isMeshStandardMaterial?e:t).get(b.envMap||W),V=at&&at.mapping===ks?at.image.height:null,_t=_[b.type];b.precision!==null&&(f=r.getMaxPrecision(b.precision),f!==b.precision&&console.warn("THREE.WebGLProgram.getParameters:",b.precision,"not supported, using",f,"instead."));const tt=rt.morphAttributes.position||rt.morphAttributes.normal||rt.morphAttributes.color,xt=tt!==void 0?tt.length:0;let Nt=0;rt.morphAttributes.position!==void 0&&(Nt=1),rt.morphAttributes.normal!==void 0&&(Nt=2),rt.morphAttributes.color!==void 0&&(Nt=3);let bt,q,H,X;if(_t){const le=mn[_t];bt=le.vertexShader,q=le.fragmentShader}else bt=b.vertexShader,q=b.fragmentShader,l.update(b),H=l.getVertexShaderID(b),X=l.getFragmentShaderID(b);const O=i.getRenderTarget(),D=i.state.buffers.depth.getReversed(),U=B.isInstancedMesh===!0,Q=B.isBatchedMesh===!0,ot=!!b.map,ut=!!b.matcap,dt=!!at,w=!!b.aoMap,Et=!!b.lightMap,vt=!!b.bumpMap,mt=!!b.normalMap,ct=!!b.displacementMap,St=!!b.emissiveMap,pt=!!b.metalnessMap,E=!!b.roughnessMap,v=b.anisotropy>0,$=b.clearcoat>0,Y=b.dispersion>0,et=b.iridescence>0,nt=b.sheen>0,Tt=b.transmission>0,yt=v&&!!b.anisotropyMap,At=$&&!!b.clearcoatMap,Wt=$&&!!b.clearcoatNormalMap,gt=$&&!!b.clearcoatRoughnessMap,ft=et&&!!b.iridescenceMap,Dt=et&&!!b.iridescenceThicknessMap,It=nt&&!!b.sheenColorMap,ht=nt&&!!b.sheenRoughnessMap,Ht=!!b.specularMap,$t=!!b.specularColorMap,te=!!b.specularIntensityMap,N=Tt&&!!b.transmissionMap,wt=Tt&&!!b.thicknessMap,it=!!b.gradientMap,lt=!!b.alphaMap,Pt=b.alphaTest>0,Ct=!!b.alphaHash,Xt=!!b.extensions;let de=Wn;b.toneMapped&&(O===null||O.isXRRenderTarget===!0)&&(de=i.toneMapping);const Pe={shaderID:_t,shaderType:b.type,shaderName:b.name,vertexShader:bt,fragmentShader:q,defines:b.defines,customVertexShaderID:H,customFragmentShaderID:X,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:f,batching:Q,batchingColor:Q&&B._colorsTexture!==null,instancing:U,instancingColor:U&&B.instanceColor!==null,instancingMorph:U&&B.morphTexture!==null,supportsVertexTextures:p,outputColorSpace:O===null?i.outputColorSpace:O.isXRRenderTarget===!0?O.texture.colorSpace:cr,alphaToCoverage:!!b.alphaToCoverage,map:ot,matcap:ut,envMap:dt,envMapMode:dt&&at.mapping,envMapCubeUVHeight:V,aoMap:w,lightMap:Et,bumpMap:vt,normalMap:mt,displacementMap:p&&ct,emissiveMap:St,normalMapObjectSpace:mt&&b.normalMapType===gd,normalMapTangentSpace:mt&&b.normalMapType===eh,metalnessMap:pt,roughnessMap:E,anisotropy:v,anisotropyMap:yt,clearcoat:$,clearcoatMap:At,clearcoatNormalMap:Wt,clearcoatRoughnessMap:gt,dispersion:Y,iridescence:et,iridescenceMap:ft,iridescenceThicknessMap:Dt,sheen:nt,sheenColorMap:It,sheenRoughnessMap:ht,specularMap:Ht,specularColorMap:$t,specularIntensityMap:te,transmission:Tt,transmissionMap:N,thicknessMap:wt,gradientMap:it,opaque:b.transparent===!1&&b.blending===Ki&&b.alphaToCoverage===!1,alphaMap:lt,alphaTest:Pt,alphaHash:Ct,combine:b.combine,mapUv:ot&&g(b.map.channel),aoMapUv:w&&g(b.aoMap.channel),lightMapUv:Et&&g(b.lightMap.channel),bumpMapUv:vt&&g(b.bumpMap.channel),normalMapUv:mt&&g(b.normalMap.channel),displacementMapUv:ct&&g(b.displacementMap.channel),emissiveMapUv:St&&g(b.emissiveMap.channel),metalnessMapUv:pt&&g(b.metalnessMap.channel),roughnessMapUv:E&&g(b.roughnessMap.channel),anisotropyMapUv:yt&&g(b.anisotropyMap.channel),clearcoatMapUv:At&&g(b.clearcoatMap.channel),clearcoatNormalMapUv:Wt&&g(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:gt&&g(b.clearcoatRoughnessMap.channel),iridescenceMapUv:ft&&g(b.iridescenceMap.channel),iridescenceThicknessMapUv:Dt&&g(b.iridescenceThicknessMap.channel),sheenColorMapUv:It&&g(b.sheenColorMap.channel),sheenRoughnessMapUv:ht&&g(b.sheenRoughnessMap.channel),specularMapUv:Ht&&g(b.specularMap.channel),specularColorMapUv:$t&&g(b.specularColorMap.channel),specularIntensityMapUv:te&&g(b.specularIntensityMap.channel),transmissionMapUv:N&&g(b.transmissionMap.channel),thicknessMapUv:wt&&g(b.thicknessMap.channel),alphaMapUv:lt&&g(b.alphaMap.channel),vertexTangents:!!rt.attributes.tangent&&(mt||v),vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!rt.attributes.color&&rt.attributes.color.itemSize===4,pointsUvs:B.isPoints===!0&&!!rt.attributes.uv&&(ot||lt),fog:!!Z,useFog:b.fog===!0,fogExp2:!!Z&&Z.isFogExp2,flatShading:b.flatShading===!0,sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:d,reverseDepthBuffer:D,skinning:B.isSkinnedMesh===!0,morphTargets:rt.morphAttributes.position!==void 0,morphNormals:rt.morphAttributes.normal!==void 0,morphColors:rt.morphAttributes.color!==void 0,morphTargetsCount:xt,morphTextureStride:Nt,numDirLights:x.directional.length,numPointLights:x.point.length,numSpotLights:x.spot.length,numSpotLightMaps:x.spotLightMap.length,numRectAreaLights:x.rectArea.length,numHemiLights:x.hemi.length,numDirLightShadows:x.directionalShadowMap.length,numPointLightShadows:x.pointShadowMap.length,numSpotLightShadows:x.spotShadowMap.length,numSpotLightShadowsWithMaps:x.numSpotLightShadowsWithMaps,numLightProbes:x.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:b.dithering,shadowMapEnabled:i.shadowMap.enabled&&P.length>0,shadowMapType:i.shadowMap.type,toneMapping:de,decodeVideoTexture:ot&&b.map.isVideoTexture===!0&&ie.getTransfer(b.map.colorSpace)===ce,decodeVideoTextureEmissive:St&&b.emissiveMap.isVideoTexture===!0&&ie.getTransfer(b.emissiveMap.colorSpace)===ce,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===Cn,flipSided:b.side===He,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionClipCullDistance:Xt&&b.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Xt&&b.extensions.multiDraw===!0||Q)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()};return Pe.vertexUv1s=c.has(1),Pe.vertexUv2s=c.has(2),Pe.vertexUv3s=c.has(3),c.clear(),Pe}function u(b){const x=[];if(b.shaderID?x.push(b.shaderID):(x.push(b.customVertexShaderID),x.push(b.customFragmentShaderID)),b.defines!==void 0)for(const P in b.defines)x.push(P),x.push(b.defines[P]);return b.isRawShaderMaterial===!1&&(A(x,b),T(x,b),x.push(i.outputColorSpace)),x.push(b.customProgramCacheKey),x.join()}function A(b,x){b.push(x.precision),b.push(x.outputColorSpace),b.push(x.envMapMode),b.push(x.envMapCubeUVHeight),b.push(x.mapUv),b.push(x.alphaMapUv),b.push(x.lightMapUv),b.push(x.aoMapUv),b.push(x.bumpMapUv),b.push(x.normalMapUv),b.push(x.displacementMapUv),b.push(x.emissiveMapUv),b.push(x.metalnessMapUv),b.push(x.roughnessMapUv),b.push(x.anisotropyMapUv),b.push(x.clearcoatMapUv),b.push(x.clearcoatNormalMapUv),b.push(x.clearcoatRoughnessMapUv),b.push(x.iridescenceMapUv),b.push(x.iridescenceThicknessMapUv),b.push(x.sheenColorMapUv),b.push(x.sheenRoughnessMapUv),b.push(x.specularMapUv),b.push(x.specularColorMapUv),b.push(x.specularIntensityMapUv),b.push(x.transmissionMapUv),b.push(x.thicknessMapUv),b.push(x.combine),b.push(x.fogExp2),b.push(x.sizeAttenuation),b.push(x.morphTargetsCount),b.push(x.morphAttributeCount),b.push(x.numDirLights),b.push(x.numPointLights),b.push(x.numSpotLights),b.push(x.numSpotLightMaps),b.push(x.numHemiLights),b.push(x.numRectAreaLights),b.push(x.numDirLightShadows),b.push(x.numPointLightShadows),b.push(x.numSpotLightShadows),b.push(x.numSpotLightShadowsWithMaps),b.push(x.numLightProbes),b.push(x.shadowMapType),b.push(x.toneMapping),b.push(x.numClippingPlanes),b.push(x.numClipIntersection),b.push(x.depthPacking)}function T(b,x){o.disableAll(),x.supportsVertexTextures&&o.enable(0),x.instancing&&o.enable(1),x.instancingColor&&o.enable(2),x.instancingMorph&&o.enable(3),x.matcap&&o.enable(4),x.envMap&&o.enable(5),x.normalMapObjectSpace&&o.enable(6),x.normalMapTangentSpace&&o.enable(7),x.clearcoat&&o.enable(8),x.iridescence&&o.enable(9),x.alphaTest&&o.enable(10),x.vertexColors&&o.enable(11),x.vertexAlphas&&o.enable(12),x.vertexUv1s&&o.enable(13),x.vertexUv2s&&o.enable(14),x.vertexUv3s&&o.enable(15),x.vertexTangents&&o.enable(16),x.anisotropy&&o.enable(17),x.alphaHash&&o.enable(18),x.batching&&o.enable(19),x.dispersion&&o.enable(20),x.batchingColor&&o.enable(21),b.push(o.mask),o.disableAll(),x.fog&&o.enable(0),x.useFog&&o.enable(1),x.flatShading&&o.enable(2),x.logarithmicDepthBuffer&&o.enable(3),x.reverseDepthBuffer&&o.enable(4),x.skinning&&o.enable(5),x.morphTargets&&o.enable(6),x.morphNormals&&o.enable(7),x.morphColors&&o.enable(8),x.premultipliedAlpha&&o.enable(9),x.shadowMapEnabled&&o.enable(10),x.doubleSided&&o.enable(11),x.flipSided&&o.enable(12),x.useDepthPacking&&o.enable(13),x.dithering&&o.enable(14),x.transmission&&o.enable(15),x.sheen&&o.enable(16),x.opaque&&o.enable(17),x.pointsUvs&&o.enable(18),x.decodeVideoTexture&&o.enable(19),x.decodeVideoTextureEmissive&&o.enable(20),x.alphaToCoverage&&o.enable(21),b.push(o.mask)}function M(b){const x=_[b.type];let P;if(x){const G=mn[x];P=Yd.clone(G.uniforms)}else P=b.uniforms;return P}function L(b,x){let P;for(let G=0,B=h.length;G<B;G++){const Z=h[G];if(Z.cacheKey===x){P=Z,++P.usedTimes;break}}return P===void 0&&(P=new Fg(i,x,b,s),h.push(P)),P}function R(b){if(--b.usedTimes===0){const x=h.indexOf(b);h[x]=h[h.length-1],h.pop(),b.destroy()}}function C(b){l.remove(b)}function I(){l.dispose()}return{getParameters:m,getProgramCacheKey:u,getUniforms:M,acquireProgram:L,releaseProgram:R,releaseShaderCache:C,programs:h,dispose:I}}function kg(){let i=new WeakMap;function t(a){return i.has(a)}function e(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function r(a,o,l){i.get(a)[o]=l}function s(){i=new WeakMap}return{has:t,get:e,remove:n,update:r,dispose:s}}function Hg(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.z!==t.z?i.z-t.z:i.id-t.id}function cc(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function hc(){const i=[];let t=0;const e=[],n=[],r=[];function s(){t=0,e.length=0,n.length=0,r.length=0}function a(d,p,f,_,g,m){let u=i[t];return u===void 0?(u={id:d.id,object:d,geometry:p,material:f,groupOrder:_,renderOrder:d.renderOrder,z:g,group:m},i[t]=u):(u.id=d.id,u.object=d,u.geometry=p,u.material=f,u.groupOrder=_,u.renderOrder=d.renderOrder,u.z=g,u.group=m),t++,u}function o(d,p,f,_,g,m){const u=a(d,p,f,_,g,m);f.transmission>0?n.push(u):f.transparent===!0?r.push(u):e.push(u)}function l(d,p,f,_,g,m){const u=a(d,p,f,_,g,m);f.transmission>0?n.unshift(u):f.transparent===!0?r.unshift(u):e.unshift(u)}function c(d,p){e.length>1&&e.sort(d||Hg),n.length>1&&n.sort(p||cc),r.length>1&&r.sort(p||cc)}function h(){for(let d=t,p=i.length;d<p;d++){const f=i[d];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:e,transmissive:n,transparent:r,init:s,push:o,unshift:l,finish:h,sort:c}}function Vg(){let i=new WeakMap;function t(n,r){const s=i.get(n);let a;return s===void 0?(a=new hc,i.set(n,[a])):r>=s.length?(a=new hc,s.push(a)):a=s[r],a}function e(){i=new WeakMap}return{get:t,dispose:e}}function Gg(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new F,color:new Qt};break;case"SpotLight":e={position:new F,direction:new F,color:new Qt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new F,color:new Qt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new F,skyColor:new Qt,groundColor:new Qt};break;case"RectAreaLight":e={color:new Qt,position:new F,halfWidth:new F,halfHeight:new F};break}return i[t.id]=e,e}}}function Wg(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Rt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Rt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Rt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}let Xg=0;function qg(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function Yg(i){const t=new Gg,e=Wg(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new F);const r=new F,s=new fe,a=new fe;function o(c){let h=0,d=0,p=0;for(let b=0;b<9;b++)n.probe[b].set(0,0,0);let f=0,_=0,g=0,m=0,u=0,A=0,T=0,M=0,L=0,R=0,C=0;c.sort(qg);for(let b=0,x=c.length;b<x;b++){const P=c[b],G=P.color,B=P.intensity,Z=P.distance,rt=P.shadow&&P.shadow.map?P.shadow.map.texture:null;if(P.isAmbientLight)h+=G.r*B,d+=G.g*B,p+=G.b*B;else if(P.isLightProbe){for(let W=0;W<9;W++)n.probe[W].addScaledVector(P.sh.coefficients[W],B);C++}else if(P.isDirectionalLight){const W=t.get(P);if(W.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){const at=P.shadow,V=e.get(P);V.shadowIntensity=at.intensity,V.shadowBias=at.bias,V.shadowNormalBias=at.normalBias,V.shadowRadius=at.radius,V.shadowMapSize=at.mapSize,n.directionalShadow[f]=V,n.directionalShadowMap[f]=rt,n.directionalShadowMatrix[f]=P.shadow.matrix,A++}n.directional[f]=W,f++}else if(P.isSpotLight){const W=t.get(P);W.position.setFromMatrixPosition(P.matrixWorld),W.color.copy(G).multiplyScalar(B),W.distance=Z,W.coneCos=Math.cos(P.angle),W.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),W.decay=P.decay,n.spot[g]=W;const at=P.shadow;if(P.map&&(n.spotLightMap[L]=P.map,L++,at.updateMatrices(P),P.castShadow&&R++),n.spotLightMatrix[g]=at.matrix,P.castShadow){const V=e.get(P);V.shadowIntensity=at.intensity,V.shadowBias=at.bias,V.shadowNormalBias=at.normalBias,V.shadowRadius=at.radius,V.shadowMapSize=at.mapSize,n.spotShadow[g]=V,n.spotShadowMap[g]=rt,M++}g++}else if(P.isRectAreaLight){const W=t.get(P);W.color.copy(G).multiplyScalar(B),W.halfWidth.set(P.width*.5,0,0),W.halfHeight.set(0,P.height*.5,0),n.rectArea[m]=W,m++}else if(P.isPointLight){const W=t.get(P);if(W.color.copy(P.color).multiplyScalar(P.intensity),W.distance=P.distance,W.decay=P.decay,P.castShadow){const at=P.shadow,V=e.get(P);V.shadowIntensity=at.intensity,V.shadowBias=at.bias,V.shadowNormalBias=at.normalBias,V.shadowRadius=at.radius,V.shadowMapSize=at.mapSize,V.shadowCameraNear=at.camera.near,V.shadowCameraFar=at.camera.far,n.pointShadow[_]=V,n.pointShadowMap[_]=rt,n.pointShadowMatrix[_]=P.shadow.matrix,T++}n.point[_]=W,_++}else if(P.isHemisphereLight){const W=t.get(P);W.skyColor.copy(P.color).multiplyScalar(B),W.groundColor.copy(P.groundColor).multiplyScalar(B),n.hemi[u]=W,u++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Lt.LTC_FLOAT_1,n.rectAreaLTC2=Lt.LTC_FLOAT_2):(n.rectAreaLTC1=Lt.LTC_HALF_1,n.rectAreaLTC2=Lt.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=p;const I=n.hash;(I.directionalLength!==f||I.pointLength!==_||I.spotLength!==g||I.rectAreaLength!==m||I.hemiLength!==u||I.numDirectionalShadows!==A||I.numPointShadows!==T||I.numSpotShadows!==M||I.numSpotMaps!==L||I.numLightProbes!==C)&&(n.directional.length=f,n.spot.length=g,n.rectArea.length=m,n.point.length=_,n.hemi.length=u,n.directionalShadow.length=A,n.directionalShadowMap.length=A,n.pointShadow.length=T,n.pointShadowMap.length=T,n.spotShadow.length=M,n.spotShadowMap.length=M,n.directionalShadowMatrix.length=A,n.pointShadowMatrix.length=T,n.spotLightMatrix.length=M+L-R,n.spotLightMap.length=L,n.numSpotLightShadowsWithMaps=R,n.numLightProbes=C,I.directionalLength=f,I.pointLength=_,I.spotLength=g,I.rectAreaLength=m,I.hemiLength=u,I.numDirectionalShadows=A,I.numPointShadows=T,I.numSpotShadows=M,I.numSpotMaps=L,I.numLightProbes=C,n.version=Xg++)}function l(c,h){let d=0,p=0,f=0,_=0,g=0;const m=h.matrixWorldInverse;for(let u=0,A=c.length;u<A;u++){const T=c[u];if(T.isDirectionalLight){const M=n.directional[d];M.direction.setFromMatrixPosition(T.matrixWorld),r.setFromMatrixPosition(T.target.matrixWorld),M.direction.sub(r),M.direction.transformDirection(m),d++}else if(T.isSpotLight){const M=n.spot[f];M.position.setFromMatrixPosition(T.matrixWorld),M.position.applyMatrix4(m),M.direction.setFromMatrixPosition(T.matrixWorld),r.setFromMatrixPosition(T.target.matrixWorld),M.direction.sub(r),M.direction.transformDirection(m),f++}else if(T.isRectAreaLight){const M=n.rectArea[_];M.position.setFromMatrixPosition(T.matrixWorld),M.position.applyMatrix4(m),a.identity(),s.copy(T.matrixWorld),s.premultiply(m),a.extractRotation(s),M.halfWidth.set(T.width*.5,0,0),M.halfHeight.set(0,T.height*.5,0),M.halfWidth.applyMatrix4(a),M.halfHeight.applyMatrix4(a),_++}else if(T.isPointLight){const M=n.point[p];M.position.setFromMatrixPosition(T.matrixWorld),M.position.applyMatrix4(m),p++}else if(T.isHemisphereLight){const M=n.hemi[g];M.direction.setFromMatrixPosition(T.matrixWorld),M.direction.transformDirection(m),g++}}}return{setup:o,setupView:l,state:n}}function uc(i){const t=new Yg(i),e=[],n=[];function r(h){c.camera=h,e.length=0,n.length=0}function s(h){e.push(h)}function a(h){n.push(h)}function o(){t.setup(e)}function l(h){t.setupView(e,h)}const c={lightsArray:e,shadowsArray:n,camera:null,lights:t,transmissionRenderTarget:{}};return{init:r,state:c,setupLights:o,setupLightsView:l,pushLight:s,pushShadow:a}}function jg(i){let t=new WeakMap;function e(r,s=0){const a=t.get(r);let o;return a===void 0?(o=new uc(i),t.set(r,[o])):s>=a.length?(o=new uc(i),a.push(o)):o=a[s],o}function n(){t=new WeakMap}return{get:e,dispose:n}}const Kg=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Zg=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Jg(i,t,e){let n=new Oo;const r=new Rt,s=new Rt,a=new ve,o=new yf({depthPacking:_d}),l=new Mf,c={},h=e.maxTextureSize,d={[jn]:He,[He]:jn,[Cn]:Cn},p=new Zn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Rt},radius:{value:4}},vertexShader:Kg,fragmentShader:Zg}),f=p.clone();f.defines.HORIZONTAL_PASS=1;const _=new Ve;_.setAttribute("position",new fn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const g=new Ke(_,p),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=kc;let u=this.type;this.render=function(R,C,I){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||R.length===0)return;const b=i.getRenderTarget(),x=i.getActiveCubeFace(),P=i.getActiveMipmapLevel(),G=i.state;G.setBlending(Gn),G.buffers.color.setClear(1,1,1,1),G.buffers.depth.setTest(!0),G.setScissorTest(!1);const B=u!==wn&&this.type===wn,Z=u===wn&&this.type!==wn;for(let rt=0,W=R.length;rt<W;rt++){const at=R[rt],V=at.shadow;if(V===void 0){console.warn("THREE.WebGLShadowMap:",at,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;r.copy(V.mapSize);const _t=V.getFrameExtents();if(r.multiply(_t),s.copy(V.mapSize),(r.x>h||r.y>h)&&(r.x>h&&(s.x=Math.floor(h/_t.x),r.x=s.x*_t.x,V.mapSize.x=s.x),r.y>h&&(s.y=Math.floor(h/_t.y),r.y=s.y*_t.y,V.mapSize.y=s.y)),V.map===null||B===!0||Z===!0){const xt=this.type!==wn?{minFilter:dn,magFilter:dn}:{};V.map!==null&&V.map.dispose(),V.map=new _i(r.x,r.y,xt),V.map.texture.name=at.name+".shadowMap",V.camera.updateProjectionMatrix()}i.setRenderTarget(V.map),i.clear();const tt=V.getViewportCount();for(let xt=0;xt<tt;xt++){const Nt=V.getViewport(xt);a.set(s.x*Nt.x,s.y*Nt.y,s.x*Nt.z,s.y*Nt.w),G.viewport(a),V.updateMatrices(at,xt),n=V.getFrustum(),M(C,I,V.camera,at,this.type)}V.isPointLightShadow!==!0&&this.type===wn&&A(V,I),V.needsUpdate=!1}u=this.type,m.needsUpdate=!1,i.setRenderTarget(b,x,P)};function A(R,C){const I=t.update(g);p.defines.VSM_SAMPLES!==R.blurSamples&&(p.defines.VSM_SAMPLES=R.blurSamples,f.defines.VSM_SAMPLES=R.blurSamples,p.needsUpdate=!0,f.needsUpdate=!0),R.mapPass===null&&(R.mapPass=new _i(r.x,r.y)),p.uniforms.shadow_pass.value=R.map.texture,p.uniforms.resolution.value=R.mapSize,p.uniforms.radius.value=R.radius,i.setRenderTarget(R.mapPass),i.clear(),i.renderBufferDirect(C,null,I,p,g,null),f.uniforms.shadow_pass.value=R.mapPass.texture,f.uniforms.resolution.value=R.mapSize,f.uniforms.radius.value=R.radius,i.setRenderTarget(R.map),i.clear(),i.renderBufferDirect(C,null,I,f,g,null)}function T(R,C,I,b){let x=null;const P=I.isPointLight===!0?R.customDistanceMaterial:R.customDepthMaterial;if(P!==void 0)x=P;else if(x=I.isPointLight===!0?l:o,i.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0){const G=x.uuid,B=C.uuid;let Z=c[G];Z===void 0&&(Z={},c[G]=Z);let rt=Z[B];rt===void 0&&(rt=x.clone(),Z[B]=rt,C.addEventListener("dispose",L)),x=rt}if(x.visible=C.visible,x.wireframe=C.wireframe,b===wn?x.side=C.shadowSide!==null?C.shadowSide:C.side:x.side=C.shadowSide!==null?C.shadowSide:d[C.side],x.alphaMap=C.alphaMap,x.alphaTest=C.alphaTest,x.map=C.map,x.clipShadows=C.clipShadows,x.clippingPlanes=C.clippingPlanes,x.clipIntersection=C.clipIntersection,x.displacementMap=C.displacementMap,x.displacementScale=C.displacementScale,x.displacementBias=C.displacementBias,x.wireframeLinewidth=C.wireframeLinewidth,x.linewidth=C.linewidth,I.isPointLight===!0&&x.isMeshDistanceMaterial===!0){const G=i.properties.get(x);G.light=I}return x}function M(R,C,I,b,x){if(R.visible===!1)return;if(R.layers.test(C.layers)&&(R.isMesh||R.isLine||R.isPoints)&&(R.castShadow||R.receiveShadow&&x===wn)&&(!R.frustumCulled||n.intersectsObject(R))){R.modelViewMatrix.multiplyMatrices(I.matrixWorldInverse,R.matrixWorld);const B=t.update(R),Z=R.material;if(Array.isArray(Z)){const rt=B.groups;for(let W=0,at=rt.length;W<at;W++){const V=rt[W],_t=Z[V.materialIndex];if(_t&&_t.visible){const tt=T(R,_t,b,x);R.onBeforeShadow(i,R,C,I,B,tt,V),i.renderBufferDirect(I,null,B,tt,R,V),R.onAfterShadow(i,R,C,I,B,tt,V)}}}else if(Z.visible){const rt=T(R,Z,b,x);R.onBeforeShadow(i,R,C,I,B,rt,null),i.renderBufferDirect(I,null,B,rt,R,null),R.onAfterShadow(i,R,C,I,B,rt,null)}}const G=R.children;for(let B=0,Z=G.length;B<Z;B++)M(G[B],C,I,b,x)}function L(R){R.target.removeEventListener("dispose",L);for(const I in c){const b=c[I],x=R.target.uuid;x in b&&(b[x].dispose(),delete b[x])}}}const Qg={[Ba]:$a,[za]:Va,[ka]:Ga,[rr]:Ha,[$a]:Ba,[Va]:za,[Ga]:ka,[Ha]:rr};function tv(i,t){function e(){let N=!1;const wt=new ve;let it=null;const lt=new ve(0,0,0,0);return{setMask:function(Pt){it!==Pt&&!N&&(i.colorMask(Pt,Pt,Pt,Pt),it=Pt)},setLocked:function(Pt){N=Pt},setClear:function(Pt,Ct,Xt,de,Pe){Pe===!0&&(Pt*=de,Ct*=de,Xt*=de),wt.set(Pt,Ct,Xt,de),lt.equals(wt)===!1&&(i.clearColor(Pt,Ct,Xt,de),lt.copy(wt))},reset:function(){N=!1,it=null,lt.set(-1,0,0,0)}}}function n(){let N=!1,wt=!1,it=null,lt=null,Pt=null;return{setReversed:function(Ct){if(wt!==Ct){const Xt=t.get("EXT_clip_control");wt?Xt.clipControlEXT(Xt.LOWER_LEFT_EXT,Xt.ZERO_TO_ONE_EXT):Xt.clipControlEXT(Xt.LOWER_LEFT_EXT,Xt.NEGATIVE_ONE_TO_ONE_EXT);const de=Pt;Pt=null,this.setClear(de)}wt=Ct},getReversed:function(){return wt},setTest:function(Ct){Ct?O(i.DEPTH_TEST):D(i.DEPTH_TEST)},setMask:function(Ct){it!==Ct&&!N&&(i.depthMask(Ct),it=Ct)},setFunc:function(Ct){if(wt&&(Ct=Qg[Ct]),lt!==Ct){switch(Ct){case Ba:i.depthFunc(i.NEVER);break;case $a:i.depthFunc(i.ALWAYS);break;case za:i.depthFunc(i.LESS);break;case rr:i.depthFunc(i.LEQUAL);break;case ka:i.depthFunc(i.EQUAL);break;case Ha:i.depthFunc(i.GEQUAL);break;case Va:i.depthFunc(i.GREATER);break;case Ga:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}lt=Ct}},setLocked:function(Ct){N=Ct},setClear:function(Ct){Pt!==Ct&&(wt&&(Ct=1-Ct),i.clearDepth(Ct),Pt=Ct)},reset:function(){N=!1,it=null,lt=null,Pt=null,wt=!1}}}function r(){let N=!1,wt=null,it=null,lt=null,Pt=null,Ct=null,Xt=null,de=null,Pe=null;return{setTest:function(le){N||(le?O(i.STENCIL_TEST):D(i.STENCIL_TEST))},setMask:function(le){wt!==le&&!N&&(i.stencilMask(le),wt=le)},setFunc:function(le,an,yn){(it!==le||lt!==an||Pt!==yn)&&(i.stencilFunc(le,an,yn),it=le,lt=an,Pt=yn)},setOp:function(le,an,yn){(Ct!==le||Xt!==an||de!==yn)&&(i.stencilOp(le,an,yn),Ct=le,Xt=an,de=yn)},setLocked:function(le){N=le},setClear:function(le){Pe!==le&&(i.clearStencil(le),Pe=le)},reset:function(){N=!1,wt=null,it=null,lt=null,Pt=null,Ct=null,Xt=null,de=null,Pe=null}}}const s=new e,a=new n,o=new r,l=new WeakMap,c=new WeakMap;let h={},d={},p=new WeakMap,f=[],_=null,g=!1,m=null,u=null,A=null,T=null,M=null,L=null,R=null,C=new Qt(0,0,0),I=0,b=!1,x=null,P=null,G=null,B=null,Z=null;const rt=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let W=!1,at=0;const V=i.getParameter(i.VERSION);V.indexOf("WebGL")!==-1?(at=parseFloat(/^WebGL (\d)/.exec(V)[1]),W=at>=1):V.indexOf("OpenGL ES")!==-1&&(at=parseFloat(/^OpenGL ES (\d)/.exec(V)[1]),W=at>=2);let _t=null,tt={};const xt=i.getParameter(i.SCISSOR_BOX),Nt=i.getParameter(i.VIEWPORT),bt=new ve().fromArray(xt),q=new ve().fromArray(Nt);function H(N,wt,it,lt){const Pt=new Uint8Array(4),Ct=i.createTexture();i.bindTexture(N,Ct),i.texParameteri(N,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(N,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Xt=0;Xt<it;Xt++)N===i.TEXTURE_3D||N===i.TEXTURE_2D_ARRAY?i.texImage3D(wt,0,i.RGBA,1,1,lt,0,i.RGBA,i.UNSIGNED_BYTE,Pt):i.texImage2D(wt+Xt,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Pt);return Ct}const X={};X[i.TEXTURE_2D]=H(i.TEXTURE_2D,i.TEXTURE_2D,1),X[i.TEXTURE_CUBE_MAP]=H(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),X[i.TEXTURE_2D_ARRAY]=H(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),X[i.TEXTURE_3D]=H(i.TEXTURE_3D,i.TEXTURE_3D,1,1),s.setClear(0,0,0,1),a.setClear(1),o.setClear(0),O(i.DEPTH_TEST),a.setFunc(rr),vt(!1),mt(sl),O(i.CULL_FACE),w(Gn);function O(N){h[N]!==!0&&(i.enable(N),h[N]=!0)}function D(N){h[N]!==!1&&(i.disable(N),h[N]=!1)}function U(N,wt){return d[N]!==wt?(i.bindFramebuffer(N,wt),d[N]=wt,N===i.DRAW_FRAMEBUFFER&&(d[i.FRAMEBUFFER]=wt),N===i.FRAMEBUFFER&&(d[i.DRAW_FRAMEBUFFER]=wt),!0):!1}function Q(N,wt){let it=f,lt=!1;if(N){it=p.get(wt),it===void 0&&(it=[],p.set(wt,it));const Pt=N.textures;if(it.length!==Pt.length||it[0]!==i.COLOR_ATTACHMENT0){for(let Ct=0,Xt=Pt.length;Ct<Xt;Ct++)it[Ct]=i.COLOR_ATTACHMENT0+Ct;it.length=Pt.length,lt=!0}}else it[0]!==i.BACK&&(it[0]=i.BACK,lt=!0);lt&&i.drawBuffers(it)}function ot(N){return _!==N?(i.useProgram(N),_=N,!0):!1}const ut={[li]:i.FUNC_ADD,[Hu]:i.FUNC_SUBTRACT,[Vu]:i.FUNC_REVERSE_SUBTRACT};ut[Gu]=i.MIN,ut[Wu]=i.MAX;const dt={[Xu]:i.ZERO,[qu]:i.ONE,[Yu]:i.SRC_COLOR,[Fa]:i.SRC_ALPHA,[td]:i.SRC_ALPHA_SATURATE,[Ju]:i.DST_COLOR,[Ku]:i.DST_ALPHA,[ju]:i.ONE_MINUS_SRC_COLOR,[Oa]:i.ONE_MINUS_SRC_ALPHA,[Qu]:i.ONE_MINUS_DST_COLOR,[Zu]:i.ONE_MINUS_DST_ALPHA,[ed]:i.CONSTANT_COLOR,[nd]:i.ONE_MINUS_CONSTANT_COLOR,[id]:i.CONSTANT_ALPHA,[rd]:i.ONE_MINUS_CONSTANT_ALPHA};function w(N,wt,it,lt,Pt,Ct,Xt,de,Pe,le){if(N===Gn){g===!0&&(D(i.BLEND),g=!1);return}if(g===!1&&(O(i.BLEND),g=!0),N!==ku){if(N!==m||le!==b){if((u!==li||M!==li)&&(i.blendEquation(i.FUNC_ADD),u=li,M=li),le)switch(N){case Ki:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case al:i.blendFunc(i.ONE,i.ONE);break;case ol:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case ll:i.blendFuncSeparate(i.ZERO,i.SRC_COLOR,i.ZERO,i.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}else switch(N){case Ki:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case al:i.blendFunc(i.SRC_ALPHA,i.ONE);break;case ol:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case ll:i.blendFunc(i.ZERO,i.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}A=null,T=null,L=null,R=null,C.set(0,0,0),I=0,m=N,b=le}return}Pt=Pt||wt,Ct=Ct||it,Xt=Xt||lt,(wt!==u||Pt!==M)&&(i.blendEquationSeparate(ut[wt],ut[Pt]),u=wt,M=Pt),(it!==A||lt!==T||Ct!==L||Xt!==R)&&(i.blendFuncSeparate(dt[it],dt[lt],dt[Ct],dt[Xt]),A=it,T=lt,L=Ct,R=Xt),(de.equals(C)===!1||Pe!==I)&&(i.blendColor(de.r,de.g,de.b,Pe),C.copy(de),I=Pe),m=N,b=!1}function Et(N,wt){N.side===Cn?D(i.CULL_FACE):O(i.CULL_FACE);let it=N.side===He;wt&&(it=!it),vt(it),N.blending===Ki&&N.transparent===!1?w(Gn):w(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),a.setFunc(N.depthFunc),a.setTest(N.depthTest),a.setMask(N.depthWrite),s.setMask(N.colorWrite);const lt=N.stencilWrite;o.setTest(lt),lt&&(o.setMask(N.stencilWriteMask),o.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),o.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),St(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?O(i.SAMPLE_ALPHA_TO_COVERAGE):D(i.SAMPLE_ALPHA_TO_COVERAGE)}function vt(N){x!==N&&(N?i.frontFace(i.CW):i.frontFace(i.CCW),x=N)}function mt(N){N!==$u?(O(i.CULL_FACE),N!==P&&(N===sl?i.cullFace(i.BACK):N===zu?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):D(i.CULL_FACE),P=N}function ct(N){N!==G&&(W&&i.lineWidth(N),G=N)}function St(N,wt,it){N?(O(i.POLYGON_OFFSET_FILL),(B!==wt||Z!==it)&&(i.polygonOffset(wt,it),B=wt,Z=it)):D(i.POLYGON_OFFSET_FILL)}function pt(N){N?O(i.SCISSOR_TEST):D(i.SCISSOR_TEST)}function E(N){N===void 0&&(N=i.TEXTURE0+rt-1),_t!==N&&(i.activeTexture(N),_t=N)}function v(N,wt,it){it===void 0&&(_t===null?it=i.TEXTURE0+rt-1:it=_t);let lt=tt[it];lt===void 0&&(lt={type:void 0,texture:void 0},tt[it]=lt),(lt.type!==N||lt.texture!==wt)&&(_t!==it&&(i.activeTexture(it),_t=it),i.bindTexture(N,wt||X[N]),lt.type=N,lt.texture=wt)}function $(){const N=tt[_t];N!==void 0&&N.type!==void 0&&(i.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function Y(){try{i.compressedTexImage2D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function et(){try{i.compressedTexImage3D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function nt(){try{i.texSubImage2D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Tt(){try{i.texSubImage3D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function yt(){try{i.compressedTexSubImage2D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function At(){try{i.compressedTexSubImage3D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Wt(){try{i.texStorage2D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function gt(){try{i.texStorage3D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ft(){try{i.texImage2D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Dt(){try{i.texImage3D.apply(i,arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function It(N){bt.equals(N)===!1&&(i.scissor(N.x,N.y,N.z,N.w),bt.copy(N))}function ht(N){q.equals(N)===!1&&(i.viewport(N.x,N.y,N.z,N.w),q.copy(N))}function Ht(N,wt){let it=c.get(wt);it===void 0&&(it=new WeakMap,c.set(wt,it));let lt=it.get(N);lt===void 0&&(lt=i.getUniformBlockIndex(wt,N.name),it.set(N,lt))}function $t(N,wt){const lt=c.get(wt).get(N);l.get(wt)!==lt&&(i.uniformBlockBinding(wt,lt,N.__bindingPointIndex),l.set(wt,lt))}function te(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),h={},_t=null,tt={},d={},p=new WeakMap,f=[],_=null,g=!1,m=null,u=null,A=null,T=null,M=null,L=null,R=null,C=new Qt(0,0,0),I=0,b=!1,x=null,P=null,G=null,B=null,Z=null,bt.set(0,0,i.canvas.width,i.canvas.height),q.set(0,0,i.canvas.width,i.canvas.height),s.reset(),a.reset(),o.reset()}return{buffers:{color:s,depth:a,stencil:o},enable:O,disable:D,bindFramebuffer:U,drawBuffers:Q,useProgram:ot,setBlending:w,setMaterial:Et,setFlipSided:vt,setCullFace:mt,setLineWidth:ct,setPolygonOffset:St,setScissorTest:pt,activeTexture:E,bindTexture:v,unbindTexture:$,compressedTexImage2D:Y,compressedTexImage3D:et,texImage2D:ft,texImage3D:Dt,updateUBOMapping:Ht,uniformBlockBinding:$t,texStorage2D:Wt,texStorage3D:gt,texSubImage2D:nt,texSubImage3D:Tt,compressedTexSubImage2D:yt,compressedTexSubImage3D:At,scissor:It,viewport:ht,reset:te}}function ev(i,t,e,n,r,s,a){const o=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Rt,h=new WeakMap;let d;const p=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(E,v){return f?new OffscreenCanvas(E,v):Us("canvas")}function g(E,v,$){let Y=1;const et=pt(E);if((et.width>$||et.height>$)&&(Y=$/Math.max(et.width,et.height)),Y<1)if(typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&E instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&E instanceof ImageBitmap||typeof VideoFrame<"u"&&E instanceof VideoFrame){const nt=Math.floor(Y*et.width),Tt=Math.floor(Y*et.height);d===void 0&&(d=_(nt,Tt));const yt=v?_(nt,Tt):d;return yt.width=nt,yt.height=Tt,yt.getContext("2d").drawImage(E,0,0,nt,Tt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+et.width+"x"+et.height+") to ("+nt+"x"+Tt+")."),yt}else return"data"in E&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+et.width+"x"+et.height+")."),E;return E}function m(E){return E.generateMipmaps}function u(E){i.generateMipmap(E)}function A(E){return E.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:E.isWebGL3DRenderTarget?i.TEXTURE_3D:E.isWebGLArrayRenderTarget||E.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function T(E,v,$,Y,et=!1){if(E!==null){if(i[E]!==void 0)return i[E];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+E+"'")}let nt=v;if(v===i.RED&&($===i.FLOAT&&(nt=i.R32F),$===i.HALF_FLOAT&&(nt=i.R16F),$===i.UNSIGNED_BYTE&&(nt=i.R8)),v===i.RED_INTEGER&&($===i.UNSIGNED_BYTE&&(nt=i.R8UI),$===i.UNSIGNED_SHORT&&(nt=i.R16UI),$===i.UNSIGNED_INT&&(nt=i.R32UI),$===i.BYTE&&(nt=i.R8I),$===i.SHORT&&(nt=i.R16I),$===i.INT&&(nt=i.R32I)),v===i.RG&&($===i.FLOAT&&(nt=i.RG32F),$===i.HALF_FLOAT&&(nt=i.RG16F),$===i.UNSIGNED_BYTE&&(nt=i.RG8)),v===i.RG_INTEGER&&($===i.UNSIGNED_BYTE&&(nt=i.RG8UI),$===i.UNSIGNED_SHORT&&(nt=i.RG16UI),$===i.UNSIGNED_INT&&(nt=i.RG32UI),$===i.BYTE&&(nt=i.RG8I),$===i.SHORT&&(nt=i.RG16I),$===i.INT&&(nt=i.RG32I)),v===i.RGB_INTEGER&&($===i.UNSIGNED_BYTE&&(nt=i.RGB8UI),$===i.UNSIGNED_SHORT&&(nt=i.RGB16UI),$===i.UNSIGNED_INT&&(nt=i.RGB32UI),$===i.BYTE&&(nt=i.RGB8I),$===i.SHORT&&(nt=i.RGB16I),$===i.INT&&(nt=i.RGB32I)),v===i.RGBA_INTEGER&&($===i.UNSIGNED_BYTE&&(nt=i.RGBA8UI),$===i.UNSIGNED_SHORT&&(nt=i.RGBA16UI),$===i.UNSIGNED_INT&&(nt=i.RGBA32UI),$===i.BYTE&&(nt=i.RGBA8I),$===i.SHORT&&(nt=i.RGBA16I),$===i.INT&&(nt=i.RGBA32I)),v===i.RGB&&$===i.UNSIGNED_INT_5_9_9_9_REV&&(nt=i.RGB9_E5),v===i.RGBA){const Tt=et?Ds:ie.getTransfer(Y);$===i.FLOAT&&(nt=i.RGBA32F),$===i.HALF_FLOAT&&(nt=i.RGBA16F),$===i.UNSIGNED_BYTE&&(nt=Tt===ce?i.SRGB8_ALPHA8:i.RGBA8),$===i.UNSIGNED_SHORT_4_4_4_4&&(nt=i.RGBA4),$===i.UNSIGNED_SHORT_5_5_5_1&&(nt=i.RGB5_A1)}return(nt===i.R16F||nt===i.R32F||nt===i.RG16F||nt===i.RG32F||nt===i.RGBA16F||nt===i.RGBA32F)&&t.get("EXT_color_buffer_float"),nt}function M(E,v){let $;return E?v===null||v===mi||v===or?$=i.DEPTH24_STENCIL8:v===Rn?$=i.DEPTH32F_STENCIL8:v===Pr&&($=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):v===null||v===mi||v===or?$=i.DEPTH_COMPONENT24:v===Rn?$=i.DEPTH_COMPONENT32F:v===Pr&&($=i.DEPTH_COMPONENT16),$}function L(E,v){return m(E)===!0||E.isFramebufferTexture&&E.minFilter!==dn&&E.minFilter!==gn?Math.log2(Math.max(v.width,v.height))+1:E.mipmaps!==void 0&&E.mipmaps.length>0?E.mipmaps.length:E.isCompressedTexture&&Array.isArray(E.image)?v.mipmaps.length:1}function R(E){const v=E.target;v.removeEventListener("dispose",R),I(v),v.isVideoTexture&&h.delete(v)}function C(E){const v=E.target;v.removeEventListener("dispose",C),x(v)}function I(E){const v=n.get(E);if(v.__webglInit===void 0)return;const $=E.source,Y=p.get($);if(Y){const et=Y[v.__cacheKey];et.usedTimes--,et.usedTimes===0&&b(E),Object.keys(Y).length===0&&p.delete($)}n.remove(E)}function b(E){const v=n.get(E);i.deleteTexture(v.__webglTexture);const $=E.source,Y=p.get($);delete Y[v.__cacheKey],a.memory.textures--}function x(E){const v=n.get(E);if(E.depthTexture&&(E.depthTexture.dispose(),n.remove(E.depthTexture)),E.isWebGLCubeRenderTarget)for(let Y=0;Y<6;Y++){if(Array.isArray(v.__webglFramebuffer[Y]))for(let et=0;et<v.__webglFramebuffer[Y].length;et++)i.deleteFramebuffer(v.__webglFramebuffer[Y][et]);else i.deleteFramebuffer(v.__webglFramebuffer[Y]);v.__webglDepthbuffer&&i.deleteRenderbuffer(v.__webglDepthbuffer[Y])}else{if(Array.isArray(v.__webglFramebuffer))for(let Y=0;Y<v.__webglFramebuffer.length;Y++)i.deleteFramebuffer(v.__webglFramebuffer[Y]);else i.deleteFramebuffer(v.__webglFramebuffer);if(v.__webglDepthbuffer&&i.deleteRenderbuffer(v.__webglDepthbuffer),v.__webglMultisampledFramebuffer&&i.deleteFramebuffer(v.__webglMultisampledFramebuffer),v.__webglColorRenderbuffer)for(let Y=0;Y<v.__webglColorRenderbuffer.length;Y++)v.__webglColorRenderbuffer[Y]&&i.deleteRenderbuffer(v.__webglColorRenderbuffer[Y]);v.__webglDepthRenderbuffer&&i.deleteRenderbuffer(v.__webglDepthRenderbuffer)}const $=E.textures;for(let Y=0,et=$.length;Y<et;Y++){const nt=n.get($[Y]);nt.__webglTexture&&(i.deleteTexture(nt.__webglTexture),a.memory.textures--),n.remove($[Y])}n.remove(E)}let P=0;function G(){P=0}function B(){const E=P;return E>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+E+" texture units while this GPU supports only "+r.maxTextures),P+=1,E}function Z(E){const v=[];return v.push(E.wrapS),v.push(E.wrapT),v.push(E.wrapR||0),v.push(E.magFilter),v.push(E.minFilter),v.push(E.anisotropy),v.push(E.internalFormat),v.push(E.format),v.push(E.type),v.push(E.generateMipmaps),v.push(E.premultiplyAlpha),v.push(E.flipY),v.push(E.unpackAlignment),v.push(E.colorSpace),v.join()}function rt(E,v){const $=n.get(E);if(E.isVideoTexture&&ct(E),E.isRenderTargetTexture===!1&&E.version>0&&$.__version!==E.version){const Y=E.image;if(Y===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(Y.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{q($,E,v);return}}e.bindTexture(i.TEXTURE_2D,$.__webglTexture,i.TEXTURE0+v)}function W(E,v){const $=n.get(E);if(E.version>0&&$.__version!==E.version){q($,E,v);return}e.bindTexture(i.TEXTURE_2D_ARRAY,$.__webglTexture,i.TEXTURE0+v)}function at(E,v){const $=n.get(E);if(E.version>0&&$.__version!==E.version){q($,E,v);return}e.bindTexture(i.TEXTURE_3D,$.__webglTexture,i.TEXTURE0+v)}function V(E,v){const $=n.get(E);if(E.version>0&&$.__version!==E.version){H($,E,v);return}e.bindTexture(i.TEXTURE_CUBE_MAP,$.__webglTexture,i.TEXTURE0+v)}const _t={[qa]:i.REPEAT,[hi]:i.CLAMP_TO_EDGE,[Ya]:i.MIRRORED_REPEAT},tt={[dn]:i.NEAREST,[pd]:i.NEAREST_MIPMAP_NEAREST,[Or]:i.NEAREST_MIPMAP_LINEAR,[gn]:i.LINEAR,[Js]:i.LINEAR_MIPMAP_NEAREST,[ui]:i.LINEAR_MIPMAP_LINEAR},xt={[vd]:i.NEVER,[Ed]:i.ALWAYS,[xd]:i.LESS,[nh]:i.LEQUAL,[Sd]:i.EQUAL,[bd]:i.GEQUAL,[yd]:i.GREATER,[Md]:i.NOTEQUAL};function Nt(E,v){if(v.type===Rn&&t.has("OES_texture_float_linear")===!1&&(v.magFilter===gn||v.magFilter===Js||v.magFilter===Or||v.magFilter===ui||v.minFilter===gn||v.minFilter===Js||v.minFilter===Or||v.minFilter===ui)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(E,i.TEXTURE_WRAP_S,_t[v.wrapS]),i.texParameteri(E,i.TEXTURE_WRAP_T,_t[v.wrapT]),(E===i.TEXTURE_3D||E===i.TEXTURE_2D_ARRAY)&&i.texParameteri(E,i.TEXTURE_WRAP_R,_t[v.wrapR]),i.texParameteri(E,i.TEXTURE_MAG_FILTER,tt[v.magFilter]),i.texParameteri(E,i.TEXTURE_MIN_FILTER,tt[v.minFilter]),v.compareFunction&&(i.texParameteri(E,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(E,i.TEXTURE_COMPARE_FUNC,xt[v.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(v.magFilter===dn||v.minFilter!==Or&&v.minFilter!==ui||v.type===Rn&&t.has("OES_texture_float_linear")===!1)return;if(v.anisotropy>1||n.get(v).__currentAnisotropy){const $=t.get("EXT_texture_filter_anisotropic");i.texParameterf(E,$.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,r.getMaxAnisotropy())),n.get(v).__currentAnisotropy=v.anisotropy}}}function bt(E,v){let $=!1;E.__webglInit===void 0&&(E.__webglInit=!0,v.addEventListener("dispose",R));const Y=v.source;let et=p.get(Y);et===void 0&&(et={},p.set(Y,et));const nt=Z(v);if(nt!==E.__cacheKey){et[nt]===void 0&&(et[nt]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,$=!0),et[nt].usedTimes++;const Tt=et[E.__cacheKey];Tt!==void 0&&(et[E.__cacheKey].usedTimes--,Tt.usedTimes===0&&b(v)),E.__cacheKey=nt,E.__webglTexture=et[nt].texture}return $}function q(E,v,$){let Y=i.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&(Y=i.TEXTURE_2D_ARRAY),v.isData3DTexture&&(Y=i.TEXTURE_3D);const et=bt(E,v),nt=v.source;e.bindTexture(Y,E.__webglTexture,i.TEXTURE0+$);const Tt=n.get(nt);if(nt.version!==Tt.__version||et===!0){e.activeTexture(i.TEXTURE0+$);const yt=ie.getPrimaries(ie.workingColorSpace),At=v.colorSpace===Vn?null:ie.getPrimaries(v.colorSpace),Wt=v.colorSpace===Vn||yt===At?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,v.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,v.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Wt);let gt=g(v.image,!1,r.maxTextureSize);gt=St(v,gt);const ft=s.convert(v.format,v.colorSpace),Dt=s.convert(v.type);let It=T(v.internalFormat,ft,Dt,v.colorSpace,v.isVideoTexture);Nt(Y,v);let ht;const Ht=v.mipmaps,$t=v.isVideoTexture!==!0,te=Tt.__version===void 0||et===!0,N=nt.dataReady,wt=L(v,gt);if(v.isDepthTexture)It=M(v.format===lr,v.type),te&&($t?e.texStorage2D(i.TEXTURE_2D,1,It,gt.width,gt.height):e.texImage2D(i.TEXTURE_2D,0,It,gt.width,gt.height,0,ft,Dt,null));else if(v.isDataTexture)if(Ht.length>0){$t&&te&&e.texStorage2D(i.TEXTURE_2D,wt,It,Ht[0].width,Ht[0].height);for(let it=0,lt=Ht.length;it<lt;it++)ht=Ht[it],$t?N&&e.texSubImage2D(i.TEXTURE_2D,it,0,0,ht.width,ht.height,ft,Dt,ht.data):e.texImage2D(i.TEXTURE_2D,it,It,ht.width,ht.height,0,ft,Dt,ht.data);v.generateMipmaps=!1}else $t?(te&&e.texStorage2D(i.TEXTURE_2D,wt,It,gt.width,gt.height),N&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,gt.width,gt.height,ft,Dt,gt.data)):e.texImage2D(i.TEXTURE_2D,0,It,gt.width,gt.height,0,ft,Dt,gt.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){$t&&te&&e.texStorage3D(i.TEXTURE_2D_ARRAY,wt,It,Ht[0].width,Ht[0].height,gt.depth);for(let it=0,lt=Ht.length;it<lt;it++)if(ht=Ht[it],v.format!==un)if(ft!==null)if($t){if(N)if(v.layerUpdates.size>0){const Pt=kl(ht.width,ht.height,v.format,v.type);for(const Ct of v.layerUpdates){const Xt=ht.data.subarray(Ct*Pt/ht.data.BYTES_PER_ELEMENT,(Ct+1)*Pt/ht.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,it,0,0,Ct,ht.width,ht.height,1,ft,Xt)}v.clearLayerUpdates()}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,it,0,0,0,ht.width,ht.height,gt.depth,ft,ht.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,it,It,ht.width,ht.height,gt.depth,0,ht.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else $t?N&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,it,0,0,0,ht.width,ht.height,gt.depth,ft,Dt,ht.data):e.texImage3D(i.TEXTURE_2D_ARRAY,it,It,ht.width,ht.height,gt.depth,0,ft,Dt,ht.data)}else{$t&&te&&e.texStorage2D(i.TEXTURE_2D,wt,It,Ht[0].width,Ht[0].height);for(let it=0,lt=Ht.length;it<lt;it++)ht=Ht[it],v.format!==un?ft!==null?$t?N&&e.compressedTexSubImage2D(i.TEXTURE_2D,it,0,0,ht.width,ht.height,ft,ht.data):e.compressedTexImage2D(i.TEXTURE_2D,it,It,ht.width,ht.height,0,ht.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):$t?N&&e.texSubImage2D(i.TEXTURE_2D,it,0,0,ht.width,ht.height,ft,Dt,ht.data):e.texImage2D(i.TEXTURE_2D,it,It,ht.width,ht.height,0,ft,Dt,ht.data)}else if(v.isDataArrayTexture)if($t){if(te&&e.texStorage3D(i.TEXTURE_2D_ARRAY,wt,It,gt.width,gt.height,gt.depth),N)if(v.layerUpdates.size>0){const it=kl(gt.width,gt.height,v.format,v.type);for(const lt of v.layerUpdates){const Pt=gt.data.subarray(lt*it/gt.data.BYTES_PER_ELEMENT,(lt+1)*it/gt.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,lt,gt.width,gt.height,1,ft,Dt,Pt)}v.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,gt.width,gt.height,gt.depth,ft,Dt,gt.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,It,gt.width,gt.height,gt.depth,0,ft,Dt,gt.data);else if(v.isData3DTexture)$t?(te&&e.texStorage3D(i.TEXTURE_3D,wt,It,gt.width,gt.height,gt.depth),N&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,gt.width,gt.height,gt.depth,ft,Dt,gt.data)):e.texImage3D(i.TEXTURE_3D,0,It,gt.width,gt.height,gt.depth,0,ft,Dt,gt.data);else if(v.isFramebufferTexture){if(te)if($t)e.texStorage2D(i.TEXTURE_2D,wt,It,gt.width,gt.height);else{let it=gt.width,lt=gt.height;for(let Pt=0;Pt<wt;Pt++)e.texImage2D(i.TEXTURE_2D,Pt,It,it,lt,0,ft,Dt,null),it>>=1,lt>>=1}}else if(Ht.length>0){if($t&&te){const it=pt(Ht[0]);e.texStorage2D(i.TEXTURE_2D,wt,It,it.width,it.height)}for(let it=0,lt=Ht.length;it<lt;it++)ht=Ht[it],$t?N&&e.texSubImage2D(i.TEXTURE_2D,it,0,0,ft,Dt,ht):e.texImage2D(i.TEXTURE_2D,it,It,ft,Dt,ht);v.generateMipmaps=!1}else if($t){if(te){const it=pt(gt);e.texStorage2D(i.TEXTURE_2D,wt,It,it.width,it.height)}N&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,ft,Dt,gt)}else e.texImage2D(i.TEXTURE_2D,0,It,ft,Dt,gt);m(v)&&u(Y),Tt.__version=nt.version,v.onUpdate&&v.onUpdate(v)}E.__version=v.version}function H(E,v,$){if(v.image.length!==6)return;const Y=bt(E,v),et=v.source;e.bindTexture(i.TEXTURE_CUBE_MAP,E.__webglTexture,i.TEXTURE0+$);const nt=n.get(et);if(et.version!==nt.__version||Y===!0){e.activeTexture(i.TEXTURE0+$);const Tt=ie.getPrimaries(ie.workingColorSpace),yt=v.colorSpace===Vn?null:ie.getPrimaries(v.colorSpace),At=v.colorSpace===Vn||Tt===yt?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,v.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,v.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,At);const Wt=v.isCompressedTexture||v.image[0].isCompressedTexture,gt=v.image[0]&&v.image[0].isDataTexture,ft=[];for(let lt=0;lt<6;lt++)!Wt&&!gt?ft[lt]=g(v.image[lt],!0,r.maxCubemapSize):ft[lt]=gt?v.image[lt].image:v.image[lt],ft[lt]=St(v,ft[lt]);const Dt=ft[0],It=s.convert(v.format,v.colorSpace),ht=s.convert(v.type),Ht=T(v.internalFormat,It,ht,v.colorSpace),$t=v.isVideoTexture!==!0,te=nt.__version===void 0||Y===!0,N=et.dataReady;let wt=L(v,Dt);Nt(i.TEXTURE_CUBE_MAP,v);let it;if(Wt){$t&&te&&e.texStorage2D(i.TEXTURE_CUBE_MAP,wt,Ht,Dt.width,Dt.height);for(let lt=0;lt<6;lt++){it=ft[lt].mipmaps;for(let Pt=0;Pt<it.length;Pt++){const Ct=it[Pt];v.format!==un?It!==null?$t?N&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Pt,0,0,Ct.width,Ct.height,It,Ct.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Pt,Ht,Ct.width,Ct.height,0,Ct.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):$t?N&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Pt,0,0,Ct.width,Ct.height,It,ht,Ct.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Pt,Ht,Ct.width,Ct.height,0,It,ht,Ct.data)}}}else{if(it=v.mipmaps,$t&&te){it.length>0&&wt++;const lt=pt(ft[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,wt,Ht,lt.width,lt.height)}for(let lt=0;lt<6;lt++)if(gt){$t?N&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,0,0,0,ft[lt].width,ft[lt].height,It,ht,ft[lt].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,0,Ht,ft[lt].width,ft[lt].height,0,It,ht,ft[lt].data);for(let Pt=0;Pt<it.length;Pt++){const Xt=it[Pt].image[lt].image;$t?N&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Pt+1,0,0,Xt.width,Xt.height,It,ht,Xt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Pt+1,Ht,Xt.width,Xt.height,0,It,ht,Xt.data)}}else{$t?N&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,0,0,0,It,ht,ft[lt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,0,Ht,It,ht,ft[lt]);for(let Pt=0;Pt<it.length;Pt++){const Ct=it[Pt];$t?N&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Pt+1,0,0,It,ht,Ct.image[lt]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+lt,Pt+1,Ht,It,ht,Ct.image[lt])}}}m(v)&&u(i.TEXTURE_CUBE_MAP),nt.__version=et.version,v.onUpdate&&v.onUpdate(v)}E.__version=v.version}function X(E,v,$,Y,et,nt){const Tt=s.convert($.format,$.colorSpace),yt=s.convert($.type),At=T($.internalFormat,Tt,yt,$.colorSpace),Wt=n.get(v),gt=n.get($);if(gt.__renderTarget=v,!Wt.__hasExternalTextures){const ft=Math.max(1,v.width>>nt),Dt=Math.max(1,v.height>>nt);et===i.TEXTURE_3D||et===i.TEXTURE_2D_ARRAY?e.texImage3D(et,nt,At,ft,Dt,v.depth,0,Tt,yt,null):e.texImage2D(et,nt,At,ft,Dt,0,Tt,yt,null)}e.bindFramebuffer(i.FRAMEBUFFER,E),mt(v)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Y,et,gt.__webglTexture,0,vt(v)):(et===i.TEXTURE_2D||et>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&et<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,Y,et,gt.__webglTexture,nt),e.bindFramebuffer(i.FRAMEBUFFER,null)}function O(E,v,$){if(i.bindRenderbuffer(i.RENDERBUFFER,E),v.depthBuffer){const Y=v.depthTexture,et=Y&&Y.isDepthTexture?Y.type:null,nt=M(v.stencilBuffer,et),Tt=v.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,yt=vt(v);mt(v)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,yt,nt,v.width,v.height):$?i.renderbufferStorageMultisample(i.RENDERBUFFER,yt,nt,v.width,v.height):i.renderbufferStorage(i.RENDERBUFFER,nt,v.width,v.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Tt,i.RENDERBUFFER,E)}else{const Y=v.textures;for(let et=0;et<Y.length;et++){const nt=Y[et],Tt=s.convert(nt.format,nt.colorSpace),yt=s.convert(nt.type),At=T(nt.internalFormat,Tt,yt,nt.colorSpace),Wt=vt(v);$&&mt(v)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Wt,At,v.width,v.height):mt(v)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Wt,At,v.width,v.height):i.renderbufferStorage(i.RENDERBUFFER,At,v.width,v.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function D(E,v){if(v&&v.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(i.FRAMEBUFFER,E),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const Y=n.get(v.depthTexture);Y.__renderTarget=v,(!Y.__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),rt(v.depthTexture,0);const et=Y.__webglTexture,nt=vt(v);if(v.depthTexture.format===Zi)mt(v)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,et,0,nt):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,et,0);else if(v.depthTexture.format===lr)mt(v)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,et,0,nt):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,et,0);else throw new Error("Unknown depthTexture format")}function U(E){const v=n.get(E),$=E.isWebGLCubeRenderTarget===!0;if(v.__boundDepthTexture!==E.depthTexture){const Y=E.depthTexture;if(v.__depthDisposeCallback&&v.__depthDisposeCallback(),Y){const et=()=>{delete v.__boundDepthTexture,delete v.__depthDisposeCallback,Y.removeEventListener("dispose",et)};Y.addEventListener("dispose",et),v.__depthDisposeCallback=et}v.__boundDepthTexture=Y}if(E.depthTexture&&!v.__autoAllocateDepthBuffer){if($)throw new Error("target.depthTexture not supported in Cube render targets");D(v.__webglFramebuffer,E)}else if($){v.__webglDepthbuffer=[];for(let Y=0;Y<6;Y++)if(e.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer[Y]),v.__webglDepthbuffer[Y]===void 0)v.__webglDepthbuffer[Y]=i.createRenderbuffer(),O(v.__webglDepthbuffer[Y],E,!1);else{const et=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,nt=v.__webglDepthbuffer[Y];i.bindRenderbuffer(i.RENDERBUFFER,nt),i.framebufferRenderbuffer(i.FRAMEBUFFER,et,i.RENDERBUFFER,nt)}}else if(e.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer===void 0)v.__webglDepthbuffer=i.createRenderbuffer(),O(v.__webglDepthbuffer,E,!1);else{const Y=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,et=v.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,et),i.framebufferRenderbuffer(i.FRAMEBUFFER,Y,i.RENDERBUFFER,et)}e.bindFramebuffer(i.FRAMEBUFFER,null)}function Q(E,v,$){const Y=n.get(E);v!==void 0&&X(Y.__webglFramebuffer,E,E.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),$!==void 0&&U(E)}function ot(E){const v=E.texture,$=n.get(E),Y=n.get(v);E.addEventListener("dispose",C);const et=E.textures,nt=E.isWebGLCubeRenderTarget===!0,Tt=et.length>1;if(Tt||(Y.__webglTexture===void 0&&(Y.__webglTexture=i.createTexture()),Y.__version=v.version,a.memory.textures++),nt){$.__webglFramebuffer=[];for(let yt=0;yt<6;yt++)if(v.mipmaps&&v.mipmaps.length>0){$.__webglFramebuffer[yt]=[];for(let At=0;At<v.mipmaps.length;At++)$.__webglFramebuffer[yt][At]=i.createFramebuffer()}else $.__webglFramebuffer[yt]=i.createFramebuffer()}else{if(v.mipmaps&&v.mipmaps.length>0){$.__webglFramebuffer=[];for(let yt=0;yt<v.mipmaps.length;yt++)$.__webglFramebuffer[yt]=i.createFramebuffer()}else $.__webglFramebuffer=i.createFramebuffer();if(Tt)for(let yt=0,At=et.length;yt<At;yt++){const Wt=n.get(et[yt]);Wt.__webglTexture===void 0&&(Wt.__webglTexture=i.createTexture(),a.memory.textures++)}if(E.samples>0&&mt(E)===!1){$.__webglMultisampledFramebuffer=i.createFramebuffer(),$.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,$.__webglMultisampledFramebuffer);for(let yt=0;yt<et.length;yt++){const At=et[yt];$.__webglColorRenderbuffer[yt]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,$.__webglColorRenderbuffer[yt]);const Wt=s.convert(At.format,At.colorSpace),gt=s.convert(At.type),ft=T(At.internalFormat,Wt,gt,At.colorSpace,E.isXRRenderTarget===!0),Dt=vt(E);i.renderbufferStorageMultisample(i.RENDERBUFFER,Dt,ft,E.width,E.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+yt,i.RENDERBUFFER,$.__webglColorRenderbuffer[yt])}i.bindRenderbuffer(i.RENDERBUFFER,null),E.depthBuffer&&($.__webglDepthRenderbuffer=i.createRenderbuffer(),O($.__webglDepthRenderbuffer,E,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(nt){e.bindTexture(i.TEXTURE_CUBE_MAP,Y.__webglTexture),Nt(i.TEXTURE_CUBE_MAP,v);for(let yt=0;yt<6;yt++)if(v.mipmaps&&v.mipmaps.length>0)for(let At=0;At<v.mipmaps.length;At++)X($.__webglFramebuffer[yt][At],E,v,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+yt,At);else X($.__webglFramebuffer[yt],E,v,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+yt,0);m(v)&&u(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(Tt){for(let yt=0,At=et.length;yt<At;yt++){const Wt=et[yt],gt=n.get(Wt);e.bindTexture(i.TEXTURE_2D,gt.__webglTexture),Nt(i.TEXTURE_2D,Wt),X($.__webglFramebuffer,E,Wt,i.COLOR_ATTACHMENT0+yt,i.TEXTURE_2D,0),m(Wt)&&u(i.TEXTURE_2D)}e.unbindTexture()}else{let yt=i.TEXTURE_2D;if((E.isWebGL3DRenderTarget||E.isWebGLArrayRenderTarget)&&(yt=E.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(yt,Y.__webglTexture),Nt(yt,v),v.mipmaps&&v.mipmaps.length>0)for(let At=0;At<v.mipmaps.length;At++)X($.__webglFramebuffer[At],E,v,i.COLOR_ATTACHMENT0,yt,At);else X($.__webglFramebuffer,E,v,i.COLOR_ATTACHMENT0,yt,0);m(v)&&u(yt),e.unbindTexture()}E.depthBuffer&&U(E)}function ut(E){const v=E.textures;for(let $=0,Y=v.length;$<Y;$++){const et=v[$];if(m(et)){const nt=A(E),Tt=n.get(et).__webglTexture;e.bindTexture(nt,Tt),u(nt),e.unbindTexture()}}}const dt=[],w=[];function Et(E){if(E.samples>0){if(mt(E)===!1){const v=E.textures,$=E.width,Y=E.height;let et=i.COLOR_BUFFER_BIT;const nt=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Tt=n.get(E),yt=v.length>1;if(yt)for(let At=0;At<v.length;At++)e.bindFramebuffer(i.FRAMEBUFFER,Tt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+At,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,Tt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+At,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,Tt.__webglMultisampledFramebuffer),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,Tt.__webglFramebuffer);for(let At=0;At<v.length;At++){if(E.resolveDepthBuffer&&(E.depthBuffer&&(et|=i.DEPTH_BUFFER_BIT),E.stencilBuffer&&E.resolveStencilBuffer&&(et|=i.STENCIL_BUFFER_BIT)),yt){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Tt.__webglColorRenderbuffer[At]);const Wt=n.get(v[At]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Wt,0)}i.blitFramebuffer(0,0,$,Y,0,0,$,Y,et,i.NEAREST),l===!0&&(dt.length=0,w.length=0,dt.push(i.COLOR_ATTACHMENT0+At),E.depthBuffer&&E.resolveDepthBuffer===!1&&(dt.push(nt),w.push(nt),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,w)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,dt))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),yt)for(let At=0;At<v.length;At++){e.bindFramebuffer(i.FRAMEBUFFER,Tt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+At,i.RENDERBUFFER,Tt.__webglColorRenderbuffer[At]);const Wt=n.get(v[At]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,Tt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+At,i.TEXTURE_2D,Wt,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,Tt.__webglMultisampledFramebuffer)}else if(E.depthBuffer&&E.resolveDepthBuffer===!1&&l){const v=E.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[v])}}}function vt(E){return Math.min(r.maxSamples,E.samples)}function mt(E){const v=n.get(E);return E.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function ct(E){const v=a.render.frame;h.get(E)!==v&&(h.set(E,v),E.update())}function St(E,v){const $=E.colorSpace,Y=E.format,et=E.type;return E.isCompressedTexture===!0||E.isVideoTexture===!0||$!==cr&&$!==Vn&&(ie.getTransfer($)===ce?(Y!==un||et!==Un)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",$)),v}function pt(E){return typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement?(c.width=E.naturalWidth||E.width,c.height=E.naturalHeight||E.height):typeof VideoFrame<"u"&&E instanceof VideoFrame?(c.width=E.displayWidth,c.height=E.displayHeight):(c.width=E.width,c.height=E.height),c}this.allocateTextureUnit=B,this.resetTextureUnits=G,this.setTexture2D=rt,this.setTexture2DArray=W,this.setTexture3D=at,this.setTextureCube=V,this.rebindTextures=Q,this.setupRenderTarget=ot,this.updateRenderTargetMipmap=ut,this.updateMultisampleRenderTarget=Et,this.setupDepthRenderbuffer=U,this.setupFrameBufferTexture=X,this.useMultisampledRTT=mt}function nv(i,t){function e(n,r=Vn){let s;const a=ie.getTransfer(r);if(n===Un)return i.UNSIGNED_BYTE;if(n===Lo)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Do)return i.UNSIGNED_SHORT_5_5_5_1;if(n===qc)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Wc)return i.BYTE;if(n===Xc)return i.SHORT;if(n===Pr)return i.UNSIGNED_SHORT;if(n===Po)return i.INT;if(n===mi)return i.UNSIGNED_INT;if(n===Rn)return i.FLOAT;if(n===Dr)return i.HALF_FLOAT;if(n===Yc)return i.ALPHA;if(n===jc)return i.RGB;if(n===un)return i.RGBA;if(n===Kc)return i.LUMINANCE;if(n===Zc)return i.LUMINANCE_ALPHA;if(n===Zi)return i.DEPTH_COMPONENT;if(n===lr)return i.DEPTH_STENCIL;if(n===Jc)return i.RED;if(n===Io)return i.RED_INTEGER;if(n===Qc)return i.RG;if(n===Uo)return i.RG_INTEGER;if(n===No)return i.RGBA_INTEGER;if(n===fs||n===ps||n===ms||n===_s)if(a===ce)if(s=t.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===fs)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===ps)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===ms)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===_s)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=t.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===fs)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===ps)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===ms)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===_s)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===ja||n===Ka||n===Za||n===Ja)if(s=t.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===ja)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Ka)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Za)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Ja)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Qa||n===to||n===eo)if(s=t.get("WEBGL_compressed_texture_etc"),s!==null){if(n===Qa||n===to)return a===ce?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===eo)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===no||n===io||n===ro||n===so||n===ao||n===oo||n===lo||n===co||n===ho||n===uo||n===fo||n===po||n===mo||n===_o)if(s=t.get("WEBGL_compressed_texture_astc"),s!==null){if(n===no)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===io)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===ro)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===so)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===ao)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===oo)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===lo)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===co)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===ho)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===uo)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===fo)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===po)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===mo)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===_o)return a===ce?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===gs||n===go||n===vo)if(s=t.get("EXT_texture_compression_bptc"),s!==null){if(n===gs)return a===ce?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===go)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===vo)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===th||n===xo||n===So||n===yo)if(s=t.get("EXT_texture_compression_rgtc"),s!==null){if(n===gs)return s.COMPRESSED_RED_RGTC1_EXT;if(n===xo)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===So)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===yo)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===or?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}const iv={type:"move"};class Da{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Vi,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Vi,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new F,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new F),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Vi,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new F,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new F),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let r=null,s=null,a=null;const o=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){a=!0;for(const g of t.hand.values()){const m=e.getJointPose(g,n),u=this._getHandJoint(c,g);m!==null&&(u.matrix.fromArray(m.transform.matrix),u.matrix.decompose(u.position,u.rotation,u.scale),u.matrixWorldNeedsUpdate=!0,u.jointRadius=m.radius),u.visible=m!==null}const h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],p=h.position.distanceTo(d.position),f=.02,_=.005;c.inputState.pinching&&p>f+_?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&p<=f-_&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(s=e.getPose(t.gripSpace,n),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(r=e.getPose(t.targetRaySpace,n),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(iv)))}return o!==null&&(o.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new Vi;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}const rv=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,sv=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class av{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,n){if(this.texture===null){const r=new Oe,s=t.properties.get(r);s.__webglTexture=e.texture,(e.depthNear!==n.depthNear||e.depthFar!==n.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=r}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new Zn({vertexShader:rv,fragmentShader:sv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new Ke(new Ws(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class ov extends xi{constructor(t,e){super();const n=this;let r=null,s=1,a=null,o="local-floor",l=1,c=null,h=null,d=null,p=null,f=null,_=null;const g=new av,m=e.getContextAttributes();let u=null,A=null;const T=[],M=[],L=new Rt;let R=null;const C=new qe;C.viewport=new ve;const I=new qe;I.viewport=new ve;const b=[C,I],x=new Tf;let P=null,G=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(q){let H=T[q];return H===void 0&&(H=new Da,T[q]=H),H.getTargetRaySpace()},this.getControllerGrip=function(q){let H=T[q];return H===void 0&&(H=new Da,T[q]=H),H.getGripSpace()},this.getHand=function(q){let H=T[q];return H===void 0&&(H=new Da,T[q]=H),H.getHandSpace()};function B(q){const H=M.indexOf(q.inputSource);if(H===-1)return;const X=T[H];X!==void 0&&(X.update(q.inputSource,q.frame,c||a),X.dispatchEvent({type:q.type,data:q.inputSource}))}function Z(){r.removeEventListener("select",B),r.removeEventListener("selectstart",B),r.removeEventListener("selectend",B),r.removeEventListener("squeeze",B),r.removeEventListener("squeezestart",B),r.removeEventListener("squeezeend",B),r.removeEventListener("end",Z),r.removeEventListener("inputsourceschange",rt);for(let q=0;q<T.length;q++){const H=M[q];H!==null&&(M[q]=null,T[q].disconnect(H))}P=null,G=null,g.reset(),t.setRenderTarget(u),f=null,p=null,d=null,r=null,A=null,bt.stop(),n.isPresenting=!1,t.setPixelRatio(R),t.setSize(L.width,L.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(q){s=q,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(q){o=q,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(q){c=q},this.getBaseLayer=function(){return p!==null?p:f},this.getBinding=function(){return d},this.getFrame=function(){return _},this.getSession=function(){return r},this.setSession=async function(q){if(r=q,r!==null){if(u=t.getRenderTarget(),r.addEventListener("select",B),r.addEventListener("selectstart",B),r.addEventListener("selectend",B),r.addEventListener("squeeze",B),r.addEventListener("squeezestart",B),r.addEventListener("squeezeend",B),r.addEventListener("end",Z),r.addEventListener("inputsourceschange",rt),m.xrCompatible!==!0&&await e.makeXRCompatible(),R=t.getPixelRatio(),t.getSize(L),r.enabledFeatures!==void 0&&r.enabledFeatures.includes("layers")){let X=null,O=null,D=null;m.depth&&(D=m.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,X=m.stencil?lr:Zi,O=m.stencil?or:mi);const U={colorFormat:e.RGBA8,depthFormat:D,scaleFactor:s};d=new XRWebGLBinding(r,e),p=d.createProjectionLayer(U),r.updateRenderState({layers:[p]}),t.setPixelRatio(1),t.setSize(p.textureWidth,p.textureHeight,!1),A=new _i(p.textureWidth,p.textureHeight,{format:un,type:Un,depthTexture:new gh(p.textureWidth,p.textureHeight,O,void 0,void 0,void 0,void 0,void 0,void 0,X),stencilBuffer:m.stencil,colorSpace:t.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:p.ignoreDepthValues===!1})}else{const X={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(r,e,X),r.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),A=new _i(f.framebufferWidth,f.framebufferHeight,{format:un,type:Un,colorSpace:t.outputColorSpace,stencilBuffer:m.stencil})}A.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await r.requestReferenceSpace(o),bt.setContext(r),bt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function rt(q){for(let H=0;H<q.removed.length;H++){const X=q.removed[H],O=M.indexOf(X);O>=0&&(M[O]=null,T[O].disconnect(X))}for(let H=0;H<q.added.length;H++){const X=q.added[H];let O=M.indexOf(X);if(O===-1){for(let U=0;U<T.length;U++)if(U>=M.length){M.push(X),O=U;break}else if(M[U]===null){M[U]=X,O=U;break}if(O===-1)break}const D=T[O];D&&D.connect(X)}}const W=new F,at=new F;function V(q,H,X){W.setFromMatrixPosition(H.matrixWorld),at.setFromMatrixPosition(X.matrixWorld);const O=W.distanceTo(at),D=H.projectionMatrix.elements,U=X.projectionMatrix.elements,Q=D[14]/(D[10]-1),ot=D[14]/(D[10]+1),ut=(D[9]+1)/D[5],dt=(D[9]-1)/D[5],w=(D[8]-1)/D[0],Et=(U[8]+1)/U[0],vt=Q*w,mt=Q*Et,ct=O/(-w+Et),St=ct*-w;if(H.matrixWorld.decompose(q.position,q.quaternion,q.scale),q.translateX(St),q.translateZ(ct),q.matrixWorld.compose(q.position,q.quaternion,q.scale),q.matrixWorldInverse.copy(q.matrixWorld).invert(),D[10]===-1)q.projectionMatrix.copy(H.projectionMatrix),q.projectionMatrixInverse.copy(H.projectionMatrixInverse);else{const pt=Q+ct,E=ot+ct,v=vt-St,$=mt+(O-St),Y=ut*ot/E*pt,et=dt*ot/E*pt;q.projectionMatrix.makePerspective(v,$,Y,et,pt,E),q.projectionMatrixInverse.copy(q.projectionMatrix).invert()}}function _t(q,H){H===null?q.matrixWorld.copy(q.matrix):q.matrixWorld.multiplyMatrices(H.matrixWorld,q.matrix),q.matrixWorldInverse.copy(q.matrixWorld).invert()}this.updateCamera=function(q){if(r===null)return;let H=q.near,X=q.far;g.texture!==null&&(g.depthNear>0&&(H=g.depthNear),g.depthFar>0&&(X=g.depthFar)),x.near=I.near=C.near=H,x.far=I.far=C.far=X,(P!==x.near||G!==x.far)&&(r.updateRenderState({depthNear:x.near,depthFar:x.far}),P=x.near,G=x.far),C.layers.mask=q.layers.mask|2,I.layers.mask=q.layers.mask|4,x.layers.mask=C.layers.mask|I.layers.mask;const O=q.parent,D=x.cameras;_t(x,O);for(let U=0;U<D.length;U++)_t(D[U],O);D.length===2?V(x,C,I):x.projectionMatrix.copy(C.projectionMatrix),tt(q,x,O)};function tt(q,H,X){X===null?q.matrix.copy(H.matrixWorld):(q.matrix.copy(X.matrixWorld),q.matrix.invert(),q.matrix.multiply(H.matrixWorld)),q.matrix.decompose(q.position,q.quaternion,q.scale),q.updateMatrixWorld(!0),q.projectionMatrix.copy(H.projectionMatrix),q.projectionMatrixInverse.copy(H.projectionMatrixInverse),q.isPerspectiveCamera&&(q.fov=bo*2*Math.atan(1/q.projectionMatrix.elements[5]),q.zoom=1)}this.getCamera=function(){return x},this.getFoveation=function(){if(!(p===null&&f===null))return l},this.setFoveation=function(q){l=q,p!==null&&(p.fixedFoveation=q),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=q)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(x)};let xt=null;function Nt(q,H){if(h=H.getViewerPose(c||a),_=H,h!==null){const X=h.views;f!==null&&(t.setRenderTargetFramebuffer(A,f.framebuffer),t.setRenderTarget(A));let O=!1;X.length!==x.cameras.length&&(x.cameras.length=0,O=!0);for(let U=0;U<X.length;U++){const Q=X[U];let ot=null;if(f!==null)ot=f.getViewport(Q);else{const dt=d.getViewSubImage(p,Q);ot=dt.viewport,U===0&&(t.setRenderTargetTextures(A,dt.colorTexture,p.ignoreDepthValues?void 0:dt.depthStencilTexture),t.setRenderTarget(A))}let ut=b[U];ut===void 0&&(ut=new qe,ut.layers.enable(U),ut.viewport=new ve,b[U]=ut),ut.matrix.fromArray(Q.transform.matrix),ut.matrix.decompose(ut.position,ut.quaternion,ut.scale),ut.projectionMatrix.fromArray(Q.projectionMatrix),ut.projectionMatrixInverse.copy(ut.projectionMatrix).invert(),ut.viewport.set(ot.x,ot.y,ot.width,ot.height),U===0&&(x.matrix.copy(ut.matrix),x.matrix.decompose(x.position,x.quaternion,x.scale)),O===!0&&x.cameras.push(ut)}const D=r.enabledFeatures;if(D&&D.includes("depth-sensing")){const U=d.getDepthInformation(X[0]);U&&U.isValid&&U.texture&&g.init(t,U,r.renderState)}}for(let X=0;X<T.length;X++){const O=M[X],D=T[X];O!==null&&D!==void 0&&D.update(O,H,c||a)}xt&&xt(q,H),H.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:H}),_=null}const bt=new Ah;bt.setAnimationLoop(Nt),this.setAnimationLoop=function(q){xt=q},this.dispose=function(){}}}const ai=new xn,lv=new fe;function cv(i,t){function e(m,u){m.matrixAutoUpdate===!0&&m.updateMatrix(),u.value.copy(m.matrix)}function n(m,u){u.color.getRGB(m.fogColor.value,hh(i)),u.isFog?(m.fogNear.value=u.near,m.fogFar.value=u.far):u.isFogExp2&&(m.fogDensity.value=u.density)}function r(m,u,A,T,M){u.isMeshBasicMaterial||u.isMeshLambertMaterial?s(m,u):u.isMeshToonMaterial?(s(m,u),d(m,u)):u.isMeshPhongMaterial?(s(m,u),h(m,u)):u.isMeshStandardMaterial?(s(m,u),p(m,u),u.isMeshPhysicalMaterial&&f(m,u,M)):u.isMeshMatcapMaterial?(s(m,u),_(m,u)):u.isMeshDepthMaterial?s(m,u):u.isMeshDistanceMaterial?(s(m,u),g(m,u)):u.isMeshNormalMaterial?s(m,u):u.isLineBasicMaterial?(a(m,u),u.isLineDashedMaterial&&o(m,u)):u.isPointsMaterial?l(m,u,A,T):u.isSpriteMaterial?c(m,u):u.isShadowMaterial?(m.color.value.copy(u.color),m.opacity.value=u.opacity):u.isShaderMaterial&&(u.uniformsNeedUpdate=!1)}function s(m,u){m.opacity.value=u.opacity,u.color&&m.diffuse.value.copy(u.color),u.emissive&&m.emissive.value.copy(u.emissive).multiplyScalar(u.emissiveIntensity),u.map&&(m.map.value=u.map,e(u.map,m.mapTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,e(u.alphaMap,m.alphaMapTransform)),u.bumpMap&&(m.bumpMap.value=u.bumpMap,e(u.bumpMap,m.bumpMapTransform),m.bumpScale.value=u.bumpScale,u.side===He&&(m.bumpScale.value*=-1)),u.normalMap&&(m.normalMap.value=u.normalMap,e(u.normalMap,m.normalMapTransform),m.normalScale.value.copy(u.normalScale),u.side===He&&m.normalScale.value.negate()),u.displacementMap&&(m.displacementMap.value=u.displacementMap,e(u.displacementMap,m.displacementMapTransform),m.displacementScale.value=u.displacementScale,m.displacementBias.value=u.displacementBias),u.emissiveMap&&(m.emissiveMap.value=u.emissiveMap,e(u.emissiveMap,m.emissiveMapTransform)),u.specularMap&&(m.specularMap.value=u.specularMap,e(u.specularMap,m.specularMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest);const A=t.get(u),T=A.envMap,M=A.envMapRotation;T&&(m.envMap.value=T,ai.copy(M),ai.x*=-1,ai.y*=-1,ai.z*=-1,T.isCubeTexture&&T.isRenderTargetTexture===!1&&(ai.y*=-1,ai.z*=-1),m.envMapRotation.value.setFromMatrix4(lv.makeRotationFromEuler(ai)),m.flipEnvMap.value=T.isCubeTexture&&T.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=u.reflectivity,m.ior.value=u.ior,m.refractionRatio.value=u.refractionRatio),u.lightMap&&(m.lightMap.value=u.lightMap,m.lightMapIntensity.value=u.lightMapIntensity,e(u.lightMap,m.lightMapTransform)),u.aoMap&&(m.aoMap.value=u.aoMap,m.aoMapIntensity.value=u.aoMapIntensity,e(u.aoMap,m.aoMapTransform))}function a(m,u){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,u.map&&(m.map.value=u.map,e(u.map,m.mapTransform))}function o(m,u){m.dashSize.value=u.dashSize,m.totalSize.value=u.dashSize+u.gapSize,m.scale.value=u.scale}function l(m,u,A,T){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,m.size.value=u.size*A,m.scale.value=T*.5,u.map&&(m.map.value=u.map,e(u.map,m.uvTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,e(u.alphaMap,m.alphaMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest)}function c(m,u){m.diffuse.value.copy(u.color),m.opacity.value=u.opacity,m.rotation.value=u.rotation,u.map&&(m.map.value=u.map,e(u.map,m.mapTransform)),u.alphaMap&&(m.alphaMap.value=u.alphaMap,e(u.alphaMap,m.alphaMapTransform)),u.alphaTest>0&&(m.alphaTest.value=u.alphaTest)}function h(m,u){m.specular.value.copy(u.specular),m.shininess.value=Math.max(u.shininess,1e-4)}function d(m,u){u.gradientMap&&(m.gradientMap.value=u.gradientMap)}function p(m,u){m.metalness.value=u.metalness,u.metalnessMap&&(m.metalnessMap.value=u.metalnessMap,e(u.metalnessMap,m.metalnessMapTransform)),m.roughness.value=u.roughness,u.roughnessMap&&(m.roughnessMap.value=u.roughnessMap,e(u.roughnessMap,m.roughnessMapTransform)),u.envMap&&(m.envMapIntensity.value=u.envMapIntensity)}function f(m,u,A){m.ior.value=u.ior,u.sheen>0&&(m.sheenColor.value.copy(u.sheenColor).multiplyScalar(u.sheen),m.sheenRoughness.value=u.sheenRoughness,u.sheenColorMap&&(m.sheenColorMap.value=u.sheenColorMap,e(u.sheenColorMap,m.sheenColorMapTransform)),u.sheenRoughnessMap&&(m.sheenRoughnessMap.value=u.sheenRoughnessMap,e(u.sheenRoughnessMap,m.sheenRoughnessMapTransform))),u.clearcoat>0&&(m.clearcoat.value=u.clearcoat,m.clearcoatRoughness.value=u.clearcoatRoughness,u.clearcoatMap&&(m.clearcoatMap.value=u.clearcoatMap,e(u.clearcoatMap,m.clearcoatMapTransform)),u.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=u.clearcoatRoughnessMap,e(u.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),u.clearcoatNormalMap&&(m.clearcoatNormalMap.value=u.clearcoatNormalMap,e(u.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(u.clearcoatNormalScale),u.side===He&&m.clearcoatNormalScale.value.negate())),u.dispersion>0&&(m.dispersion.value=u.dispersion),u.iridescence>0&&(m.iridescence.value=u.iridescence,m.iridescenceIOR.value=u.iridescenceIOR,m.iridescenceThicknessMinimum.value=u.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=u.iridescenceThicknessRange[1],u.iridescenceMap&&(m.iridescenceMap.value=u.iridescenceMap,e(u.iridescenceMap,m.iridescenceMapTransform)),u.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=u.iridescenceThicknessMap,e(u.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),u.transmission>0&&(m.transmission.value=u.transmission,m.transmissionSamplerMap.value=A.texture,m.transmissionSamplerSize.value.set(A.width,A.height),u.transmissionMap&&(m.transmissionMap.value=u.transmissionMap,e(u.transmissionMap,m.transmissionMapTransform)),m.thickness.value=u.thickness,u.thicknessMap&&(m.thicknessMap.value=u.thicknessMap,e(u.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=u.attenuationDistance,m.attenuationColor.value.copy(u.attenuationColor)),u.anisotropy>0&&(m.anisotropyVector.value.set(u.anisotropy*Math.cos(u.anisotropyRotation),u.anisotropy*Math.sin(u.anisotropyRotation)),u.anisotropyMap&&(m.anisotropyMap.value=u.anisotropyMap,e(u.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=u.specularIntensity,m.specularColor.value.copy(u.specularColor),u.specularColorMap&&(m.specularColorMap.value=u.specularColorMap,e(u.specularColorMap,m.specularColorMapTransform)),u.specularIntensityMap&&(m.specularIntensityMap.value=u.specularIntensityMap,e(u.specularIntensityMap,m.specularIntensityMapTransform))}function _(m,u){u.matcap&&(m.matcap.value=u.matcap)}function g(m,u){const A=t.get(u).light;m.referencePosition.value.setFromMatrixPosition(A.matrixWorld),m.nearDistance.value=A.shadow.camera.near,m.farDistance.value=A.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:r}}function hv(i,t,e,n){let r={},s={},a=[];const o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(A,T){const M=T.program;n.uniformBlockBinding(A,M)}function c(A,T){let M=r[A.id];M===void 0&&(_(A),M=h(A),r[A.id]=M,A.addEventListener("dispose",m));const L=T.program;n.updateUBOMapping(A,L);const R=t.render.frame;s[A.id]!==R&&(p(A),s[A.id]=R)}function h(A){const T=d();A.__bindingPointIndex=T;const M=i.createBuffer(),L=A.__size,R=A.usage;return i.bindBuffer(i.UNIFORM_BUFFER,M),i.bufferData(i.UNIFORM_BUFFER,L,R),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,T,M),M}function d(){for(let A=0;A<o;A++)if(a.indexOf(A)===-1)return a.push(A),A;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function p(A){const T=r[A.id],M=A.uniforms,L=A.__cache;i.bindBuffer(i.UNIFORM_BUFFER,T);for(let R=0,C=M.length;R<C;R++){const I=Array.isArray(M[R])?M[R]:[M[R]];for(let b=0,x=I.length;b<x;b++){const P=I[b];if(f(P,R,b,L)===!0){const G=P.__offset,B=Array.isArray(P.value)?P.value:[P.value];let Z=0;for(let rt=0;rt<B.length;rt++){const W=B[rt],at=g(W);typeof W=="number"||typeof W=="boolean"?(P.__data[0]=W,i.bufferSubData(i.UNIFORM_BUFFER,G+Z,P.__data)):W.isMatrix3?(P.__data[0]=W.elements[0],P.__data[1]=W.elements[1],P.__data[2]=W.elements[2],P.__data[3]=0,P.__data[4]=W.elements[3],P.__data[5]=W.elements[4],P.__data[6]=W.elements[5],P.__data[7]=0,P.__data[8]=W.elements[6],P.__data[9]=W.elements[7],P.__data[10]=W.elements[8],P.__data[11]=0):(W.toArray(P.__data,Z),Z+=at.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,G,P.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(A,T,M,L){const R=A.value,C=T+"_"+M;if(L[C]===void 0)return typeof R=="number"||typeof R=="boolean"?L[C]=R:L[C]=R.clone(),!0;{const I=L[C];if(typeof R=="number"||typeof R=="boolean"){if(I!==R)return L[C]=R,!0}else if(I.equals(R)===!1)return I.copy(R),!0}return!1}function _(A){const T=A.uniforms;let M=0;const L=16;for(let C=0,I=T.length;C<I;C++){const b=Array.isArray(T[C])?T[C]:[T[C]];for(let x=0,P=b.length;x<P;x++){const G=b[x],B=Array.isArray(G.value)?G.value:[G.value];for(let Z=0,rt=B.length;Z<rt;Z++){const W=B[Z],at=g(W),V=M%L,_t=V%at.boundary,tt=V+_t;M+=_t,tt!==0&&L-tt<at.storage&&(M+=L-tt),G.__data=new Float32Array(at.storage/Float32Array.BYTES_PER_ELEMENT),G.__offset=M,M+=at.storage}}}const R=M%L;return R>0&&(M+=L-R),A.__size=M,A.__cache={},this}function g(A){const T={boundary:0,storage:0};return typeof A=="number"||typeof A=="boolean"?(T.boundary=4,T.storage=4):A.isVector2?(T.boundary=8,T.storage=8):A.isVector3||A.isColor?(T.boundary=16,T.storage=12):A.isVector4?(T.boundary=16,T.storage=16):A.isMatrix3?(T.boundary=48,T.storage=48):A.isMatrix4?(T.boundary=64,T.storage=64):A.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",A),T}function m(A){const T=A.target;T.removeEventListener("dispose",m);const M=a.indexOf(T.__bindingPointIndex);a.splice(M,1),i.deleteBuffer(r[T.id]),delete r[T.id],delete s[T.id]}function u(){for(const A in r)i.deleteBuffer(r[A]);a=[],r={},s={}}return{bind:l,update:c,dispose:u}}class Lh{constructor(t={}){const{canvas:e=wd(),context:n=null,depth:r=!0,stencil:s=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reverseDepthBuffer:p=!1}=t;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=a;const _=new Uint32Array(4),g=new Int32Array(4);let m=null,u=null;const A=[],T=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=en,this.toneMapping=Wn,this.toneMappingExposure=1;const M=this;let L=!1,R=0,C=0,I=null,b=-1,x=null;const P=new ve,G=new ve;let B=null;const Z=new Qt(0);let rt=0,W=e.width,at=e.height,V=1,_t=null,tt=null;const xt=new ve(0,0,W,at),Nt=new ve(0,0,W,at);let bt=!1;const q=new Oo;let H=!1,X=!1;this.transmissionResolutionScale=1;const O=new fe,D=new fe,U=new F,Q=new ve,ot={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let ut=!1;function dt(){return I===null?V:1}let w=n;function Et(S,z){return e.getContext(S,z)}try{const S={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${Ro}`),e.addEventListener("webglcontextlost",lt,!1),e.addEventListener("webglcontextrestored",Pt,!1),e.addEventListener("webglcontextcreationerror",Ct,!1),w===null){const z="webgl2";if(w=Et(z,S),w===null)throw Et(z)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(S){throw console.error("THREE.WebGLRenderer: "+S.message),S}let vt,mt,ct,St,pt,E,v,$,Y,et,nt,Tt,yt,At,Wt,gt,ft,Dt,It,ht,Ht,$t,te,N;function wt(){vt=new S_(w),vt.init(),$t=new nv(w,vt),mt=new p_(w,vt,t,$t),ct=new tv(w,vt),mt.reverseDepthBuffer&&p&&ct.buffers.depth.setReversed(!0),St=new b_(w),pt=new kg,E=new ev(w,vt,ct,pt,mt,$t,St),v=new __(M),$=new x_(M),Y=new Pf(w),te=new d_(w,Y),et=new y_(w,Y,St,te),nt=new T_(w,et,Y,St),It=new E_(w,mt,E),gt=new m_(pt),Tt=new zg(M,v,$,vt,mt,te,gt),yt=new cv(M,pt),At=new Vg,Wt=new jg(vt),Dt=new u_(M,v,$,ct,nt,f,l),ft=new Jg(M,nt,mt),N=new hv(w,St,mt,ct),ht=new f_(w,vt,St),Ht=new M_(w,vt,St),St.programs=Tt.programs,M.capabilities=mt,M.extensions=vt,M.properties=pt,M.renderLists=At,M.shadowMap=ft,M.state=ct,M.info=St}wt();const it=new ov(M,w);this.xr=it,this.getContext=function(){return w},this.getContextAttributes=function(){return w.getContextAttributes()},this.forceContextLoss=function(){const S=vt.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){const S=vt.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return V},this.setPixelRatio=function(S){S!==void 0&&(V=S,this.setSize(W,at,!1))},this.getSize=function(S){return S.set(W,at)},this.setSize=function(S,z,j=!0){if(it.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}W=S,at=z,e.width=Math.floor(S*V),e.height=Math.floor(z*V),j===!0&&(e.style.width=S+"px",e.style.height=z+"px"),this.setViewport(0,0,S,z)},this.getDrawingBufferSize=function(S){return S.set(W*V,at*V).floor()},this.setDrawingBufferSize=function(S,z,j){W=S,at=z,V=j,e.width=Math.floor(S*j),e.height=Math.floor(z*j),this.setViewport(0,0,S,z)},this.getCurrentViewport=function(S){return S.copy(P)},this.getViewport=function(S){return S.copy(xt)},this.setViewport=function(S,z,j,J){S.isVector4?xt.set(S.x,S.y,S.z,S.w):xt.set(S,z,j,J),ct.viewport(P.copy(xt).multiplyScalar(V).round())},this.getScissor=function(S){return S.copy(Nt)},this.setScissor=function(S,z,j,J){S.isVector4?Nt.set(S.x,S.y,S.z,S.w):Nt.set(S,z,j,J),ct.scissor(G.copy(Nt).multiplyScalar(V).round())},this.getScissorTest=function(){return bt},this.setScissorTest=function(S){ct.setScissorTest(bt=S)},this.setOpaqueSort=function(S){_t=S},this.setTransparentSort=function(S){tt=S},this.getClearColor=function(S){return S.copy(Dt.getClearColor())},this.setClearColor=function(){Dt.setClearColor.apply(Dt,arguments)},this.getClearAlpha=function(){return Dt.getClearAlpha()},this.setClearAlpha=function(){Dt.setClearAlpha.apply(Dt,arguments)},this.clear=function(S=!0,z=!0,j=!0){let J=0;if(S){let k=!1;if(I!==null){const Mt=I.texture.format;k=Mt===No||Mt===Uo||Mt===Io}if(k){const Mt=I.texture.type,Ut=Mt===Un||Mt===mi||Mt===Pr||Mt===or||Mt===Lo||Mt===Do,Ft=Dt.getClearColor(),Ot=Dt.getClearAlpha(),qt=Ft.r,Yt=Ft.g,Vt=Ft.b;Ut?(_[0]=qt,_[1]=Yt,_[2]=Vt,_[3]=Ot,w.clearBufferuiv(w.COLOR,0,_)):(g[0]=qt,g[1]=Yt,g[2]=Vt,g[3]=Ot,w.clearBufferiv(w.COLOR,0,g))}else J|=w.COLOR_BUFFER_BIT}z&&(J|=w.DEPTH_BUFFER_BIT),j&&(J|=w.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),w.clear(J)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",lt,!1),e.removeEventListener("webglcontextrestored",Pt,!1),e.removeEventListener("webglcontextcreationerror",Ct,!1),Dt.dispose(),At.dispose(),Wt.dispose(),pt.dispose(),v.dispose(),$.dispose(),nt.dispose(),te.dispose(),N.dispose(),Tt.dispose(),it.dispose(),it.removeEventListener("sessionstart",Wo),it.removeEventListener("sessionend",Xo),Qn.stop()};function lt(S){S.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),L=!0}function Pt(){console.log("THREE.WebGLRenderer: Context Restored."),L=!1;const S=St.autoReset,z=ft.enabled,j=ft.autoUpdate,J=ft.needsUpdate,k=ft.type;wt(),St.autoReset=S,ft.enabled=z,ft.autoUpdate=j,ft.needsUpdate=J,ft.type=k}function Ct(S){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function Xt(S){const z=S.target;z.removeEventListener("dispose",Xt),de(z)}function de(S){Pe(S),pt.remove(S)}function Pe(S){const z=pt.get(S).programs;z!==void 0&&(z.forEach(function(j){Tt.releaseProgram(j)}),S.isShaderMaterial&&Tt.releaseShaderCache(S))}this.renderBufferDirect=function(S,z,j,J,k,Mt){z===null&&(z=ot);const Ut=k.isMesh&&k.matrixWorld.determinant()<0,Ft=Fh(S,z,j,J,k);ct.setMaterial(J,Ut);let Ot=j.index,qt=1;if(J.wireframe===!0){if(Ot=et.getWireframeAttribute(j),Ot===void 0)return;qt=2}const Yt=j.drawRange,Vt=j.attributes.position;let ee=Yt.start*qt,se=(Yt.start+Yt.count)*qt;Mt!==null&&(ee=Math.max(ee,Mt.start*qt),se=Math.min(se,(Mt.start+Mt.count)*qt)),Ot!==null?(ee=Math.max(ee,0),se=Math.min(se,Ot.count)):Vt!=null&&(ee=Math.max(ee,0),se=Math.min(se,Vt.count));const Se=se-ee;if(Se<0||Se===1/0)return;te.setup(k,J,Ft,j,Ot);let _e,ne=ht;if(Ot!==null&&(_e=Y.get(Ot),ne=Ht,ne.setIndex(_e)),k.isMesh)J.wireframe===!0?(ct.setLineWidth(J.wireframeLinewidth*dt()),ne.setMode(w.LINES)):ne.setMode(w.TRIANGLES);else if(k.isLine){let Gt=J.linewidth;Gt===void 0&&(Gt=1),ct.setLineWidth(Gt*dt()),k.isLineSegments?ne.setMode(w.LINES):k.isLineLoop?ne.setMode(w.LINE_LOOP):ne.setMode(w.LINE_STRIP)}else k.isPoints?ne.setMode(w.POINTS):k.isSprite&&ne.setMode(w.TRIANGLES);if(k.isBatchedMesh)if(k._multiDrawInstances!==null)ne.renderMultiDrawInstances(k._multiDrawStarts,k._multiDrawCounts,k._multiDrawCount,k._multiDrawInstances);else if(vt.get("WEBGL_multi_draw"))ne.renderMultiDraw(k._multiDrawStarts,k._multiDrawCounts,k._multiDrawCount);else{const Gt=k._multiDrawStarts,Ce=k._multiDrawCounts,ae=k._multiDrawCount,on=Ot?Y.get(Ot).bytesPerElement:1,yi=pt.get(J).currentProgram.getUniforms();for(let Ge=0;Ge<ae;Ge++)yi.setValue(w,"_gl_DrawID",Ge),ne.render(Gt[Ge]/on,Ce[Ge])}else if(k.isInstancedMesh)ne.renderInstances(ee,Se,k.count);else if(j.isInstancedBufferGeometry){const Gt=j._maxInstanceCount!==void 0?j._maxInstanceCount:1/0,Ce=Math.min(j.instanceCount,Gt);ne.renderInstances(ee,Se,Ce)}else ne.render(ee,Se)};function le(S,z,j){S.transparent===!0&&S.side===Cn&&S.forceSinglePass===!1?(S.side=He,S.needsUpdate=!0,Nr(S,z,j),S.side=jn,S.needsUpdate=!0,Nr(S,z,j),S.side=Cn):Nr(S,z,j)}this.compile=function(S,z,j=null){j===null&&(j=S),u=Wt.get(j),u.init(z),T.push(u),j.traverseVisible(function(k){k.isLight&&k.layers.test(z.layers)&&(u.pushLight(k),k.castShadow&&u.pushShadow(k))}),S!==j&&S.traverseVisible(function(k){k.isLight&&k.layers.test(z.layers)&&(u.pushLight(k),k.castShadow&&u.pushShadow(k))}),u.setupLights();const J=new Set;return S.traverse(function(k){if(!(k.isMesh||k.isPoints||k.isLine||k.isSprite))return;const Mt=k.material;if(Mt)if(Array.isArray(Mt))for(let Ut=0;Ut<Mt.length;Ut++){const Ft=Mt[Ut];le(Ft,j,k),J.add(Ft)}else le(Mt,j,k),J.add(Mt)}),T.pop(),u=null,J},this.compileAsync=function(S,z,j=null){const J=this.compile(S,z,j);return new Promise(k=>{function Mt(){if(J.forEach(function(Ut){pt.get(Ut).currentProgram.isReady()&&J.delete(Ut)}),J.size===0){k(S);return}setTimeout(Mt,10)}vt.get("KHR_parallel_shader_compile")!==null?Mt():setTimeout(Mt,10)})};let an=null;function yn(S){an&&an(S)}function Wo(){Qn.stop()}function Xo(){Qn.start()}const Qn=new Ah;Qn.setAnimationLoop(yn),typeof self<"u"&&Qn.setContext(self),this.setAnimationLoop=function(S){an=S,it.setAnimationLoop(S),S===null?Qn.stop():Qn.start()},it.addEventListener("sessionstart",Wo),it.addEventListener("sessionend",Xo),this.render=function(S,z){if(z!==void 0&&z.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(L===!0)return;if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),z.parent===null&&z.matrixWorldAutoUpdate===!0&&z.updateMatrixWorld(),it.enabled===!0&&it.isPresenting===!0&&(it.cameraAutoUpdate===!0&&it.updateCamera(z),z=it.getCamera()),S.isScene===!0&&S.onBeforeRender(M,S,z,I),u=Wt.get(S,T.length),u.init(z),T.push(u),D.multiplyMatrices(z.projectionMatrix,z.matrixWorldInverse),q.setFromProjectionMatrix(D),X=this.localClippingEnabled,H=gt.init(this.clippingPlanes,X),m=At.get(S,A.length),m.init(),A.push(m),it.enabled===!0&&it.isPresenting===!0){const Mt=M.xr.getDepthSensingMesh();Mt!==null&&Ys(Mt,z,-1/0,M.sortObjects)}Ys(S,z,0,M.sortObjects),m.finish(),M.sortObjects===!0&&m.sort(_t,tt),ut=it.enabled===!1||it.isPresenting===!1||it.hasDepthSensing()===!1,ut&&Dt.addToRenderList(m,S),this.info.render.frame++,H===!0&&gt.beginShadows();const j=u.state.shadowsArray;ft.render(j,S,z),H===!0&&gt.endShadows(),this.info.autoReset===!0&&this.info.reset();const J=m.opaque,k=m.transmissive;if(u.setupLights(),z.isArrayCamera){const Mt=z.cameras;if(k.length>0)for(let Ut=0,Ft=Mt.length;Ut<Ft;Ut++){const Ot=Mt[Ut];Yo(J,k,S,Ot)}ut&&Dt.render(S);for(let Ut=0,Ft=Mt.length;Ut<Ft;Ut++){const Ot=Mt[Ut];qo(m,S,Ot,Ot.viewport)}}else k.length>0&&Yo(J,k,S,z),ut&&Dt.render(S),qo(m,S,z);I!==null&&C===0&&(E.updateMultisampleRenderTarget(I),E.updateRenderTargetMipmap(I)),S.isScene===!0&&S.onAfterRender(M,S,z),te.resetDefaultState(),b=-1,x=null,T.pop(),T.length>0?(u=T[T.length-1],H===!0&&gt.setGlobalState(M.clippingPlanes,u.state.camera)):u=null,A.pop(),A.length>0?m=A[A.length-1]:m=null};function Ys(S,z,j,J){if(S.visible===!1)return;if(S.layers.test(z.layers)){if(S.isGroup)j=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(z);else if(S.isLight)u.pushLight(S),S.castShadow&&u.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||q.intersectsSprite(S)){J&&Q.setFromMatrixPosition(S.matrixWorld).applyMatrix4(D);const Ut=nt.update(S),Ft=S.material;Ft.visible&&m.push(S,Ut,Ft,j,Q.z,null)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||q.intersectsObject(S))){const Ut=nt.update(S),Ft=S.material;if(J&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),Q.copy(S.boundingSphere.center)):(Ut.boundingSphere===null&&Ut.computeBoundingSphere(),Q.copy(Ut.boundingSphere.center)),Q.applyMatrix4(S.matrixWorld).applyMatrix4(D)),Array.isArray(Ft)){const Ot=Ut.groups;for(let qt=0,Yt=Ot.length;qt<Yt;qt++){const Vt=Ot[qt],ee=Ft[Vt.materialIndex];ee&&ee.visible&&m.push(S,Ut,ee,j,Q.z,Vt)}}else Ft.visible&&m.push(S,Ut,Ft,j,Q.z,null)}}const Mt=S.children;for(let Ut=0,Ft=Mt.length;Ut<Ft;Ut++)Ys(Mt[Ut],z,j,J)}function qo(S,z,j,J){const k=S.opaque,Mt=S.transmissive,Ut=S.transparent;u.setupLightsView(j),H===!0&&gt.setGlobalState(M.clippingPlanes,j),J&&ct.viewport(P.copy(J)),k.length>0&&Ur(k,z,j),Mt.length>0&&Ur(Mt,z,j),Ut.length>0&&Ur(Ut,z,j),ct.buffers.depth.setTest(!0),ct.buffers.depth.setMask(!0),ct.buffers.color.setMask(!0),ct.setPolygonOffset(!1)}function Yo(S,z,j,J){if((j.isScene===!0?j.overrideMaterial:null)!==null)return;u.state.transmissionRenderTarget[J.id]===void 0&&(u.state.transmissionRenderTarget[J.id]=new _i(1,1,{generateMipmaps:!0,type:vt.has("EXT_color_buffer_half_float")||vt.has("EXT_color_buffer_float")?Dr:Un,minFilter:ui,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:ie.workingColorSpace}));const Mt=u.state.transmissionRenderTarget[J.id],Ut=J.viewport||P;Mt.setSize(Ut.z*M.transmissionResolutionScale,Ut.w*M.transmissionResolutionScale);const Ft=M.getRenderTarget();M.setRenderTarget(Mt),M.getClearColor(Z),rt=M.getClearAlpha(),rt<1&&M.setClearColor(16777215,.5),M.clear(),ut&&Dt.render(j);const Ot=M.toneMapping;M.toneMapping=Wn;const qt=J.viewport;if(J.viewport!==void 0&&(J.viewport=void 0),u.setupLightsView(J),H===!0&&gt.setGlobalState(M.clippingPlanes,J),Ur(S,j,J),E.updateMultisampleRenderTarget(Mt),E.updateRenderTargetMipmap(Mt),vt.has("WEBGL_multisampled_render_to_texture")===!1){let Yt=!1;for(let Vt=0,ee=z.length;Vt<ee;Vt++){const se=z[Vt],Se=se.object,_e=se.geometry,ne=se.material,Gt=se.group;if(ne.side===Cn&&Se.layers.test(J.layers)){const Ce=ne.side;ne.side=He,ne.needsUpdate=!0,jo(Se,j,J,_e,ne,Gt),ne.side=Ce,ne.needsUpdate=!0,Yt=!0}}Yt===!0&&(E.updateMultisampleRenderTarget(Mt),E.updateRenderTargetMipmap(Mt))}M.setRenderTarget(Ft),M.setClearColor(Z,rt),qt!==void 0&&(J.viewport=qt),M.toneMapping=Ot}function Ur(S,z,j){const J=z.isScene===!0?z.overrideMaterial:null;for(let k=0,Mt=S.length;k<Mt;k++){const Ut=S[k],Ft=Ut.object,Ot=Ut.geometry,qt=J===null?Ut.material:J,Yt=Ut.group;Ft.layers.test(j.layers)&&jo(Ft,z,j,Ot,qt,Yt)}}function jo(S,z,j,J,k,Mt){S.onBeforeRender(M,z,j,J,k,Mt),S.modelViewMatrix.multiplyMatrices(j.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),k.onBeforeRender(M,z,j,J,S,Mt),k.transparent===!0&&k.side===Cn&&k.forceSinglePass===!1?(k.side=He,k.needsUpdate=!0,M.renderBufferDirect(j,z,J,k,S,Mt),k.side=jn,k.needsUpdate=!0,M.renderBufferDirect(j,z,J,k,S,Mt),k.side=Cn):M.renderBufferDirect(j,z,J,k,S,Mt),S.onAfterRender(M,z,j,J,k,Mt)}function Nr(S,z,j){z.isScene!==!0&&(z=ot);const J=pt.get(S),k=u.state.lights,Mt=u.state.shadowsArray,Ut=k.state.version,Ft=Tt.getParameters(S,k.state,Mt,z,j),Ot=Tt.getProgramCacheKey(Ft);let qt=J.programs;J.environment=S.isMeshStandardMaterial?z.environment:null,J.fog=z.fog,J.envMap=(S.isMeshStandardMaterial?$:v).get(S.envMap||J.environment),J.envMapRotation=J.environment!==null&&S.envMap===null?z.environmentRotation:S.envMapRotation,qt===void 0&&(S.addEventListener("dispose",Xt),qt=new Map,J.programs=qt);let Yt=qt.get(Ot);if(Yt!==void 0){if(J.currentProgram===Yt&&J.lightsStateVersion===Ut)return Zo(S,Ft),Yt}else Ft.uniforms=Tt.getUniforms(S),S.onBeforeCompile(Ft,M),Yt=Tt.acquireProgram(Ft,Ot),qt.set(Ot,Yt),J.uniforms=Ft.uniforms;const Vt=J.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(Vt.clippingPlanes=gt.uniform),Zo(S,Ft),J.needsLights=Bh(S),J.lightsStateVersion=Ut,J.needsLights&&(Vt.ambientLightColor.value=k.state.ambient,Vt.lightProbe.value=k.state.probe,Vt.directionalLights.value=k.state.directional,Vt.directionalLightShadows.value=k.state.directionalShadow,Vt.spotLights.value=k.state.spot,Vt.spotLightShadows.value=k.state.spotShadow,Vt.rectAreaLights.value=k.state.rectArea,Vt.ltc_1.value=k.state.rectAreaLTC1,Vt.ltc_2.value=k.state.rectAreaLTC2,Vt.pointLights.value=k.state.point,Vt.pointLightShadows.value=k.state.pointShadow,Vt.hemisphereLights.value=k.state.hemi,Vt.directionalShadowMap.value=k.state.directionalShadowMap,Vt.directionalShadowMatrix.value=k.state.directionalShadowMatrix,Vt.spotShadowMap.value=k.state.spotShadowMap,Vt.spotLightMatrix.value=k.state.spotLightMatrix,Vt.spotLightMap.value=k.state.spotLightMap,Vt.pointShadowMap.value=k.state.pointShadowMap,Vt.pointShadowMatrix.value=k.state.pointShadowMatrix),J.currentProgram=Yt,J.uniformsList=null,Yt}function Ko(S){if(S.uniformsList===null){const z=S.currentProgram.getUniforms();S.uniformsList=Ss.seqWithValue(z.seq,S.uniforms)}return S.uniformsList}function Zo(S,z){const j=pt.get(S);j.outputColorSpace=z.outputColorSpace,j.batching=z.batching,j.batchingColor=z.batchingColor,j.instancing=z.instancing,j.instancingColor=z.instancingColor,j.instancingMorph=z.instancingMorph,j.skinning=z.skinning,j.morphTargets=z.morphTargets,j.morphNormals=z.morphNormals,j.morphColors=z.morphColors,j.morphTargetsCount=z.morphTargetsCount,j.numClippingPlanes=z.numClippingPlanes,j.numIntersection=z.numClipIntersection,j.vertexAlphas=z.vertexAlphas,j.vertexTangents=z.vertexTangents,j.toneMapping=z.toneMapping}function Fh(S,z,j,J,k){z.isScene!==!0&&(z=ot),E.resetTextureUnits();const Mt=z.fog,Ut=J.isMeshStandardMaterial?z.environment:null,Ft=I===null?M.outputColorSpace:I.isXRRenderTarget===!0?I.texture.colorSpace:cr,Ot=(J.isMeshStandardMaterial?$:v).get(J.envMap||Ut),qt=J.vertexColors===!0&&!!j.attributes.color&&j.attributes.color.itemSize===4,Yt=!!j.attributes.tangent&&(!!J.normalMap||J.anisotropy>0),Vt=!!j.morphAttributes.position,ee=!!j.morphAttributes.normal,se=!!j.morphAttributes.color;let Se=Wn;J.toneMapped&&(I===null||I.isXRRenderTarget===!0)&&(Se=M.toneMapping);const _e=j.morphAttributes.position||j.morphAttributes.normal||j.morphAttributes.color,ne=_e!==void 0?_e.length:0,Gt=pt.get(J),Ce=u.state.lights;if(H===!0&&(X===!0||S!==x)){const Ue=S===x&&J.id===b;gt.setState(J,S,Ue)}let ae=!1;J.version===Gt.__version?(Gt.needsLights&&Gt.lightsStateVersion!==Ce.state.version||Gt.outputColorSpace!==Ft||k.isBatchedMesh&&Gt.batching===!1||!k.isBatchedMesh&&Gt.batching===!0||k.isBatchedMesh&&Gt.batchingColor===!0&&k.colorTexture===null||k.isBatchedMesh&&Gt.batchingColor===!1&&k.colorTexture!==null||k.isInstancedMesh&&Gt.instancing===!1||!k.isInstancedMesh&&Gt.instancing===!0||k.isSkinnedMesh&&Gt.skinning===!1||!k.isSkinnedMesh&&Gt.skinning===!0||k.isInstancedMesh&&Gt.instancingColor===!0&&k.instanceColor===null||k.isInstancedMesh&&Gt.instancingColor===!1&&k.instanceColor!==null||k.isInstancedMesh&&Gt.instancingMorph===!0&&k.morphTexture===null||k.isInstancedMesh&&Gt.instancingMorph===!1&&k.morphTexture!==null||Gt.envMap!==Ot||J.fog===!0&&Gt.fog!==Mt||Gt.numClippingPlanes!==void 0&&(Gt.numClippingPlanes!==gt.numPlanes||Gt.numIntersection!==gt.numIntersection)||Gt.vertexAlphas!==qt||Gt.vertexTangents!==Yt||Gt.morphTargets!==Vt||Gt.morphNormals!==ee||Gt.morphColors!==se||Gt.toneMapping!==Se||Gt.morphTargetsCount!==ne)&&(ae=!0):(ae=!0,Gt.__version=J.version);let on=Gt.currentProgram;ae===!0&&(on=Nr(J,z,k));let yi=!1,Ge=!1,pr=!1;const pe=on.getUniforms(),Je=Gt.uniforms;if(ct.useProgram(on.program)&&(yi=!0,Ge=!0,pr=!0),J.id!==b&&(b=J.id,Ge=!0),yi||x!==S){ct.buffers.depth.getReversed()?(O.copy(S.projectionMatrix),Rd(O),Pd(O),pe.setValue(w,"projectionMatrix",O)):pe.setValue(w,"projectionMatrix",S.projectionMatrix),pe.setValue(w,"viewMatrix",S.matrixWorldInverse);const $e=pe.map.cameraPosition;$e!==void 0&&$e.setValue(w,U.setFromMatrixPosition(S.matrixWorld)),mt.logarithmicDepthBuffer&&pe.setValue(w,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(J.isMeshPhongMaterial||J.isMeshToonMaterial||J.isMeshLambertMaterial||J.isMeshBasicMaterial||J.isMeshStandardMaterial||J.isShaderMaterial)&&pe.setValue(w,"isOrthographic",S.isOrthographicCamera===!0),x!==S&&(x=S,Ge=!0,pr=!0)}if(k.isSkinnedMesh){pe.setOptional(w,k,"bindMatrix"),pe.setOptional(w,k,"bindMatrixInverse");const Ue=k.skeleton;Ue&&(Ue.boneTexture===null&&Ue.computeBoneTexture(),pe.setValue(w,"boneTexture",Ue.boneTexture,E))}k.isBatchedMesh&&(pe.setOptional(w,k,"batchingTexture"),pe.setValue(w,"batchingTexture",k._matricesTexture,E),pe.setOptional(w,k,"batchingIdTexture"),pe.setValue(w,"batchingIdTexture",k._indirectTexture,E),pe.setOptional(w,k,"batchingColorTexture"),k._colorsTexture!==null&&pe.setValue(w,"batchingColorTexture",k._colorsTexture,E));const Qe=j.morphAttributes;if((Qe.position!==void 0||Qe.normal!==void 0||Qe.color!==void 0)&&It.update(k,j,on),(Ge||Gt.receiveShadow!==k.receiveShadow)&&(Gt.receiveShadow=k.receiveShadow,pe.setValue(w,"receiveShadow",k.receiveShadow)),J.isMeshGouraudMaterial&&J.envMap!==null&&(Je.envMap.value=Ot,Je.flipEnvMap.value=Ot.isCubeTexture&&Ot.isRenderTargetTexture===!1?-1:1),J.isMeshStandardMaterial&&J.envMap===null&&z.environment!==null&&(Je.envMapIntensity.value=z.environmentIntensity),Ge&&(pe.setValue(w,"toneMappingExposure",M.toneMappingExposure),Gt.needsLights&&Oh(Je,pr),Mt&&J.fog===!0&&yt.refreshFogUniforms(Je,Mt),yt.refreshMaterialUniforms(Je,J,V,at,u.state.transmissionRenderTarget[S.id]),Ss.upload(w,Ko(Gt),Je,E)),J.isShaderMaterial&&J.uniformsNeedUpdate===!0&&(Ss.upload(w,Ko(Gt),Je,E),J.uniformsNeedUpdate=!1),J.isSpriteMaterial&&pe.setValue(w,"center",k.center),pe.setValue(w,"modelViewMatrix",k.modelViewMatrix),pe.setValue(w,"normalMatrix",k.normalMatrix),pe.setValue(w,"modelMatrix",k.matrixWorld),J.isShaderMaterial||J.isRawShaderMaterial){const Ue=J.uniformsGroups;for(let $e=0,js=Ue.length;$e<js;$e++){const ti=Ue[$e];N.update(ti,on),N.bind(ti,on)}}return on}function Oh(S,z){S.ambientLightColor.needsUpdate=z,S.lightProbe.needsUpdate=z,S.directionalLights.needsUpdate=z,S.directionalLightShadows.needsUpdate=z,S.pointLights.needsUpdate=z,S.pointLightShadows.needsUpdate=z,S.spotLights.needsUpdate=z,S.spotLightShadows.needsUpdate=z,S.rectAreaLights.needsUpdate=z,S.hemisphereLights.needsUpdate=z}function Bh(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return R},this.getActiveMipmapLevel=function(){return C},this.getRenderTarget=function(){return I},this.setRenderTargetTextures=function(S,z,j){pt.get(S.texture).__webglTexture=z,pt.get(S.depthTexture).__webglTexture=j;const J=pt.get(S);J.__hasExternalTextures=!0,J.__autoAllocateDepthBuffer=j===void 0,J.__autoAllocateDepthBuffer||vt.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),J.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(S,z){const j=pt.get(S);j.__webglFramebuffer=z,j.__useDefaultFramebuffer=z===void 0};const $h=w.createFramebuffer();this.setRenderTarget=function(S,z=0,j=0){I=S,R=z,C=j;let J=!0,k=null,Mt=!1,Ut=!1;if(S){const Ot=pt.get(S);if(Ot.__useDefaultFramebuffer!==void 0)ct.bindFramebuffer(w.FRAMEBUFFER,null),J=!1;else if(Ot.__webglFramebuffer===void 0)E.setupRenderTarget(S);else if(Ot.__hasExternalTextures)E.rebindTextures(S,pt.get(S.texture).__webglTexture,pt.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){const Vt=S.depthTexture;if(Ot.__boundDepthTexture!==Vt){if(Vt!==null&&pt.has(Vt)&&(S.width!==Vt.image.width||S.height!==Vt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");E.setupDepthRenderbuffer(S)}}const qt=S.texture;(qt.isData3DTexture||qt.isDataArrayTexture||qt.isCompressedArrayTexture)&&(Ut=!0);const Yt=pt.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(Yt[z])?k=Yt[z][j]:k=Yt[z],Mt=!0):S.samples>0&&E.useMultisampledRTT(S)===!1?k=pt.get(S).__webglMultisampledFramebuffer:Array.isArray(Yt)?k=Yt[j]:k=Yt,P.copy(S.viewport),G.copy(S.scissor),B=S.scissorTest}else P.copy(xt).multiplyScalar(V).floor(),G.copy(Nt).multiplyScalar(V).floor(),B=bt;if(j!==0&&(k=$h),ct.bindFramebuffer(w.FRAMEBUFFER,k)&&J&&ct.drawBuffers(S,k),ct.viewport(P),ct.scissor(G),ct.setScissorTest(B),Mt){const Ot=pt.get(S.texture);w.framebufferTexture2D(w.FRAMEBUFFER,w.COLOR_ATTACHMENT0,w.TEXTURE_CUBE_MAP_POSITIVE_X+z,Ot.__webglTexture,j)}else if(Ut){const Ot=pt.get(S.texture),qt=z;w.framebufferTextureLayer(w.FRAMEBUFFER,w.COLOR_ATTACHMENT0,Ot.__webglTexture,j,qt)}else if(S!==null&&j!==0){const Ot=pt.get(S.texture);w.framebufferTexture2D(w.FRAMEBUFFER,w.COLOR_ATTACHMENT0,w.TEXTURE_2D,Ot.__webglTexture,j)}b=-1},this.readRenderTargetPixels=function(S,z,j,J,k,Mt,Ut){if(!(S&&S.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ft=pt.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&Ut!==void 0&&(Ft=Ft[Ut]),Ft){ct.bindFramebuffer(w.FRAMEBUFFER,Ft);try{const Ot=S.texture,qt=Ot.format,Yt=Ot.type;if(!mt.textureFormatReadable(qt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!mt.textureTypeReadable(Yt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}z>=0&&z<=S.width-J&&j>=0&&j<=S.height-k&&w.readPixels(z,j,J,k,$t.convert(qt),$t.convert(Yt),Mt)}finally{const Ot=I!==null?pt.get(I).__webglFramebuffer:null;ct.bindFramebuffer(w.FRAMEBUFFER,Ot)}}},this.readRenderTargetPixelsAsync=async function(S,z,j,J,k,Mt,Ut){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ft=pt.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&Ut!==void 0&&(Ft=Ft[Ut]),Ft){const Ot=S.texture,qt=Ot.format,Yt=Ot.type;if(!mt.textureFormatReadable(qt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!mt.textureTypeReadable(Yt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(z>=0&&z<=S.width-J&&j>=0&&j<=S.height-k){ct.bindFramebuffer(w.FRAMEBUFFER,Ft);const Vt=w.createBuffer();w.bindBuffer(w.PIXEL_PACK_BUFFER,Vt),w.bufferData(w.PIXEL_PACK_BUFFER,Mt.byteLength,w.STREAM_READ),w.readPixels(z,j,J,k,$t.convert(qt),$t.convert(Yt),0);const ee=I!==null?pt.get(I).__webglFramebuffer:null;ct.bindFramebuffer(w.FRAMEBUFFER,ee);const se=w.fenceSync(w.SYNC_GPU_COMMANDS_COMPLETE,0);return w.flush(),await Cd(w,se,4),w.bindBuffer(w.PIXEL_PACK_BUFFER,Vt),w.getBufferSubData(w.PIXEL_PACK_BUFFER,0,Mt),w.deleteBuffer(Vt),w.deleteSync(se),Mt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(S,z=null,j=0){S.isTexture!==!0&&(ki("WebGLRenderer: copyFramebufferToTexture function signature has changed."),z=arguments[0]||null,S=arguments[1]);const J=Math.pow(2,-j),k=Math.floor(S.image.width*J),Mt=Math.floor(S.image.height*J),Ut=z!==null?z.x:0,Ft=z!==null?z.y:0;E.setTexture2D(S,0),w.copyTexSubImage2D(w.TEXTURE_2D,j,0,0,Ut,Ft,k,Mt),ct.unbindTexture()};const zh=w.createFramebuffer(),kh=w.createFramebuffer();this.copyTextureToTexture=function(S,z,j=null,J=null,k=0,Mt=null){S.isTexture!==!0&&(ki("WebGLRenderer: copyTextureToTexture function signature has changed."),J=arguments[0]||null,S=arguments[1],z=arguments[2],Mt=arguments[3]||0,j=null),Mt===null&&(k!==0?(ki("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),Mt=k,k=0):Mt=0);let Ut,Ft,Ot,qt,Yt,Vt,ee,se,Se;const _e=S.isCompressedTexture?S.mipmaps[Mt]:S.image;if(j!==null)Ut=j.max.x-j.min.x,Ft=j.max.y-j.min.y,Ot=j.isBox3?j.max.z-j.min.z:1,qt=j.min.x,Yt=j.min.y,Vt=j.isBox3?j.min.z:0;else{const Qe=Math.pow(2,-k);Ut=Math.floor(_e.width*Qe),Ft=Math.floor(_e.height*Qe),S.isDataArrayTexture?Ot=_e.depth:S.isData3DTexture?Ot=Math.floor(_e.depth*Qe):Ot=1,qt=0,Yt=0,Vt=0}J!==null?(ee=J.x,se=J.y,Se=J.z):(ee=0,se=0,Se=0);const ne=$t.convert(z.format),Gt=$t.convert(z.type);let Ce;z.isData3DTexture?(E.setTexture3D(z,0),Ce=w.TEXTURE_3D):z.isDataArrayTexture||z.isCompressedArrayTexture?(E.setTexture2DArray(z,0),Ce=w.TEXTURE_2D_ARRAY):(E.setTexture2D(z,0),Ce=w.TEXTURE_2D),w.pixelStorei(w.UNPACK_FLIP_Y_WEBGL,z.flipY),w.pixelStorei(w.UNPACK_PREMULTIPLY_ALPHA_WEBGL,z.premultiplyAlpha),w.pixelStorei(w.UNPACK_ALIGNMENT,z.unpackAlignment);const ae=w.getParameter(w.UNPACK_ROW_LENGTH),on=w.getParameter(w.UNPACK_IMAGE_HEIGHT),yi=w.getParameter(w.UNPACK_SKIP_PIXELS),Ge=w.getParameter(w.UNPACK_SKIP_ROWS),pr=w.getParameter(w.UNPACK_SKIP_IMAGES);w.pixelStorei(w.UNPACK_ROW_LENGTH,_e.width),w.pixelStorei(w.UNPACK_IMAGE_HEIGHT,_e.height),w.pixelStorei(w.UNPACK_SKIP_PIXELS,qt),w.pixelStorei(w.UNPACK_SKIP_ROWS,Yt),w.pixelStorei(w.UNPACK_SKIP_IMAGES,Vt);const pe=S.isDataArrayTexture||S.isData3DTexture,Je=z.isDataArrayTexture||z.isData3DTexture;if(S.isDepthTexture){const Qe=pt.get(S),Ue=pt.get(z),$e=pt.get(Qe.__renderTarget),js=pt.get(Ue.__renderTarget);ct.bindFramebuffer(w.READ_FRAMEBUFFER,$e.__webglFramebuffer),ct.bindFramebuffer(w.DRAW_FRAMEBUFFER,js.__webglFramebuffer);for(let ti=0;ti<Ot;ti++)pe&&(w.framebufferTextureLayer(w.READ_FRAMEBUFFER,w.COLOR_ATTACHMENT0,pt.get(S).__webglTexture,k,Vt+ti),w.framebufferTextureLayer(w.DRAW_FRAMEBUFFER,w.COLOR_ATTACHMENT0,pt.get(z).__webglTexture,Mt,Se+ti)),w.blitFramebuffer(qt,Yt,Ut,Ft,ee,se,Ut,Ft,w.DEPTH_BUFFER_BIT,w.NEAREST);ct.bindFramebuffer(w.READ_FRAMEBUFFER,null),ct.bindFramebuffer(w.DRAW_FRAMEBUFFER,null)}else if(k!==0||S.isRenderTargetTexture||pt.has(S)){const Qe=pt.get(S),Ue=pt.get(z);ct.bindFramebuffer(w.READ_FRAMEBUFFER,zh),ct.bindFramebuffer(w.DRAW_FRAMEBUFFER,kh);for(let $e=0;$e<Ot;$e++)pe?w.framebufferTextureLayer(w.READ_FRAMEBUFFER,w.COLOR_ATTACHMENT0,Qe.__webglTexture,k,Vt+$e):w.framebufferTexture2D(w.READ_FRAMEBUFFER,w.COLOR_ATTACHMENT0,w.TEXTURE_2D,Qe.__webglTexture,k),Je?w.framebufferTextureLayer(w.DRAW_FRAMEBUFFER,w.COLOR_ATTACHMENT0,Ue.__webglTexture,Mt,Se+$e):w.framebufferTexture2D(w.DRAW_FRAMEBUFFER,w.COLOR_ATTACHMENT0,w.TEXTURE_2D,Ue.__webglTexture,Mt),k!==0?w.blitFramebuffer(qt,Yt,Ut,Ft,ee,se,Ut,Ft,w.COLOR_BUFFER_BIT,w.NEAREST):Je?w.copyTexSubImage3D(Ce,Mt,ee,se,Se+$e,qt,Yt,Ut,Ft):w.copyTexSubImage2D(Ce,Mt,ee,se,qt,Yt,Ut,Ft);ct.bindFramebuffer(w.READ_FRAMEBUFFER,null),ct.bindFramebuffer(w.DRAW_FRAMEBUFFER,null)}else Je?S.isDataTexture||S.isData3DTexture?w.texSubImage3D(Ce,Mt,ee,se,Se,Ut,Ft,Ot,ne,Gt,_e.data):z.isCompressedArrayTexture?w.compressedTexSubImage3D(Ce,Mt,ee,se,Se,Ut,Ft,Ot,ne,_e.data):w.texSubImage3D(Ce,Mt,ee,se,Se,Ut,Ft,Ot,ne,Gt,_e):S.isDataTexture?w.texSubImage2D(w.TEXTURE_2D,Mt,ee,se,Ut,Ft,ne,Gt,_e.data):S.isCompressedTexture?w.compressedTexSubImage2D(w.TEXTURE_2D,Mt,ee,se,_e.width,_e.height,ne,_e.data):w.texSubImage2D(w.TEXTURE_2D,Mt,ee,se,Ut,Ft,ne,Gt,_e);w.pixelStorei(w.UNPACK_ROW_LENGTH,ae),w.pixelStorei(w.UNPACK_IMAGE_HEIGHT,on),w.pixelStorei(w.UNPACK_SKIP_PIXELS,yi),w.pixelStorei(w.UNPACK_SKIP_ROWS,Ge),w.pixelStorei(w.UNPACK_SKIP_IMAGES,pr),Mt===0&&z.generateMipmaps&&w.generateMipmap(Ce),ct.unbindTexture()},this.copyTextureToTexture3D=function(S,z,j=null,J=null,k=0){return S.isTexture!==!0&&(ki("WebGLRenderer: copyTextureToTexture3D function signature has changed."),j=arguments[0]||null,J=arguments[1]||null,S=arguments[2],z=arguments[3],k=arguments[4]||0),ki('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(S,z,j,J,k)},this.initRenderTarget=function(S){pt.get(S).__webglFramebuffer===void 0&&E.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?E.setTextureCube(S,0):S.isData3DTexture?E.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?E.setTexture2DArray(S,0):E.setTexture2D(S,0),ct.unbindTexture()},this.resetState=function(){R=0,C=0,I=null,ct.reset(),te.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Pn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorspace=ie._getDrawingBufferColorSpace(t),e.unpackColorSpace=ie._getUnpackColorSpace()}}const dc={type:"change"},Go={type:"start"},Dh={type:"end"},hs=new Vs,fc=new Hn,uv=Math.cos(70*Ad.DEG2RAD),Me=new F,ze=2*Math.PI,ue={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Ia=1e-6;class Ih extends Cf{constructor(t,e=null){super(t,e),this.state=ue.NONE,this.enabled=!0,this.target=new F,this.cursor=new F,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:ji.ROTATE,MIDDLE:ji.DOLLY,RIGHT:ji.PAN},this.touches={ONE:Hi.ROTATE,TWO:Hi.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new F,this._lastQuaternion=new gi,this._lastTargetPosition=new F,this._quat=new gi().setFromUnitVectors(t.up,new F(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new zl,this._sphericalDelta=new zl,this._scale=1,this._panOffset=new F,this._rotateStart=new Rt,this._rotateEnd=new Rt,this._rotateDelta=new Rt,this._panStart=new Rt,this._panEnd=new Rt,this._panDelta=new Rt,this._dollyStart=new Rt,this._dollyEnd=new Rt,this._dollyDelta=new Rt,this._dollyDirection=new F,this._mouse=new Rt,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=fv.bind(this),this._onPointerDown=dv.bind(this),this._onPointerUp=pv.bind(this),this._onContextMenu=yv.bind(this),this._onMouseWheel=gv.bind(this),this._onKeyDown=vv.bind(this),this._onTouchStart=xv.bind(this),this._onTouchMove=Sv.bind(this),this._onMouseDown=mv.bind(this),this._onMouseMove=_v.bind(this),this._interceptControlDown=Mv.bind(this),this._interceptControlUp=bv.bind(this),this.domElement!==null&&this.connect(),this.update()}connect(){this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(dc),this.update(),this.state=ue.NONE}update(t=null){const e=this.object.position;Me.copy(e).sub(this.target),Me.applyQuaternion(this._quat),this._spherical.setFromVector3(Me),this.autoRotate&&this.state===ue.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,r=this.maxAzimuthAngle;isFinite(n)&&isFinite(r)&&(n<-Math.PI?n+=ze:n>Math.PI&&(n-=ze),r<-Math.PI?r+=ze:r>Math.PI&&(r-=ze),n<=r?this._spherical.theta=Math.max(n,Math.min(r,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+r)/2?Math.max(n,this._spherical.theta):Math.min(r,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let s=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),s=a!=this._spherical.radius}if(Me.setFromSpherical(this._spherical),Me.applyQuaternion(this._quatInverse),e.copy(this.target).add(Me),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){const o=Me.length();a=this._clampDistance(o*this._scale);const l=o-a;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),s=!!l}else if(this.object.isOrthographicCamera){const o=new F(this._mouse.x,this._mouse.y,0);o.unproject(this.object);const l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),s=l!==this.object.zoom;const c=new F(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(o),this.object.updateMatrixWorld(),a=Me.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(hs.origin.copy(this.object.position),hs.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(hs.direction))<uv?this.object.lookAt(this.target):(fc.setFromNormalAndCoplanarPoint(this.object.up,this.target),hs.intersectPlane(fc,this.target))))}else if(this.object.isOrthographicCamera){const a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),s=!0)}return this._scale=1,this._performCursorZoom=!1,s||this._lastPosition.distanceToSquared(this.object.position)>Ia||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Ia||this._lastTargetPosition.distanceToSquared(this.target)>Ia?(this.dispatchEvent(dc),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?ze/60*this.autoRotateSpeed*t:ze/60/60*this.autoRotateSpeed}_getZoomScale(t){const e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){Me.setFromMatrixColumn(e,0),Me.multiplyScalar(-t),this._panOffset.add(Me)}_panUp(t,e){this.screenSpacePanning===!0?Me.setFromMatrixColumn(e,1):(Me.setFromMatrixColumn(e,0),Me.crossVectors(this.object.up,Me)),Me.multiplyScalar(t),this._panOffset.add(Me)}_pan(t,e){const n=this.domElement;if(this.object.isPerspectiveCamera){const r=this.object.position;Me.copy(r).sub(this.target);let s=Me.length();s*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*s/n.clientHeight,this.object.matrix),this._panUp(2*e*s/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const n=this.domElement.getBoundingClientRect(),r=t-n.left,s=e-n.top,a=n.width,o=n.height;this._mouse.x=r/a*2-1,this._mouse.y=-(s/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(ze*this._rotateDelta.x/e.clientHeight),this._rotateUp(ze*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(ze*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-ze*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(ze*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-ze*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),r=.5*(t.pageY+e.y);this._rotateStart.set(n,r)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),r=.5*(t.pageY+e.y);this._panStart.set(n,r)}}_handleTouchStartDolly(t){const e=this._getSecondPointerPosition(t),n=t.pageX-e.x,r=t.pageY-e.y,s=Math.sqrt(n*n+r*r);this._dollyStart.set(0,s)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{const n=this._getSecondPointerPosition(t),r=.5*(t.pageX+n.x),s=.5*(t.pageY+n.y);this._rotateEnd.set(r,s)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(ze*this._rotateDelta.x/e.clientHeight),this._rotateUp(ze*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),r=.5*(t.pageY+e.y);this._panEnd.set(n,r)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){const e=this._getSecondPointerPosition(t),n=t.pageX-e.x,r=t.pageY-e.y,s=Math.sqrt(n*n+r*r);this._dollyEnd.set(0,s),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const a=(t.pageX+e.x)*.5,o=(t.pageY+e.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new Rt,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){const e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){const e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}}function dv(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i)))}function fv(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function pv(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Dh),this.state=ue.NONE;break;case 1:const t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function mv(i){let t;switch(i.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case ji.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=ue.DOLLY;break;case ji.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=ue.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=ue.ROTATE}break;case ji.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=ue.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=ue.PAN}break;default:this.state=ue.NONE}this.state!==ue.NONE&&this.dispatchEvent(Go)}function _v(i){switch(this.state){case ue.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case ue.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case ue.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function gv(i){this.enabled===!1||this.enableZoom===!1||this.state!==ue.NONE||(i.preventDefault(),this.dispatchEvent(Go),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Dh))}function vv(i){this.enabled!==!1&&this._handleKeyDown(i)}function xv(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case Hi.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=ue.TOUCH_ROTATE;break;case Hi.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=ue.TOUCH_PAN;break;default:this.state=ue.NONE}break;case 2:switch(this.touches.TWO){case Hi.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=ue.TOUCH_DOLLY_PAN;break;case Hi.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=ue.TOUCH_DOLLY_ROTATE;break;default:this.state=ue.NONE}break;default:this.state=ue.NONE}this.state!==ue.NONE&&this.dispatchEvent(Go)}function Sv(i){switch(this._trackPointer(i),this.state){case ue.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case ue.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case ue.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case ue.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=ue.NONE}}function yv(i){this.enabled!==!1&&i.preventDefault()}function Mv(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function bv(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function Ev(i){switch(i){case"box":return new Kn(1,1,1,2,2,2);case"sphere":return new Ho(.5,32,24);case"cylinder":return new Gs(.5,.5,1,28);case"torus":return new Xs(.42,.16,20,40);case"capsule":return new ko(.5,.6,8,20);default:return new Kn(1,1,1)}}function Tv(i){const t=Math.ceil(Math.sqrt(i)),e=Math.ceil(i/t);return{cols:t,rows:e}}var Av=st('<div class="absolute left-3 top-3 chip chip-danger">红点分件 = 试模缺陷定位'),wv=st('<div class=relative><div class=canvas-host></div><div class="absolute right-3 top-3 flex gap-2"><button class=btn-mini></button></div><div class="absolute bottom-3 left-3 hint">拖拽旋转 · 滚轮缩放 · 点击分件查看');function Uh(i){let t,e,n,r,s,a;const o=new Map,[l,c]=jt(!0),[h,d]=jt(null),p=()=>{o.forEach((_,g)=>{var M;const m=_.material,u=g===i.selectedId,A=(M=i.defectPartIds)==null?void 0:M.includes(g),T=g===h();m.emissive.set(A?"#ff2d2d":u?"#ffb020":T?"#3a6ea5":"#000000"),m.emissiveIntensity=A?.85:u?.6:T?.45:0})},f=()=>{a.clear(),o.clear();for(const _ of i.parts){const g=Ev(_.shape),m=new xs({color:new Qt(_.color),roughness:.45,metalness:.12}),u=new Ke(g,m);u.position.set(..._.pos),u.rotation.set(..._.rot),u.scale.set(..._.scale),u.userData.partId=_.id,u.castShadow=!0,a.add(u),o.set(_.id,u)}p()};return yc(()=>{const _=t.clientWidth,g=t.clientHeight;e=new fh,e.background=new Qt("#10141b"),n=new qe(45,_/g,.1,100),n.position.set(4.2,3.2,5.4),r=new Lh({antialias:!0}),r.setPixelRatio(Math.min(2,window.devicePixelRatio)),r.setSize(_,g),r.shadowMap.enabled=!0,r.shadowMap.type=Hc,t.appendChild(r.domElement),s=new Ih(n,r.domElement),s.enableDamping=!0,s.dampingFactor=.08,s.target.set(0,1,0);const m=new bh("#bcd4ff","#2a2418",1.1);e.add(m);const u=new Th("#ffffff",1.6);u.position.set(4,7,3),u.castShadow=!0,u.shadow.mapSize.set(1024,1024),e.add(u);const A=new wf(9,18,"#3a4356","#232a37");A.position.y=-1.05,e.add(A),a=new Vi,e.add(a),f();const T=new Af,M=new Rt,L=b=>{var B;const x=r.domElement.getBoundingClientRect();M.x=(b.clientX-x.left)/x.width*2-1,M.y=-((b.clientY-x.top)/x.height)*2+1,T.setFromCamera(M,n);const G=(B=T.intersectObjects([...o.values()],!1)[0])==null?void 0:B.object.userData.partId;b.type==="click"?G&&i.onSelect&&i.onSelect(G):(d(G??null),r.domElement.style.cursor=G?"pointer":"default")};r.domElement.addEventListener("click",L),r.domElement.addEventListener("pointermove",L);const R=new ResizeObserver(()=>{const b=t.clientWidth,x=t.clientHeight;!b||!x||(n.aspect=b/x,n.updateProjectionMatrix(),r.setSize(b,x))});R.observe(t);let C=0;const I=()=>{s.autoRotate=l(),s.autoRotateSpeed=1.2,s.update(),r.render(e,n),C=requestAnimationFrame(I)};I(),Ao(()=>{cancelAnimationFrame(C),R.disconnect(),r.domElement.removeEventListener("click",L),r.domElement.removeEventListener("pointermove",L),s.dispose(),o.forEach(b=>{b.geometry.dispose(),b.material.dispose()}),r.dispose(),r.domElement.remove()})}),wr(()=>{i.parts.map(_=>_.id).join("|"),a&&f()}),wr(()=>{var _;i.selectedId,(_=i.defectPartIds)==null||_.join("|"),h(),p()}),(()=>{var _=wv(),g=_.firstChild,m=g.nextSibling,u=m.firstChild,A=m.nextSibling,T=t;return typeof T=="function"?Pc(T,g):t=g,u.$$click=()=>c(M=>!M),y(u,()=>l()?"⏸ 停止旋转":"▶ 自动旋转"),y(_,K(Bt,{get when(){var M;return(M=i.defectPartIds)==null?void 0:M.length},get children(){return Av()}}),A),zt(M=>pi(_,"height",i.height??"420px")),_})()}vi(["click"]);var Cv=st('<div><div class=canvas-host></div><div class="flex-wrap gap-2 mt-2">'),Rv=st('<span class="chip chip-outline"># 穴');function Nh(i){let t,e,n,r,s,a;const o=()=>{a.clear();const{cols:l,rows:c}=Tv(i.cavities),h=1.25,d=new xs({color:new Qt(i.color),roughness:.4,metalness:.15}),p=new Ke(new Kn(l*h+.9,.18,c*h+.9),new xs({color:"#5b6472",roughness:.7,metalness:.4}));p.position.y=-.32,p.receiveShadow=!0,a.add(p);for(let f=0;f<i.cavities;f++){const _=f%l-(l-1)/2,g=Math.floor(f/l)-(c-1)/2,m=new Ke(new Gs(.46,.46,.12,28),d.clone());m.position.set(_*h,-.16,g*h),m.castShadow=!0,a.add(m);const u=new Ke(new Xs(.47,.035,10,30),new xs({color:"#d8e2f0",metalness:.8,roughness:.25}));u.rotation.x=Math.PI/2,u.position.set(_*h,-.09,g*h),a.add(u)}for(let f=0;f<i.cavities;f++){const _=f%l-(l-1)/2,g=Math.floor(f/l)-(c-1)/2,m=document.createElement("canvas");m.width=96,m.height=96;const u=m.getContext("2d");u.fillStyle="rgba(16,20,27,.85)",u.beginPath(),u.arc(48,48,34,0,Math.PI*2),u.fill(),u.strokeStyle="#9fc2ff",u.lineWidth=4,u.stroke(),u.fillStyle="#fff",u.font="bold 34px sans-serif",u.textAlign="center",u.textBaseline="middle",u.fillText(String(f+1),48,50);const A=new af(m),T=new tf(new ph({map:A,depthTest:!1}));T.scale.set(.42,.42,.42),T.position.set(_*h,.18,g*h),a.add(T)}};return yc(()=>{const l=t.clientWidth,c=t.clientHeight;e=new fh,e.background=new Qt("#10141b"),n=new qe(45,l/c,.1,100),n.position.set(0,5.2,4.2),r=new Lh({antialias:!0}),r.setPixelRatio(Math.min(2,window.devicePixelRatio)),r.setSize(l,c),r.shadowMap.enabled=!0,t.appendChild(r.domElement),s=new Ih(n,r.domElement),s.enableDamping=!0,s.target.set(0,0,0),e.add(new bh("#bcd4ff","#222",1.2));const h=new Th("#fff",1.5);h.position.set(3,6,2),h.castShadow=!0,e.add(h),a=new Vi,e.add(a),o();const d=new ResizeObserver(()=>{const _=t.clientWidth,g=t.clientHeight;!_||!g||(n.aspect=_/g,n.updateProjectionMatrix(),r.setSize(_,g))});d.observe(t);let p=0;const f=()=>{s.update(),r.render(e,n),p=requestAnimationFrame(f)};f(),Ao(()=>{cancelAnimationFrame(p),d.disconnect(),s.dispose(),r.dispose(),r.domElement.remove()})}),wr(()=>{i.cavities,i.color,a&&o()}),(()=>{var l=Cv(),c=l.firstChild,h=c.nextSibling,d=t;return typeof d=="function"?Pc(d,c):t=c,y(h,K(oe,{get each(){return Array.from({length:i.cavities},(p,f)=>f+1)},children:p=>(()=>{var f=Rv(),_=f.firstChild;return y(f,p,_),f})()})),zt(p=>pi(c,"height",i.height??"320px")),l})()}var Pv=st('<div class="flex-col gap-4"><div class=card><div class="flex items-center justify-between mb-3 flex-wrap gap-3"><h3 style=margin:0px>选择款式</h3><div class=pill-filter></div></div><div class="grid grid-2"><div class=card style=padding:10px;background:#0d1220></div><div class="flex-col gap-2"></div></div></div><div class=card><h3>分件清单（点击行联动 3D 高亮）</h3><div class=tbl-wrap><table class=tbl><thead><tr><th>分件</th><th>色号</th><th>模号</th><th>穴数</th><th>材质</th><th>状态</th><th>修模次数</th><th class=right>操作</th></tr></thead><tbody>'),Lv=st("<button> · <span class=hint>（<!>）"),Dv=st('<div class="flex items-center justify-between"><h3 style=margin:0px><span class="chip ml-2"style="margin:0 6px"><i style="display:inline-block;width:12px;height:12px;border-radius:3px;border:1px solid #999"></i>色号 '),Iv=st("<table class=tbl><tbody><tr><td class=muted>几何体</td><td></td></tr><tr><td class=muted>累计修模</td><td><b></b> 次</td></tr><tr><td class=muted>模具</td><td>"),Uv=st('<button class="btn primary">＋ 建开模单'),Nv=st('<div class="flex gap-2 mt-2"><button class=btn>📁 分件档案'),Fv=st("<span class=muted>未开模"),Ov=st('<div class="flex-col gap-2"><b></b><div class=hint> 穴 · <!> · 开模单 '),Bv=st('<button class="btn sm primary">建开模单'),$v=st('<tr class=row-click><td><b></b></td><td><span class=chip><i style="display:inline-block;width:11px;height:11px;border-radius:3px;border:1px solid #999"></i></span></td><td></td><td class=num></td><td></td><td></td><td class=num><b></b></td><td class=right><div class="flex gap-2"style=justify-content:flex-end><button class="btn sm">档案'),zv=st("<span class=muted>—"),kv=st("<div class=err>"),Hv=st('<div class=form-row><div class=field><label>模号 <span class=req>*</span>（全局唯一）</label><input placeholder="如 M-A018-09"></div><div class=field><label>穴数 <span class=req>*</span></label><input type=number min=1 max=64>'),Vv=st('<div class=form-row><div class=field><label>材质 <span class=req>*</span></label><select></select></div><div class=field><label>色号 <span class=req>*</span></label><div class="flex gap-2"><input type=color style=width:52px;padding:3px><input placeholder=#d94f4f>'),Gv=st('<div class=field><label>模具寿命（模次）<span class=req>*</span></label><input type=number min=1000 step=10000><div class="hint mt-2">行业默认 300,000 模次；剩余寿命低于 10% 时排产自动拦截'),Wv=st("<div class=field><label>备注</label><textarea placeholder=浇口形式、外观要求、咬花纹路等>"),Xv=st("<button class=btn>取消"),qv=st('<button class="btn primary">提交开模单'),Yv=st("<option>"),jv=st("<div class=timeline>"),Kv=st('<div class="grid grid-2"><div><table class=tbl><tbody><tr><td class=muted>所属款式</td><td></td></tr><tr><td class=muted>色号 / 材质</td><td> / </td></tr><tr><td class=muted>当前状态</td><td></td></tr><tr><td class=muted>累计修模次数</td><td><b style=font-size:17px></b> 次</td></tr><tr><td class=muted>试模轮次</td><td> 次（通过 <!> 次）</td></tr></tbody></table><h3 class=mt-4>试模 / 修模时间线</h3></div><div>'),Zv=st('<div class="toast-warn mt-2"><span>🔧</span><span>修模方案：'),Jv=st('<div><b>第 <!> 轮 · <!> · </b><div class=hint>工艺员：</div><div class="mt-2 flex-wrap gap-2">'),Qv=st('<span class="chip chip-danger">：'),t0=st("<div class=toast-warn>该分件尚未建立开模单，无模穴视图"),e0=st("<h3>模穴分布（<!> 穴 · <!>）"),n0=st('<div class=mt-3><div class="hint mt-2">已用 <!> / 寿命 <!> 模次');function i0(){var G;const[i,t]=jt(((G=kt.styles[0])==null?void 0:G.id)??""),[e,n]=jt(null),[r,s]=jt(null),[a,o]=jt(null),{flash:l,FlashBox:c}=zs(),h=re(()=>kt.parts.filter(B=>B.styleId===i())),d=re(()=>h().find(B=>B.id===e())??h()[0]),[p,f]=jt(""),[_,g]=jt(4),[m,u]=jt("ABS"),[A,T]=jt(""),[M,L]=jt(Ls),[R,C]=jt(""),[I,b]=jt(""),x=B=>{var Z;s(B),f(`M-${((Z=je(B.styleId))==null?void 0:Z.code.slice(-3))??"NEW"}-${String(kt.orders.length+1).padStart(2,"0")}`),g(4),u("ABS"),T(B.color),L(Ls),C(""),b("")},P=()=>{const B=r();if(!B)return;if(!p().trim()){b("模号必填");return}if(_()<1){b("穴数至少为 1");return}const Z=pu({partId:B.id,moldNo:p(),cavities:_(),material:m(),colorCode:A(),lifeTotal:M(),remark:R()});if(!Z.ok){b(Z.msg??"提交失败");return}l("ok",`开模单已建立，分件「${B.name}」进入待试模`),s(null)};return(()=>{var B=Pv(),Z=B.firstChild,rt=Z.firstChild,W=rt.firstChild,at=W.nextSibling,V=rt.nextSibling,_t=V.firstChild,tt=_t.nextSibling,xt=Z.nextSibling,Nt=xt.firstChild,bt=Nt.nextSibling,q=bt.firstChild,H=q.firstChild,X=H.nextSibling;return y(B,K(c,{}),Z),y(at,K(oe,{get each(){return kt.styles},children:O=>(()=>{var D=Lv(),U=D.firstChild,Q=U.nextSibling,ot=Q.firstChild,ut=ot.nextSibling;return ut.nextSibling,D.$$click=()=>{t(O.id),n(null)},y(D,()=>O.code,U),y(D,()=>O.name,Q),y(Q,()=>{var dt;return(dt=kt.customers.find(w=>w.id===O.customerId))==null?void 0:dt.name},ut),zt(()=>xe(D,i()===O.id?"on":"")),D})()})),y(_t,K(Uh,{get parts(){return h()},get selectedId(){var O;return(O=d())==null?void 0:O.id},onSelect:O=>n(O),height:"430px"})),y(tt,K(Bt,{get when(){return d()},get fallback(){return K(rn,{text:"该款式暂无分件"})},children:O=>[(()=>{var D=Dv(),U=D.firstChild,Q=U.firstChild,ot=Q.firstChild;return ot.nextSibling,y(U,()=>O().name,Q),y(Q,()=>O().color,null),y(D,K(qi,{get status(){return O().status}}),null),zt(ut=>pi(ot,"background",O().color)),D})(),(()=>{var D=Iv(),U=D.firstChild,Q=U.firstChild,ot=Q.firstChild,ut=ot.nextSibling,dt=Q.nextSibling,w=dt.firstChild,Et=w.nextSibling,vt=Et.firstChild,mt=dt.nextSibling,ct=mt.firstChild,St=ct.nextSibling;return y(ut,()=>O().shape),y(vt,()=>O().repairCount),y(St,K(Bt,{get when(){return ke(O().id)},get fallback(){return Fv()},children:pt=>(()=>{var E=Ov(),v=E.firstChild,$=v.nextSibling,Y=$.firstChild,et=Y.nextSibling;return et.nextSibling,y(v,()=>pt().moldNo),y($,()=>pt().cavities,Y),y($,()=>pt().material,et),y($,()=>pt().no,null),y(E,K(ir,{get pct(){return Ze(pt())}}),null),E})()})),zt(()=>vt.classList.toggle("err",O().repairCount>=3)),D})(),(()=>{var D=Nv(),U=D.firstChild;return y(D,K(Bt,{get when(){return!ke(O().id)},get children(){var Q=Uv();return Q.$$click=()=>x(O()),Q}}),U),U.$$click=()=>o(O()),D})()]})),y(X,K(oe,{get each(){return h()},children:O=>{const D=ke(O.id);return(()=>{var U=$v(),Q=U.firstChild,ot=Q.firstChild,ut=Q.nextSibling,dt=ut.firstChild,w=dt.firstChild,Et=ut.nextSibling,vt=Et.nextSibling,mt=vt.nextSibling,ct=mt.nextSibling,St=ct.nextSibling,pt=St.firstChild,E=St.nextSibling,v=E.firstChild,$=v.firstChild;return U.$$click=()=>n(O.id),y(ot,()=>O.name),y(dt,()=>O.color,null),y(Et,()=>(D==null?void 0:D.moldNo)??zv()),y(vt,()=>(D==null?void 0:D.cavities)??"—"),y(mt,()=>(D==null?void 0:D.material)??"—"),y(ct,K(qi,{get status(){return O.status}})),y(pt,()=>O.repairCount),y(v,K(Bt,{when:!D,get children(){var Y=Bv();return Y.$$click=et=>{et.stopPropagation(),x(O)},Y}}),$),$.$$click=Y=>{Y.stopPropagation(),o(O)},zt(Y=>{var yt;var et=((yt=d())==null?void 0:yt.id)===O.id,nt=O.color,Tt=O.repairCount>=3;return et!==Y.e&&U.classList.toggle("bg-blue",Y.e=et),nt!==Y.t&&pi(w,"background",Y.t=nt),Tt!==Y.a&&pt.classList.toggle("err",Y.a=Tt),Y},{e:void 0,t:void 0,a:void 0}),U})()}})),y(B,K(Bt,{get when(){return r()},children:O=>K(fi,{get title(){return`建立开模单 · ${O().name}`},onClose:()=>s(null),get footer(){return[(()=>{var D=Xv();return D.$$click=()=>s(null),D})(),(()=>{var D=qv();return D.$$click=P,D})()]},get children(){return[K(Bt,{get when(){return I()},get children(){var D=kv();return y(D,I),D}}),(()=>{var D=Hv(),U=D.firstChild,Q=U.firstChild,ot=Q.nextSibling,ut=U.nextSibling,dt=ut.firstChild,w=dt.nextSibling;return ot.$$input=Et=>f(Et.currentTarget.value),w.$$input=Et=>g(Number(Et.currentTarget.value)),zt(()=>ot.value=p()),zt(()=>w.value=_()),D})(),(()=>{var D=Vv(),U=D.firstChild,Q=U.firstChild,ot=Q.nextSibling,ut=U.nextSibling,dt=ut.firstChild,w=dt.nextSibling,Et=w.firstChild,vt=Et.nextSibling;return ot.addEventListener("change",mt=>u(mt.currentTarget.value)),y(ot,K(oe,{each:["ABS","PC+ABS","PVC","PP","POM","PA","PC"],children:mt=>(()=>{var ct=Yv();return ct.value=mt,y(ct,mt),ct})()})),Et.$$input=mt=>T(mt.currentTarget.value),vt.$$input=mt=>T(mt.currentTarget.value),zt(()=>ot.value=m()),zt(()=>Et.value=A()),zt(()=>vt.value=A()),D})(),(()=>{var D=Gv(),U=D.firstChild,Q=U.nextSibling;return Q.$$input=ot=>L(Number(ot.currentTarget.value)),zt(()=>Q.value=M()),D})(),(()=>{var D=Wv(),U=D.firstChild,Q=U.nextSibling;return Q.$$input=ot=>C(ot.currentTarget.value),zt(()=>Q.value=R()),D})()]}})}),null),y(B,K(Bt,{get when(){return a()},children:O=>{const D=re(()=>ke(O().id)),U=re(()=>Wi(O().id));return K(fi,{wide:!0,get title(){return`分件档案 · ${O().name}`},onClose:()=>o(null),get children(){var Q=Kv(),ot=Q.firstChild,ut=ot.firstChild,dt=ut.firstChild,w=dt.firstChild,Et=w.firstChild,vt=Et.nextSibling,mt=w.nextSibling,ct=mt.firstChild,St=ct.nextSibling,pt=St.firstChild,E=mt.nextSibling,v=E.firstChild,$=v.nextSibling,Y=E.nextSibling,et=Y.firstChild,nt=et.nextSibling,Tt=nt.firstChild,yt=Y.nextSibling,At=yt.firstChild,Wt=At.nextSibling,gt=Wt.firstChild,ft=gt.nextSibling;ft.nextSibling,ut.nextSibling;var Dt=ot.nextSibling;return y(vt,()=>{var It;return(It=je(O().styleId))==null?void 0:It.name}),y(St,()=>O().color,pt),y(St,()=>{var It;return((It=D())==null?void 0:It.material)??"—"},null),y($,K(qi,{get status(){return O().status}})),y(Tt,()=>O().repairCount),y(Wt,()=>U().length,gt),y(Wt,()=>U().filter(It=>It.passed).length,ft),y(ot,K(Bt,{get when(){return U().length},get fallback(){return K(rn,{text:"暂无试模记录"})},get children(){var It=jv();return y(It,K(oe,{get each(){return U()},children:ht=>(()=>{var Ht=Jv(),$t=Ht.firstChild,te=$t.firstChild,N=te.nextSibling,wt=N.nextSibling,it=wt.nextSibling;it.nextSibling;var lt=$t.nextSibling;lt.firstChild;var Pt=lt.nextSibling;return y($t,()=>ht.round,N),y($t,()=>Ps(ht.date),it),y($t,()=>ht.passed?"试模通过":"试模不通过",null),y(lt,()=>ht.operator,null),y(Pt,K(oe,{get each(){return ht.defects},children:Ct=>(()=>{var Xt=Qv(),de=Xt.firstChild;return y(Xt,()=>Ct.type,de),y(Xt,()=>Ct.desc,null),Xt})()})),y(Ht,K(Bt,{get when(){return ht.repairPlan},get children(){var Ct=Zv(),Xt=Ct.firstChild,de=Xt.nextSibling;return de.firstChild,y(de,()=>ht.repairPlan,null),Ct}}),null),zt(()=>xe(Ht,`tl-item ${ht.passed?"ok":"fail"}`)),Ht})()})),It}}),null),y(Dt,K(Bt,{get when(){return D()},get fallback(){return t0()},children:It=>[(()=>{var ht=e0(),Ht=ht.firstChild,$t=Ht.nextSibling,te=$t.nextSibling,N=te.nextSibling;return N.nextSibling,y(ht,()=>It().cavities,$t),y(ht,()=>It().moldNo,N),ht})(),K(Nh,{get cavities(){return It().cavities},get color(){return It().colorCode},height:"300px"}),(()=>{var ht=n0(),Ht=ht.firstChild,$t=Ht.firstChild,te=$t.nextSibling,N=te.nextSibling,wt=N.nextSibling;return wt.nextSibling,y(ht,K(ir,{get pct(){return Ze(It())}}),Ht),y(Ht,()=>It().lifeUsed.toLocaleString(),te),y(Ht,()=>It().lifeTotal.toLocaleString(),wt),ht})()]})),zt(()=>Tt.classList.toggle("err",O().repairCount>=3)),Q}})}}),null),B})()}vi(["click","input"]);var r0=st("<div class=tbl-wrap><table class=tbl><thead><tr><th>分件</th><th>款式</th><th>模号</th><th>已试轮次</th><th>修模次数</th><th>状态</th><th class=right>操作</th></tr></thead><tbody>"),s0=st('<div class="flex-col gap-4"><div class=card><div class="flex items-center justify-between mb-3"><h3 style=margin:0px>试模任务</h3><div class=seg><button>待处理（<!>）</button><button>全部已开模分件'),a0=st('<button class="btn sm primary">'),o0=st('<button class="btn sm ok">修模完成'),l0=st('<tr><td><b></b></td><td></td><td></td><td class=num></td><td class=num><b></b></td><td></td><td class=right><div class="flex gap-2"style=justify-content:flex-end><button class="btn sm">查看记录'),c0=st("<div class=err>"),h0=st('<img class="photo-thumb mb-2"alt=缺陷预览>'),u0=st("<div class=grid style=gap:10px>"),d0=st('<div class="grid grid-2"><div><h3>① 在装配图上点选缺陷分件 <span class=sub>红点 = 已登记缺陷</span></h3><div style=background:#0d1220;padding:8px;border-radius:10px></div><div class=mt-2><label class=muted>缺陷所在分件：</label><select></select></div></div><div><h3>② 填写缺陷并强制上传照片</h3><div class=form-row><div class=field><label>缺陷类型 <span class=req>*</span></label><select></select></div><div class=field><label>缺陷照片 <span class=req>*</span></label><label class=photo-box style="padding:8px 10px"><input type=file accept=image/* capture=environment style=display:none></label></div></div><div class=field><label>缺陷描述 <span class=req>*</span></label><textarea placeholder="如：分型面周圈飞边 0.2mm，顶针位顶白"></textarea></div><button class="btn primary">＋ 添加缺陷条目</button><h3 class=mt-4>已登记缺陷（<!>）'),f0=st('<div class=field><label>修模方案 <span class=req>*</span>（不通过必填，提交后修模次数 +1，修模完成回到待试模）</label><textarea placeholder="如：浇口加大 0.3mm，配合面减胶 0.05mm，顶针区脱模斜度加至 1.5° 并抛光型腔">'),p0=st('<div class=mt-4 style="border-top:1px solid var(--line);padding-top:14px"><h3>③ 试模结论</h3><div class=form-row><div class=field><label>工艺员</label><input></div><div class=field><label>结论 <span class=req>*</span></label><div class=seg style=width:100%><button style=flex:1px>不通过 → 转修模</button><button style=flex:1px>通过 → 模具合格'),m0=st("<h3 class=mt-4>历史试模记录"),_0=st("<div class=timeline>"),g0=st("<button class=btn>取消"),v0=st('<button class="btn primary">提交试模结论'),pc=st("<option>"),x0=st("<div class=toast-warn>尚未登记缺陷，没有缺陷照片不能提交试模记录"),S0=st('<div class="defect-card flex gap-3"><img alt=缺陷照片 style="width:110px;height:80px;flex:0 0 110px"><div class=flex-1><b><span class="badge red"></span><span class="chip ml-2"style="margin:0 6px"></span></b><div class="hint mt-2"></div></div><button class="btn sm danger">删除'),y0=st('<div class="hint mt-2">修模方案：'),M0=st('<div><b>第 <!> 轮 · <!> · </b><div class="flex-wrap gap-2 mt-2">'),b0=st('<span class="chip chip-danger">（<!>）');const E0=["缩水","飞边","顶白","缺胶","气泡","变形","熔接痕","其他"];function T0(){const[i,t]=jt("todo"),[e,n]=jt(null),{flash:r,FlashBox:s}=zs(),a=re(()=>kt.parts.filter(W=>W.status==="trial_pending"||W.status==="repairing")),o=re(()=>i()==="todo"?a():kt.parts.filter(W=>ke(W.id))),[l,c]=jt([]),[h,d]=jt(!1),[p,f]=jt(""),[_,g]=jt("周工艺"),[m,u]=jt(""),[A,T]=jt("缩水"),[M,L]=jt(""),[R,C]=jt(""),[I,b]=jt(""),[x,P]=jt(!1),G=W=>{n(W),c([]),d(!1),f(""),u(""),T("缩水"),L(""),C(""),b(W.id)},B=async W=>{if(W){P(!0);try{C(await hu(W))}catch(at){u(at.message)}finally{P(!1)}}},Z=()=>{if(!I()){u("请点选缺陷所在的具体分件");return}if(!M().trim()){u("请填写缺陷描述");return}if(!R()){u("缺陷照片为必传项，不带照片不能登记");return}c(W=>[...W,{partId:I(),type:A(),desc:M().trim(),photo:R()}]),L(""),C(""),u(""),r("ok","缺陷已登记，可继续添加或直接提交试模结论")},rt=()=>{const W=e();if(!W)return;if(!l().length){u("至少登记一条缺陷记录（含照片）才能提交");return}if(l().some(V=>!V.photo)){u("存在未上传照片的缺陷，不能提交");return}if(!h()&&!p().trim()){u("试模不通过必须填写修模方案");return}const at=mu(W.id,{passed:h(),defects:l(),repairPlan:p(),operator:_()});if(!at.ok){u(at.msg??"提交失败");return}r(h()?"ok":"warn",h()?`第 ${Wi(W.id).length} 轮试模通过，模具进入合格状态`:"试模不通过已转修模，修模次数 +1，修模完成后回到待试模"),n(null)};return(()=>{var W=s0(),at=W.firstChild,V=at.firstChild,_t=V.firstChild,tt=_t.nextSibling,xt=tt.firstChild,Nt=xt.firstChild,bt=Nt.nextSibling;bt.nextSibling;var q=xt.nextSibling;return y(W,K(s,{}),at),xt.$$click=()=>t("todo"),y(xt,()=>a().length,bt),q.$$click=()=>t("all"),y(at,K(Bt,{get when(){return o().length},get fallback(){return K(rn,{text:"暂无试模任务"})},get children(){var H=r0(),X=H.firstChild,O=X.firstChild,D=O.nextSibling;return y(D,K(oe,{get each(){return o()},children:U=>{const Q=ke(U.id),ot=Wi(U.id);return(()=>{var ut=l0(),dt=ut.firstChild,w=dt.firstChild,Et=dt.nextSibling,vt=Et.nextSibling,mt=vt.nextSibling,ct=mt.nextSibling,St=ct.firstChild,pt=ct.nextSibling,E=pt.nextSibling,v=E.firstChild,$=v.firstChild;return y(w,()=>U.name),y(Et,()=>{var Y;return(Y=je(U.styleId))==null?void 0:Y.code}),y(vt,()=>(Q==null?void 0:Q.moldNo)??"—"),y(mt,()=>ot.length),y(St,()=>U.repairCount),y(pt,K(qi,{get status(){return U.status}})),y(v,K(Bt,{get when(){return U.status==="trial_pending"||U.status==="repairing"},get children(){var Y=a0();return Y.$$click=()=>G(U),y(Y,()=>U.status==="repairing"?"复检试模":"登记试模"),Y}}),$),y(v,K(Bt,{get when(){return U.status==="repairing"},get children(){var Y=o0();return Y.$$click=()=>{_u(U.id),r("ok",`「${U.name}」修模完成，已回到待试模`)},Y}}),$),$.$$click=()=>G(U),zt(()=>St.classList.toggle("err",U.repairCount>=3)),ut})()}})),H}}),null),y(W,K(Bt,{get when(){return e()},children:H=>{const X=re(()=>kt.parts.filter(D=>D.styleId===H().styleId)),O=re(()=>Wi(H().id));return K(fi,{wide:!0,get title(){var D;return`试模登记 · ${H().name}（${(D=ke(H().id))==null?void 0:D.moldNo}）`},onClose:()=>n(null),get footer(){return[(()=>{var D=g0();return D.$$click=()=>n(null),D})(),(()=>{var D=v0();return D.$$click=rt,D})()]},get children(){return[K(Bt,{get when(){return m()},get children(){var D=c0();return y(D,m),D}}),(()=>{var D=d0(),U=D.firstChild,Q=U.firstChild,ot=Q.nextSibling,ut=ot.nextSibling,dt=ut.firstChild,w=dt.nextSibling,Et=U.nextSibling,vt=Et.firstChild,mt=vt.nextSibling,ct=mt.firstChild,St=ct.firstChild,pt=St.nextSibling,E=ct.nextSibling,v=E.firstChild,$=v.nextSibling,Y=$.firstChild,et=mt.nextSibling,nt=et.firstChild,Tt=nt.nextSibling,yt=et.nextSibling,At=yt.nextSibling,Wt=At.firstChild,gt=Wt.nextSibling;return gt.nextSibling,y(ot,K(Uh,{get parts(){return X()},get selectedId(){return I()},get defectPartIds(){return l().map(ft=>ft.partId)},onSelect:ft=>b(ft),height:"300px"})),w.addEventListener("change",ft=>b(ft.currentTarget.value)),y(w,K(oe,{get each(){return X()},children:ft=>(()=>{var Dt=pc();return y(Dt,()=>ft.name),zt(()=>Dt.value=ft.id),Dt})()})),pt.addEventListener("change",ft=>T(ft.currentTarget.value)),y(pt,K(oe,{each:E0,children:ft=>(()=>{var Dt=pc();return Dt.value=ft,y(Dt,ft),Dt})()})),y($,K(Bt,{get when(){return x()},get fallback(){return R()?"📷 点击重新选择照片":"📷 点击上传缺陷照片（必传）"},children:"处理中…"}),Y),Y.addEventListener("change",ft=>{var Dt;return B((Dt=ft.currentTarget.files)==null?void 0:Dt[0])}),y(Et,K(Bt,{get when(){return R()},get children(){var ft=h0();return zt(()=>tl(ft,"src",R())),ft}}),et),Tt.$$input=ft=>L(ft.currentTarget.value),yt.$$click=Z,y(At,()=>l().length,gt),y(Et,K(Bt,{get when(){return l().length},get fallback(){return x0()},get children(){var ft=u0();return y(ft,K(oe,{get each(){return l()},children:(Dt,It)=>(()=>{var ht=S0(),Ht=ht.firstChild,$t=Ht.nextSibling,te=$t.firstChild,N=te.firstChild,wt=N.nextSibling,it=te.nextSibling,lt=$t.nextSibling;return y(N,()=>Dt.type),y(wt,()=>{var Pt;return(Pt=kt.parts.find(Ct=>Ct.id===Dt.partId))==null?void 0:Pt.name}),y(it,()=>Dt.desc),lt.$$click=()=>c(Pt=>Pt.filter((Ct,Xt)=>Xt!==It())),zt(()=>tl(Ht,"src",Dt.photo)),ht})()})),ft}}),null),zt(()=>w.value=I()),zt(()=>pt.value=A()),zt(()=>Tt.value=M()),D})(),(()=>{var D=p0(),U=D.firstChild,Q=U.nextSibling,ot=Q.firstChild,ut=ot.firstChild,dt=ut.nextSibling,w=ot.nextSibling,Et=w.firstChild,vt=Et.nextSibling,mt=vt.firstChild,ct=mt.nextSibling;return dt.$$input=St=>g(St.currentTarget.value),mt.$$click=()=>d(!1),ct.$$click=()=>d(!0),y(D,K(Bt,{get when(){return!h()},get children(){var St=f0(),pt=St.firstChild,E=pt.nextSibling;return E.$$input=v=>f(v.currentTarget.value),zt(()=>E.value=p()),St}}),null),zt(St=>{var pt=h()?"":"on",E=h()?"on":"";return pt!==St.e&&xe(mt,St.e=pt),E!==St.t&&xe(ct,St.t=E),St},{e:void 0,t:void 0}),zt(()=>dt.value=_()),D})(),K(Bt,{get when(){return O().length},get children(){return[m0(),(()=>{var D=_0();return y(D,K(oe,{get each(){return O()},children:U=>(()=>{var Q=M0(),ot=Q.firstChild,ut=ot.firstChild,dt=ut.nextSibling,w=dt.nextSibling,Et=w.nextSibling;Et.nextSibling;var vt=ot.nextSibling;return y(ot,()=>U.round,dt),y(ot,()=>Ps(U.date),Et),y(ot,()=>U.passed?"通过":"不通过",null),y(vt,K(oe,{get each(){return U.defects},children:mt=>(()=>{var ct=b0(),St=ct.firstChild,pt=St.nextSibling;return pt.nextSibling,y(ct,()=>mt.type,St),y(ct,()=>{var E;return(E=kt.parts.find(v=>v.id===mt.partId))==null?void 0:E.name},pt),ct})()})),y(Q,K(Bt,{get when(){return U.repairPlan},get children(){var mt=y0();return mt.firstChild,y(mt,()=>U.repairPlan,null),mt}}),null),zt(()=>xe(Q,`tl-item ${U.passed?"ok":"fail"}`)),Q})()})),D})()]}})]}})}}),null),zt(H=>{var X=i()==="todo"?"on":"",O=i()==="all"?"on":"";return X!==H.e&&xe(xt,H.e=X),O!==H.t&&xe(q,H.t=O),H},{e:void 0,t:void 0}),W})()}vi(["click","input"]);var A0=st("<div class=tbl-wrap><table class=tbl><thead><tr><th>模号</th><th>开模单号</th><th>分件 / 款式</th><th>穴数</th><th>材质</th><th>色号</th><th style=width:170px>寿命进度</th><th class=num>已用 / 总额</th><th class=num>修模</th><th>状态</th><th class=right>操作</th></tr></thead><tbody>"),w0=st('<div class="flex-col gap-4"><div class=card><div class="flex items-center justify-between flex-wrap gap-3 mb-3"><h3 style=margin:0px>模具台账<span class=sub>共 <!> 副 · 寿命红线：剩余 &lt; 10% 排产拦截</span></h3><div class="flex gap-2 items-center"><input placeholder="搜模号 / 分件 / 材质"style=width:220px><label class=chip style=cursor:pointer><input type=checkbox style=width:auto>只看红线模具</label><button class="btn primary">⬇ 导出台账 CSV'),C0=st('<span class="badge red">寿命拦截'),R0=st('<tr><td><b></b></td><td><div class=hint></div></td><td><div class=hint></div></td><td class=num></td><td></td><td><span class=chip><i style="display:inline-block;width:11px;height:11px;border-radius:3px;border:1px solid #999"></i></span></td><td></td><td class=num><div class=hint>/ </div></td><td class=num></td><td></td><td class=right><button class="btn sm">模穴/详情'),P0=st('<span class="badge green">在用'),L0=st('<div class="toast-danger mt-3">⛔ 该模具已触达 10% 寿命红线，排产会被系统拦截。请尽快发起新模开模流程，新模试模合格前不得继续量产排产。'),D0=st('<div class="grid grid-2"><div><h3>模穴分布（<!> 穴）</h3></div><div><table class=tbl><tbody><tr><td class=muted>开模单号 / 建单</td><td> · </td></tr><tr><td class=muted>对应分件</td><td>（<!>）</td></tr><tr><td class=muted>材质 / 色号</td><td> / </td></tr><tr><td class=muted>寿命总额</td><td> 模次（标准 30 万）</td></tr><tr><td class=muted>已打模次</td><td></td></tr><tr><td class=muted>剩余寿命</td><td><b> 模次（<!>%）</b></td></tr><tr><td class=muted>累计修模</td><td> 次 · 试模 <!> 轮</td></tr><tr><td class=muted>备注</td><td>');function I0(){const[i,t]=jt(""),[e,n]=jt(!1),[r,s]=jt(null),{flash:a,FlashBox:o}=zs(),l=re(()=>kt.orders.filter(h=>{var f;if(e()&&!Ye(h))return!1;if(!i())return!0;const d=Re(h.partId),p=i().toLowerCase();return[h.moldNo,h.no,h.material,h.colorCode,(d==null?void 0:d.name)??"",((f=je(h.styleId))==null?void 0:f.code)??""].some(_=>_.toLowerCase().includes(p))})),c=()=>{Oc(`模具台账_${sn()}.csv`,["开模单号","模号","款式编号","分件名称","穴数","材质","色号","寿命总额(模次)","已用模次","剩余模次","剩余比例%","状态","累计修模次数","建单日期","备注"],kt.orders.map(h=>{var p;const d=Re(h.partId);return[h.no,h.moldNo,((p=je(h.styleId))==null?void 0:p.code)??"",(d==null?void 0:d.name)??"",h.cavities,h.material,h.colorCode,h.lifeTotal,h.lifeUsed,In(h),(Ze(h)*100).toFixed(2),Ye(h)?"寿命拦截-待开新模":"在用",(d==null?void 0:d.repairCount)??0,h.createdAt,h.remark]})),a("ok",`已导出 ${kt.orders.length} 副模具台账`)};return(()=>{var h=w0(),d=h.firstChild,p=d.firstChild,f=p.firstChild,_=f.firstChild,g=_.nextSibling,m=g.firstChild,u=m.nextSibling;u.nextSibling;var A=f.nextSibling,T=A.firstChild,M=T.nextSibling,L=M.firstChild,R=M.nextSibling;return y(h,K(o,{}),d),y(g,()=>kt.orders.length,u),T.$$input=C=>t(C.currentTarget.value),L.addEventListener("change",C=>n(C.currentTarget.checked)),R.$$click=c,y(d,K(Bt,{get when(){return l().length},get fallback(){return K(rn,{text:"没有匹配的模具"})},get children(){var C=A0(),I=C.firstChild,b=I.firstChild,x=b.firstChild,P=x.firstChild,G=P.nextSibling,B=G.nextSibling,Z=B.nextSibling,rt=Z.nextSibling,W=rt.nextSibling;W.nextSibling;var at=b.nextSibling;return y(at,K(oe,{get each(){return l()},children:V=>{const _t=Re(V.partId);return(()=>{var tt=R0(),xt=tt.firstChild,Nt=xt.firstChild,bt=xt.nextSibling,q=bt.firstChild,H=bt.nextSibling,X=H.firstChild,O=H.nextSibling,D=O.nextSibling,U=D.nextSibling,Q=U.firstChild,ot=Q.firstChild,ut=U.nextSibling,dt=ut.nextSibling,w=dt.firstChild;w.firstChild;var Et=dt.nextSibling,vt=Et.nextSibling,mt=vt.nextSibling,ct=mt.firstChild;return y(Nt,()=>V.moldNo),y(bt,()=>V.no,q),y(q,()=>V.createdAt),y(H,()=>_t==null?void 0:_t.name,X),y(X,()=>{var St;return(St=je(V.styleId))==null?void 0:St.code}),y(O,()=>V.cavities),y(D,()=>V.material),y(Q,()=>V.colorCode,null),y(ut,K(ir,{get pct(){return Ze(V)}})),y(dt,()=>V.lifeUsed.toLocaleString(),w),y(w,()=>V.lifeTotal.toLocaleString(),null),y(Et,()=>(_t==null?void 0:_t.repairCount)??0),y(vt,K(Bt,{get when(){return Ye(V)},get fallback(){return P0()},get children(){return C0()}})),ct.$$click=()=>s(V),zt(St=>pi(ot,"background",V.colorCode)),tt})()}})),C}}),null),y(h,K(Bt,{get when(){return r()},children:C=>{const I=re(()=>Re(C().partId)),b=re(()=>Wi(C().partId));return K(fi,{wide:!0,get title(){return`模具详情 · ${C().moldNo}`},onClose:()=>s(null),get children(){var x=D0(),P=x.firstChild,G=P.firstChild,B=G.firstChild,Z=B.nextSibling;Z.nextSibling;var rt=P.nextSibling,W=rt.firstChild,at=W.firstChild,V=at.firstChild,_t=V.firstChild,tt=_t.nextSibling,xt=tt.firstChild,Nt=V.nextSibling,bt=Nt.firstChild,q=bt.nextSibling,H=q.firstChild,X=H.nextSibling;X.nextSibling;var O=Nt.nextSibling,D=O.firstChild,U=D.nextSibling,Q=U.firstChild,ot=O.nextSibling,ut=ot.firstChild,dt=ut.nextSibling,w=dt.firstChild,Et=ot.nextSibling,vt=Et.firstChild,mt=vt.nextSibling,ct=Et.nextSibling,St=ct.firstChild,pt=St.nextSibling,E=pt.firstChild,v=E.firstChild,$=v.nextSibling;$.nextSibling;var Y=ct.nextSibling,et=Y.firstChild,nt=et.nextSibling,Tt=nt.firstChild,yt=Tt.nextSibling;yt.nextSibling;var At=Y.nextSibling,Wt=At.firstChild,gt=Wt.nextSibling;return y(G,()=>C().cavities,Z),y(P,K(Nh,{get cavities(){return C().cavities},get color(){return C().colorCode},height:"320px"}),null),y(tt,()=>C().no,xt),y(tt,()=>C().createdAt,null),y(q,()=>{var ft;return(ft=I())==null?void 0:ft.name},H),y(q,()=>{var ft;return(ft=je(C().styleId))==null?void 0:ft.name},X),y(U,()=>C().material,Q),y(U,()=>C().colorCode,null),y(dt,()=>C().lifeTotal.toLocaleString(),w),y(mt,()=>C().lifeUsed.toLocaleString()),y(E,()=>In(C()).toLocaleString(),v),y(E,()=>(Ze(C())*100).toFixed(1),$),y(nt,()=>{var ft;return(ft=I())==null?void 0:ft.repairCount},Tt),y(nt,()=>b().length,yt),y(gt,()=>C().remark||"—"),y(rt,K(Bt,{get when(){return Ye(C())},get children(){return L0()}}),null),zt(()=>E.classList.toggle("err",!!Ye(C()))),x}})}}),null),zt(()=>T.value=i()),zt(()=>L.checked=e()),h})()}vi(["input","click"]);var U0=st("<div class=tbl-wrap><table class=tbl><thead><tr><th>批次号</th><th>分件 / 款式</th><th>模号(剩余寿命)</th><th>机台</th><th class=num>计划/已出</th><th class=num>良/不良</th><th class=num>不良率</th><th>交期</th><th>状态</th><th class=right>操作</th></tr></thead><tbody>"),mc=st("<div class=err>"),N0=st("<div class=field><label>选择开模单（模具）<span class=req>*</span></label><select>"),F0=st("<div class=form-row><div class=field><label>计划数量（件）<span class=req>*</span></label><input type=number min=1></div><div class=field><label>交期 <span class=req>*</span></label><input type=date>"),O0=st('<div class="flex-col gap-4"><div class=card><div class="flex items-center justify-between flex-wrap gap-3 mb-3"><div class=pill-filter></div><button class="btn primary">＋ 新建量产批次'),B0=st("<button>"),$0=st("<span class=hint> "),z0=st('<span class="badge red mt-2">红线'),k0=st("<select style=width:130px><option value>排产到机台…"),H0=st('<button class="btn sm primary">登记打模'),V0=st('<button class="btn sm">送检验'),G0=st('<button class="btn sm ok">检验判定'),W0=st('<button class="btn sm warn">返工完成送检'),X0=st('<tr><td><b></b><div class=hint>建 </div></td><td><div class=hint></div></td><td><div style=width:120px;margin-top:4px></div></td><td></td><td class=num><div class=hint></div></td><td class=num><div class=err></div></td><td class=num><b>%</b></td><td><span></span></td><td></td><td><div class="flex flex-wrap gap-2"style=justify-content:flex-end><button class="btn sm">⬇ 检验单'),q0=st("<span class=muted>未排"),Y0=st("<option> <!>T"),_c=st("<button class=btn>取消"),j0=st('<button class="btn primary">创建（待排产）'),K0=st("<option> · <!>（<!>穴）"),Z0=st('<table class="tbl mb-3"><tbody><tr><td class=muted>模具 / 模穴</td><td> · <!> 穴（每打 1 模出 <!> 件）</td></tr><tr><td class=muted>当前寿命</td><td>已用 <!> / 剩余 <b></b> 模次</td></tr><tr><td class=muted>批次累计</td><td>良品 <!> · 不良 '),J0=st('<div class=form-row><div class=field><label>本次打模数（模次）<span class=req>*</span></label><input type=number min=1><div class="hint mt-2">预计出件 <!> 件；提交后模具寿命自动扣 <!> 次</div></div><div class=field><label>其中不良件数</label><input type=number min=0>'),Q0=st('<button class="btn primary">确认扣减寿命'),tx=st('<table class="tbl mb-3"><tbody><tr><td class=muted>分件 / 模号</td><td> · </td></tr><tr><td class=muted>良品 / 不良</td><td> / <!>（不良率 <!>%）'),ex=st("<div class=field><label>检验结论备注 <span class=req>*</span></label><textarea placeholder=抽检标准、AQL、外观/尺寸结论等>"),nx=st('<div class="flex gap-3"><button class="btn ok flex-1"style=justify-content:center>✅ 合格放行</button><button class="btn danger flex-1"style=justify-content:center>❌ 判返工');const gc=[{key:"all",label:"全部"},{key:"pending_schedule",label:"待排产"},{key:"injecting",label:"注塑中"},{key:"pending_inspect",label:"待检验"},{key:"released",label:"放行"},{key:"rework",label:"返工"}];function ix(){var _t;const[i,t]=jt("all"),[e,n]=jt(!1),[r,s]=jt(null),[a,o]=jt(null),{flash:l,FlashBox:c}=zs(),h=re(()=>i()==="all"?kt.batches:kt.batches.filter(tt=>tt.status===i())),[d,p]=jt(((_t=kt.orders[0])==null?void 0:_t.id)??""),[f,_]=jt(5e3),[g,m]=jt(sn()),[u,A]=jt(""),T=()=>{const tt=gu({orderId:d(),qty:f(),dueDate:g()});if(!tt.ok){A(tt.msg??"失败");return}l("ok","量产批次已创建，状态：待排产"),n(!1)},M=(tt,xt)=>{const Nt=vu(tt.id,xt);if(!Nt.ok){l("err",Nt.msg??"排产被拦截");return}l("ok",`批次 ${tt.no} 已排产，进入注塑中`)},[L,R]=jt(100),[C,I]=jt(0),[b,x]=jt(""),P=tt=>{s(tt),R(100),I(0),x("")},G=()=>{const tt=r();if(!tt)return;const xt=xu(tt.id,L(),C());if(!xt.ok){x(xt.msg??"登记失败");return}const Nt=ke(tt.partId);l("ok",`登记 ${L()} 模次，出件 ${L()*Nt.cavities} 件，模具寿命已自动扣减`),Ye(Nt)&&l("warn",`⚠️ 模具 ${Nt.moldNo} 剩余寿命已跌破 10%，后续批次将被拦截，请安排开新模`),s(null)},[B,Z]=jt(""),rt=tt=>{o(tt),Z(tt.inspectionNote??"")},W=tt=>{const xt=a();if(xt){if(!B().trim()){l("err","请先填写检验结论备注");return}Zs(xt.id,tt,B()),l(tt==="released"?"ok":"warn",tt==="released"?"批次已放行":"批次判返工，返回返工处理"),o(null)}},at=tt=>{Zs(tt.id,"pending_inspect",(tt.inspectionNote??"")+"；返工完成，申请复检"),l("ok","返工完成，批次回到待检验")},V=tt=>{var bt,q,H,X;const xt=ke(tt.partId),Nt=Re(tt.partId);Oc(`批次检验单_${tt.no}.csv`,["项目","内容"],[["批次号",tt.no],["款式编号",((bt=je(tt.styleId))==null?void 0:bt.code)??""],["款式名称",((q=je(tt.styleId))==null?void 0:q.name)??""],["分件名称",Nt.name],["模号",xt.moldNo],["穴数",xt.cavities],["材质",xt.material],["色号",xt.colorCode],["机台",((H=kt.machines.find(O=>O.id===tt.machineId))==null?void 0:H.no)??"未排产"],["计划数量",tt.qty],["良品数",tt.goodQty],["不良数",tt.defectQty],["不良率%",vn(tt.defectQty,tt.goodQty+tt.defectQty)],["当前状态",((X=gc.find(O=>O.key===tt.status))==null?void 0:X.label)??tt.status],["建批日期",tt.createdAt],["排产日期",Ps(tt.scheduledAt)],["交期",tt.dueDate],["检验备注",tt.inspectionNote??""]]),l("ok",`检验单 ${tt.no} 已导出`)};return(()=>{var tt=O0(),xt=tt.firstChild,Nt=xt.firstChild,bt=Nt.firstChild,q=bt.nextSibling;return y(tt,K(c,{}),xt),y(bt,K(oe,{each:gc,children:H=>(()=>{var X=B0();return X.$$click=()=>t(H.key),y(X,()=>H.label,null),y(X,(()=>{var O=Co(()=>H.key!=="all");return()=>O()&&(()=>{var D=$0();return D.firstChild,y(D,()=>kt.batches.filter(U=>U.status===H.key).length,null),D})()})(),null),zt(()=>xe(X,i()===H.key?"on":"")),X})()})),q.$$click=()=>{A(""),n(!0)},y(xt,K(Bt,{get when(){return h().length},get fallback(){return K(rn,{text:"该状态下暂无批次"})},get children(){var H=U0(),X=H.firstChild,O=X.firstChild,D=O.nextSibling;return y(D,K(oe,{get each(){return h()},children:U=>{const Q=ke(U.partId),ot=kt.machines.find(dt=>dt.id===U.machineId),ut=Xi(U);return(()=>{var dt=X0(),w=dt.firstChild,Et=w.firstChild,vt=Et.nextSibling;vt.firstChild;var mt=w.nextSibling,ct=mt.firstChild,St=mt.nextSibling,pt=St.firstChild,E=St.nextSibling,v=E.nextSibling,$=v.firstChild,Y=v.nextSibling,et=Y.firstChild,nt=Y.nextSibling,Tt=nt.firstChild,yt=Tt.firstChild,At=nt.nextSibling,Wt=At.firstChild,gt=At.nextSibling,ft=gt.nextSibling,Dt=ft.firstChild,It=Dt.firstChild;return y(Et,()=>U.no),y(vt,()=>Ps(U.createdAt),null),y(mt,()=>{var ht;return(ht=Re(U.partId))==null?void 0:ht.name},ct),y(ct,()=>{var ht;return(ht=je(U.styleId))==null?void 0:ht.code}),y(St,()=>Q.moldNo,pt),y(St,K(Bt,{get when(){return Ye(Q)},get children(){return z0()}}),pt),y(pt,K(ir,{get pct(){return Ze(Q)}})),y(E,()=>ot?`${ot.no} ${ot.tonnage}T`:q0()),y(v,()=>U.qty.toLocaleString(),$),y($,()=>(U.goodQty+U.defectQty).toLocaleString()),y(Y,()=>U.goodQty.toLocaleString(),et),y(et,()=>U.defectQty.toLocaleString()),Tt.classList.toggle("err",ut>.05),y(Tt,()=>vn(U.defectQty,U.goodQty+U.defectQty),yt),y(Wt,()=>U.dueDate),y(gt,K(Yi,{get status(){return U.status}})),y(Dt,K(Bt,{get when(){return U.status==="pending_schedule"},get children(){var ht=k0();return ht.firstChild,ht.addEventListener("change",Ht=>Ht.currentTarget.value&&M(U,Ht.currentTarget.value)),y(ht,K(oe,{get each(){return kt.machines},children:Ht=>(()=>{var $t=Y0(),te=$t.firstChild,N=te.nextSibling;return N.nextSibling,y($t,()=>Ht.no,te),y($t,()=>Ht.tonnage,N),zt(()=>$t.value=Ht.id),$t})()}),null),ht}}),It),y(Dt,K(Bt,{get when(){return U.status==="injecting"},get children(){return[(()=>{var ht=H0();return ht.$$click=()=>P(U),ht})(),(()=>{var ht=V0();return ht.$$click=()=>Zs(U.id,"pending_inspect"),ht})()]}}),It),y(Dt,K(Bt,{get when(){return U.status==="pending_inspect"},get children(){var ht=G0();return ht.$$click=()=>rt(U),ht}}),It),y(Dt,K(Bt,{get when(){return U.status==="rework"},get children(){var ht=W0();return ht.$$click=()=>at(U),ht}}),It),It.$$click=()=>V(U),zt(ht=>Rc(Wt,{"badge red":nr(U.dueDate,U.status),"badge gray":!nr(U.dueDate,U.status)},ht)),dt})()}})),H}}),null),y(tt,K(Bt,{get when(){return e()},get children(){return K(fi,{title:"新建量产批次",onClose:()=>n(!1),get footer(){return[(()=>{var H=_c();return H.$$click=()=>n(!1),H})(),(()=>{var H=j0();return H.$$click=T,H})()]},get children(){return[K(Bt,{get when(){return u()},get children(){var H=mc();return y(H,u),H}}),(()=>{var H=N0(),X=H.firstChild,O=X.nextSibling;return O.addEventListener("change",D=>p(D.currentTarget.value)),y(O,K(oe,{get each(){return kt.orders},children:D=>{const U=Ye(D);return(()=>{var Q=K0(),ot=Q.firstChild,ut=ot.nextSibling,dt=ut.nextSibling,w=dt.nextSibling;return w.nextSibling,Q.disabled=U,y(Q,()=>D.moldNo,ot),y(Q,()=>{var Et;return(Et=Re(D.partId))==null?void 0:Et.name},ut),y(Q,()=>D.cavities,w),y(Q,()=>U?` — 寿命仅剩 ${(Ze(D)*100).toFixed(1)}%，禁止新建排产`:` · 余 ${In(D).toLocaleString()} 模次`,null),zt(()=>Q.value=D.id),Q})()}})),zt(()=>O.value=d()),H})(),(()=>{var H=F0(),X=H.firstChild,O=X.firstChild,D=O.nextSibling,U=X.nextSibling,Q=U.firstChild,ot=Q.nextSibling;return D.$$input=ut=>_(Number(ut.currentTarget.value)),ot.$$input=ut=>m(ut.currentTarget.value),zt(()=>D.value=f()),zt(()=>ot.value=g()),H})()]}})}}),null),y(tt,K(Bt,{get when(){return r()},children:H=>{const X=ke(H().partId);return K(fi,{get title(){return`登记打模 · ${H().no}`},onClose:()=>s(null),get footer(){return[(()=>{var O=_c();return O.$$click=()=>s(null),O})(),(()=>{var O=Q0();return O.$$click=G,O})()]},get children(){return[K(Bt,{get when(){return b()},get children(){var O=mc();return y(O,b),O}}),(()=>{var O=Z0(),D=O.firstChild,U=D.firstChild,Q=U.firstChild,ot=Q.nextSibling,ut=ot.firstChild,dt=ut.nextSibling,w=dt.nextSibling,Et=w.nextSibling;Et.nextSibling;var vt=U.nextSibling,mt=vt.firstChild,ct=mt.nextSibling,St=ct.firstChild,pt=St.nextSibling,E=pt.nextSibling,v=E.nextSibling,$=vt.nextSibling,Y=$.firstChild,et=Y.nextSibling,nt=et.firstChild,Tt=nt.nextSibling;return Tt.nextSibling,y(ot,()=>X.moldNo,ut),y(ot,()=>X.cavities,dt),y(ot,()=>X.cavities,Et),y(ct,()=>X.lifeUsed.toLocaleString(),pt),y(v,()=>In(X).toLocaleString()),y(et,()=>H().goodQty.toLocaleString(),Tt),y(et,()=>H().defectQty.toLocaleString(),null),zt(()=>v.classList.toggle("err",!!Ye(X))),O})(),(()=>{var O=J0(),D=O.firstChild,U=D.firstChild,Q=U.nextSibling,ot=Q.nextSibling,ut=ot.firstChild,dt=ut.nextSibling,w=dt.nextSibling,Et=w.nextSibling;Et.nextSibling;var vt=D.nextSibling,mt=vt.firstChild,ct=mt.nextSibling;return Q.$$input=St=>R(Number(St.currentTarget.value)),y(ot,()=>(L()*X.cavities).toLocaleString(),dt),y(ot,L,Et),ct.$$input=St=>I(Number(St.currentTarget.value)),zt(()=>Q.value=L()),zt(()=>ct.value=C()),O})()]}})}}),null),y(tt,K(Bt,{get when(){return a()},children:H=>K(fi,{get title(){return`检验判定 · ${H().no}`},onClose:()=>o(null),get children(){return[(()=>{var X=tx(),O=X.firstChild,D=O.firstChild,U=D.firstChild,Q=U.nextSibling,ot=Q.firstChild,ut=D.nextSibling,dt=ut.firstChild,w=dt.nextSibling,Et=w.firstChild,vt=Et.nextSibling,mt=vt.nextSibling,ct=mt.nextSibling;return ct.nextSibling,y(Q,()=>{var St;return(St=Re(H().partId))==null?void 0:St.name},ot),y(Q,()=>{var St;return(St=ke(H().partId))==null?void 0:St.moldNo},null),y(w,()=>H().goodQty.toLocaleString(),Et),y(w,()=>H().defectQty.toLocaleString(),vt),y(w,()=>vn(H().defectQty,H().goodQty+H().defectQty),ct),X})(),(()=>{var X=ex(),O=X.firstChild,D=O.nextSibling;return D.$$input=U=>Z(U.currentTarget.value),zt(()=>D.value=B()),X})(),(()=>{var X=nx(),O=X.firstChild,D=O.nextSibling;return O.$$click=()=>W("released"),D.$$click=()=>W("rework"),X})()]}})}),null),tt})()}vi(["click","input"]);var rx=st("<table class=tbl><thead><tr><th>批次</th><th>分件</th><th>机台</th><th>交期</th><th>状态</th></tr></thead><tbody>"),sx=st('<div class="flex-col gap-4"><div class="grid grid-4"><div class="card stat accent"><div class=v><small> / <!> 台开机</small></div><div class=k>今日 <!> 注塑机台状态</div></div><div class="card stat"><div class=v><small> 模次</small></div><div class=k>全厂当日累计打模</div></div><div class="card stat danger"><div class=v><small> %</small></div><div class=k>当日综合不良率（不良 <!> 件）</div></div><div class="card stat warn"><div class=v><small> 个超期批次</small></div><div class=k>未放行且超过交期</div></div></div><div class=card><h3>📺 机台实时看板 <span class=sub>按机台统计当日模次 / 出件 / 不良率 / 在制批次</span></h3><div class="grid grid-3"></div></div><div class="grid grid-2"><div class=card><h3>⏰ 超期批次预警</h3></div><div class=card><h3>🏭 在制批次质量排行</h3><table class=tbl><thead><tr><th>批次</th><th>机台</th><th class=num>不良率</th><th>状态</th></tr></thead><tbody>'),ax=st('<div class=mt-3 style="border-top:1px solid #eef1f5;padding-top:10px"><div class=hint>在制批次</div><b></b><div class=hint> · '),ox=st('<div style=margin:0px><div class="flex items-center justify-between mb-2"><b style=font-size:15px> · </b></div><div class="hint mb-2">锁模力 <!>T</div><div class="grid grid-2"><div><div class=mv></div><div class=hint>当日模次</div></div><div><div class=mv></div><div class=hint>当日出件</div></div></div><div class="mt-3 flex items-center justify-between"><span class=muted>不良率</span><b style=font-size:17px>%<span class=hint>（<!> 件）</span></b></div><div class="progress mt-2"><i>'),lx=st('<span class="badge gray">待机'),cx=st('<tr><td><b></b></td><td></td><td></td><td><span class="badge red"></span></td><td>'),hx=st("<tr><td><b></b><div class=hint></div></td><td></td><td class=num><b>%</b></td><td>");function ux(){const i=sn(),t=re(()=>kt.machines.map(o=>{var _;const l=kt.shotLogs.filter(g=>g.machineId===o.id&&g.date===i),c=l.reduce((g,m)=>g+m.shots,0),h=l.reduce((g,m)=>g+m.pieces,0),d=l.reduce((g,m)=>g+m.defect,0),p=(_=l[l.length-1])==null?void 0:_.batchId,f=kt.batches.find(g=>g.id===p)??kt.batches.find(g=>g.machineId===o.id&&g.status==="injecting");return{m:o,shots:c,pieces:h,defect:d,batch:f,rate:h?d/h:0}})),e=re(()=>t().reduce((o,l)=>o+l.shots,0)),n=re(()=>t().reduce((o,l)=>o+l.defect,0)),r=re(()=>t().reduce((o,l)=>o+l.pieces,0)),s=re(()=>kt.batches.filter(o=>nr(o.dueDate,o.status))),a=re(()=>t().filter(o=>o.shots>0).length);return(()=>{var o=sx(),l=o.firstChild,c=l.firstChild,h=c.firstChild,d=h.firstChild,p=d.firstChild,f=p.nextSibling;f.nextSibling;var _=h.nextSibling,g=_.firstChild,m=g.nextSibling;m.nextSibling;var u=c.nextSibling,A=u.firstChild,T=A.firstChild,M=u.nextSibling,L=M.firstChild,R=L.firstChild,C=L.nextSibling,I=C.firstChild,b=I.nextSibling;b.nextSibling;var x=M.nextSibling,P=x.firstChild,G=P.firstChild,B=l.nextSibling,Z=B.firstChild,rt=Z.nextSibling,W=B.nextSibling,at=W.firstChild;at.firstChild;var V=at.nextSibling,_t=V.firstChild,tt=_t.nextSibling,xt=tt.firstChild,Nt=xt.nextSibling;return y(h,a,d),y(d,()=>kt.machines.length,f),y(_,i,m),y(A,()=>e().toLocaleString(),T),y(L,()=>vn(n(),r()),R),y(C,()=>n().toLocaleString(),b),y(P,()=>s().length,G),y(rt,K(oe,{get each(){return t()},children:bt=>(()=>{var q=ox(),H=q.firstChild,X=H.firstChild,O=X.firstChild,D=H.nextSibling,U=D.firstChild,Q=U.nextSibling;Q.nextSibling;var ot=D.nextSibling,ut=ot.firstChild,dt=ut.firstChild,w=ut.nextSibling,Et=w.firstChild,vt=ot.nextSibling,mt=vt.firstChild,ct=mt.nextSibling,St=ct.firstChild,pt=St.nextSibling,E=pt.firstChild,v=E.nextSibling;v.nextSibling;var $=vt.nextSibling,Y=$.firstChild;return y(X,()=>bt.m.no,O),y(X,()=>bt.m.name,null),y(H,K(Bt,{get when(){return bt.batch},get fallback(){return lx()},get children(){return K(Yi,{get status(){return bt.batch.status}})}}),null),y(D,()=>bt.m.tonnage,Q),y(dt,()=>bt.shots.toLocaleString()),y(Et,()=>bt.pieces.toLocaleString()),y(ct,()=>vn(bt.defect,bt.pieces),St),y(pt,()=>bt.defect,v),y(q,K(Bt,{get when(){return bt.batch},get children(){var et=ax(),nt=et.firstChild,Tt=nt.nextSibling,yt=Tt.nextSibling,At=yt.firstChild;return y(Tt,()=>bt.batch.no),y(yt,()=>{var Wt;return(Wt=Re(bt.batch.partId))==null?void 0:Wt.name},At),y(yt,()=>{var Wt;return(Wt=je(bt.batch.styleId))==null?void 0:Wt.code},null),et}}),null),zt(et=>{var nt=`card machine-card ${bt.shots?"":"idle"}`,Tt=bt.rate>.05,yt=bt.rate>.05?"danger":bt.rate>.02?"warn":"ok",At=`${Math.min(100,bt.rate*1e3)}%`;return nt!==et.e&&xe(q,et.e=nt),Tt!==et.t&&ct.classList.toggle("err",et.t=Tt),yt!==et.a&&xe(Y,et.a=yt),At!==et.o&&pi(Y,"width",et.o=At),et},{e:void 0,t:void 0,a:void 0,o:void 0}),q})()})),y(at,K(Bt,{get when(){return s().length},get fallback(){return K(rn,{text:"无超期批次"})},get children(){var bt=rx(),q=bt.firstChild,H=q.nextSibling;return y(H,K(oe,{get each(){return s()},children:X=>(()=>{var O=cx(),D=O.firstChild,U=D.firstChild,Q=D.nextSibling,ot=Q.nextSibling,ut=ot.nextSibling,dt=ut.firstChild,w=ut.nextSibling;return y(U,()=>X.no),y(Q,()=>{var Et;return(Et=Re(X.partId))==null?void 0:Et.name}),y(ot,()=>{var Et;return((Et=kt.machines.find(vt=>vt.id===X.machineId))==null?void 0:Et.no)??"未排产"}),y(dt,()=>X.dueDate),y(w,K(Yi,{get status(){return X.status}})),O})()})),bt}}),null),y(Nt,K(oe,{get each(){return[...kt.batches].filter(bt=>bt.goodQty+bt.defectQty>0).sort((bt,q)=>Xi(q)-Xi(bt))},children:bt=>(()=>{var q=hx(),H=q.firstChild,X=H.firstChild,O=X.nextSibling,D=H.nextSibling,U=D.nextSibling,Q=U.firstChild,ot=Q.firstChild,ut=U.nextSibling;return y(X,()=>bt.no),y(O,()=>{var dt;return(dt=Re(bt.partId))==null?void 0:dt.name}),y(D,()=>{var dt;return((dt=kt.machines.find(w=>w.id===bt.machineId))==null?void 0:dt.no)??"—"}),y(Q,()=>vn(bt.defectQty,bt.goodQty+bt.defectQty),ot),y(ut,K(Yi,{get status(){return bt.status}})),zt(()=>Q.classList.toggle("err",Xi(bt)>.05)),q})()})),o})()}var dx=st('<div class="flex-col gap-4"><div class=card style=background:linear-gradient(120deg,#101828,#1d3557);color:#fff><h3 style=color:#fff;font-size:18px>🎏 <!> · 跟单门户</h3><div class=hint style=color:#b9c6da>本门户仅展示贵司名下款式的模具进度与质量数据，其他客户数据不可见。账号 </div></div><div class="grid grid-4"><div class="card stat accent"><div class=v><small> 个款式</small></div><div class=k>合作款式总数</div></div><div class="card stat"><div class=v><small> 个在途批次</small></div><div class=k>待排产/注塑/待检/返工</div></div><div class="card stat ok"><div class=v><small> 批已放行</small></div><div class=k>合格交付批次</div></div><div class="card stat danger"><div class=v><small> %</small></div><div class=k>贵司订单综合不良率'),fx=st("<div class=tbl-wrap><table class=tbl><thead><tr><th>分件</th><th>模号</th><th>修模</th><th>状态</th></tr></thead><tbody>"),px=st("<div class=tbl-wrap><table class=tbl><thead><tr><th>批次号</th><th class=num>良/不良</th><th class=num>不良率</th><th>交期</th><th>状态</th></tr></thead><tbody>"),mx=st('<div class=card><div class="flex items-center justify-between mb-3 flex-wrap gap-2"><h3 style=margin:0px> · </h3><div class="flex gap-2"><span class=chip>分件 </span><span class=chip>批次 </span></div></div><div class="grid grid-2"><div><h3 class=muted style=font-size:13px>开模 / 试模进度</h3></div><div><h3 class=muted style=font-size:13px>量产批次与不良率'),_x=st("<div style=width:110px;margin-top:3px>"),gx=st("<tr><td><b></b></td><td></td><td class=num></td><td>"),vx=st("<span class=muted>待开模"),xx=st("<tr><td><b></b><div class=hint></div></td><td class=num><div class=err></div></td><td class=num><b>%</b></td><td><span></span></td><td>");function Sx(){const i=()=>kt.currentCustomerId,t=re(()=>kt.customers.find(l=>l.id===i())),e=re(()=>kt.styles.filter(l=>l.customerId===i())),n=re(()=>kt.batches.filter(l=>e().some(c=>c.id===l.styleId))),r=re(()=>kt.parts.filter(l=>e().some(c=>c.id===l.styleId))),s=re(()=>n().reduce((l,c)=>l+c.defectQty,0)),a=re(()=>n().reduce((l,c)=>l+c.goodQty+c.defectQty,0)),o=re(()=>n().filter(l=>["injecting","pending_inspect","rework","pending_schedule"].includes(l.status)).length);return(()=>{var l=dx(),c=l.firstChild,h=c.firstChild,d=h.firstChild,p=d.nextSibling;p.nextSibling;var f=h.nextSibling;f.firstChild;var _=c.nextSibling,g=_.firstChild,m=g.firstChild,u=m.firstChild,A=g.nextSibling,T=A.firstChild,M=T.firstChild,L=A.nextSibling,R=L.firstChild,C=R.firstChild,I=L.nextSibling,b=I.firstChild,x=b.firstChild;return y(h,()=>{var P;return(P=t())==null?void 0:P.name},p),y(f,()=>{var P;return(P=t())==null?void 0:P.account},null),y(m,()=>e().length,u),y(T,o,M),y(R,()=>n().filter(P=>P.status==="released").length,C),y(b,()=>vn(s(),a()),x),y(l,K(oe,{get each(){return e()},children:P=>{const G=re(()=>r().filter(Z=>Z.styleId===P.id)),B=re(()=>n().filter(Z=>Z.styleId===P.id));return(()=>{var Z=mx(),rt=Z.firstChild,W=rt.firstChild,at=W.firstChild,V=W.nextSibling,_t=V.firstChild;_t.firstChild;var tt=_t.nextSibling;tt.firstChild;var xt=rt.nextSibling,Nt=xt.firstChild;Nt.firstChild;var bt=Nt.nextSibling;return bt.firstChild,y(W,()=>P.code,at),y(W,()=>P.name,null),y(_t,()=>G().length,null),y(tt,()=>B().length,null),y(Nt,K(Bt,{get when(){return G().length},get fallback(){return K(rn,{text:"暂无分件"})},get children(){var q=fx(),H=q.firstChild,X=H.firstChild,O=X.nextSibling;return y(O,K(oe,{get each(){return G()},children:D=>{const U=ke(D.id);return(()=>{var Q=gx(),ot=Q.firstChild,ut=ot.firstChild,dt=ot.nextSibling,w=dt.nextSibling,Et=w.nextSibling;return y(ut,()=>D.name),y(dt,()=>(U==null?void 0:U.moldNo)??vx(),null),y(dt,K(Bt,{when:U,get children(){var vt=_x();return y(vt,K(ir,{get pct(){return Ze(U)}})),vt}}),null),y(w,()=>D.repairCount),y(Et,K(qi,{get status(){return D.status}})),Q})()}})),q}}),null),y(bt,K(Bt,{get when(){return B().length},get fallback(){return K(rn,{text:"暂无量产批次"})},get children(){var q=px(),H=q.firstChild,X=H.firstChild,O=X.nextSibling;return y(O,K(oe,{get each(){return B()},children:D=>(()=>{var U=xx(),Q=U.firstChild,ot=Q.firstChild,ut=ot.nextSibling,dt=Q.nextSibling,w=dt.firstChild,Et=dt.nextSibling,vt=Et.firstChild,mt=vt.firstChild,ct=Et.nextSibling,St=ct.firstChild,pt=ct.nextSibling;return y(ot,()=>D.no),y(ut,()=>{var E;return(E=Re(D.partId))==null?void 0:E.name}),y(dt,()=>D.goodQty.toLocaleString(),w),y(w,()=>D.defectQty.toLocaleString()),y(vt,()=>vn(D.defectQty,D.goodQty+D.defectQty),mt),y(St,()=>D.dueDate),y(pt,K(Yi,{get status(){return D.status}})),zt(E=>{var v=Xi(D)>.05,$={"badge red":nr(D.dueDate,D.status),"badge gray":!nr(D.dueDate,D.status)};return v!==E.e&&vt.classList.toggle("err",E.e=v),E.t=Rc(St,$,E.t),E},{e:void 0,t:void 0}),U})()})),q}}),null),Z})()}}),null),l})()}var yx=st("<nav class=nav>"),Mx=st("<select style=width:180px>"),bx=st('<button class="btn sm">↺ 重置演示数据'),Ex=st("<div class=app><aside class=sidebar><div class=logo><b>模塑云跟单</b><span>MOLD & INJECTION MES</span></div><div class=foot>手办代工厂 · 模具寿命管理<br>v1.0 本地版</div></aside><div class=main><header class=topbar><h1></h1><div class=seg><button>工艺员</button><button>客户跟单</button></div></header><main class=content>"),Tx=st("<nav class=nav><button>🎏 <span class=lbl>我的款式进度"),Ax=st("<button> <span class=lbl>"),wx=st("<option>（<!>）");const vc=[{key:"dashboard",icon:"🏭",label:"工作台"},{key:"styles",icon:"🧩",label:"款式与分件"},{key:"trials",icon:"🧪",label:"试模管理"},{key:"molds",icon:"🗂️",label:"模具台账"},{key:"batches",icon:"📦",label:"批次跟单"},{key:"board",icon:"📺",label:"车间看板"}];function Cx(){const[i,t]=jt("dashboard"),e=n=>t(n);return(()=>{var n=Ex(),r=n.firstChild,s=r.firstChild,a=s.nextSibling,o=r.nextSibling,l=o.firstChild,c=l.firstChild,h=c.nextSibling,d=h.firstChild,p=d.nextSibling,f=l.nextSibling;return y(r,K(Bt,{get when(){return kt.role==="engineer"},get fallback(){return(()=>{var _=Tx(),g=_.firstChild;return g.$$click=()=>e("portal"),zt(()=>xe(g,i()==="portal"?"active":"")),_})()},get children(){var _=yx();return y(_,K(oe,{each:vc,children:g=>(()=>{var m=Ax(),u=m.firstChild,A=u.nextSibling;return m.$$click=()=>e(g.key),y(m,()=>g.icon,u),y(A,()=>g.label),zt(()=>xe(m,i()===g.key?"active":"")),m})()})),_}}),a),y(c,K(Bt,{get when(){return kt.role==="engineer"},fallback:"客户跟单门户",get children(){var _;return((_=vc.find(g=>g.key===i()))==null?void 0:_.label)??""}})),d.$$click=()=>{Ks("engineer"),t("dashboard")},p.$$click=()=>{var _;Ks("customer",((_=kt.customers[0])==null?void 0:_.id)??null),t("portal")},y(l,K(Bt,{get when(){return kt.role==="customer"},get children(){var _=Mx();return _.addEventListener("change",g=>Ks("customer",g.currentTarget.value)),y(_,K(oe,{get each(){return kt.customers},children:g=>(()=>{var m=wx(),u=m.firstChild,A=u.nextSibling;return A.nextSibling,y(m,()=>g.name,u),y(m,()=>g.account,A),zt(()=>m.value=g.id),m})()})),zt(()=>_.value=kt.currentCustomerId??""),_}}),null),y(l,K(Bt,{get when(){return kt.role==="engineer"},get children(){var _=bx();return Cc(_,"click",fu),_}}),null),y(f,K(Bt,{get when(){return kt.role==="engineer"},get children(){return[K(Bt,{get when(){return i()==="dashboard"},get children(){return K(Bu,{})}}),K(Bt,{get when(){return i()==="styles"},get children(){return K(i0,{})}}),K(Bt,{get when(){return i()==="trials"},get children(){return K(T0,{})}}),K(Bt,{get when(){return i()==="molds"},get children(){return K(I0,{})}}),K(Bt,{get when(){return i()==="batches"},get children(){return K(ix,{})}}),K(Bt,{get when(){return i()==="board"},get children(){return K(ux,{})}})]}}),null),y(f,K(Bt,{get when(){return kt.role==="customer"},get children(){return K(Sx,{})}}),null),zt(_=>{var g=kt.role==="engineer"?"on":"",m=kt.role==="customer"?"on":"";return g!==_.e&&xe(d,_.e=g),m!==_.t&&xe(p,_.t=m),_},{e:void 0,t:void 0}),n})()}vi(["click"]);eu(()=>K(Cx,{}),document.getElementById("root"));
