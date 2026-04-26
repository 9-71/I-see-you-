import React, { useState, useEffect, useCallback, useMemo, useRef, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { 
  RefreshCw, 
  Heart, 
  Download,
  PenTool, 
  X, 
  Check,
  Disc,
  Clock,
  Plus,
  Image as ImageIcon,
  Lock,
  Search,
  MoreVertical,
  Filter,
  Radio,
  Zap,
  RotateCw,
  Tractor,
  Trophy,
  ArrowRight
} from 'lucide-react';

// --- Types & Constants ---

type AppState = 'STAGE_HEAL' | 'STAGE_WRITE' | 'STAGE_FAKE' | 'STAGE_BUDDY' | 'STAGE_CHAT';

type FrequencyMode = 'FM_66.6' | 'FM_88.8';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

interface Sticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
  rotate: number;
  scale: number;
}

interface Message {
  id: string;
  text: string;
  color: string;
  authorName?: string;
  stickers?: Sticker[];
  relatableCount?: number;
  godTierCount?: number;
  funnyCount?: number;
}

interface UserStats {
  disasterCount: number;
  healingCount: number;
}

interface FrequencyConfig {
  mode: FrequencyMode;
  title: string;
  slogan: string;
  primaryColor: string;
  noteColors: string[];
  stickers: { id: string, emoji: string, label: string }[];
  writeBtnText: string;
  writePrompt: string;
  bgClass: string;
}

const FREQUENCY_CONFIGS: Record<FrequencyMode, FrequencyConfig> = {
  'FM_66.6': {
    mode: 'FM_66.6',
    title: 'FM 66.6 Chaos FM',
    slogan: '小小的老子总能捅大大的篓子',
    primaryColor: '#8b5cf6', // Deep Purple
    noteColors: ['#a855f7', '#22c55e', '#f97316', '#1a1a1a'], // Purple, Green, Orange, Black
    stickers: [
      { id: 'f_clown', emoji: '🤡', label: '你真行' },
      { id: 'f_mug', emoji: '☕', label: '打碎的心' },
      { id: 'f_fire', emoji: '🔥', label: '烧杯' },
      { id: 'f_ghost', emoji: '👻', label: '穷鬼' },
      { id: 'f_poop', emoji: '💩', label: '谢了' },
      { id: 'f_broken', emoji: '💔', label: '心碎' },
    ],
    writeBtnText: '别急..我有话说...',
    writePrompt: '今天又闯了什么惊天大祸？写在大群里的吐槽撤回了吗？',
    bgClass: 'bg-[#120a1f]'
  },
  'FM_88.8': {
    mode: 'FM_88.8',
    title: 'FM 88.8 Healing Wave',
    slogan: '宝子我懂你',
    primaryColor: '#10b981', 
    noteColors: ['#fff9c4', '#f8bbd0', '#c8e6c9', '#e1f5fe', '#fff3e0'],
    stickers: [
      { id: 'w_cat', emoji: '🐱', label: '大胖猫' },
      { id: 'w_flower', emoji: '🌸', label: '小雏菊' },
      { id: 'w_coffee', emoji: '☕', label: '热气咖啡' },
      { id: 'w_sun', emoji: '☀️', label: '小太阳' },
      { id: 'w_heart', emoji: '❤️', label: '爱心' },
      { id: 'w_cloud', emoji: '☁️', label: '轻云' },
    ],
    writeBtnText: '真好，我也有话说',
    writePrompt: '有什么想对另一位牛马说的？在这里，你的辛苦会被接住。',
    bgClass: 'meadow-bg'
  }
};

// --- Components ---

const DraggableSticker: React.FC<{ 
  sticker: Sticker; 
  onDragEnd?: (id: string, x: number, y: number) => void;
  onScaleChange?: (id: string, scale: number) => void;
  onDelete?: (id: string) => void;
  isEditable?: boolean;
  constraintsRef?: React.RefObject<HTMLDivElement>;
}> = ({ sticker, onDragEnd, onScaleChange, onDelete, isEditable, constraintsRef }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      drag={isEditable}
      dragConstraints={constraintsRef}
      onDragEnd={(_, info) => {
        if (onDragEnd && constraintsRef?.current) {
          const rect = constraintsRef.current.getBoundingClientRect();
          const x = ((info.point.x - rect.left) / rect.width) * 100;
          const y = ((info.point.y - rect.top) / rect.height) * 100;
          onDragEnd(sticker.id, x, y);
        }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ scale: 0, rotate: sticker.rotate }}
      animate={{ scale: sticker.scale || 1, rotate: sticker.rotate }}
      className={`absolute select-none z-20 ${isEditable ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
      style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, transform: 'translate(-50%, -50%)' }}
    >
      <div className="relative text-6xl">
        <span className="drop-shadow-xl">{sticker.emoji}</span>
        {isEditable && isHovered && (
          <button
            onClick={() => onDelete?.(sticker.id)}
            className="absolute -top-3 -left-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] border-2 border-white"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

const Danmaku = ({ messages }: { messages: Message[] }) => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden danmaku-container opacity-20">
      {messages.slice(0, 8).map((m, i) => (
        <div 
          key={m.id} 
          className="danmaku-item absolute text-white text-[12px] font-bold tracking-widest opacity-40"
          style={{ 
            top: `${15 + i * 10}%`, 
            animationDelay: `${i * 1.5}s`,
            animationDuration: `${15 + Math.random() * 10}s`
          }}
        >
          {m.text}
        </div>
      ))}
    </div>
  );
};

const AnimatedRadioIcon = ({ isGlitching }: { isGlitching: boolean }) => {
  return (
    <div className="relative group">
      <div className={`p-3 bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 rounded-2xl shadow-[0_0_20px_rgba(236,72,153,0.3)] radio-animated-icon ${isGlitching ? 'glitch-effect' : ''} transition-all group-hover:scale-110 active:scale-95`}>
        <Radio className="w-5 h-5 text-white" />
      </div>
      <div className="absolute -top-1 -right-1">
        <div className="relative">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75" />
        </div>
      </div>
    </div>
  );
};

const TypewriterMessage = ({ text, authorName, onProfileClick, onReadMore }: { text: string; authorName?: string; onProfileClick?: () => void; onReadMore: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  const isLong = text.length > 80; 
  
  const fontSize = useMemo(() => {
    const len = text.length;
    if (len < 40) return 'text-[16px]';
    return 'text-[14px]';
  }, [text]);

  useEffect(() => {
    setDisplayedText('');
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, index));
      index++;
      if (index > text.length) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 relative cursor-pointer" onClick={(e) => { e.stopPropagation(); if (isLong) onReadMore(); }}>
      {authorName && (
        <button 
          onClick={(e) => { e.stopPropagation(); onProfileClick?.(); }}
          className="absolute top-5 left-1/2 -translate-x-1/2 z-20 text-[9px] font-black bg-black/5 hover:bg-black/10 px-3 py-1 rounded-full border border-black/10 transition-all tracking-widest text-black/60 uppercase whitespace-nowrap"
        >
          @{authorName}
        </button>
      )}
      <div className="flex-grow flex flex-col items-center justify-center w-full mt-4">
        <div className="relative w-full text-center px-4">
          <p className={`font-handwriting text-[#3e2723] ${fontSize} leading-relaxed select-none italic font-medium break-words overflow-hidden ${isLong ? 'line-clamp-3 opacity-90' : ''}`}>
            {displayedText}<span className="animate-pulse font-sans opacity-30 ml-0.5">|</span>
          </p>
        </div>
        
        {isLong && (
          <div className="mt-8 flex flex-col items-center gap-1 animate-breathing shrink-0">
            <div className="flex items-center gap-2 text-[10px] font-black text-black/60 tracking-[0.2em] uppercase bg-black/5 px-4 py-1.5 rounded-full">
              📖 点击查看全文
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FullReader = ({ isOpen, text, color, authorName, onClose }: { isOpen: boolean; text: string; color: string; authorName?: string; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 z-[1200] bg-white flex flex-col"
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />
          
          <header className="relative shrink-0 p-6 flex justify-between items-center border-b border-black/5">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[10px] font-black tracking-widest text-black/30 uppercase">Full Record · 档案全文</span>
             </div>
             <button onClick={onClose} className="p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors">
               <X className="w-5 h-5 text-black" />
             </button>
          </header>

          <main className="flex-grow overflow-y-auto p-10 custom-scrollbar overscroll-contain bg-white">
             <div className="max-w-2xl mx-auto space-y-12">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-2xl shadow-inner">👤</div>
                   <div>
                     <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Source Transmission</p>
                     <p className="text-xl font-black text-black">@{authorName || '匿名听众'}</p>
                   </div>
                 </div>
                 <div className="px-4 py-2 bg-black text-white text-[10px] font-black rounded-full tracking-widest uppercase">
                   Verified Record
                 </div>
               </div>
               
               <div className="relative p-12 min-h-[50vh] flex items-center justify-center rounded-[48px] shadow-2xl overflow-hidden" style={{ backgroundColor: color }}>
                  <div className="absolute inset-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/fiber-paper.png')]" />
                  {/* Decorative corner element */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-black/5 rounded-bl-[100px]" />
                  
                  <p className="font-handwriting text-3xl text-[#3e2723] leading-[1.7] text-center max-w-lg z-10">
                    {text}
                  </p>
               </div>

               <div className="flex flex-col items-center gap-4 py-12 opacity-30">
                  <div className="w-12 h-[2px] bg-black" />
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.6em]">End_Of_Document</p>
                  <p className="text-[9px] font-mono italic">Capture Frequency Hash: {Math.random().toString(36).substring(7).toUpperCase()}</p>
               </div>
             </div>
          </main>

          <footer className="relative shrink-0 p-8 border-t border-black/5">
            <button 
              onClick={onClose} 
              className="w-full py-5 bg-black text-white rounded-3xl font-black tracking-[0.3em] uppercase text-xs shadow-xl active:scale-95 transition-transform"
            >
              返回电台
            </button>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const KPIReport = ({ onExit }: { onExit: () => void }) => {
  return (
    <div className="fixed inset-0 z-[9500] bg-white text-black font-sans flex flex-col select-none overflow-hidden">
      <div className="bg-[#217346] text-white p-2 flex items-center justify-between">
        <span className="font-bold text-sm px-2">2026年Q2核心效能监控表.xlsx</span>
        <button onClick={onExit} className="bg-red-600 px-3 py-1 rounded text-xs font-bold">退出监控</button>
      </div>
      <div className="flex-grow overflow-auto p-4">
        <table className="w-full border-collapse text-[11px]">
           <thead><tr className="bg-gray-100">{['姓名', '工号', '状态', '效率', '备注'].map(h => <th key={h} className="border p-2 text-left">{h}</th>)}</tr></thead>
           <tbody>
             <tr>
               <td className="border p-2 bg-red-100 text-red-600 font-black cursor-pointer hover:bg-red-200" onClick={onExit}>[退出监控]</td>
               <td className="border p-2 font-mono text-red-400">EXIT_NODE_001</td>
               <td className="border p-2 text-red-600 font-bold">终止会话</td>
               <td className="border p-2">0.0</td>
               <td className="border p-2">点击此单元格返回</td>
             </tr>
             {Array.from({ length: 20 }).map((_, i) => (
                <tr key={i}>
                  <td className="border p-2">实习生_{100 + i}</td>
                  <td className="border p-2 font-mono">ITN_{202600 + i}</td>
                  <td className="border p-2 text-green-600 font-bold">监控中</td>
                  <td className="border p-2">{(Math.random() * 2).toFixed(1)}</td>
                  <td className="border p-2">---</td>
                </tr>
             ))}
           </tbody>
        </table>
      </div>
    </div>
  );
};

const Leaderboard = ({ isOpen, onClose, messages, onSelectMessage }: { isOpen: boolean; onClose: () => void; messages: Message[]; onSelectMessage: (id: string) => void }) => {
  const categories = [
    { title: '[必错榜]', key: 'relatableCount' as const, color: 'text-orange-500' },
    { title: '[大神榜]', key: 'godTierCount' as const, color: 'text-red-500' },
    { title: '[最夯笑料榜]', key: 'funnyCount' as const, color: 'text-amber-500' },
  ];

  const getTop3 = (key: 'relatableCount' | 'godTierCount' | 'funnyCount') => {
    return [...messages]
      .filter(m => (m[key] || 0) > 0)
      .sort((a, b) => (b[key] || 0) - (a[key] || 0))
      .slice(0, 3);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 z-[8000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20 }} 
            animate={{ scale: 1, y: 0 }} 
            exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-md max-h-[85vh] bg-[#121212] border border-white/10 rounded-[40px] px-8 py-10 flex flex-col overflow-hidden relative shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-6 right-6 z-10">
              <button onClick={onClose} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="shrink-0 mb-8 pr-12">
              <h2 className="text-3xl font-black text-white italic tracking-tighter">实习生神人榜</h2>
              <p className="text-[10px] text-white/30 font-mono tracking-[0.3em] mt-1 uppercase">Intern God-tier Ranking • TOP 3</p>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 space-y-10 custom-scrollbar">
              {categories.map(cat => {
                const top3 = getTop3(cat.key);
                return (
                  <div key={cat.title}>
                    <h3 className={`text-[11px] font-black mb-5 tracking-[0.2em] border-l-2 pl-3 ${cat.color}`}>{cat.title}</h3>
                    <div className="space-y-4">
                      {top3.length > 0 ? top3.map((m, i) => (
                        <div 
                          key={m.id} 
                          onClick={() => onSelectMessage(m.id)}
                          className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 group active:bg-white/10 transition-colors cursor-pointer"
                        >
                          <span className="text-2xl font-black italic text-white/10 group-hover:text-white/20 transition-colors">0{i+1}</span>
                          <div className="flex-grow min-w-0">
                            <p className="text-white/90 text-sm font-bold truncate leading-tight mb-1">"{m.text}"</p>
                            <p className="text-[10px] text-white/30 font-medium">@{m.authorName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[11px] font-black font-mono text-white/80">{m[cat.key] || 0}</span>
                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">PTS</span>
                          </div>
                        </div>
                      )) : (
                        <div className="py-8 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center opacity-30">
                           <Tractor className="w-6 h-6 mb-2" />
                           <p className="text-[10px] font-bold tracking-widest uppercase">暂无记录</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 mt-8">
              <button onClick={onClose} className="w-full py-4 bg-white text-black rounded-2xl font-black tracking-widest text-xs uppercase shadow-xl active:scale-95 transition-transform">返回电台</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- MAIN APP ---

export default function App() {
  return (
    <MainApp />
  );
}

function MainApp() {
  const [appState, setAppState] = useState<AppState>('STAGE_HEAL');
  const [activeFrequency, setActiveFrequency] = useState<FrequencyMode>(
    Math.random() > 0.5 ? 'FM_88.8' : 'FM_66.6'
  );
  const [isGlitching, setIsGlitching] = useState(false);
  
  const [allMessages, setAllMessages] = useState<Record<FrequencyMode, Message[]>>({
    'FM_66.6': [],
    'FM_88.8': []
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isTearing, setIsTearing] = useState(false);
  const [isPosterVisible, setIsPosterVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [selectedStickers, setSelectedStickers] = useState<Sticker[]>([]);
  const [healingCount, setHealingCount] = useState(1204); 
  
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [authorStats, setAuthorStats] = useState<UserStats>({ disasterCount: 0, healingCount: 0 });
  
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [showBuddyCard, setShowBuddyCard] = useState(false);
  const [buddyInfo, setBuddyInfo] = useState<{ name: string; emoji: string; intro: string } | null>(null);
  
  const [activeNoteColor, setActiveNoteColor] = useState(FREQUENCY_CONFIGS[activeFrequency].noteColors[0]);
  const editorRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  const currentConfig = FREQUENCY_CONFIGS[activeFrequency];

  useEffect(() => {
    const chaos = JSON.parse(localStorage.getItem('radio_chaos_msgs') || 'null') || [
      { id: 'c1', text: '去动物园实习，忘记锁门了，放跑了好几只卡皮巴拉', authorName: '打工仔007', color: '#e0e0e0', stickers: [{ id: 's1', emoji: '🤡', x: 80, y: 80, rotate: 10, scale: 2 }], relatableCount: 24, godTierCount: 5, funnyCount: 88 },
      { id: 'c2', text: '实习第一天，把正式环境的库给 Drop 了，现在全组都在陪我通宵。', authorName: '英雄王', color: '#fca5a5', stickers: [{ id: 's2', emoji: '💩', x: 85, y: 15, rotate: -20, scale: 2.2 }], relatableCount: 42, godTierCount: 99, funnyCount: 15 },
      { id: 'c3', text: '离职流程搞错了，一不小心把经理开了，给经理走了个离职流程...', authorName: '摸鱼达人', color: '#fdba74', stickers: [], relatableCount: 102, godTierCount: 12, funnyCount: 240 },
      { id: 'c4', text: '谢谢老师发成谢谢老公，虽然我秒撤但是对面也秒回了', authorName: '迷糊鬼', color: '#e0e0e0', stickers: [], relatableCount: 156, godTierCount: 8, funnyCount: 412 },
      { id: 'c5', text: '在厕所吐槽主管，抬头发现他就在隔壁坑位，还给我递了张纸。', authorName: '社死专家', color: '#ddd6fe', stickers: [], relatableCount: 89, godTierCount: 33, funnyCount: 188 },
      { id: 'c6', text: '错把周报发给了竞争对手，老板还没发现，我该坦白吗？', authorName: '内鬼本鬼', color: '#fca5a5', relatableCount: 12, godTierCount: 45, funnyCount: 22 }
    ];
    const healing = JSON.parse(localStorage.getItem('radio_healing_msgs') || 'null') || [
      { id: 'h1', text: '早点回家吧，今晚月亮很美，记得做个好梦。', authorName: '温柔猫猫', color: '#fff9c4', stickers: [{ id: 's3', emoji: '🐱', x: 85, y: 85, rotate: -15, scale: 2.5 }] },
      { id: 'h2', text: '我看见了你的努力，那些没人在意的细节，其实都在发光。不要否定自己。', authorName: '路人A', color: '#c8e6c9', stickers: [{ id: 's4', emoji: '🌸', x: 15, y: 85, rotate: 10, scale: 2.2 }] },
      { id: 'h3', text: '辛苦了，如果累了就歇一歇，世界不会因为你停下脚步而崩塌。', authorName: '星球居民', color: '#fff3e0' },
      { id: 'h4', text: '没关系的，汤洒了也就是一顿饭的事，抱抱你，别难过了。', authorName: '小太阳', color: '#f8bbd0' },
      { id: 'h5', text: '明天又是新的一天，你已经做得很好了，相信自己，你是最棒的。', authorName: '信使', color: '#e1f5fe' },
      { id: 'h6', text: '风在摇它的叶子，草在结它的种子，你只需要做你自己。', authorName: '大自然', color: '#c8e6c9' }
    ];
    setAllMessages({ 'FM_66.6': chaos, 'FM_88.8': healing });
    
    const timer = setInterval(() => setHealingCount(p => p + (Math.random() > 0.8 ? 1 : 0)), 5000);
    return () => clearInterval(timer);
  }, []);

  const handleInteraction = (key: 'relatableCount' | 'godTierCount' | 'funnyCount') => {
    if (!currentMsg || activeFrequency !== 'FM_66.6') return;
    
    // Animation trigger (vibration)
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);

    const updatedMessages = [...allMessages['FM_66.6']];
    const targetIdx = updatedMessages.findIndex(m => m.id === currentMsg.id);
    if (targetIdx !== -1) {
      updatedMessages[targetIdx] = {
        ...updatedMessages[targetIdx],
        [key]: (updatedMessages[targetIdx][key] || 0) + 1
      };
      setAllMessages({ ...allMessages, 'FM_66.6': updatedMessages });
      localStorage.setItem('radio_chaos_msgs', JSON.stringify(updatedMessages));
    }

    // Floating +1 Animation
    const targetBtn = document.getElementById(`btn-${key}`);
    if (targetBtn) {
      const plusOne = document.createElement('div');
      plusOne.className = 'absolute top-0 left-1/2 -translate-x-1/2 text-white font-black text-xl animate-plus-one pointer-events-none z-50';
      plusOne.innerText = '+1';
      targetBtn.appendChild(plusOne);
      setTimeout(() => plusOne.remove(), 800);
    }
  };

  const openProfile = (author: string) => {
    setSelectedAuthor(author);
    // Generate some stable random stats for user
    const hash = author.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    setAuthorStats({
      disasterCount: (hash % 10) + 1,
      healingCount: (hash % 50) + 5
    });
    setIsProfileVisible(true);
  };

  useEffect(() => {
    setActiveNoteColor(currentConfig.noteColors[0]);
    setCurrentIdx(0);
  }, [activeFrequency, currentConfig.noteColors]);

  const switchFrequency = () => {
    setIsGlitching(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => {
      setActiveFrequency(f => f === 'FM_88.8' ? 'FM_66.6' : 'FM_88.8');
      setTimeout(() => setIsGlitching(false), 300);
    }, 400);
  };

  const handleLeaderboardJump = (msgId: string) => {
    const idx = allMessages['FM_66.6'].findIndex(m => m.id === msgId);
    if (idx !== -1) {
      setCurrentIdx(idx);
      setIsLeaderboardOpen(false);
    }
  };

  const currentMessages = allMessages[activeFrequency];
  const currentMsg = currentMessages?.[currentIdx];

  const handleNext = useCallback(() => {
    if (isTearing || isGlitching) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
    setIsTearing(true);
    setTimeout(() => {
      setCurrentIdx((prev) => (prev + 1) % (currentMessages.length || 1));
      setTimeout(() => setIsTearing(false), 50); // Small grace period
    }, 600);
  }, [currentMessages.length, isTearing, isGlitching]);

  const handleSubmit = () => {
    if (!newMessage.trim()) return;
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      text: newMessage,
      authorName: `牛马_${Math.floor(Math.random() * 8999 + 1000)}`,
      color: activeNoteColor,
      stickers: selectedStickers,
    };
    const updated = [newMsg, ...allMessages[activeFrequency]].slice(0, 50);
    setAllMessages({ ...allMessages, [activeFrequency]: updated });
    localStorage.setItem(activeFrequency === 'FM_66.6' ? 'radio_chaos_msgs' : 'radio_healing_msgs', JSON.stringify(updated));
    setIsSubmitting(true);
    setTimeout(() => {
      setNewMessage('');
      setSelectedStickers([]);
      setAppState('STAGE_HEAL');
      setIsSubmitting(false);
      setCurrentIdx(0);
    }, 800);
  };

  const addStickerToEditor = (sticker: typeof currentConfig.stickers[0]) => {
    setSelectedStickers([{ id: `stk-${Date.now()}`, emoji: sticker.emoji, x: 80, y: 80, rotate: Math.random()*40-20, scale: 2 }]);
  };

  const downloadPoster = async () => {
    if (!posterRef.current) return;
    try {
      const canvas = await html2canvas(posterRef.current, { scale: 2, useCORS: true, backgroundColor: '#000' });
      const link = document.createElement('a');
      link.download = `radio-poster-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) { console.error(err); }
  };

  const enterCamouflage = () => setAppState('STAGE_FAKE');
  const exitCamouflage = () => setAppState('STAGE_HEAL');

  const startMatching = () => {
    setIsMatching(true);
    setTimeout(() => {
      setIsMatching(false);
      const isHuman = Math.random() < 0.3;
      if (isHuman) {
        const humanBuddies = [
          { name: '代码裁缝侠', emoji: '🪡', intro: '擅长在各种屎山代码中缝合出奇迹，目前已缝合2048个Bug。' },
          { name: '文档撤回大师', emoji: '↩️', intro: '手速极快，吐槽刚发出即撤回，目前保持着全司最快手速记录。' },
          { name: '午餐拼单判官', emoji: '⚖️', intro: '对满减优惠券有着精准的直觉，是全司公认的省钱小能手。' },
          { name: 'PPT渲染仙人', emoji: '🎨', intro: '能把一张空白PPT渲染出五彩斑斓的黑。' }
        ];
        setBuddyInfo(humanBuddies[Math.floor(Math.random() * humanBuddies.length)]);
        setShowBuddyCard(true);
      } else {
        const welcome = activeFrequency === 'FM_66.6' 
            ? "我是 FM 66.6 的灵魂接线员，听说你今天又捅篓子了？" 
            : "你好哟，FM 88.8 接线员上线。感觉到你今天有点累，要不要我抱抱你？";
        setChatMessages([{ id: '1', role: 'ai', text: welcome }]);
        setAppState('STAGE_CHAT');
      }
    }, 2000);
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const responses = activeFrequency === 'FM_66.6' ? [
        "只要我不尴尬，尴尬的就是别人。你那事儿真不算大。",
        "老板最近发际线又退了，他估计没心思管你。放宽心。",
        "实习期的离谱事儿多了去了，去年有个哥们直接把公司服务器当矿机了，你这顶多算毛毛雨。"
      ] : [
        "辛苦啦，在这个城市里，你不是一个人在战斗。",
        "深呼吸... 现在的烦恼，到明年这时候看真的什么都不是。",
        "去做点让自己开心的事吧，你值得被温柔对待。"
      ];
      const aiMsg: ChatMessage = { id: (Date.now()+1).toString(), role: 'ai', text: responses[Math.floor(Math.random() * responses.length)] };
      setChatMessages(prev => [...prev, aiMsg]);
    }, 1500);
  };

  return (
    <div className={`relative h-[100dvh] w-full overflow-hidden flex flex-col items-center font-sans select-none transition-colors duration-700 ${currentConfig.bgClass}`}>
      
      <AnimatePresence>
        {isGlitching && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] bg-white static-layer pointer-events-none mix-blend-difference" />}
      </AnimatePresence>

      {/* --- CONTENT CARD CONTAINER --- */}
      <div className="relative z-10 w-full max-w-[420px] h-full flex flex-col items-center p-4 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
        
        {/* --- CARD HEADER --- */}
        <header className="w-full flex-shrink-0 flex flex-col items-center text-center space-y-3 pt-6 pb-2">
          <div className="flex items-center gap-4">
            <AnimatedRadioIcon isGlitching={isGlitching} />
            <div className="text-left">
              <h1 className="text-white text-2xl font-black italic tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">实习生地下电台</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white/40 text-[10px] font-black tracking-[0.2em] uppercase">地下直播中</span>
              </div>
            </div>
          </div>
          
          <motion.p 
            key={activeFrequency}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white/80 text-sm font-bold tracking-tight px-8 py-2 bg-white/5 rounded-2xl italic"
          >
            “{currentConfig.slogan}”
          </motion.p>
        </header>

      {/* --- DANMAKU BACKGROUND for FM 66.6 --- */}
      {activeFrequency === 'FM_66.6' && <Danmaku messages={allMessages['FM_66.6']} />}

        {/* --- MAIN CENTER (Sticky Note Card) --- */}
        <main className="flex-grow w-full flex items-center justify-center overflow-visible min-h-0">
          <div 
            className="relative w-full max-w-[340px] max-h-[45vh] aspect-[1/1.1] flex items-center justify-center transition-transform duration-500"
            style={{ transform: activeFrequency === 'FM_66.6' ? 'translateY(15px)' : 'none' }}
          >
          <AnimatePresence mode="popLayout" initial={false}>
            {currentMsg && (
              <motion.div
                key={`${activeFrequency}-${currentMsg.id}`}
                initial={{ rotate: -15, y: 50, opacity: 0, scale: 0.8 }}
                animate={{ rotate: currentIdx % 2 === 0 ? 0.5 : -1, y: 0, opacity: 1, scale: 1 }}
                exit={{ 
                  y: -1000, 
                  rotate: -35, 
                  opacity: 0, 
                  filter: 'blur(15px)',
                  transition: { duration: 0.6, ease: [0.645, 0.045, 0.355, 1] } 
                }}
                className="absolute inset-0 flex items-center justify-center cursor-pointer overflow-visible"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  if (x > rect.width * 0.7) {
                    handleNext();
                  }
                }}
              >
                  <div 
                    className={`relative w-full h-full p-8 flex flex-col justify-between overflow-visible transition-all duration-300 ${activeFrequency === 'FM_66.6' ? 'disaster-note shadow-[0_30px_60px_rgba(0,0,0,0.5)]' : 'healing-note shadow-[0_30px_60px_rgba(0,0,0,0.3)]'}`} 
                    style={{ 
                      backgroundColor: currentMsg.color || FREQUENCY_CONFIGS[activeFrequency].noteColors[0],
                      boxShadow: '0 30px 60px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.4)'
                    }}
                  >
                    {/* Content Section */}
                    <div className="relative z-10 w-full h-full flex flex-col">
                      <TypewriterMessage 
                        text={currentMsg.text} 
                        authorName={currentMsg.authorName}
                        onProfileClick={() => openProfile(currentMsg.authorName || '')}
                        onReadMore={() => setIsReaderOpen(true)}
                      />
                    </div>
                    
                    {/* Stickers */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                      {(currentMsg.stickers || []).map(sticker => (
                        <DraggableSticker key={sticker.id} sticker={sticker} isEditable={false} />
                      ))}
                    </div>

                    {/* Right Edge Next Trigger Indicator */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
                      <motion.span 
                        animate={{ x: [0, 5, 0], opacity: [0.2, 0.6, 0.2] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="text-4xl text-black/20"
                      >
                        ›
                      </motion.span>
                    </div>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlapping Reactions Container */}
          {activeFrequency === 'FM_66.6' && currentMsg && appState === 'STAGE_HEAL' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] flex gap-2 z-[999] px-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button id="btn-relatableCount" onClick={(e) => { e.stopPropagation(); handleInteraction('relatableCount'); }} className="flex-1 h-14 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center border border-white/20 transition-all active:scale-95 group shadow-xl relative overflow-visible">
                <span className="text-xl group-active:scale-125 transition-transform">🤡</span>
                <span className="text-[10px] text-white font-bold mt-1 uppercase tracking-widest leading-none whitespace-nowrap">我也干过 {currentMsg.relatableCount || 0}</span>
              </button>
              <button id="btn-godTierCount" onClick={(e) => { e.stopPropagation(); handleInteraction('godTierCount'); }} className="flex-1 h-14 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center border border-white/20 transition-all active:scale-95 group shadow-xl relative overflow-visible">
                <span className="text-xl group-active:scale-125 transition-transform">🏆</span>
                <span className="text-[10px] text-white font-bold mt-1 uppercase tracking-widest leading-none whitespace-nowrap">还有高手 {currentMsg.godTierCount || 0}</span>
              </button>
              <button id="btn-funnyCount" onClick={(e) => { e.stopPropagation(); handleInteraction('funnyCount'); }} className="flex-1 h-14 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center border border-white/20 transition-all active:scale-95 group shadow-xl relative overflow-visible">
                <span className="text-xl group-active:scale-125 transition-transform">🤣</span>
                <span className="text-[10px] text-white font-bold mt-1 uppercase tracking-widest leading-none whitespace-nowrap">笑发财了 {currentMsg.funnyCount || 0}</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* --- BUTTON STACK --- */}
      <footer className="relative z-30 w-full px-6 flex flex-col gap-3 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,20px))] max-w-[400px] flex-shrink-0">
        {appState === 'STAGE_HEAL' && (
          <>
            {/* Row 1: Primary Action */}
            <motion.button 
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setAppState('STAGE_WRITE')} 
              className={`w-full h-[64px] rounded-[28px] flex items-center justify-center gap-3 font-black tracking-[0.3em] shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all ${activeFrequency === 'FM_88.8' ? 'bg-white text-emerald-900' : 'bg-red-600 text-white'}`}
            >
              <PenTool className="w-5 h-5" />
              <span className="uppercase text-sm">{currentConfig.writeBtnText}</span>
            </motion.button>

            {/* Row 1.5: Status Bar (Relocated & Minimalized) */}
            <div className="flex justify-between items-center px-6 w-full opacity-40 translate-y-1">
               <div className="flex items-center gap-2">
                 <div className="flex items-end gap-[1.5px] h-3 mb-[2px]">
                   {[0.4, 0.7, 0.5, 0.8].map((d, i) => (
                     <motion.div
                       key={i}
                       animate={{ height: ['20%', '100%', '20%'] }}
                       transition={{ repeat: Infinity, duration: d + 0.3, delay: i * 0.1 }}
                       className={`w-[1.5px] rounded-full ${activeFrequency === 'FM_88.8' ? 'bg-emerald-400' : 'bg-red-500'}`}
                     />
                   ))}
                 </div>
                 <span className="text-white text-[10px] font-medium font-mono uppercase tracking-widest">{activeFrequency} 信号</span>
               </div>
               <span className="text-white text-[10px] font-medium font-mono uppercase tracking-widest">
                 📡 {healingCount} {activeFrequency === 'FM_66.6' ? '次共鸣回响' : '位战友已同步'}
               </span>
            </div>

            {/* Row 2: Secondary Actions */}
            <div className="flex gap-[12px] w-full items-center px-4">
              <button onClick={switchFrequency} className="flex-1 h-12 bg-white/5 backdrop-blur-md rounded-2xl text-white/80 font-black text-[10px] tracking-tight border border-white/5 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>换频道</span>
              </button>
              
              {activeFrequency === 'FM_88.8' ? (
                <button onClick={startMatching} className="flex-1 h-12 bg-emerald-500 rounded-2xl text-white font-black text-[10px] tracking-tight flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-lg px-2">
                  <span className="shrink-0">🤝 申请上班搭子</span>
                </button>
              ) : (
                <button onClick={() => setIsLeaderboardOpen(true)} className="flex-1 h-12 bg-white/10 backdrop-blur-md rounded-2xl text-white/80 font-black text-[10px] tracking-tight border border-white/5 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>🏆 神人榜</span>
                </button>
              )}

              <button 
                onClick={enterCamouflage} 
                className="flex-1 h-12 bg-red-600/10 backdrop-blur-md rounded-2xl text-red-500/60 font-black text-[10px] tracking-tight border border-red-500/10 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all outline-none"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>领导来了...</span>
              </button>
            </div>
          </>
        )}
      </footer>
    </div>

      {/* Boss Alert Button - REMOVED from absolute position, moved to footer */}

      {/* --- WRITE OVERLAY --- */}
      <AnimatePresence>
        {appState === 'STAGE_WRITE' && (
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }} 
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-3xl flex flex-col"
          >
            <div className="p-6 flex justify-between items-center border-b border-white/10 shrink-0">
              <button onClick={() => setAppState('STAGE_HEAL')} className="p-2"><X className="text-white/40 w-6 h-6"/></button>
              <span className="text-white text-xs font-black font-mono tracking-widest">WRITE_MODE</span>
              <button onClick={handleSubmit} disabled={!newMessage.trim() || isSubmitting} className="px-6 py-2 bg-white rounded-full font-black text-sm disabled:opacity-30 active:scale-95 transition-transform">发送</button>
            </div>
            <div className="flex-grow p-6 flex flex-col items-center overflow-y-auto w-full">
               <div ref={editorRef} className="w-full max-w-[340px] aspect-square relative shadow-2xl p-8 flex flex-col justify-center overflow-hidden rounded-xl" style={{ backgroundColor: activeNoteColor }}>
                  <textarea 
                    autoFocus 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value.slice(0, 100))} 
                    placeholder={currentConfig.writePrompt} 
                    className="w-full h-full bg-transparent border-none outline-none font-handwriting text-2xl text-[#5d4037] placeholder:text-[#5d4037]/20 resize-none" 
                  />
                  {selectedStickers.map(s => <DraggableSticker key={s.id} sticker={s} isEditable constraintsRef={editorRef} onDragEnd={(id, x, y) => setSelectedStickers(p => p.map(stk => stk.id === id ? {...stk, x, y} : stk))} onDelete={id => setSelectedStickers(p => p.filter(stk => stk.id !== id))} />)}
               </div>
               <div className="w-full max-w-[340px] mt-8 space-y-8">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-white/40 tracking-widest uppercase">Select Paper Color</span>
                    <div className="flex gap-2.5">{currentConfig.noteColors.map(c => <button key={c} onClick={() => setActiveNoteColor(c)} className={`w-6 h-6 rounded-full border-2 transition-all ${activeNoteColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50'}`} style={{ backgroundColor: c }} />)}</div>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-white/40 tracking-widest uppercase">Stickers</span>
                    <div className="grid grid-cols-6 gap-2">
                      {currentConfig.stickers.map(s => <button key={s.id} onClick={() => addStickerToEditor(s)} className="aspect-square bg-white/5 rounded-2xl flex items-center justify-center text-2xl hover:bg-white/10 active:scale-90 transition-all border border-white/5">{s.emoji}</button>)}
                    </div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MATCHING OVERLAY --- */}
      <AnimatePresence>
        {isMatching && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[11000] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-12">
            <div className="relative w-24 h-24 mb-10 flex items-center justify-center">
               <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute inset-0 border-4 border-white/5 rounded-full" />
               <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="absolute inset-0 border-t-4 border-emerald-500 rounded-full" />
               <div className="absolute inset-0 flex items-center justify-center text-3xl">📡</div>
            </div>
            <p className="text-white text-lg font-black tracking-[0.4em] uppercase italic animate-pulse">灵魂匹配中...</p>
            <p className="text-white/30 text-[10px] font-bold mt-4 tracking-[0.2em] uppercase">Searching_Frequency_Node</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- BUDDY CARD (Douyin Style) --- */}
      <AnimatePresence>
        {showBuddyCard && buddyInfo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setShowBuddyCard(false)}>
            <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 50 }} className="w-full max-w-sm bg-white rounded-[40px] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="w-full aspect-[4/5] bg-gray-100 flex items-center justify-center text-9xl relative">
                {buddyInfo.emoji}
                <div className="absolute top-6 left-6">
                   <div className="px-4 py-1.5 bg-red-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg animate-pulse">Human Match</div>
                </div>
                {/* Mock Douyin elements */}
                <div className="absolute bottom-6 left-6 flex flex-col items-start gap-1">
                  <div className="px-2 py-0.5 bg-black/20 backdrop-blur-sm rounded text-[10px] text-white">@实习牛马_2026</div>
                </div>
              </div>
              <div className="p-8 text-center">
                <h3 className="text-2xl font-black text-black mb-2">{buddyInfo.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-8 px-4 font-medium italic">"{buddyInfo.intro}"</p>
                <div className="flex flex-col gap-3">
                  <a href="https://v.douyin.com/mock" target="_blank" rel="noopener noreferrer" className="w-full py-5 bg-black text-white rounded-3xl font-black text-sm tracking-widest uppercase shadow-xl hover:bg-[#222] active:scale-95 transition-all text-center">去 TA 的主页看看</a>
                  <button onClick={() => setShowBuddyCard(false)} className="w-full py-5 bg-gray-100 text-gray-400 rounded-3xl font-black text-sm tracking-widest uppercase hover:bg-gray-200 transition-colors">再看看</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- AI CHAT OVERLAY --- */}
      <AnimatePresence>
        {appState === 'STAGE_CHAT' && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed inset-0 z-[10000] bg-[#111] flex flex-col items-center">
            <div className="w-full max-w-[420px] h-full flex flex-col">
              <header className="p-6 flex justify-between items-center border-b border-white/10 shrink-0">
                <button onClick={() => setAppState('STAGE_HEAL')} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center active:scale-90 transition-transform">
                  <X className="w-5 h-5 text-white" />
                </button>
                <div className="text-center">
                  <p className="text-sm font-black text-white">灵魂接线员</p>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest leading-none mt-1">已同步信号</p>
                </div>
                <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                </div>
              </header>

              <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar flex flex-col">
                {chatMessages.map(m => (
                  <div key={m.id} className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed shadow-lg ${m.role === 'ai' ? 'self-start bg-white/10 text-white rounded-bl-none' : 'self-end bg-red-600 text-white rounded-br-none ml-auto'}`}>
                    {m.text}
                  </div>
                ))}
                {isTyping && (
                  <div className="self-start bg-white/5 px-4 py-3 rounded-2xl text-[10px] text-white/30 font-bold tracking-widest animate-pulse">
                    正在输入...
                  </div>
                )}
              </div>

              <footer className="p-6 border-t border-white/10 pb-[calc(1.5rem+env(safe-area-inset-bottom,20px))]">
                <div className="flex gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 focus-within:border-white/20 transition-colors">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && sendChatMessage()}
                    placeholder="和接线员说点什么..."
                    className="flex-grow bg-transparent px-4 py-2 text-white placeholder-white/20 outline-none text-sm"
                  />
                  <button onClick={sendChatMessage} className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-transform flex-shrink-0">
                    <ArrowRight className="w-5 h-5 text-white" />
                  </button>
                </div>
              </footer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- INTERN PROFILE CARD --- */}
      <AnimatePresence>
        {isProfileVisible && selectedAuthor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[8600] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6" onClick={() => setIsProfileVisible(false)}>
            <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm max-h-[85vh] overflow-y-auto bg-white rounded-[40px] p-10 flex flex-col items-center relative shadow-2xl custom-scrollbar" onClick={e => e.stopPropagation()}>
               <div className="absolute top-0 left-0 w-full h-32 bg-gray-100" />
               <div className="relative z-10 w-24 h-24 bg-white rounded-full flex items-center justify-center text-5xl mb-6 shadow-xl border-4 border-white translate-y-[-10px]">
                 👤
               </div>
               <h2 className="relative z-10 text-2xl font-black text-black mb-1">@{selectedAuthor}</h2>
               <p className="relative z-10 text-[10px] font-black text-gray-400 tracking-[0.3em] uppercase mb-8">Verified Intern Soul</p>
               
               <div className="w-full grid grid-cols-2 gap-4 mb-10">
                  <div className="bg-gray-50 p-5 rounded-3xl text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">捅娄子次数</p>
                    <p className="text-2xl font-black text-red-500">{authorStats.disasterCount}</p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-3xl text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">治愈他人次数</p>
                    <p className="text-2xl font-black text-emerald-500">{authorStats.healingCount}</p>
                  </div>
               </div>
               
               <div className="w-full flex flex-col gap-4 text-center">
                  <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">当前波段频率</div>
                  <div className="text-xs font-black text-black bg-gray-100 py-3 rounded-2xl border border-black/5 tracking-[0.2em]">{activeFrequency}</div>
               </div>
               
               <button onClick={() => setIsProfileVisible(false)} className="mt-10 w-full py-5 bg-black text-white rounded-3xl font-black tracking-[0.2em] text-xs uppercase active:scale-95 transition-transform">
                 确定
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- POSTER MODAL --- */}
      <AnimatePresence>
        {isPosterVisible && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-black/90 flex flex-col items-center justify-center p-8">
            <button onClick={() => setIsPosterVisible(false)} className="absolute top-8 right-8 text-white"><X/></button>
            <div ref={posterRef} className={`w-full max-w-sm aspect-[9/16] bg-black p-8 flex flex-col items-center justify-between relative overflow-hidden`} style={{ color: '#ffffff' }}>
               <div className="absolute inset-0 opacity-20 blur-[100px]" style={{ backgroundColor: activeFrequency === 'FM_88.8' ? '#10b981' : '#ef4444' }} />
               <div className="z-10 text-center space-y-4 pt-12">
                  <Radio className="w-12 h-12 mx-auto mb-4" />
                  <h2 className="text-4xl font-black italic tracking-tighter leading-none">实习生地下电台</h2>
                  <p className="text-xs uppercase font-mono tracking-[0.4em] opacity-40">Healing Lab • EP.01</p>
               </div>
               <div className="z-10 w-full aspect-square relative shadow-2xl p-8" style={{ backgroundColor: currentMsg?.color || '#fff' }}>
                  <p className="font-handwriting text-2xl text-[#5d4037] leading-relaxed text-center">{currentMsg?.text}</p>
                  {currentMsg?.stickers?.map(s => <div key={s.id} className="absolute" style={{ left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%, -50%)' }}><span className="text-6xl">{s.emoji}</span></div>)}
               </div>
               <div className="z-10 text-center pb-8 opacity-40">
                  <p className="text-[10px] font-mono tracking-widest">SCAN_TO_LISTEN @ freq_{activeFrequency.split('_')[1]}</p>
               </div>
            </div>
            <button onClick={downloadPoster} className="mt-8 px-12 py-4 bg-white text-black rounded-full font-black tracking-widest flex items-center gap-3">
              <Download className="w-5 h-5"/> PRESERVE_MEMORIES
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Leaderboard 
        isOpen={isLeaderboardOpen} 
        onClose={() => setIsLeaderboardOpen(false)} 
        messages={allMessages['FM_66.6']} 
        onSelectMessage={handleLeaderboardJump}
      />

      <FullReader 
        isOpen={isReaderOpen} 
        text={currentMsg?.text || ''} 
        color={currentMsg?.color || '#fff'} 
        authorName={currentMsg?.authorName} 
        onClose={() => setIsReaderOpen(false)} 
      />

      <AnimatePresence>{appState === 'STAGE_FAKE' && <KPIReport onExit={exitCamouflage} />}</AnimatePresence>
    </div>
  );
}
