import { Image, View } from "@pocketjs/framework/solid/components";
export function Desktop(props:any) {
 const wallpapers=[['tokyo-1-tl.png', 'tokyo-1-tr.png', 'tokyo-1-bl.png', 'tokyo-1-br.png'], ['tokyo-2-tl.png', 'tokyo-2-tr.png', 'tokyo-2-bl.png', 'tokyo-2-br.png'], ['tokyo-3-tl.png', 'tokyo-3-tr.png', 'tokyo-3-bl.png', 'tokyo-3-br.png'], ['tokyo-4-tl.png', 'tokyo-4-tr.png', 'tokyo-4-bl.png', 'tokyo-4-br.png']];
 const src=(part:string)=>wallpapers[props.wallpaper?.()??0][["tl","tr","bl","br"].indexOf(part)];
 return <View class="absolute left-0 top-0 w-full h-full">
  <Image class="absolute left-0 top-0 w-[180] h-[180]" src={src("tl")}/><Image class="absolute left-[180] top-0 w-[180] h-[180]" src={src("tr")}/>
  <Image class="absolute left-0 top-[180] w-[180] h-[180]" src={src("bl")}/><Image class="absolute left-[180] top-[180] w-[180] h-[180]" src={src("br")}/>
 </View>;
}
