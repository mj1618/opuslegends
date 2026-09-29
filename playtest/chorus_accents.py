"""
Chorus accent pattern (iteration 9, docs/level/chorus_alignment.md): onset strength (full mix, <200 Hz, 1-5 kHz, HPSS
percussive) and 60 ms RMS at every grid position of every chorus bar vs the verses, lane hits by position, and the
two strongest grid accents per chorus bar. Needs the licensed recording (assets/audio/licensed/jim_edit.ogg).
  tools/music/.venv/bin/python playtest/chorus_accents.py
"""
import json, numpy as np, librosa, scipy.signal as ss, collections
R='/Users/matt/code/opuslegends/'
d=json.load(open(R+'assets/audio/jim_edit.beatmap.json'))
SR=44100
y,_=librosa.load(R+'assets/audio/licensed/jim_edit.ogg',sr=SR,mono=True)
bs=np.array([b['sample'] for b in d['beats']],float)/SR
def b2t(b):
    i=int(np.floor(b)); i=max(0,min(i,len(bs)-2)); f=b-i
    return bs[i]+f*(bs[i+1]-bs[i])
HOP=256
def bandpass(lo,hi):
    sos=ss.butter(4,[lo,hi] if lo else hi,btype='band' if lo else 'low',fs=SR,output='sos'); return ss.sosfiltfilt(sos,y)
yh,yp=librosa.effects.hpss(y)
sigs={'full':y,'low<200':bandpass(None,200),'mid1-5k':bandpass(1000,5000),'perc':yp}
env={}
for k,s in sigs.items():
    o=librosa.onset.onset_strength(y=s,sr=SR,hop_length=HOP,aggregate=np.median if k=='full' else np.mean)
    env[k]=o
ft=librosa.frames_to_time(np.arange(len(env['full'])),sr=SR,hop_length=HOP)
def osamp(k,t):  # max onset in +-25ms
    m=(ft>=t-0.025)&(ft<=t+0.025); return env[k][m].max()
def rms(t,w=0.06):
    a=int(t*SR); s=y[a:a+int(w*SR)]; return 20*np.log10(np.sqrt(np.mean(s**2))+1e-9)
SW=d['audio']['swingRatio']
POS=[('1',0),('&1',SW),('2',1),('&2',1+SW),('3',2),('&3',2+SW),('4',3),('&4',3+SW),('e1',.25),('a1',.75)]
POS=[('1',0),('e1',.25),('&1',SW),('2',1),('&2',1+SW),('3',2),('&3',2+SW),('4',3),('&4',3+SW)]
CH={'chorus1':(88,124),'chorus3':(204,240),'chorus4':(272,308)}
VE={'verse1':(16,80),'verse3':(132,196)}
def table(regions,label):
    rows={k:[] for k in env}; rr=[]; bars=[]
    for name,(a,b) in regions.items():
        for bar0 in range(a,b,4):
            bars.append((name,bar0))
            for k in env:
                v=np.array([osamp(k,b2t(bar0+o)) for _,o in POS]); rows[k].append(v/v.max())
            rr.append(np.array([rms(b2t(bar0+o)) for _,o in POS]))
    print(f'\n=== {label}: {len(bars)} bars; onset strength normalised per bar (max=1), mean±sd ===')
    print('band      '+''.join(f'{p:>11}' for p,_ in POS))
    for k in env:
        A=np.array(rows[k]); print(f'{k:9} '+''.join(f'{m:6.2f}±{s:.2f}'.rjust(11) for m,s in zip(A.mean(0),A.std(0))))
    R_=np.array(rr); R_=R_-R_.max(1,keepdims=True)
    print('RMS60ms dB'+''.join(f'{m:6.1f}±{s:.1f}'.rjust(11) for m,s in zip(R_.mean(0),R_.std(0))))
    return bars,rows
bc,rc=table(CH,'CHORUS (+tag)')
bv,rv=table(VE,'VERSES 1+3')
# per chorus bar index, perc band raw (not per-bar norm), normalized by chorus median beat value
print('\n=== chorus per bar (bar idx 1..9, 9=tag): perc onset raw / chorus median of beats; full mix ===')
for name,(a,b) in CH.items():
    allv=[osamp('perc',b2t(x)) for x in range(a,b)]; med=np.median(allv)
    allf=[osamp('full',b2t(x)) for x in range(a,b)]; medf=np.median(allf)
    print(name)
    for i,bar0 in enumerate(range(a,b,4)):
        v=[osamp('perc',b2t(bar0+o))/med for _,o in POS]; f=[osamp('full',b2t(bar0+o))/medf for _,o in POS]
        top=sorted(zip(f,[p for p,_ in POS],[bar0+o for _,o in POS]),reverse=True)[:3]
        print(f' bar{i+1} b{bar0:3}: perc '+' '.join(f'{p}:{x:.1f}' for (p,_),x in zip(POS,v))+ ' | full top: '+', '.join(f'{p}@{bb:.2f}={x:.1f}' for x,p,bb in top))
# lanes by position
def posname(b,bar0):
    r=b-bar0; best=min(POS,key=lambda p:abs(p[1]-r)); 
    return best[0] if abs(best[1]-r)<0.12 else f'~{r:.2f}'
print('\n=== lane hits by position in chorus bars (+tag) / verses ===')
for label,regs in [('CHORUS',CH),('VERSE',VE)]:
    print(label)
    for lane in ['kick','snare','tom','stomps','claps','cowbell','shouts','piano','fills','bass']:
        c=collections.Counter(); vel=collections.defaultdict(list)
        for e in d['lanes'][lane]:
            for name,(a,b) in regs.items():
                if a<=e['beat']<b:
                    bar0=a+4*int((e['beat']-a+0.2)//4); 
                    if e['beat']-bar0>3.85: bar0+=4
                    p=posname(e['beat'],bar0); c[p]+=1; vel[p].append(e.get('vel',e.get('strength',1)))
        print(f' {lane:8}',' '.join(f'{p}:{n}(v{np.mean(vel[p]):.2f})' for p,n in sorted(c.items(),key=lambda x:-x[1])))
# absolute strongest accents per bar (full + perc combined, off-grid allowed: 8th swing grid)
print('\n=== strongest 2 grid accents per chorus bar (score = mean of full & perc onset, norm by chorus median) ===')
for name,(a,b) in CH.items():
    medf=np.median([osamp('full',b2t(x)) for x in range(a,b)]); medp=np.median([osamp('perc',b2t(x)) for x in range(a,b)])
    out=[]
    for bar0 in range(a,b,4):
        sc=[((osamp('full',b2t(bar0+o))/medf+osamp('perc',b2t(bar0+o))/medp)/2,bar0+o,p) for p,o in POS]
        sc.sort(reverse=True); out.append(f'{bar0}: '+', '.join(f'{bb:.2f}({p}) {s:.1f}' for s,bb,p in sc[:2]))
    print(name); print('  '+'\n  '.join(out))
