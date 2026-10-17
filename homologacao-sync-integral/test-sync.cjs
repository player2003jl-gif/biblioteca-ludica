/* Automated VM smoke tests for the published layout-only D1 connector. */
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),assert=require('assert');
const code=fs.readFileSync('homologacao-sync-integral/d1-sync-completo.js','utf8');
const deep=x=>JSON.parse(JSON.stringify(x)),sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
let layout={version:7,architecture:'reception-library-virtual-reading',roomSizes:{hall:{tilesW:24,tilesH:24},archive:{tilesW:44,tilesH:26}},rooms:{hall:[{id:'h-table',kind:'table',x:64,y:480,w:200,h:50},{id:'user-mv9ym902-2',kind:'shelf',x:544,y:368,w:136,h:64,shelfName:'teste2026'}],archive:[]},doors:{hall:[],archive:[]},scene:{hall:[],archive:[]},npcs:{hall:null,archive:null},interactionModes:{}},rev=14,writes=0;
const current=()=>({revision:rev,layout:deep(layout),sha256:sha(layout)});
function make(preload=null){
 const disk=new Map(preload?Object.entries(preload):[]),dom={};
 const node=id=>dom[id]||(dom[id]={textContent:'',style:{},dataset:{},disabled:false,hidden:false,checked:false});
 let data=deep(layout),dirty=false,callback=null;
 const editor={bundle:()=>deep(data),applyLayout:v=>{data=deep(v);dirty=false},commitConfirmed:()=>{dirty=false},get dirty(){return dirty},get isBusyGesture(){return false},mutate:f=>{f(data);dirty=true}};
 const store={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,String(v)),removeItem:k=>disk.delete(k)};
 const google={accounts:{id:{initialize:opts=>{callback=opts.callback},renderButton(){}}}};
 const win={__BL2_EDITOR__:editor,google,addEventListener(){}};
 const doc={hidden:false,querySelector:q=>q.includes('Cloudflare D1')?node('panel'):null,getElementById:node,
 createElement:()=>({click(){},remove(){}}),head:{appendChild(){}},body:{appendChild(){}},addEventListener(){}};
 const fetch=async (url,opts={})=>{
 if((opts.method||'GET')==='GET')return{ok:true,status:200,json:async()=>current()};
 writes++;
 const b=JSON.parse(opts.body);
 if(b.expectedRevision!==rev)return{ok:false,status:409};
 if(!opts.headers.Authorization)return{ok:false,status:401};
 layout=deep(b.layout);rev++;
 return{ok:true,status:200,json:async()=>({revision:rev,sha256:sha(layout)})};
 };
 const ctx={window:win,google,document:doc,fetch,crypto:crypto.webcrypto,TextEncoder,AbortController,JSON,Date,console,localStorage:store,
 setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},confirm(){return true}};
 vm.runInNewContext(code,ctx);
 return {win,editor,disk,node,login:()=>callback({credential:'test-google-token'}),async wait(){await new Promise(r=>setTimeout(r,150))},
 async refresh(){await win.__BL2_D1_BRIDGE__.refresh(true);await this.wait()},async save(){const r=await win.__BL2_D1_BRIDGE__.saveFromEditor();await this.wait();return r},
 status:()=>win.__BL2_D1_BRIDGE__.status};
}
(async()=>{
 const a=make(),b=make();await a.wait();await b.wait();
 assert(a.status().active&&b.status().active,'fresh auto hydration');
 // Regression: metadata can say the current revision while the editor visual state is stale.
 // With no unsaved edits, refresh must reapply the remote layout instead of falsely saying synchronized.
 const z=make();await z.wait();const expectedZ=deep(z.editor.bundle()),staleZ=deep(expectedZ);
 staleZ.rooms.hall[0].y=expectedZ.rooms.hall[0].y+77;z.editor.applyLayout(staleZ);
 assert.equal(z.status().revision,rev,'metadata remains on the current revision before regression refresh');
 await z.refresh();
 assert.equal(z.editor.bundle().rooms.hall[0].y,expectedZ.rooms.hall[0].y,'same-revision stale visual state must be reapplied from D1');
 a.login();a.editor.mutate(s=>{s.rooms.hall[0].y=464});assert.equal(await a.save(),true);assert.equal(rev,15);
 await b.refresh();assert.equal(b.editor.bundle().rooms.hall[0].y,464,'A to B');
 b.login();b.editor.mutate(s=>{s.rooms.hall[1].x=528});assert.equal(await b.save(),true);
 await a.refresh();assert.equal(a.editor.bundle().rooms.hall[1].x,528,'B to A');
 const c=make();await c.wait();c.editor.mutate(s=>{s.rooms.hall[0].y=448});
 a.editor.mutate(s=>{s.rooms.hall[0].y=432});await a.save();
 await c.refresh();assert(c.status().conflict,'conflict recognized');assert.equal(c.editor.bundle().rooms.hall[0].y,448);
 assert(c.disk.has('BL2_D1_LAYOUT_RASCUNHO_V2'),'draft durable');
 const old=deep(layout);old.rooms.hall[0].y=900;
 const d=make({'BL2_layout_044_TWO_ROOMS':JSON.stringify(old)});d.editor.applyLayout(old);await d.wait();
 assert(d.status().conflict,'old local state protected');assert.equal(d.editor.bundle().rooms.hall[0].y,900);
 const noauth=make();await noauth.wait();noauth.editor.mutate(s=>{s.rooms.hall[0].y=440});assert.equal(await noauth.save(),false);assert(noauth.disk.has('BL2_D1_LAYOUT_RASCUNHO_V2'));
 console.log('PASS: automatic D1 initial load, same-revision visual reapply, A→B, B→A, conflict, durable draft, legacy safety, unauthorized save.');
})().catch(e=>{console.error(e);process.exitCode=1});