import React, { useState, useEffect, useRef } from 'react';
import { List, ChevronRight, ChevronLeft, Play, Pause, Settings, Search, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TOTAL_PAGES = 604;

const JUZ_NAMES = [
    '', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
    'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون',
    'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون'
];

const RECITERS = [
    { id: 'Alafasy_128kbps', name: 'مشاري العفاسي' },
    { id: 'Abdul_Basit_Murattal_192kbps', name: 'عبد الباسط عبد الصمد' },
    { id: 'Husary_128kbps', name: 'محمود خليل الحصري' },
    { id: 'Minshawy_Murattal_128kbps', name: 'محمد صديق المنشاوي' },
    { id: 'Sudais_128kbps', name: 'عبد الرحمن السديس' },
];

const SP: Record<number, number> = {
    1:1,2:2,3:50,4:77,5:106,6:128,7:151,8:177,9:187,10:208,
    11:221,12:235,13:249,14:255,15:262,16:267,17:282,18:293,19:305,20:312,
    21:322,22:332,23:342,24:350,25:359,26:367,27:377,28:385,29:396,30:404,
    31:411,32:415,33:418,34:428,35:434,36:440,37:446,38:453,39:458,40:467,
    41:477,42:483,43:489,44:496,45:499,46:502,47:507,48:511,49:515,50:518,
    51:520,52:523,53:526,54:528,55:531,56:534,57:537,58:542,59:545,60:549,
    61:551,62:553,63:554,64:556,65:558,66:560,67:562,68:564,69:566,70:568,
    71:570,72:572,73:574,74:575,75:577,76:578,77:580,78:582,79:583,80:585,
    81:586,82:587,83:587,84:589,85:590,86:591,87:591,88:592,89:593,90:594,
    91:595,92:595,93:596,94:596,95:597,96:597,97:598,98:598,99:599,100:599,
    101:600,102:600,103:601,104:601,105:601,106:602,107:602,108:602,109:603,
    110:603,111:603,112:604,113:604,114:604,
};

function audioUrl(rec: string, surah: number, ayah: number) {
    return `https://everyayah.com/data/${rec}/${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}.mp3`;
}

function getJuz(p: number) {
    return Math.min(30, Math.ceil(p * 30 / TOTAL_PAGES));
}

function getMushafPageImage(p: number) {
    return `https://static.qurancdn.com/images/pages/page_${p}.png`;
}

function toArabicDigits(str: string | number) {
    return str.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

const pageCache = new Map();
const imageCacheSet = new Set();
const CACHE_TTL = 5 * 60 * 1000;

export default function App() {
    const [view, setView] = useState<'index' | 'mushaf'>('index');
    const [page, setPage] = useState(1);
    const [surahs, setSurahs] = useState<any[]>([]);
    const [ayahs, setAyahs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [imageFailed, setImageFailed] = useState(false);
    
    const [playing, setPlaying] = useState(false);
    const [playIdx, setPlayIdx] = useState(-1);
    const [reciter, setReciter] = useState(RECITERS[0].id);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showToast, setShowToast] = useState('');
    const [showControls, setShowControls] = useState(false);

    useEffect(() => {
        async function fetchSurahs() {
            try {
                const res = await fetch('https://api.alquran.cloud/v1/surah');
                const json = await res.json();
                if (json.code === 200) {
                    setSurahs(json.data);
                }
            } catch (e) {
                console.error(e);
            }
        }
        fetchSurahs();
    }, []);

    useEffect(() => {
        if (view !== 'mushaf') return;
        
        let isMounted = true;
        
        async function loadPageData(pageNum: number) {
            setImageFailed(false);
            setLoading(true);
            
            const cached = pageCache.get(pageNum);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                if (isMounted) {
                    setAyahs(cached.ayahs);
                    setLoading(false);
                }
            } else {
                try {
                    const res = await fetch(`https://api.alquran.cloud/v1/page/${pageNum}/quran-uthmani`);
                    const json = await res.json();
                    if (json.code === 200 && isMounted) {
                        const data = json.data.ayahs.map((ay: any) => ({
                            numberInSurah: ay.numberInSurah,
                            surah: { number: ay.surah.number, name: ay.surah.name },
                            text: ay.text,
                            juz: ay.juz,
                            isBismillah: ay.numberInSurah === 1 && ay.text.includes('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ') && ay.surah.number !== 1,
                        }));
                        setAyahs(data);
                        pageCache.set(pageNum, { ayahs: data, timestamp: Date.now() });
                    }
                } catch(e) {
                    console.error(e);
                } finally {
                    if (isMounted) setLoading(false);
                }
            }
            
            // Prefetch
            [pageNum-1, pageNum+1].forEach(n => {
                if (n >= 1 && n <= TOTAL_PAGES && !imageCacheSet.has(n)) {
                    const img = new Image();
                    img.src = getMushafPageImage(n);
                    imageCacheSet.add(n);
                }
            });
        }
        
        loadPageData(page);
        
        return () => { isMounted = false; };
    }, [page, view]);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    const getVerses = () => {
        if (!ayahs.length || !surahs.length) return ayahs;
        return ayahs.map(ay => {
            if (!ay.surah.name) {
                const s = surahs.find(s => s.number === ay.surah.number);
                if (s) return { ...ay, surah: { ...ay.surah, name: s.name } };
            }
            return ay;
        });
    };

    const getPageSurahs = () => {
        const names: string[] = [];
        getVerses().forEach(v => {
            const n = v.surah?.name || '';
            if (n && !names.includes(n)) names.push(n);
        });
        return names.length ? names : ['-'];
    };

    const getPlaylist = () => {
        return getVerses().filter(v => !v.isBismillah && v.text?.trim())
            .map(v => ({ surah: v.surah.number, ayah: v.numberInSurah, key: v.surah.number * 1000 + v.numberInSurah }));
    };

    const playFrom = (idx: number) => {
        const playlist = getPlaylist();
        if (idx >= playlist.length) { 
            setPlaying(false); 
            setPlayIdx(-1); 
            return; 
        }
        const v = playlist[idx];
        if (audioRef.current) audioRef.current.pause();
        
        const newAudio = new Audio(audioUrl(reciter, v.surah, v.ayah));
        newAudio.onended = () => playFrom(idx + 1);
        newAudio.play().catch(()=>{});
        
        audioRef.current = newAudio;
        setPlaying(true);
        setPlayIdx(idx);
    };

    const stopAudio = () => {
        if (audioRef.current) { 
            audioRef.current.pause(); 
            audioRef.current = null; 
        }
        setPlaying(false);
        setPlayIdx(-1);
    };

    const handleCopy = () => {
        const verses = getVerses();
        const textToCopy = verses
            .filter(v => !v.isBismillah && v.text?.trim())
            .map(ay => `${ay.text} ﴿${toArabicDigits(ay.numberInSurah)}﴾`)
            .join(' ');
        
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                setShowToast('تم نسخ الصفحة بنجاح');
                setTimeout(() => setShowToast(''), 3000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    };

    const renderIndex = () => {
        const filteredSurahs = surahs.filter(s => s.name.includes(searchQuery));
        
        return (
            <motion.div 
                key="index"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="min-h-screen w-full p-6 md:p-12 flex flex-col items-center"
            >
                <div className="max-w-5xl w-full space-y-12">
                    {/* Header */}
                    <div className="text-center space-y-4 mt-8">
                        <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-200" style={{ fontFamily: "'Amiri Quran', serif" }}>
                            القرآن الكريم
                        </h1>
                        <p className="text-gray-400 text-lg" style={{ fontFamily: "'Cairo', sans-serif" }}>
                            بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                        </p>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-md mx-auto">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} strokeWidth={1.2} />
                        <input 
                            type="text" 
                            placeholder="ابحث عن سورة..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition-colors backdrop-blur-md"
                            style={{ fontFamily: "'Cairo', sans-serif" }}
                        />
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                        {filteredSurahs.map((s, i) => (
                            <motion.div
                                key={s.number}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                                onClick={() => {
                                    setPage(SP[s.number] || 1);
                                    setView('mushaf');
                                }}
                                className="glass-card rounded-2xl p-6 flex items-center justify-between cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:border-gold/50 group-hover:text-gold transition-colors">
                                        <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-lg text-gray-300 group-hover:text-gold">
                                            {s.number}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl text-white group-hover:text-gold transition-colors" style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700 }}>
                                            {s.name}
                                        </h3>
                                        <p className="text-sm text-gray-500" style={{ fontFamily: "'Cairo', sans-serif" }}>
                                            {toArabicDigits(s.numberOfAyahs)} آية
                                        </p>
                                    </div>
                                </div>
                                <div className="text-gray-600 group-hover:text-gold/50 transition-colors">
                                    <ChevronLeft size={20} strokeWidth={1.2} />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.div>
        );
    };

    const renderMushaf = () => {
        const verses = getVerses();
        const juzNum = getJuz(page);
        const pageSurahs = getPageSurahs();
        
        return (
            <motion.div 
                key="mushaf"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-h-screen w-full flex flex-col relative bg-[#FBF7E9] text-black overflow-hidden"
                onClick={() => setShowControls(!showControls)}
            >
                {/* Header */}
                <div className="w-full px-6 md:px-12 pt-8 pb-4 flex justify-between items-center text-[#5A4A3A] text-lg md:text-xl font-bold" style={{ fontFamily: "'Amiri', serif" }}>
                    <span>{pageSurahs.join(' ❖ ')}</span>
                    <span>الجزء {JUZ_NAMES[juzNum]}</span>
                </div>

                {/* Content */}
                <div className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-12 flex items-center justify-center relative">
                    {loading ? (
                        <div className="w-12 h-12 rounded-full border-2 border-[#8B7355]/30 border-t-[#8B7355] animate-spin"></div>
                    ) : !imageFailed ? (
                        <img 
                            src={getMushafPageImage(page)} 
                            alt={`Page ${page}`}
                            className="w-full h-full object-contain mix-blend-multiply"
                            draggable="false"
                            onError={() => setImageFailed(true)}
                        />
                    ) : (
                        <div className="h-full w-full overflow-y-auto px-4 text-justify custom-scrollbar flex flex-col justify-center" style={{ fontFamily: "'Amiri Quran', serif", fontSize: 'clamp(22px, 3.5vw, 36px)', lineHeight: '2.2', color: '#1A1A1A', textAlignLast: 'center' }}>
                            <div>
                                {verses.filter(v => !v.isBismillah && v.text?.trim()).map((ay, i) => (
                                    <span key={i}>
                                        {ay.text} <span className="inline-block mx-1 align-middle text-[#8B7355] text-[0.6em]">﴿{toArabicDigits(ay.numberInSurah)}﴾</span>{' '}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="w-full px-6 md:px-12 pt-4 pb-8 flex justify-center items-center">
                    <div className="text-[#5A4A3A] text-xl font-bold" style={{ fontFamily: "'Amiri', serif" }}>
                        {toArabicDigits(page)}
                    </div>
                </div>

                {/* The Neo-Glass Floating Bar */}
                <AnimatePresence>
                    {showControls && (
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-black/80 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6">
                                <button onClick={() => { setView('index'); setShowControls(false); }} className="text-gray-400 hover:text-gold transition-colors duration-300" title="الفهرس">
                                    <List size={20} strokeWidth={1.2} />
                                </button>
                                
                                <button onClick={() => setPage(p => Math.min(TOTAL_PAGES, p + 1))} disabled={page >= TOTAL_PAGES} className="text-gray-400 hover:text-gold disabled:opacity-30 transition-colors duration-300" title="الصفحة التالية">
                                    <ChevronRight size={20} strokeWidth={1.2} />
                                </button>

                                <button onClick={() => playing ? stopAudio() : playFrom(0)} className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold hover:bg-gold hover:text-black transition-all duration-300 shadow-[0_4px_20px_rgba(212,175,55,0.2)] hover:shadow-[0_10px_30px_rgba(212,175,55,0.4)]">
                                    {playing ? <Pause size={20} strokeWidth={1.5} /> : <Play size={20} strokeWidth={1.5} className="ml-1" />}
                                </button>

                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="text-gray-400 hover:text-gold disabled:opacity-30 transition-colors duration-300" title="الصفحة السابقة">
                                    <ChevronLeft size={20} strokeWidth={1.2} />
                                </button>

                                <button onClick={handleCopy} className="text-gray-400 hover:text-gold transition-colors duration-300" title="نسخ الصفحة">
                                    <Copy size={20} strokeWidth={1.2} />
                                </button>

                                <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-gold transition-colors duration-300" title="الإعدادات">
                                    <Settings size={20} strokeWidth={1.2} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Toast Notification */}
                <AnimatePresence>
                    {showToast && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] bg-[#1B5E20] text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm"
                            style={{ fontFamily: "'Cairo', sans-serif" }}
                        >
                            {showToast}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Settings Modal */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                            onClick={() => setShowSettings(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#0B1120] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl"
                                dir="rtl"
                            >
                                <h3 className="text-xl font-bold text-gold mb-6" style={{ fontFamily: "'Cairo', sans-serif" }}>الإعدادات</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>القارئ (تلاوة الصفحة)</label>
                                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                            {RECITERS.map(r => (
                                                <button
                                                    key={r.id}
                                                    onClick={() => {
                                                        setReciter(r.id);
                                                        if (playing) stopAudio();
                                                    }}
                                                    className={`w-full text-right px-4 py-3 rounded-xl transition-colors ${reciter === r.id ? 'bg-gold/10 border border-gold/30 text-gold' : 'bg-white/5 border border-white/5 text-gray-300 hover:bg-white/10'}`}
                                                    style={{ fontFamily: "'Cairo', sans-serif" }}
                                                >
                                                    {r.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="mt-6 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors font-bold"
                                    style={{ fontFamily: "'Cairo', sans-serif" }}
                                >
                                    إغلاق
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    return (
        <AnimatePresence mode="wait">
            {view === 'index' ? renderIndex() : renderMushaf()}
        </AnimatePresence>
    );
}
