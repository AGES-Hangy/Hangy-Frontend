const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
class ApiError extends Error {
  constructor(kind, status, detail) { super(detail); Object.assign(this, { kind, status, detail }); }
  is(status, detail) { return this.status === status && this.detail === detail; }
}
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const tick = () => new Promise(resolve => setImmediate(resolve));
function mount({ apiFetch, uploadImage, pickImage=async()=>null }) {
  let slots=[], index=0, effect, cleanup, scheduled, event='A', cancelled=0, released=[];
  const same = (a,b) => a?.length === b?.length && a.every((x,i)=>x===b[i]);
  const react = {
    useState(initial) { const n=index++; if (!(n in slots)) slots[n]=initial; return [slots[n], value=>slots[n]=typeof value==='function'?value(slots[n]):value]; },
    useRef(initial) { const n=index++; return slots[n]??={current:initial}; },
    useCallback(fn,deps) { const n=index++; if (!same(slots[n]?.deps,deps)) slots[n]={fn,deps}; return slots[n].fn; },
  };
  const cancelUploads = () => { cancelled++; };
  const exports={};
  vm.runInNewContext(ts.transpile(fs.readFileSync(path.join(__dirname,'../src/hooks/useExperiencePhotos.ts'),'utf8'), {module:ts.ModuleKind.CommonJS}), {
    exports, require: name => {
      if (name==='react') return react;
      if (name==='expo-router') return {useFocusEffect(fn) { if(fn!==effect) { scheduled=fn; effect=fn; } }};
      if (name==='@/utils/http') return {apiFetch,ApiError};
      if (name==='@/hooks/useImageUpload') return {useImageUpload:()=>({pickImage,uploadImage,cancelUploads,releaseImage:uri=>released.push(uri),isPicking:false,error:null})};
      if (name==='@/constants/api') return {endpoints:{eventExperiences:id=>`/events/${id}/experiences`,experienceImages:id=>`/experiences/${id}/images`,experienceImage:id=>`/experiences/images/${id}`}};
      throw Error(name);
    },
  });
  const api = {
    render(id=event) { event=id; index=0; const result=exports.useExperiencePhotos(id,'QA'); if(scheduled) { cleanup?.(); cleanup=scheduled(); scheduled=null; } return result; },
    blur() { cleanup?.(); cleanup=null; },
    get cancelled() { return cancelled; }, get released() { return released; },
  };
  api.hook=api.render(); return api;
}
const image = { uri:'file://photo',mimeType:'image/png',fileSize:100 };
test('leaving while creation is pending never starts the file upload', async()=>{
  const create=deferred(); let uploads=0;
  const m=mount({apiFetch:()=>create.promise,uploadImage:()=>{ uploads++; return {promise:Promise.resolve({photo_id:'1',photo_url:'https://photo'})}; }});
  const p=m.hook.uploadPhoto(image); m.blur(); create.resolve({experience_id:'exp'}); await p;
  assert.equal(uploads,0); assert.equal(m.cancelled,1);
});
test('A → B → A does not accept a response from the first visit', async()=>{
  const create=deferred(); let uploads=0;
  const m=mount({apiFetch:()=>create.promise,uploadImage:()=>{ uploads++; }});
  const p=m.hook.uploadPhoto(image); m.render('B'); m.render('A'); create.resolve({experience_id:'old'}); await p;
  assert.equal(uploads,0); assert.equal(m.render().photos.length,0);
});
test('two different photos share one experience request; double retry sends once', async()=>{
  let creates=0,uploads=0; const upload=deferred();
  const m=mount({apiFetch:async()=>{creates++;return {experience_id:'exp'};},uploadImage:()=>{uploads++;return {promise:upload.promise};}});
  const a=m.hook.uploadPhoto(image), duplicate=m.hook.uploadPhoto(image), b=m.hook.uploadPhoto({...image,uri:'second'});
  await tick(); assert.equal(creates,1);assert.equal(uploads,2);
  upload.resolve({photo_id:'photo',photo_url:'https://server/photo'});await Promise.all([a,duplicate,b]);
  assert.equal(m.render().photos.length,2);assert.equal(m.render().photos[0].uri,'https://server/photo');
});
test('upload failure rolls back the tile and remains retryable',async()=>{
  const m=mount({apiFetch:async()=>({experience_id:'exp'}),uploadImage:()=>({promise:Promise.reject(new ApiError('http',503,'Unavailable'))})});
  await assert.rejects(m.hook.uploadPhoto(image));assert.equal(m.render().photos.length,0);
});
test('a delayed picker result after leaving is released and ignored',async()=>{
  const picker=deferred();const m=mount({apiFetch:async()=>{},uploadImage:()=>{},pickImage:()=>picker.promise});
  const p=m.hook.pickPhoto();m.blur();picker.resolve(image);assert.equal(await p,null);assert.deepEqual(m.released,[image.uri]);
});
test('late delete cannot remove a photo or show an error in a new visit',async()=>{
  const deletion=deferred();const m=mount({apiFetch:()=>deletion.promise,uploadImage:()=>{}});
  const p=m.hook.removePhoto('photo');m.render('B');deletion.reject(new ApiError('http',403,'Forbidden'));
  await assert.rejects(p,error=>error.kind==='cancelled');assert.equal(m.render().removingPhotoId,null);
});
