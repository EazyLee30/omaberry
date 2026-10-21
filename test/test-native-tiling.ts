import {strict as assert} from "node:assert";
import vm from "node:vm";
const source=await Bun.file(new URL("../native/src/tiling.ts",import.meta.url)).text();
const compiled=new Bun.Transpiler({loader:"ts"}).transformSync(source.replace(/^import .*;\n/gm,"").replace(/export /g,""));
const context:any={createSignal(value:any){return [()=>value,(next:any)=>value=next];}};vm.createContext(context);vm.runInContext(compiled+"\nglobalThis.wm=createTiling()",context);const w=context.wm;
const first=w.open(3);assert.equal(first,0);assert.equal(w.rect(first).width,350);const second=w.open(3);assert.equal(w.count(),2);assert.equal(w.rect(first).width,172);const third=w.open(4);assert(w.rect(second).height<200);assert.equal(w.rect(first).height,326);w.focus(first);const fourth=w.open(6);assert.equal(w.count(),4);
function check(){const rects=Object.values(w.rects()) as any[];for(const a of rects){assert(a.width>0&&a.height>0);assert(a.x>=0&&a.y>=0&&a.x+a.width<=360&&a.y+a.height<=360);for(const b of rects)if(a!==b)assert(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);}}
check();w.focus(second);w.toggleZoom();assert.equal(Object.keys(w.rects()).length,1);w.toggleZoom();w.toggleSplit();check();w.resize(.1);check();w.direction('left',true);check();w.move(9);assert.equal(w.workspace(),9);assert(w.ids().includes(second));w.select(0);assert.equal(w.count(),3);w.close(third);assert.equal(w.count(),2);w.close(first);assert.equal(w.rect(fourth).width,350);w.select(9);assert.equal(w.apps()[second],3);w.close(second);w.select(0);w.close(fourth);assert.equal(w.count(),0);
for(let i=0;i<16;i++){w.select(i%10);assert(w.open(3)>=0);}assert.equal(w.open(3),-1);for(let i=0;i<10;i++){w.select(i);check();w.toggleGaps();check();w.toggleBar();check();}for(let i=0;i<16;i++)w.close(i);assert(w.apps().every((a:number)=>!a));assert.equal(w.open(3),0);
for(let i=1;i<16;i++)w.open(3);check();for(let i=0;i<16;i++){w.focus(i);w.toggleSplit();w.resize(-.7);check();}
console.log('✓ Dwindle: 4 panes, focused splitting, disjoint geometry, resize/swap/collapse, 10 workspaces, move, 16 stable slots and reuse');

const saved=JSON.parse(JSON.stringify(w.snapshot())),before=JSON.stringify(w.snapshot());assert.equal(w.restore({...saved,apps:[]}),false);assert.equal(JSON.stringify(w.snapshot()),before);assert(w.restore(saved));assert.equal(w.snapshot().version,2);assert(!('tabs' in w.current()));check();
const legacy={version:1,workspace:0,apps:Array(16).fill(0),spaces:Array.from({length:10},(_,i)=>({name:'Project '+i,selected:0,tabs:[{name:'shell',tree:null,focus:-1,zoom:false}]}))};
legacy.apps[0]=3;legacy.apps[1]=5;legacy.apps[2]=3;legacy.apps[3]=5;
legacy.spaces[0].tabs=[{name:'shell',tree:0,focus:0,zoom:false},{name:'agent',tree:{axis:'x',ratio:.5,a:1,b:2},focus:1,zoom:false},{name:'another',tree:3,focus:3,zoom:false}] as any;
assert(w.restore(legacy));assert.equal(w.count(),3);assert.equal(w.apps()[1],6);assert.equal(w.apps()[3],0);assert.equal(w.current().name,'Desktop 1');check();const layout=JSON.stringify(w.snapshot());const bad=JSON.parse(JSON.stringify(w.snapshot()));bad.spaces[1].tree=0;assert(!w.restore(bad));assert.equal(JSON.stringify(w.snapshot()),layout);
console.log('✓ desktop-only windows, independent workspaces, v1 tab migration, duplicate chat consolidation, atomic corrupt-state rejection');
