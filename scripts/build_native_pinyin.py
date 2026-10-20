#!/usr/bin/env python3
"""Subset existing OmaBerry pinyin data to the native font coverage (Bun required)."""
from pathlib import Path
import subprocess,json
r=Path(__file__).resolve().parent.parent
js="globalThis.window={};eval(await Bun.file('web/js/pinyin-data.js').text());process.stdout.write(JSON.stringify({syllables:window.OB_PINYIN,words:window.OB_WORDS}));"
source=json.loads(subprocess.check_output(['bun','-e',js],cwd=r,text=True));allowed=set((r/'native/src/chat-characters.txt').read_text())
syl={key:''.join(ch for ch in chars if ch in allowed)[:16] for key,chars in source['syllables'].items()};syl={key:value for key,value in syl.items() if value}
words={}
for item in source['words'].split('|'):
 if '=' not in item:continue
 key,text=item.split('=',1);key=key.replace(' ','')
 if all(ch in allowed for ch in text):
  bucket=words.setdefault(key,[])
  if text not in bucket:bucket.append(text)
 if len(words)>=1000:break
for key,text in {'nihao':'你好','xiexie':'谢谢','zhongwen':'中文','heimei':'黑莓','yuansheng':'原生','liaotian':'聊天','qingwen':'请问','bangzhu':'帮助','gongzuoqu':'工作区','shijie':'世界','ceshi':'测试','zaijian':'再见'}.items():words[key]=[text]+[w for w in words.get(key,[]) if w!=text]
data=json.dumps({'syllables':syl,'words':words},ensure_ascii=False,separators=(',',':')).encode();assert len(data)<60000,len(data)
(r/'native/src/pinyin.json').write_bytes(data);print('Native pinyin dictionary:',len(syl),'syllables,',len(words),'phrase keys,',len(data),'bytes')
