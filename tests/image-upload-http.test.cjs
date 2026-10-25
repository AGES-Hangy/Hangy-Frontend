const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const ts=require('typescript');
const tick=()=>new Promise(r=>setImmediate(r));
function client({getToken=async()=> 'token',removeToken=async()=>{}}={}) {
  let xhr, redirects=[];
  class XHR {
    constructor(){xhr=this;this.upload={};this.headers={};}
    open(method,url){this.method=method;this.url=url;}
    setRequestHeader(key,value){this.headers[key]=value;}
    send(body){this.body=body;}
    abort(){this.onabort?.();}
  }
  const exports={};
  vm.runInNewContext(ts.transpile(fs.readFileSync(path.join(__dirname,'../src/utils/http.ts'),'utf8'),{module:ts.ModuleKind.CommonJS}),{
    exports,XMLHttpRequest:XHR,setTimeout,clearTimeout,AbortController,
    require:name=> name==='expo-router'?{router:{replace:path=>redirects.push(path)}}:name==='@/constants/api'?{API_BASE_URL:'http://test',API_TIMEOUT_MS:15000,API_UPLOAD_TIMEOUT_MS:120000,USE_API_MOCKS:false}:name==='@/utils/auth'?{getToken,removeToken}: {},
  });
  return {exports,get xhr(){return xhr;},redirects};
}
test('upload has a mobile-sized timeout, auth, and browser-generated multipart boundary',async()=>{
 const c=client(),body={file:'test'},progress=[];const h=c.exports.apiUpload('/images',body,{onProgress:p=>progress.push(p)});await tick();
 assert.equal(c.xhr.timeout,120000);assert.equal(c.xhr.headers.Authorization,'Bearer token');assert.equal(c.xhr.headers['Content-Type'],undefined);assert.equal(c.xhr.body,body);
 c.xhr.upload.onprogress({lengthComputable:true,loaded:50,total:100});assert.deepEqual(progress,[0.5]);
 c.xhr.status=201;c.xhr.responseText='{"photo_id":"p"}';await c.xhr.onload();assert.equal((await h.promise).photo_id,'p');
});
test('storage failure while reading token rejects instead of hanging forever',async()=>{
 const c=client({getToken:async()=>{throw Error('storage');}});await assert.rejects(c.exports.apiUpload('/images',{}).promise,e=>e.kind==='network');
});
test('cancelled request is distinct from offline errors',async()=>{
 const c=client();const h=c.exports.apiUpload('/images',{});await tick();h.cancel();await assert.rejects(h.promise,e=>e.kind==='cancelled');
});
test('401 redirects once and rejects even if removing token fails',async()=>{
 for(const failure of [false,true]){
  const c=client({removeToken:async()=>{if(failure)throw Error('storage');}});const h=c.exports.apiUpload('/images',{});const rejection=assert.rejects(h.promise,e=>e.status===401);await tick();c.xhr.status=401;c.xhr.responseText='{"detail":"Expired"}';await c.xhr.onload();await rejection;
  assert.deepEqual(c.redirects,failure?[]:['/Login']);
 }
});
