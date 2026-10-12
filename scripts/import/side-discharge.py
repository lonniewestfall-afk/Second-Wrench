"""Import tables as authoring data; never execute handoff material."""
import json,re,sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
s=Path(sys.argv[1]).read_text()
def literals(x):
 return [a or b for a,b in re.findall(r'“([^”]+)”|`([^`]+)`',x) if not (a or b).startswith(('PENDING','REUSED'))]
def text(x):
 vals=literals(x)
 if vals:return vals[0]
 return re.sub(r'\*\*','',x).strip().strip('“”')
def table(block):
 rows=[l.strip().strip('|').split('|') for l in block.splitlines() if l.startswith('|')]
 if not rows:return []
 head=[re.sub(r'[^a-z_]','',c.lower()) for c in rows[0]]
 return [dict(zip(head,[x.strip() for x in row])) for row in rows[2:] if len(row)==len(head)]
nodes={}
entry=s[s.index('**Node `sd.entry.outdoor`'):s.index('### 2.2')]
sections=[('sd.entry.outdoor',entry)]
headers=list(re.finditer(r'^### 5\.\d+ `([^`]+)`.*$',s,re.M))
for i,m in enumerate(headers):
 if m[1]=='sd.entry.outdoor':continue
 end=headers[i+1].start() if i+1<len(headers) else s.index('## 6. Results')
 sections.append((m[1],s[m.end():end]))
for id,b in sections:
 opts=[]
 for row in table(b):
  aid=text(row['answer_id']);dest=row['next'];dst=literals(dest)
  target=dst[0] if dst else re.match(r'(R-[a-z-]+)',dest)[0]
  opts.append(dict(id=aid,label=text(row.get('label','')),hint=text(row.get('hint','')) if row.get('hint','') not in ('—','') else '',next=target,fact=text(row.get('fact',row.get('factflag',''))) if row.get('fact',row.get('factflag','')) not in ('—','') else ''))
 nodes[id]={'options':opts,'sourceText':b.split('| answer_id')[0].strip()}
results={}
b=s[s.index('## 6. Results'):s.index('## 7. Service note')]
for row in table(b):
 id=text(row['resultid'])
 if not id.startswith('@sd_'):continue
 results[id[1:]]={'outcome':row['outcome'],'reason':text(row['reason']),'copy':literals(row['copy'])}
# Apply the final answer-label review where it provides replacements.
review=Path(sys.argv[2]).read_text()
for line in review.splitlines():
 if not line.startswith('|'):continue
 cols=[x.strip() for x in line.strip('|').split('|')]
 if len(cols)!=6 or 'Replace' not in cols[4]:continue
 id,aid=text(cols[1]),text(cols[2])
 if id in nodes:
  for o in nodes[id]['options']:
   if o['id']==aid:o['label']=text(cols[5])
assert len(nodes)==17,len(nodes)
assert len(results)==35,len(results)
(root/'content/lanes/side-discharge-draft.json').write_text(json.dumps({'nodes':nodes,'results':results},ensure_ascii=False,indent=2)+'\n')
print('Imported',len(nodes),'nodes and',len(results),'results for review')
