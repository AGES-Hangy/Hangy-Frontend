// Execute the real hooks with controlled HTTP promises and a minimal hook host.
// No network/mocks are included in the application bundle.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((yes,no) => { resolve=yes; reject=no; }); return {promise,resolve,reject}; }
class ApiError extends Error { constructor(kind,status) { super(kind); this.kind=kind;this.status=status; } }
function host(file, overrides = {}) {
  const slots=[], effects=[], listeners=new Set(); let cursor=0;
  const slot = () => cursor++;
  const react = {
    createContext: () => ({ Provider: 'Provider' }), useContext: () => null,
    useState: initial => { const i=slot(); if (!(i in slots)) slots[i]=initial; return [slots[i], value => { slots[i]=typeof value==='function'?value(slots[i]):value; }]; },
    useRef: initial => { const i=slot(); return slots[i] ||= { current:initial }; },
    useMemo: fn => { slot();return fn(); },
    useCallback: (fn,deps) => { const i=slot();if (!slots[i] || deps.some((v,j)=>v!==slots[i].deps[j])) slots[i]={fn,deps}; return slots[i].fn; },
    useEffect: (fn,deps) => { const i=slot();if (!slots[i] || deps.some((v,j)=>v!==slots[i].deps[j])) { effects.push(()=>{slots[i]?.cleanup?.(); slots[i]={deps,cleanup:fn()};}); } },
  };
  const addToast=()=>{};
  const imports = {
    react,
    'react/jsx-runtime': { jsx: (type,props) => ({type,props}) },
    'react-native': { AppState: { addEventListener: () => ({remove(){}}) } },
    '@/utils/relationshipChanges': { onRelationshipsChanged: fn => { listeners.add(fn); return ()=>listeners.delete(fn); } },
    '@/components/Toast': { useToast: () => ({addToast}) },
    '@/constants/api': {endpoints: new Proxy({}, { get: (_,key) => (...args)=>`${String(key)}:${JSON.stringify(args)}` })},
    '@/utils/http': {ApiError,apiFetch: overrides.apiFetch},
    '@/utils/apiErrors': {describeActionError:()=>({tone:'error',message:'erro'}),isApiErrorLike:e=>e instanceof ApiError},
    ...overrides.imports,
  };
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  const context={exports:{},require:id=>{assert.ok(imports[id],`unexpected import ${id}`);return imports[id];},console,Set,Date};
  vm.runInNewContext(ts.transpile(source,{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}),context);
  return { render(name='NotificationsProvider') { cursor=0; const result=context.exports[name]({children:null}); while(effects.length) effects.shift()();return result.props?.value ?? result; }, invalidate(){for(const fn of listeners)fn();} };
}
const note = id => ({notification_id:id,type:'CONNECTION_REQUEST',payload:{sender:{id:'bruno'}},read:false,created_at:'2026-10-25T12:00:00Z'});
const page = (ids,cursor=null) => ({items:ids.map(note),unread_count:ids.length,next_cursor:cursor});

test('block 204 and 409 invalidate; failure preserves existing state',async()=>{
  for(const status of [204,409,500]){
    let invalidated=0,feed=0;
    const h=host('src/hooks/useBlockUser.ts',{apiFetch:async()=>{if(status!==204)throw new ApiError('http',status);},imports:{
      '@/utils/relationshipChanges':{invalidateRelationships:()=>invalidated++},'@/hooks/useFeed':{invalidateFeed:()=>feed++},
    }});
    const result=await h.render('useBlockUser').block('bruno');
    assert.equal(result,status===500?'failed':'done');assert.equal(invalidated,status===500?0:1);assert.equal(feed,invalidated);
  }
});
test('late initial load cannot replace post-block list or badge',async()=>{
  const old=deferred(),fresh=deferred();let calls=0;
  const h=host('src/hooks/useNotifications.tsx',{apiFetch: path => path.startsWith('notificationsUnreadCount')?Promise.resolve({unread_count:0}):(++calls===1?old.promise:fresh.promise)});
  const value=h.render();const pending=value.loadNotifications();h.invalidate();
  fresh.resolve(page(['carla']));await flush();old.resolve(page(['bruno','carla']));await pending;
  const current=h.render();assert.equal(current.notifications.length,1);assert.equal(current.notifications[0].notification_id,'carla');assert.equal(current.unreadCount,1);
});
test('old pagination and failed optimistic read cannot restore blocked data',async()=>{
  const paging=deferred(),read=deferred();let loads=0;
  const h=host('src/hooks/useNotifications.tsx',{apiFetch: path=>{
    if(path.startsWith('notificationsUnreadCount'))return Promise.resolve({unread_count:0});
    if(path.startsWith('notificationRead:'))return read.promise;
    if(path.includes('"cursor":"old-cursor"'))return paging.promise;
    return Promise.resolve(++loads===1?page(['bruno'],'old-cursor'):page(['carla']));
  }});
  await h.render().loadNotifications();let value=h.render();
  const more=value.loadMore(),mark=value.markAsRead('bruno');h.invalidate();await flush();
  paging.resolve(page(['bruno-old']));read.reject(new ApiError('network',0));await Promise.all([more,mark]);
  value=h.render();assert.equal(value.notifications.length,1);assert.equal(value.notifications[0].notification_id,'carla');assert.equal(value.unreadCount,1);assert.equal(value.isLoadingMore,false);
});
test('failed reload after block clears old cards, pagination and badge',async()=>{
  let calls=0;const h=host('src/hooks/useNotifications.tsx',{apiFetch:path=>{
    if(path.startsWith('notificationsUnreadCount'))return Promise.resolve({unread_count:0});
    return ++calls===1?Promise.resolve(page(['bruno'],'old-cursor')):Promise.reject(new ApiError('network',0));
  }});
  await h.render().loadNotifications();h.invalidate();await flush();const value=h.render();
  assert.equal(value.notifications.length,0);assert.equal(value.unreadCount,0);assert.equal(value.hasMore,false);assert.equal(value.errorKind,'offline');
});
