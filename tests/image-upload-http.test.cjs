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
    exports,XMLHttpRequest:XHR,setTimeout,clearTimeout,AbortController,FormData,
    fetch:async()=>{throw Error('Retry must use the stored Blob');},
    require:name=> name==='react-native'?{Platform:{OS:'web'}}:name==='expo-router'?{router:{replace:path=>redirects.push(path)}}:name==='@/constants/api'?{API_BASE_URL:'http://test',API_TIMEOUT_MS:15000,UPLOAD_RESPONSE_TIMEOUT_MS:120000,UPLOAD_STALL_TIMEOUT_MS:30000,USE_API_MOCKS:false}:name==='@/utils/auth'?{getToken,removeToken}: {},
  });
  return {exports,get xhr(){return xhr;},redirects};
}
const file=()=>({uri:'blob:released',mimeType:'image/png',file:new Blob(['photo'],{type:'image/png'})});
test('upload keeps auth and browser multipart boundary; retry reads the stored Blob',async()=>{
 const c=client(),progress=[];const promise=c.exports.apiUpload('/images',file(),{onProgress:p=>progress.push(p)});await tick();
 assert.equal(c.xhr.headers.Authorization,'Bearer token');assert.equal(c.xhr.headers['Content-Type'],undefined);assert.equal(c.xhr.body.get('file').size,5);
 c.xhr.upload.onprogress({lengthComputable:true,loaded:50,total:100});assert.deepEqual(progress,[0.5]);
 c.xhr.status=201;c.xhr.responseText='{"photo_id":"p"}';c.xhr.onload();assert.equal((await promise).photo_id,'p');
});
test('storage failure while reading token rejects instead of hanging forever',async()=>{
 const c=client({getToken:async()=>{throw Error('storage');}});await assert.rejects(c.exports.apiUpload('/images',file()),e=>e.kind==='network');
});
test('cancelled request is distinct from offline errors and late progress stops',async()=>{
 const c=client(),controller=new AbortController();const promise=c.exports.apiUpload('/images',file(),{signal:controller.signal});await tick();controller.abort();await assert.rejects(promise,e=>e.kind==='cancelled');assert.equal(c.xhr.upload.onprogress,null);
});
test('401 redirects once and rejects even if removing token fails',async()=>{
 for(const failure of [false,true]){
  const c=client({removeToken:async()=>{if(failure)throw Error('storage');}});const promise=c.exports.apiUpload('/images',file());const rejection=assert.rejects(promise,e=>e.status===401);await tick();c.xhr.status=401;c.xhr.responseText='{"detail":"Expired"}';c.xhr.onload();await rejection;
  assert.deepEqual(c.redirects,failure?[]:['/Login']);
 }
});
