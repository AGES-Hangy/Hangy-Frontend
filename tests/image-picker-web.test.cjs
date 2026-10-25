const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');const {test}=require('node:test');const ts=require('typescript');
function mount(){
 const inputs=[],revoked=[],uploads=[],cleanups=[];let seq=0;
 const exports={};
 const FormData=class{constructor(){this.parts=[];}append(...args){this.parts.push(args);}};
 vm.runInNewContext(ts.transpile(fs.readFileSync(path.join(__dirname,'../src/hooks/useImageUpload.ts'),'utf8'),{module:ts.ModuleKind.CommonJS}),{
  exports,FormData,setTimeout,fetch:async()=>{throw Error('The revoked preview must not be fetched');},
  URL:{createObjectURL:()=>`blob:${++seq}`,revokeObjectURL:url=>revoked.push(url)},
  window:{addEventListener(){},removeEventListener(){}},
  document:{body:{appendChild(){}},createElement(){const input={style:{},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},remove(){},click(){}};inputs.push(input);return input;}},
  require:name=>{
   if(name==='react')return {useRef:value=>({current:value}),useState:value=>[value,()=>{}],useCallback:fn=>fn,useEffect:fn=>cleanups.push(fn())};
   if(name==='react-native')return {Platform:{OS:'web'}};
   if(name==='@/utils/http')return {apiUpload:(path,body)=>{uploads.push(body.parts);return {promise:Promise.resolve({photo_id:'p'}),cancel(){}};}};
   if(name==='@/utils/resizeUploadImage')return {resizeUploadImage:async()=>{throw Error('not used');}};
   return {};
  },
 });
 const hook=exports.useImageUpload({aspect:null});
 return {hook,inputs,revoked,uploads,unmount:()=>cleanups.forEach(fn=>fn?.())};
}
const blob=()=>new Blob(['PNG'],{type:'image/png'});
test('second selection preserves the first preview; retry uses its file even after preview release',async()=>{
 const m=mount();const p1=m.hook.pickImage();m.inputs[0].files=[blob()];m.inputs[0].listeners.change();const first=await p1;
 const p2=m.hook.pickImage();m.inputs[1].files=[blob()];m.inputs[1].listeners.change();const second=await p2;
 assert.deepEqual(m.revoked,[]);m.hook.releaseImage(first.uri);await m.hook.uploadImage('/images',first).promise;
 assert.equal(m.uploads[0][0][1],first.file);assert.equal(m.uploads[0][0][2],'foto.png');
 m.unmount();assert.deepEqual(m.revoked,[first.uri,second.uri]);
});
test('two taps before the native/browser picker resolves open one picker',async()=>{
 const m=mount();const first=m.hook.pickImage();assert.equal(await m.hook.pickImage(),null);assert.equal(m.inputs.length,1);
 m.inputs[0].files=[];m.inputs[0].listeners.change();assert.equal(await first,null);
});
