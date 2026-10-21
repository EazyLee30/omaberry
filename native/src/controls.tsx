import {Text,View} from "@pocketjs/framework/solid/components";
/** Slot zero includes the bundled CJK glyphs. Do not add font-mono here. */
export function Button(p:any){return <View class="h-[20] px-1 justify-center focus:bg-[#414868] active:bg-[#565f89]" style={{bgColor:p.selected?"#414868":undefined}} focusable onPress={()=>p.action()}><Text class="text-xs text-[#7aa2f7]">{p.label}</Text></View>;}
