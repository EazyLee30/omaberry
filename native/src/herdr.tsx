import { For } from "solid-js";
import { Text, View } from "@pocketjs/framework/solid/components";
export const WORKSPACES=["Main","Build","Scratch"];
export function Herdr(props:any) {
  const button="px-2 py-2 bg-slate-800 focus:bg-blue-700 active:bg-blue-600";
  const workspaceButton="flex-col px-2 py-2 bg-slate-800 focus:bg-blue-700 active:bg-blue-600";
  return <View class="flex-col gap-2">
    <View class="flex-row items-center justify-between">
      <Text class="text-base font-bold text-slate-100">herdr</Text>
      <Text class="text-xs text-blue-300">LOCAL WORKSPACES</Text>
    </View>
    <View class="flex-row gap-2">
      <View class="w-[88] flex-col gap-2">
        <For each={WORKSPACES}>{(name,index)=><View class={workspaceButton} focusable onPress={()=>props.select(index())}>
          <Text class="text-xs text-slate-100">{(props.workspace()===index()?"> ":"  ")+name}</Text>
          <Text class="text-xs text-slate-400">{props.terminals[index()].sessionState()==="open"?"shell open":"not started"}</Text>
        </View>}</For>
      </View>
      <View class="flex-1 flex-col gap-2 p-2 bg-slate-900">
        <Text class="text-sm font-bold text-blue-300">{WORKSPACES[props.workspace()]}</Text>
        <Text class="text-xs text-slate-400">{props.chat.pending()===props.workspace()?"DeepSeek replying":"Independent shell + chat"}</Text>
        <View class={button} focusable onPress={()=>props.open(3)}><Text class="text-sm text-white">Open terminal</Text></View>
        <View class={button} focusable onPress={()=>props.open(5)}><Text class="text-sm text-white">Ask DeepSeek</Text></View>
        <View class={button} focusable onPress={()=>props.open(4)}><Text class="text-sm text-white">Browse files</Text></View>
      </View>
    </View>
  </View>;
}
