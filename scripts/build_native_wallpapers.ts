// Bake upstream artwork into native texture tiles; run after native.py prepare.
import {decodePng} from '../.cache/pocketjs/framework/compiler/pak.ts';
import {deflateSync} from 'node:zlib';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function crc32(data:Buffer){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function chunk(type:string,body:Buffer){const name=Buffer.from(type),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(body.length);sum.writeUInt32BE(crc32(Buffer.concat([name,body])));return Buffer.concat([len,name,body,sum]);}
function png(rgba:Uint8Array){const header=Buffer.alloc(13);header.writeUInt32BE(512,0);header.writeUInt32BE(512,4);header[8]=8;header[9]=6;const rows=Buffer.alloc(512*(2048+1));for(let y=0;y<512;y++)rows.set(rgba.subarray(y*2048,(y+1)*2048),y*2049+1);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);}
const metadata=JSON.parse(readFileSync(resolve(root,'native/tokyo-liftoff-assets.json'),'utf8'));
for(let i=0;i<metadata.assets.length;i++){
 const entry=metadata.assets[i],source=resolve(root,'.cache/tokyo-liftoff/backgrounds',entry.source),square=resolve(root,'.cache',`tokyo-square-${i+1}.png`);
 execFileSync('sips',['--resampleHeight','1024',source,'--out',square],{stdio:'ignore'});
 execFileSync('sips',['--cropToHeightWidth','1024','1024',square],{stdio:'ignore'});
 const image=decodePng(new Uint8Array(readFileSync(square)));if(image.width!==1024||image.height!==1024)throw new Error('Unexpected square dimensions');
 for(let tile=0;tile<4;tile++){
  const x=tile%2*512,y=Math.floor(tile/2)*512,pixels=new Uint8Array(512*512*4);
  for(let row=0;row<512;row++)pixels.set(image.rgba.subarray(((y+row)*1024+x)*4,((y+row)*1024+x+512)*4),row*2048);
  const encoded=png(pixels),asset=entry.tiles[tile];writeFileSync(resolve(root,'native/src',asset.asset),encoded);asset.sha256=createHash('sha256').update(encoded).digest('hex');
  const check=decodePng(encoded);if(check.width!==512||check.height!==512||!Buffer.from(check.rgba).equals(Buffer.from(pixels)))throw new Error('Tile round-trip failed');
 }
}
writeFileSync(resolve(root,'native/tokyo-liftoff-assets.json'),JSON.stringify(metadata,null,2)+'\n');
console.log('16 wallpaper tiles verified against resized source pixels');
