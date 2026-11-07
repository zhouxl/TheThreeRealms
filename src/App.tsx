import { useCallback, useEffect, useRef, useState } from 'react';
import World, { type Direction, type InputRef } from './game/World.tsx';
import { firstAvailableSlot, getNearestStation, INCENSE_STEPS, normalizeWish, pickFortune, STATIONS, type IncenseStep, type Ritual, type Station } from './game/rules.ts';
import {advanceIncenseButton, type IncenseAction} from './game/incenseMotion.ts';
import { addBlessingMemory, addFortuneMemory, addIncenseMemory, clearMemories, describeStorageError, deleteBlessingMemory, loadMemories, type Memories } from './game/db.ts';
import { getFortune } from './game/fortuneData.ts';

const INIT_MEMORIES: Memories = {incense:[],fortunes:[],blessings:[]};
const TEMPLATES = [
  {name:'梅花心愿',color:'#e5c9ab',mark:'梅'},
  {name:'祥云祈愿',color:'#a95349',mark:'云'},
  {name:'月下求学',color:'#56667c',mark:'月'},
  {name:'银杏祝愿',color:'#d9b76d',mark:'杏'},
  {name:'竹韵成长',color:'#a8b49a',mark:'竹'},
  {name:'云鹤高飞',color:'#897b93',mark:'鹤'},
];
const INCENSE_WORDS:Record<IncenseStep, {title:string;instruction:string;button:string}> = {
  take: {title:'取一支香',instruction:'双手轻轻取香，感受安静的开始。',button:'取香'},
  light: {title:'点亮香火',instruction:'看香头微亮，一缕烟轻轻升起。',button:'点香'},
  hold: {title:'静心片刻',instruction:'把注意力放在此刻，想一件值得珍惜的事。',button:'继续'},
  bow: {title:'行礼',instruction:'跟随小旅人完成一段克制、平和的行礼。',button:'行礼'},
  bowing: {title:'正在行礼',instruction:'小旅人俯身行礼，稍后自然恢复站姿。',button:'行礼中…'},
  place: {title:'插香',instruction:'将这一份心意留在香炉里。',button:'插香 · 完成'},
  placing: {title:'正在插香',instruction:'香随手缓缓移向香炉，完成动作后保存记录。',button:'插香中…'},
  done: {title:'一炷清香',instruction:'愿此刻的安宁伴你一程。',button:'返回探索'},
};

function nowReadable(date:string){return new Date(date).toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'});}

export default function App(){
  const input=useRef<Record<Direction,boolean>>({up:false,down:false,left:false,right:false}) as InputRef;
  const [entered,setEntered]=useState(false);
  const [nearest,setNearest]=useState<Station|null>(null);
  const [ritual,setRitual]=useState<Ritual>({kind:'explore'});
  const [memories,setMemories]=useState<Memories>(INIT_MEMORIES);
  const [memoryOpen,setMemoryOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [template,setTemplate]=useState(0);
  const [wish,setWish]=useState('愿学业精进，心有所成。');
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [muted,setMuted]=useState(true);
  const ritualRef=useRef(ritual);
  const busyRef=useRef(busy);
  const nearestRef=useRef(nearest);
  ritualRef.current=ritual;
  busyRef.current=busy;
  nearestRef.current=nearest;

  useEffect(()=>{
    let alive=true;
    loadMemories().then(data=>{if(alive)setMemories(data);}).catch(error=>{
      console.error('读取本地纪念失败', error);
      if(alive)setError(`浏览器无法读取本地纪念：${describeStorageError(error)}`);
    });
    return ()=>{alive=false;};
  },[]);

  const interact=useCallback((station:Station)=>{
    if(ritualRef.current.kind!=='explore')return;
    setError(null);
    setRitual(station==='incense'?{kind:'incense',step:'take'}:station==='fortune'?{kind:'fortune',step:'shake'}:{kind:'blessing',step:'edit'});
  },[]);

  useEffect(()=>{
    const mapping:Record<string,Direction>={
      w:'up',arrowup:'up',s:'down',arrowdown:'down',a:'left',arrowleft:'left',d:'right',arrowright:'right',
    };
    const handleDown=(e:KeyboardEvent)=>{
      const target=e.target as HTMLElement;
      if(['INPUT','TEXTAREA','BUTTON','SELECT'].includes(target?.tagName) || target?.isContentEditable)return;
      const key=e.key.toLowerCase();
      if (mapping[key]){ input.current[mapping[key]]=true;e.preventDefault(); }
      if (key==='e' && entered && ritualRef.current.kind==='explore' && nearestRef.current)interact(nearestRef.current);
      if (key==='escape' && !busyRef.current) {setRitual({kind:'explore'});setMemoryOpen(false);setSettingsOpen(false);}
    };
    const handleUp=(e:KeyboardEvent)=>{const direction=mapping[e.key.toLowerCase()];if(direction)input.current[direction]=false;};
    const blur=()=>{for(const k of Object.keys(input.current) as Direction[])input.current[k]=false;};
    window.addEventListener('keydown',handleDown);
    window.addEventListener('keyup',handleUp);
    window.addEventListener('blur',blur);
    return ()=>{window.removeEventListener('keydown',handleDown);window.removeEventListener('keyup',handleUp);window.removeEventListener('blur',blur);};
  },[entered,interact,input]);

  const leave=()=>{
    if(busyRef.current)return;
    setError(null);
    ritualRef.current={kind:'explore'};
    setRitual({kind:'explore'});
  };

  const continueIncense=()=>{
    const current=ritualRef.current;
    if(current.kind!=='incense'||busyRef.current)return;
    if(current.step==='done'){leave();return;}
    const next=advanceIncenseButton(current.step);
    if(next===current.step)return; // A second click cannot skip a running action.
    const target:Ritual={kind:'incense',step:next};
    ritualRef.current=target;
    setRitual(target);
  };

  /** Fired by the render-loop's animation completion event, not by a timer or click. */
  const onIncenseActionComplete=useCallback((action:IncenseAction)=>{
    const current=ritualRef.current;
    if(current.kind!=='incense'||current.step!==action)return; // Cancelled or stale event.
    if(action==='bowing'){
      const target:Ritual={kind:'incense',step:'place'};
      ritualRef.current=target;
      setRitual(target);
      return;
    }
    if(busyRef.current)return;
    busyRef.current=true;
    setBusy(true);
    setError(null);
    void addIncenseMemory().then(memory=>{
      const active=ritualRef.current;
      if(active.kind!=='incense'||active.step!=='placing')return;
      setMemories(prev=>({...prev,incense:[...prev.incense,memory]}));
      const target:Ritual={kind:'incense',step:'done'};
      ritualRef.current=target;
      setRitual(target);
    }).catch(error=>{
      console.error('上香纪念保存失败',error);
      setError(`插香动作已完成，但本地记录未保存：${describeStorageError(error)} 请重试「插香 · 完成」。`);
      const active=ritualRef.current;
      if(active.kind==='incense' && active.step==='placing'){
        const target:Ritual={kind:'incense',step:'place'};
        ritualRef.current=target;
        setRitual(target);
      }
    }).finally(()=>{
      busyRef.current=false;
      setBusy(false);
    });
  },[]);

  const drawFortune=async()=>{
    if(ritual.kind!=='fortune'||ritual.step!=='shake'||busy)return;
    const n=pickFortune(Math.random());
    setBusy(true);
    try{
      const memory=await addFortuneMemory(n);
      setMemories(prev=>({...prev,fortunes:[...prev.fortunes,memory]}));
    }catch(error){
      console.error('签文历史保存失败', error);
      setError(`签号已揭晓但历史尚未保存：${describeStorageError(error)}`);
    }
    finally{setBusy(false);setRitual({kind:'fortune',step:'reading',number:n});}
  };
  const hangBlessing=async()=>{
    if(ritual.kind!=='blessing'||ritual.step!=='edit'||busy)return;
    const clean=normalizeWish(wish);
    if(!clean){setError('请先写下一句祝愿。');return;}
    const slot=firstAvailableSlot(memories.blessings.map(b=>b.slot));
    if(slot===null){setError('福牌架已经挂满，可以先在「我的纪念」中移除旧福牌。');return;}
    setError(null);setBusy(true);
    try{
      const record=await addBlessingMemory(clean,template,slot);
      setMemories(prev=>({...prev,blessings:[...prev.blessings,record]}));
      setRitual({kind:'blessing',step:'done',slotId:slot});
    }catch(error){
      console.error('福牌保存失败', error);
      setError(`福牌未保存：${describeStorageError(error)}`);
    }
    finally{setBusy(false);}
  };
  const removeBlessing=async(id:string)=>{
    try{await deleteBlessingMemory(id);setMemories(prev=>({...prev,blessings:prev.blessings.filter(b=>b.id!==id)}));}
    catch{setError('删除失败，请重试。');}
  };
  const clearAll=async()=>{
    if(!window.confirm('要清除本浏览器中的上香、求签和福牌纪念吗？此操作无法撤销。'))return;
    try{setMemories(await clearMemories());setError(null);}catch{setError('清除失败，请重试。');}
  };
  const setDirection=(direction:Direction,active:boolean)=>{input.current[direction]=active;};
  return <div className="app">
    <div className="sky-glow"/>
    <div className="game-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-seal">观</div><div><strong>山间文昌殿</strong><small>THE THREE REALMS · 云上道观</small></div></div>
        <div className="top-actions">
          <button onClick={()=>{setMemoryOpen(true);setSettingsOpen(false);}} title="我的纪念" aria-label="我的纪念">纪念 <span>{memories.blessings.length+memories.fortunes.length}</span></button>
          <button onClick={()=>{setSettingsOpen(true);setMemoryOpen(false);}} title="设置">设置</button>
        </div>
      </header>
      <div className="scene-wrap">
        <World input={input} ritual={ritual} blessings={memories.blessings} incenseCount={memories.incense.length} onIncenseActionComplete={onIncenseActionComplete} ready={entered && !memoryOpen && !settingsOpen} onNearby={setNearest} onInteract={interact}/>
        <div className="scene-caption"><span className="caption-dash"/>山有清风 · 殿有书香</div>
        {entered && ritual.kind==='explore' && nearest && <button className="interact-hint" onClick={()=>interact(nearest)}><kbd>E</kbd>{STATIONS[nearest].label}<span>↗</span></button>}
        {entered && ritual.kind==='explore' && <div className="move-guide">W A S D 移动 · 拖动场景调整视角 · E 互动</div>}
        {entered && ritual.kind==='explore' && <div className="mobile-dpad" aria-label="移动控制">
          {(['up','left','down','right'] as const).map(dir=><button key={dir} className={`dpad-${dir}`} aria-label={`向${{up:'前',down:'后',left:'左',right:'右'}[dir]}移动`}
            onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);setDirection(dir,true);}}
            onPointerUp={()=>setDirection(dir,false)} onPointerCancel={()=>setDirection(dir,false)} onLostPointerCapture={()=>setDirection(dir,false)}>{({up:'↑',down:'↓',left:'←',right:'→'}[dir])}</button>)}
        </div>}
        {!entered && <div className="intro-screen">
          <div className="intro-content"><div className="eyebrow">一座藏在山间的小观</div><h1>走进文昌殿</h1><p>听风穿过木檐，看一缕香烟缓缓升起。<br/>在这里，求一支签，留下一份心愿。</p>
            <button className="primary-button" onClick={()=>setEntered(true)}>进入道观 <span>↗</span></button>
            <small>无需账号 · 自由探索 · 纪念只保存在当前浏览器</small>
          </div>
        </div>}
        {entered && ritual.kind!=='explore' && <div className="ritual-backdrop">
          <section className="ritual-panel" aria-label="当前仪式">
            <button className="close-button" onClick={leave} disabled={busy} aria-label="返回探索">×</button>
            {ritual.kind==='incense' && <>
              <span className="panel-overline">清香一炷 · 静心片刻</span>
              <div className="ritual-symbol">香</div>
              <h2>{INCENSE_WORDS[ritual.step].title}</h2><p>{INCENSE_WORDS[ritual.step].instruction}</p>
              <div className="step-progress">{INCENSE_STEPS.map(step=><span key={step} className={INCENSE_STEPS.indexOf(step)<=INCENSE_STEPS.indexOf(ritual.step==='bowing'?'bow':ritual.step==='placing'?'place':ritual.step)?'current':''}/>)}</div>
              <button className="primary-button" onClick={continueIncense} disabled={busy || ritual.step==='bowing' || ritual.step==='placing'}>{busy?'保存中…':INCENSE_WORDS[ritual.step].button}</button>
              <small>拖动场景可环绕查看动作 · 桌面滚轮可调整远近</small>
            </>}
            {ritual.kind==='fortune' && ritual.step==='shake' && <>
              <span className="panel-overline">文昌签 · 原创文化体验</span><div className="ritual-symbol">签</div>
              <h2>静心，求一支签</h2><p>轻轻摇动竹签，看看今日有哪些值得思考的话。</p>
              <button className="primary-button" onClick={drawFortune} disabled={busy}>摇签 · 揭晓</button>
              <small>签诗用于文化欣赏与自我启发，不预测现实结果。</small>
            </>}
            {ritual.kind==='fortune' && ritual.step==='reading' && ritual.number && <>
              <span className="panel-overline">文昌签 · 第 {ritual.number} 签</span><div className="ritual-symbol">{ritual.number}</div>
              <h2>{getFortune(ritual.number).title}</h2>
              <blockquote className="fortune-poem">{getFortune(ritual.number).poem}</blockquote>
              <p><strong>留给自己的话：</strong>{getFortune(ritual.number).reflection}</p>
              <div className="panel-actions"><button className="primary-button" onClick={leave}>收好签文 · 继续探索</button></div>
              <small>原创签文，非历史灵签或命运预测。</small>
            </>}
            {ritual.kind==='blessing' && ritual.step==='edit' && <>
              <span className="panel-overline">留福于此 · 只属于你</span><h2>写下一份心愿</h2>
              <p>选择一块木牌，把此刻想珍惜的话留在殿里。</p>
              <div className="template-list" role="group" aria-label="福牌样式">
                {TEMPLATES.map((t,i)=><button key={i} aria-label={t.name} title={t.name} className={template===i?'selected':''} style={{backgroundColor:t.color}} onClick={()=>setTemplate(i)}>{t.mark}</button>)}
              </div>
              <label className="wish-label" htmlFor="wish">我的祝愿 <span>{[...normalizeWish(wish)].length} / 60</span></label>
              <textarea id="wish" value={wish} maxLength={60} onChange={e=>setWish(e.target.value)} rows={3} placeholder="愿每一步都有收获……" />
              <p className="privacy-note">仅存储在当前浏览器，不向其他访客展示。</p>
              <button className="primary-button" onClick={hangBlessing} disabled={busy}>{busy?'保存中…':'挂上福牌'}</button>
            </>}
            {ritual.kind==='blessing' && ritual.step==='done' && <>
              <span className="panel-overline">一份祝愿 · 一处记忆</span><div className="ritual-symbol">福</div>
              <h2>心愿已挂好</h2><p>木牌轻轻摇晃。下次再来，仍能在这儿找到它。</p>
              <p className="privacy-note">挂点编号：{ritual.slotId} · 当前浏览器私有</p>
              <button className="primary-button" onClick={leave}>继续探索</button>
            </>}
          </section>
        </div>}
        {memoryOpen && <div className="modal-overlay" onClick={()=>setMemoryOpen(false)}><section className="side-panel" onClick={e=>e.stopPropagation()} aria-label="我的纪念">
          <div className="side-heading"><div><span className="panel-overline">一路所见，皆可珍藏</span><h2>我的纪念</h2></div><button onClick={()=>setMemoryOpen(false)} aria-label="关闭">×</button></div>
          <div className="memory-summary"><div><strong>{memories.incense.length}</strong><span>上香</span></div><div><strong>{memories.fortunes.length}</strong><span>求签</span></div><div><strong>{memories.blessings.length}</strong><span>福牌</span></div></div>
          <h3>留在殿里的福牌</h3>
          {memories.blessings.length===0?<p className="empty-state">还没有留下福牌。走向殿内右侧的木架，写下第一份心愿。</p>:memories.blessings.map(b=><div className="memory-entry" key={b.id}><span className="memory-tag" style={{background:TEMPLATES[b.template]?.color??'#c9ab80'}}>福</span><div><strong>{b.content}</strong><small>{nowReadable(b.createdAt)} · 挂点 {b.slot}</small></div><button onClick={()=>removeBlessing(b.id)}>移除</button></div>)}
          <h3>最近求得的签</h3>
          {memories.fortunes.length===0?<p className="empty-state">还没有求签记录。</p>:memories.fortunes.slice().reverse().slice(0,10).map(f=><div className="fortune-entry" key={f.id}><span>第 {f.number} 签 · {getFortune(f.number).title}</span><small>{nowReadable(f.createdAt)}</small></div>)}
          <button className="danger-text" onClick={clearAll}>清除全部本地纪念</button>
        </section></div>}
        {settingsOpen && <div className="modal-overlay" onClick={()=>setSettingsOpen(false)}><section className="side-panel compact-panel" onClick={e=>e.stopPropagation()}><div className="side-heading"><h2>设置与说明</h2><button onClick={()=>setSettingsOpen(false)}>×</button></div>
          <p>当前是单人 3D 灰盒原型；神像和角色由程序化模型暂代，后续替换为正式 GLB 美术资产。</p>
          <div className="setting-row"><span>声音（后续接入环境音）</span><button onClick={()=>setMuted(!muted)}>{muted?'静音中':'已开启'}</button></div>
          <h3>操作</h3><p>电脑：WASD / 方向键移动，拖动场景调整镜头，靠近目标后按 E 互动。手机：左下方向按钮移动，拖动场景调整镜头。</p>
          <h3>隐私</h3><p>求签与自定义福牌文字只存储在本地 IndexedDB，清除网站数据或切换浏览器会丢失。没有登录、跨设备同步或多人展示。</p>
          <h3>文化说明</h3><p>文昌殿为原创风格化数字场景。游戏中的签诗为原创文化文本，不提供现实预测或宗教服务。</p>
        </section></div>}
        {error && <div className="error-banner" role="alert">{error}<button onClick={()=>setError(null)} aria-label="关闭错误提示">×</button></div>}
      </div>
      <footer className="footer"><span>山间有清风，静处自有光。</span><span>GRAYBOX PROTOTYPE · V1.1</span></footer>
    </div>
  </div>;
}
