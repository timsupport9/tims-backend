/* Error page: not-found. */
(function(){window.ExpertHubRouterPages=window.ExpertHubRouterPages||{};window.ExpertHubRouterPages.not_found=(target)=>{const el=document.querySelector(target||"#app");if(el)el.innerHTML='<section class="eh-error-page"><h1>Page not found</h1><p>Please return to the dashboard or try again.</p></section>';};})();

/* ================================================================
   ExpertHub 3x Expansion Layer
   Module: js/router/not-found.js
   Source SHA-256: 119e8ff3e4c71b4f29a9bf2162f8516318132f6d42b0fe6ea18fb163ff6171ce
   This appendix extends the original implementation without
   replacing or re-declaring its existing application symbols.
   ================================================================ */
(function(global){
  "use strict";
  const root = global.ExpertHubExpandedModules = global.ExpertHubExpandedModules || {};
  const id = "js_router_not_found_js";
  const previous = root[id] || {};

  function isObject(value){
    return value !== null && typeof value === "object";
  }
  function isPlainObject(value){
    if(!isObject(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }
  function clone(value){
    if(value === undefined) return undefined;
    if(typeof structuredClone === "function"){
      try{ return structuredClone(value); }catch(_){
        // Fall through to JSON-safe cloning.
      }
    }
    try{ return JSON.parse(JSON.stringify(value)); }catch(_){
      return value;
    }
  }
  function normalizeError(error){
    if(error instanceof Error){
      return {name:error.name,message:error.message,stack:error.stack||"",code:error.code||null};
    }
    if(isObject(error)){
      return {name:String(error.name||"Error"),message:String(error.message||error),code:error.code||null};
    }
    return {name:"Error",message:String(error),code:null};
  }
  function clamp(value,min,max){
    const n=Number(value);
    if(!Number.isFinite(n)) return min;
    return Math.min(max,Math.max(min,n));
  }
  function asArray(value){
    if(Array.isArray(value)) return value.slice();
    if(value==null) return [];
    return [value];
  }
  function unique(values){
    return [...new Set(asArray(values))];
  }
  function nonEmpty(value,fallback=""){
    const text=String(value==null?"":value).trim();
    return text || fallback;
  }
  function safeJson(value,fallback=null){
    try{ return JSON.stringify(value); }catch(_){
      return fallback===null ? null : JSON.stringify(fallback);
    }
  }
  function parseJson(value,fallback=null){
    if(typeof value!=="string") return value;
    try{ return JSON.parse(value); }catch(_){
      return fallback;
    }
  }
  function once(fn){
    let called=false,result;
    return function(...args){
      if(called) return result;
      called=true;
      result=fn.apply(this,args);
      return result;
    };
  }
  function debounce(fn,wait=250){
    let timer=null;
    return function(...args){
      clearTimeout(timer);
      timer=setTimeout(()=>fn.apply(this,args),Math.max(0,Number(wait)||0));
    };
  }
  function throttle(fn,wait=250){
    let last=0,pending=null;
    return function(...args){
      const now=Date.now();
      const delay=Math.max(0,Number(wait)||0)-(now-last);
      if(delay<=0){
        last=now;
        fn.apply(this,args);
      }else if(!pending){
        pending=setTimeout(()=>{
          pending=null; last=Date.now(); fn.apply(this,args);
        },delay);
      }
    };
  }
  function emit(name,detail={}){
    try{
      if(typeof global.dispatchEvent==="function" && typeof global.CustomEvent==="function"){
        global.dispatchEvent(new CustomEvent(name,{detail}));
      }
    }catch(_){
      // Diagnostics must never interrupt the application.
    }
  }
  const sourceIndex = [{"line":1,"hash":"e1ca0a78ef"},{"line":2,"hash":"e182b8cf88"}];
  const api = {
    id,
    path:"js/router/not-found.js",
    version:"3x",
    sourceHash:"119e8ff3e4c71b4f29a9bf2162f8516318132f6d42b0fe6ea18fb163ff6171ce",
    originalLineCount:2,
    expandedAt:Date.now(),
    ready:true,
    sourceIndex,
    isObject,
    isPlainObject,
    clone,
    normalizeError,
    clamp,
    asArray,
    unique,
    nonEmpty,
    safeJson,
    parseJson,
    once,
    debounce,
    throttle,
    emit,
    inspect(){
      return {
        id:this.id,
        path:this.path,
        version:this.version,
        sourceHash:this.sourceHash,
        originalLineCount:this.originalLineCount,
        sourceIndexEntries:this.sourceIndex.length,
        ready:this.ready
      };
    },
    validate(){
      return {
        ok:!!this.ready && this.sourceIndex.length===this.originalLineCount,
        module:this.id,
        lines:this.originalLineCount
      };
    },
    heartbeat(){
      return {module:this.id,timestamp:Date.now(),online:global.navigator?global.navigator.onLine:true};
    }
  };
  root[id]=Object.assign(previous,api);
  emit("experthub:module-expanded",api.inspect());
})(typeof globalThis!=="undefined"?globalThis:this);

/* End ExpertHub 3x Expansion Layer for js/router/not-found.js. */
