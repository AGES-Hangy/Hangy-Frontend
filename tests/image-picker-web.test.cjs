const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');const {test}=require('node:test');const ts=require('typescript');
function mount(){
 const inputs=[],revoked=[],uploads=[],cleanups=[];let seq=0;
 const exports={};
 const FormData=class{constructor(){this.parts=[];}append(...args){this.parts.push(args);}};
 vm.runInNewContext(ts.transpile(fs.readFileSync(path.join(__dirname,'../src/hooks/useImageUpload.ts'),'utf8'),{module:ts.ModuleKind.CommonJS}),{
  exports,FormData,setTimeout,AbortController,fetch:async()=>{throw Error('The revoked preview must not be fetched');},
  URL:{createObjectURL:()=>`blob:${++seq}`,revokeObjectURL:url=>revoked.push(url)},
  window:{addEventListener(){},removeEventListener(){}},
  document:{body:{appendChild(){}},createElement(){const input={style:{},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},remove(){},click(){}};inputs.push(input);return input;}},
  require:name=>{
   if(name==='react')return {useRef:value=>({current:value}),useState:value=>[value,()=>{}],useCallback:fn=>fn,useEffect:fn=>cleanups.push(fn())};
   if(name==='react-native')return {Platform:{OS:'web'}};
   if(name==='@/utils/http')return {apiUpload:async(path,image)=>{uploads.push(image);return {photo_id:'p',url:'https://server/cover'};}};
   if(name==='@/utils/accessibility')return {announce(){}};
   if(name==='@/utils/apiErrors')return {classifyUploadError:()=>null};
   if(name==='@/utils/resizeUploadImage')return {resizeUploadImage:async()=>{throw Error('not used');}};
   return {};
  },
 });
 const hook=exports.useImageUpload({endpoint:'/cover',urlField:'url',messages:{invalidFile:'invalid',failed:'failed',uploading:'uploading',uploaded:'uploaded'}});
 return {hook,inputs,revoked,uploads,unmount:()=>cleanups.forEach(fn=>fn?.())};
}
const blob=()=>new Blob(['PNG'],{type:'image/png'});
test('second selection preserves the first preview; retry uses its file even after preview release',async()=>{
 const m=mount();const p1=m.hook.pickImage();m.inputs[0].files=[blob()];m.inputs[0].listeners.change();const first=await p1;
 const p2=m.hook.pickImage();m.inputs[1].files=[blob()];m.inputs[1].listeners.change();const second=await p2;
 assert.deepEqual(m.revoked,[]);m.hook.releaseImage(first.uri);await m.hook.uploadImage('/images',first).promise;
 assert.equal(m.uploads[0].file,first.file);
 m.unmount();assert.deepEqual(m.revoked,[first.uri,second.uri]);
});
test('two taps before the native/browser picker resolves open one picker',async()=>{
 const m=mount();const first=m.hook.pickImage();assert.equal(await m.hook.pickImage(),null);assert.equal(m.inputs.length,1);
 m.inputs[0].files=[];m.inputs[0].listeners.change();assert.equal(await first,null);
});

test('cover pickAndUpload still returns the hosted URL and preserves preview until replacement succeeds',async()=>{
 const m=mount();const firstPromise=m.hook.pickAndUpload();m.inputs[0].files=[blob()];m.inputs[0].listeners.change();const first=await firstPromise;
 assert.equal(first.url,'https://server/cover');assert.deepEqual(m.revoked,[]);
 const secondPromise=m.hook.pickAndUpload();m.inputs[1].files=[blob()];m.inputs[1].listeners.change();const second=await secondPromise;
 assert.deepEqual(m.revoked,[first.uri]);m.hook.reset();assert.deepEqual(m.revoked,[first.uri,second.uri]);
});
test('browser cancel settles the picker and permits a new selection',async()=>{
 const m=mount();const first=m.hook.pickImage();m.inputs[0].listeners.cancel();assert.equal(await first,null);
 const second=m.hook.pickImage();m.inputs[1].files=[blob()];m.inputs[1].listeners.change();assert.ok(await second);
});
