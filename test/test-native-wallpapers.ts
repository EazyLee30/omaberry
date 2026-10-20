import {strict as assert} from 'node:assert';
import {decodePng,unpack} from '../.cache/pocketjs/framework/compiler/pak.ts';
import {IMG_FLAG_LINEAR} from '../.cache/pocketjs/contracts/spec/spec.ts';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const manifest=await Bun.file(new URL('native/tokyo-liftoff-assets.json',root)).json();
const pack=unpack(new Uint8Array(await Bun.file(new URL('.cache/pocketjs/dist/blackberry-qnx/guest/blackberry-classic-main.pak',root)).arrayBuffer()));
assert.equal(manifest.assets.length,4);let count=0;
for(const entry of manifest.assets)for(const tile of entry.tiles){
 const png=new Uint8Array(await Bun.file(new URL('native/src/'+tile.asset,root)).arrayBuffer());
 assert.equal(createHash('sha256').update(png).digest('hex'),tile.sha256);
 const image=decodePng(png);assert.equal(image.width,512);assert.equal(image.height,512);
 const baked=pack.find(e=>e.key==='ui:img.'+tile.asset);assert(baked,tile.asset+' must be packaged, not a placeholder');
 assert.equal(baked.data[4],3,'retain full RGBA color');assert.equal(baked.data[5]&IMG_FLAG_LINEAR,IMG_FLAG_LINEAR,'linear sampling');
 assert(Buffer.from(baked.data.subarray(8)).equals(Buffer.from(image.rgba)),'baked pixel data must match wallpaper tile');count++;
}
assert.equal(count,16);
const logo=pack.find(e=>e.key==='ui:img.icon-omaberry.png');assert(logo);
const source=decodePng(new Uint8Array(await Bun.file(new URL('native/src/icon-omaberry.png',root)).arrayBuffer()));
assert.equal(source.width,256);assert.equal(source.height,256);
assert.equal(logo.data[5]&IMG_FLAG_LINEAR,IMG_FLAG_LINEAR);
assert(Buffer.from(logo.data.subarray(8)).equals(Buffer.from(source.rgba)));
assert(!pack.some(e=>e.key==='ui:img.icon-omarchy.svg'));
assert(!pack.some(e=>e.key==='ui:img.omaberry-pixel.svg'));
console.log('✓ Native wallpaper pack: all four artworks, 16 exact texture tiles, RGBA color, linear sampling and the supplied OmaBerry logo; no wordmark');
