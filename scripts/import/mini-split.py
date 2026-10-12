"""Parse handoff prose into reviewable authoring data; never execute it."""
import json,re,sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
s=Path(sys.argv[1]).read_text()
def clean(v):
 v=re.sub(r'\[(?:MSU-|MS-owned|Cross-lane|SD-owned)[^\]]*\]','',v)
 v=re.sub(r'\((?:live|new|D-021|MSU-|LK-|pn-v1|note:|empty|unchanged|sets |then |its first|existing result|PR-B)[^)]*\)','',v)
 return v.replace('**','').replace('`','').strip().strip('“”"').replace('\\n','\n')
def quotes(v):return [a or b for a,b in re.findall(r'“([^”]*)”|"([^"]*)"',v)]
def field(b,k):
 m=re.search(r'\*\*'+re.escape(k)+r':\*\*\s*([^\n]+)',b)
 if not m:return ''
 vals=quotes(m[1]);return clean(vals[0] if vals else m[1].split(' · ')[0])
def table(b):
 out={}
 for l in b.splitlines():
  if not l.startswith('| `'):continue
  c=[x.strip() for x in l.strip('|').split('|')]
  if len(c)<5:continue
  aid=re.search(r'`([^`]+)`',c[0])
  if not aid:continue
  out[aid[1]]={k:clean(v) for k,v in zip(['id','label','hint','next','fact','gate'],c)}
  out[aid[1]]['id']=aid[1]
 return out
edges={}
for line in s.split('```edges-ms\n')[1].split('```')[0].splitlines():
 m=re.match(r'(\S+) \| (\S+) -> (\S+)(?: \[(\S+)\])?',line)
 if m:edges.setdefault(m[1],[]).append({'id':m[2],'next':m[3],**({'gate':m[4]} if m[4] else {})})
heads=list(re.finditer(r'^#### 3\.[2345]\.\d+ `([^`]+)`.*$',s,re.M))
nodes={}
for i,m in enumerate(heads):
 end=heads[i+1].start() if i+1<len(heads) else s.index('## 4. Results')
 b=s[m.end():end]
 # Cut at additive options section so node ownership is not mixed.
 b=b.split('#### 3.3.12')[0]
 node={'title':field(b,'title'),'section':field(b,'section'),'caution':field(b,'caution'),'notice':(field(b,'notice') or 'none').split()[0],'safetyGate':field(b,'safetyGate').startswith('true'),'options':table(b)}
 body=[];grab=False
 for l in b.splitlines():
  if re.match(r'\s*>',l):body.append(re.sub(r'^\s*>\s?','',l))
 node['body']=clean('\n'.join(body)) or field(b,'body')
 if '**Step block' in b:
  step={k:field(b,title) for k,title in [('what','What this does'),('caution','Caution'),('source','Source'),('watch','Watch'),('stop','Stop'),('undo','Undo')]}
  step['steps']=[clean(x) for x in re.findall(r'^    \d+\. (.+)$',b,re.M)]
  node['step']=step
 nodes[m[1]]=node
add=s[s.index('#### 3.3.12'):s.index('### 3.4')]
for m in re.finditer(r'\*\*MSU-L\d+ `(ms\.[^`]+)`\*\*.*?\n(.*?)(?=\*\*MSU-|\Z)',add,re.S):nodes[m[1]]['options'].update(table(m[2]))
results={}
block=s[s.index('### 4.5'):s.index('### 4.7')]
heads=list(re.finditer(r'^\*\*(?:MSU-L\d+ )?`(ms_[^`]+)`\*\*(.*)$',block,re.M))
for i,m in enumerate(heads):
 b=block[m.end():heads[i+1].start() if i+1<len(heads) else len(block)]
 header=m[2].split(' · ')
 r={'tier':clean(header[1]),'urgency':clean(header[2]),'outcome':clean(header[3]),'source':'maintenance','reason':m[1]}
 for key in ['title','explanation','actions','avoid']:
  x=re.search(r'^- '+key+r': (.+)$',b,re.M)
  vals=quotes(x[1]) if x else []
  r[key]=vals if key=='actions' else vals[0] if vals else ''
  if key=='actions' and x and 'MS_BACKUP_HEAT' in x[1]:r[key].append('$BACKUP')
 r['diyTier']='basic' if r['outcome']=='next_step' else 'pro_only'
 results[m[1]]=r
assert len(edges)==30,len(edges)
assert len(results)==26,len(results)
(root/'content/lanes/mini-split-draft.json').write_text(json.dumps({'edges':edges,'nodes':nodes,'results':results},ensure_ascii=False,indent=2)+'\n')
print('Imported',len(edges),'node edge lists,',len(nodes),'copy blocks,',len(results),'new results')
