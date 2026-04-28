import React, { useRef, useEffect } from 'react';
import { motion, useScroll, useSpring, useTransform, Variants, MotionValue, useMotionTemplate, useMotionValue } from 'motion/react';
import { Power, Activity, GitCommit, Search, ShieldAlert, Workflow, Terminal, Zap, CheckCircle2, TrendingDown, Layers, MapPin } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  BarChart, Bar, Legend, LineChart, Line, PieChart, Pie, Cell, ComposedChart 
} from 'recharts';
import { TelemetryChartInteractive } from './TelemetryChart';
import { SysConfigSim } from './SysConfigSim';

// --- Placeholder Data for Charts ---
const telemetryData = Array.from({ length: 12 }, (_, i) => ({
  time: `${i * 2}:00`,
  events: Math.floor(Math.random() * 5000) + 1000,
  anomalies: Math.floor(Math.random() * 200) + 10,
}));

const costMitigationData = Array.from({ length: 10 }, (_, i) => ({
  stage: `W${i + 1}`,
  unmitigated: 100000 + (i * 25000) + (Math.random() * 10000),
  supplyGuard: 100000 + (i * 5000) + (Math.random() * 5000),
}));

const fleetData = [
  { region: 'North America', onTime: 4200, mitigated: 850, delayed: 150 },
  { region: 'Europe', onTime: 3100, mitigated: 620, delayed: 90 },
  { region: 'Asia Pacific', onTime: 5400, mitigated: 1240, delayed: 210 },
  { region: 'Latin America', onTime: 1800, mitigated: 310, delayed: 60 },
];

const decisionData = [
  { name: 'Auto-Reroute', value: 82, color: '#1a4c8a' }, // Blue pen
  { name: 'Preventative Delay', value: 12, color: '#2c2c2c' }, // Dark ink
  { name: 'Escalated (Human)', value: 6, color: '#da312e' }, // Red ink
];

const capacityData = [
  { node: 'USEWR', demand: 85, capacity: 60 },
  { node: 'NLRTM', demand: 90, capacity: 85 },
  { node: 'SGSIN', demand: 60, capacity: 100 },
  { node: 'CNPVG', demand: 95, capacity: 50 },
  { node: 'USLAX', demand: 75, capacity: 80 },
];

// --- Animation Variants ---
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

// --- Scroll Reveal Text Component ---
const Word = ({ children, progress, range }: { children: string, progress: MotionValue<number>, range: [number, number] }) => {
  const opacity = useTransform(progress, range, [0.1, 1]);
  const color = useTransform(progress, range, ["#d5d1c8", "#1a1a1a"]);
  const y = useTransform(progress, range, [20, 0]);
  
  return (
    <span className="relative mr-3 lg:mr-4 mt-2 inline-block">
      <motion.span className="absolute opacity-10" style={{ color: "#d5d1c8" }}>{children}</motion.span>
      <motion.span style={{ opacity, color, y, display: "inline-block" }}>{children}</motion.span>
    </span>
  );
};

const ScrollRevealText = ({ text }: { text: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 80%", "start 20%"]
  });

  const words = text.split(" ");
  return (
    <div ref={containerRef} className="max-w-6xl mx-auto py-32 px-6">
      <h2 className="text-4xl md:text-5xl lg:text-7xl font-sans font-bold uppercase leading-[1.1] tracking-tighter flex flex-wrap justify-center text-center">
        {words.map((word, i) => {
          const start = i / words.length;
          const end = start + (1 / words.length);
          return (
            <Word key={i} progress={scrollYProgress} range={[start, end]}>
              {word}
            </Word>
          );
        })}
      </h2>
    </div>
  );
};

const textContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 }
  }
};

const textLetterVariants: Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(12px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: "easeOut" } }
};

const AnimatedLetter = ({ letter, index, scrollY, isGuard }: { letter: string, index: number, scrollY: MotionValue<number>, isGuard: boolean }) => {
  const fadeOutStart = 20 + (index * 15);
  const fadeOutEnd = fadeOutStart + 120;
  
  const scrollOpacity = useTransform(scrollY, [fadeOutStart, fadeOutEnd], [1, 0]);
  const scrollYOffset = useTransform(scrollY, [fadeOutStart, fadeOutEnd], [0, -40]);
  const scrollBlurRaw = useTransform(scrollY, [fadeOutStart, fadeOutEnd], [0, 15]);
  const scrollFilter = useMotionTemplate`blur(${scrollBlurRaw}px)`;

  return (
    <motion.span
      variants={textLetterVariants}
      style={{ 
        opacity: scrollOpacity, 
        y: scrollYOffset, 
        filter: scrollFilter, 
        color: isGuard ? "#1a4c8a" : "#1a1a1a" 
      }}
      className={`inline-block ${isGuard && index === 6 ? "ml-4 md:ml-6" : ""}`}
    >
      {letter}
    </motion.span>
  );
};

const ScrollHighlightWord = ({ children, progress, range }: { children: string, progress: MotionValue<number>, range: [number, number] }) => {
  const scaleX = useTransform(progress, range, [0, 1]);
  return (
    <span className="relative inline-block font-bold px-[2px] mx-[2px] z-10">
      <motion.span
        style={{ scaleX, backgroundColor: "#da312e", opacity: 0.25, transformOrigin: "left center" }}
        className="absolute left-0 top-[10%] bottom-[10%] w-full -z-10 rounded-[3px]"
      />
      {children}
    </span>
  );
};

const ScrollHighlightHeader = ({ text }: { text: string }) => {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 90%", "center 60%"]
  });

  const words = text.split(" ");
  return (
    <span ref={containerRef} className="flex flex-wrap gap-y-2 -ml-[4px]">
      {words.map((word, i) => {
        const start = i / words.length;
        const end = start + (1 / words.length);
        return (
          <ScrollHighlightWord key={i} progress={scrollYProgress} range={[start, end]}>
            {word}
          </ScrollHighlightWord>
        );
      })}
    </span>
  );
};

export default function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  const { scrollYProgress, scrollY } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // --- Subtle Terminal Hero Scroll Animation Variables ---
  const headerY = useTransform(scrollY, [0, 300], [0, 80]);
  const headerOpacity = useTransform(scrollY, [0, 250], [1, 0.2]);
  const leftShift = useTransform(scrollY, [0, 300], [0, -50]);
  const rightShift = useTransform(scrollY, [0, 300], [0, 50]);
  const spacing = useTransform(scrollY, [0, 300], [0, 20]);
  const skewX = useTransform(scrollY, [0, 300], [0, -5]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.9]);

  const preambleY = useTransform(scrollY, [0, 300], [0, -50]);
  const preambleOpacity = useTransform(scrollY, [0, 200], [1, 0]);
  const preambleText = "SYSTEM.INITIALIZED // AUTONOMOUS_SUPPLY_CHAIN_AI";

  // --- Chart Scroll Interactions ---
  // Section 3: Telemetry (Clip from Right to Left)
  const section3Ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: s3Progress } = useScroll({ target: section3Ref, offset: ["start 85%", "center center"] });
  const s3ClipRaw = useTransform(s3Progress, [0, 1], [100, 0]);
  const s3Clip = useMotionTemplate`inset(0 ${s3ClipRaw}% 0 0)`;

  // Section 4: Cost (Clip from Bottom to Top)
  const section4Ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: s4Progress } = useScroll({ target: section4Ref, offset: ["start 85%", "center center"] });
  const s4ClipRaw = useTransform(s4Progress, [0, 1], [100, 0]);
  const s4Clip = useMotionTemplate`inset(${s4ClipRaw}% 0 0 0)`;

  // Section 5: SLA (Scale Y)
  const section5Ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: s5Progress } = useScroll({ target: section5Ref, offset: ["start 85%", "center center"] });
  const s5ScaleY = useTransform(s5Progress, [0, 1], [0, 1]);

  // Section 6: Decision (Scale)
  const section6Ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: s6Progress } = useScroll({ target: section6Ref, offset: ["start 85%", "center center"] });
  const s6Scale = useTransform(s6Progress, [0.3, 1], [0.5, 1]);
  const s6Opacity = useTransform(s6Progress, [0.3, 1], [0, 1]);

  // Section 7: Capacity (Clip from center out)
  const section7Ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: s7Progress } = useScroll({ target: section7Ref, offset: ["start 85%", "center center"] });
  const s7ClipRaw = useTransform(s7Progress, [0, 1], [50, 0]);
  const s7Clip = useMotionTemplate`inset(0 ${s7ClipRaw}% 0 ${s7ClipRaw}%)`;

  const archRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: archScrollProgress } = useScroll({
    target: archRef,
    offset: ["start 100%", "end 0%"]
  });

  const archY0 = useTransform(archScrollProgress, [0, 0.35, 0.65, 1], [400, 0, 0, -400]);
  const archY1 = useTransform(archScrollProgress, [0, 0.4, 0.6, 1], [500, 0, 0, -500]);
  const archY2 = useTransform(archScrollProgress, [0, 0.45, 0.55, 1], [600, 0, 0, -600]);

  const archOp0 = useTransform(archScrollProgress, [0.0, 0.35, 0.65, 1.0], [0, 1, 1, 0]);
  const archOp1 = useTransform(archScrollProgress, [0.05, 0.4, 0.6, 0.95], [0, 1, 1, 0]);
  const archOp2 = useTransform(archScrollProgress, [0.1, 0.45, 0.55, 0.9], [0, 1, 1, 0]);

  const archRot0 = useTransform(archScrollProgress, [0, 0.35, 0.65, 1], [45, 0, 0, -45]);
  const archRot1 = useTransform(archScrollProgress, [0, 0.4, 0.6, 1], [55, 0, 0, -55]);
  const archRot2 = useTransform(archScrollProgress, [0, 0.45, 0.55, 1], [65, 0, 0, -65]);
  
  const archScale0 = useTransform(archScrollProgress, [0, 0.35, 0.65, 1], [0.8, 1, 1, 0.8]);
  const archScale1 = useTransform(archScrollProgress, [0, 0.4, 0.6, 1], [0.8, 1, 1, 0.8]);
  const archScale2 = useTransform(archScrollProgress, [0, 0.45, 0.55, 1], [0.8, 1, 1, 0.8]);
  
  const archYs = [archY0, archY1, archY2];
  const archOps = [archOp0, archOp1, archOp2];
  const archRots = [archRot0, archRot1, archRot2];
  const archScales = [archScale0, archScale1, archScale2];

  // --- Decorative Vector Animation Variables ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - window.innerWidth / 2);
      mouseY.set(e.clientY - window.innerHeight / 2);
    };
    
    // Also handle touch events for mobile
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouseX.set(e.touches[0].clientX - window.innerWidth / 2);
        mouseY.set(e.touches[0].clientY - window.innerHeight / 2);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [mouseX, mouseY]);

  const smoothMouseX = useSpring(mouseX, { stiffness: 40, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 40, damping: 20 });

  const vector1X = useTransform(smoothMouseX, (v) => v * -0.05);
  const vector1Y = useTransform(smoothMouseY, (v) => v * -0.05);
  const vector2X = useTransform(smoothMouseX, (v) => v * 0.08);
  const vector2Y = useTransform(smoothMouseY, (v) => v * 0.08);
  const vector3X = useTransform(smoothMouseX, (v) => v * -0.15);
  const vector3Y = useTransform(smoothMouseY, (v) => v * -0.15);

  const rotateVector1 = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const rotateVector2 = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const scrollYVector1 = useTransform(scrollYProgress, [0, 1], [0, 400]);
  const scrollYVector2 = useTransform(scrollYProgress, [0, 1], [0, -600]);
  const scrollYVector3 = useTransform(scrollYProgress, [0, 1], [0, 200]);

  return (
    <div className="text-[#1a1a1a] font-sans min-h-screen relative overflow-x-hidden pt-12 pb-24">
      
      {/* Top Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-[#da312e] origin-left z-50" 
        style={{ scaleX }} 
      />

      {/* Interactive Vector Backgrounds - Sketch/Blueprints */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-multiply opacity-20">
        {/* Abstract Vector 1 - Radar / Compass sketch */}
        <motion.div 
          style={{ x: vector1X, y: scrollYVector1, rotate: rotateVector1 }}
          className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] text-[#1a4c8a]"
        >
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.2" strokeDasharray="1 4" />
            <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="0.2" />
            <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="0.2" strokeDasharray="4 4" />
            <path d="M50 0 L50 100 M0 50 L100 50 M15 15 L85 85 M15 85 L85 15" stroke="currentColor" strokeWidth="0.1" />
            <circle cx="50" cy="50" r="2" fill="currentColor" />
          </svg>
        </motion.div>

        {/* Abstract Vector 2 - Geometry */}
        <motion.div 
          style={{ x: vector2X, y: scrollYVector2, rotate: rotateVector2 }}
          className="absolute top-[60%] right-[-15%] w-[600px] h-[600px] text-[#2c2c2c]"
        >
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" stroke="currentColor" strokeWidth="0.3" />
            <polygon points="50,15 80,32 80,68 50,85 20,68 20,32" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2 4" />
            <polygon points="50,25 70,38 70,62 50,75 30,62 30,38" stroke="currentColor" strokeWidth="0.3" />
          </svg>
        </motion.div>

        {/* Abstract Vector 3 - Mesh Nodes */}
        <motion.div 
          style={{ x: vector3X, y: scrollYVector3 }}
          className="absolute top-[30%] left-[60%] w-[400px] h-[400px] text-[#da312e]"
        >
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="20" cy="20" r="1.5" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="80" cy="30" r="1.5" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="30" cy="80" r="1.5" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="70" cy="70" r="1.5" stroke="currentColor" strokeWidth="0.5" />
            <path d="M20 20 L50 50 L80 30 M50 50 L30 80 M50 50 L70 70 M20 20 L30 80 L70 70 L80 30 Z" stroke="currentColor" strokeWidth="0.2" strokeDasharray="1 2" />
          </svg>
        </motion.div>
      </div>

      {/* ================= SECTION 1: HERO & INITIALIZE ================= */}
      <section className="min-h-[80vh] flex flex-col items-center justify-center relative z-10 px-4 py-20 text-center">
        
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col items-center relative z-10 w-full max-w-4xl mx-auto">
          
          {/* Scroll-interactive technical preamble with typing effect */}
          <motion.div 
            style={{ y: preambleY, opacity: preambleOpacity }}
            className="mb-8 flex items-center gap-4 text-[#da312e] font-mono text-sm tracking-[0.2em] font-bold"
          >
            <div className="w-8 h-[2px] bg-[#da312e] hidden sm:block"></div>
            <div className="flex gap-[2px]">
              {preambleText.split('').map((char, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.1 }}
                >
                  {char}
                </motion.span>
              ))}
            </div>
            <motion.div 
              animate={{ opacity: [1, 1, 0, 0] }} 
              transition={{ repeat: Infinity, duration: 0.8, times: [0, 0.5, 0.5, 1], ease: "linear" }}
              className="w-2 h-4 bg-[#da312e]"
            />
            <div className="w-8 h-[2px] bg-[#da312e] hidden sm:block"></div>
          </motion.div>

          <motion.div
            style={{ y: headerY, opacity: headerOpacity }}
            className="relative w-full flex justify-center items-center py-6 mb-8 cursor-default"
          >
            <motion.h1 
              variants={textContainerVariants}
              initial="hidden"
              animate="visible"
              style={{ skewX, scale }} 
              className="text-6xl sm:text-[6rem] md:text-[8rem] lg:text-[10rem] font-display font-medium tracking-tight m-0 leading-none flex items-center mx-auto uppercase mt-6 text-[#1a1a1a]"
            >
              {Array.from("SUPPLYGUARD").map((char, idx) => (
                <AnimatedLetter key={idx} letter={char} index={idx} scrollY={scrollY} isGuard={idx >= 6} />
              ))}
            </motion.h1>
          </motion.div>
          
          <motion.p variants={fadeUp} className="text-lg md:text-2xl text-[#4a4a4a] tracking-wide mb-14 max-w-2xl text-center px-4 font-sans font-light leading-relaxed">
            Autonomous supply chain rerouting. <br className="hidden md:block"/>
            Millisecond detection. <strong className="text-[#1a1a1a] font-semibold ink-underline">Zero SLA breaches.</strong>
          </motion.p>

          <motion.button 
            variants={fadeUp}
            whileTap={{ scale: 0.95, rotate: -2 }}
            onClick={onLaunch}
            className="group relative inline-flex items-center justify-center px-10 md:px-16 py-4 md:py-5 text-lg md:text-xl font-bold text-[#da312e] bg-transparent transition-all duration-300 ease-out cursor-pointer w-full md:w-auto stamp hover:bg-[#da312e] hover:text-[#f4f1ea] hover:opacity-100"
          >
            <span className="relative z-10 flex items-center justify-center font-mono tracking-widest transition-all duration-300">
              <Power className="w-5 h-5 mr-3 transition-transform duration-300 group-hover:rotate-90" />
              <span>[ INITIALIZE SYSTEM ]</span>
            </span>
          </motion.button>
          
          <motion.div variants={fadeUp} className="mt-8 text-[11px] text-[#1a1a1a] font-mono tracking-[0.2em] mb-16 font-bold flex items-center gap-2 opacity-60">
            <ShieldAlert className="w-4 h-4" />
            Warning: Grants Full Routing Authority
          </motion.div>

        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
        >
          <motion.div 
            animate={{ height: ["0px", "40px", "0px"], y: [0, 20, 40], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-[2px] bg-[#1a1a1a]"
          />
        </motion.div>
      </section>

      {/* ================= SCROLL REVEAL HOOK ================= */}
      <section className="relative z-10">
        <ScrollRevealText text="WE DON'T JUST PREDICT DISRUPTIONS. WE AUTONOMOUSLY REROUTE THE GLOBAL SUPPLY CHAIN IN MILLISECONDS." />
      </section>

      {/* ================= SECTION 2: SYSTEM ARCHITECTURE ================= */}
      <section className="py-24 relative z-10 px-6 lg:px-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="max-w-7xl mx-auto">
          <motion.div variants={fadeUp} className="mb-16 flex items-center gap-4">
            <Workflow className="w-8 h-8 text-[#da312e]" />
            <div>
              <h2 className="text-3xl md:text-5xl font-display font-bold uppercase tracking-tight text-[#1a1a1a] mb-2">The Workflow</h2>
              <div className="w-16 h-[2px] bg-[#da312e]"></div>
            </div>
          </motion.div>

          <div ref={archRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 min-h-[400px]" style={{ perspective: "1200px" }}>
            {[
              { icon: Terminal, title: "Information Ingestion", num: "01", color: "#1a4c8a", code: "AGENT_TERM_IN", 
                desc: [
                  { text: "Dual-stream ingestion", highlight: true },
                  { text: " through the Agent Terminal via ", highlight: false },
                  { text: "direct user input", highlight: true },
                  { text: " and automated API triggers.", highlight: false }
                ] 
              },
              { icon: Activity, title: "Multi-Module Processing", num: "02", color: "#2c2c2c", code: "SYNC_MODULES", 
                desc: [
                  { text: "Cross-referencing live data", highlight: true },
                  { text: " from ", highlight: false },
                  { text: "WMS Nodes, Geo Network, & Telemetry", highlight: true },
                  { text: " modules to compute risk vectors.", highlight: false }
                ] 
              },
              { icon: GitCommit, title: "Pathfinding & Output", num: "03", color: "#da312e", code: "PLOT_REROUTE", 
                desc: [
                  { text: "Generates 3 optimal options.", highlight: true },
                  { text: " The selected trajectory is executed and ", highlight: false },
                  { text: "visualized on the Geo Network", highlight: true },
                  { text: " as a rerouted path.", highlight: false }
                ] 
              }
            ].map((item, i) => {
              const Icon = item.icon;
              return (
              <motion.div 
                key={i} 
                style={{
                  opacity: archOps[i],
                  y: archYs[i],
                  rotateX: archRots[i],
                  scale: archScales[i],
                  transformOrigin: "bottom center"
                }}
                className="w-full h-full relative"
              >
                <motion.div
                  initial="idle"
                  whileHover="hovering"
                  variants={{
                    idle: { scale: 1, y: 0, rotateZ: 0, boxShadow: "0px 0px 0px 0px rgba(26,26,26,1)" },
                    hovering: { 
                      scale: 1.05, 
                      y: -10, 
                      rotateZ: i === 1 ? 0 : (i === 0 ? -0.5 : 0.5),
                      boxShadow: "10px 10px 0px 0px rgba(26,26,26,1)", 
                      transition: { type: "spring", stiffness: 350, damping: 25 } 
                    }
                  }}
                  className="group border-2 border-[#1a1a1a] bg-[#f4f1ea] p-8 pb-12 relative flex flex-col justify-between paper-edge cursor-crosshair transform-gpu h-full origin-bottom"
                >
                  {/* Blueprint grid accent */}
                  <div className="absolute inset-0 pointer-events-none opacity-10 transition-opacity duration-700 group-hover:opacity-20" style={{ backgroundImage: `linear-gradient(${item.color} 1px, transparent 1px), linear-gradient(90deg, ${item.color} 1px, transparent 1px)`, backgroundSize: '16px 16px' }}></div>
                  
                  {/* Decorative blueprint header */}
                  <div className="absolute top-0 left-0 w-full px-4 py-2 border-b-2 border-[#1a1a1a] flex items-center justify-between opacity-100 bg-[#f4f1ea]">
                     <div className="text-[10px] text-[#1a1a1a] font-mono font-bold tracking-widest">{item.code}</div>
                     <div className="w-2 h-2 border border-[#1a1a1a] rounded-full" style={{ backgroundColor: item.color }}></div>
                  </div>

                  <div className="relative z-10 pt-6">
                    <div className="flex justify-between items-start mb-12">
                      <div className="p-3 border-2 border-[#1a1a1a] transition-all duration-500 rounded relative bg-white">
                        <Icon className="w-6 h-6 transition-transform duration-500 group-hover:scale-110 relative z-10" style={{ color: item.color }} />
                      </div>
                      <div className="text-[#d5d1c8] group-hover:text-[#1a1a1a] transition-colors duration-500 font-display text-7xl font-bold tracking-tighter mix-blend-multiply opacity-50 group-hover:opacity-100 italic">
                        {item.num}
                      </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm p-4 border border-[#e0dcd2]">
                      <h3 className="text-xl lg:text-2xl font-bold text-[#1a1a1a] tracking-tight mb-2 font-display">
                        {item.title}
                      </h3>
                      <p className="text-[13px] lg:text-[14px] text-[#4a4a4a] leading-relaxed font-sans mt-2 z-10 relative">
                        {item.desc.map((part, pIdx) => {
                          if (!part.highlight) return <span key={pIdx}>{part.text}</span>;
                          return (
                            <span key={pIdx} className="relative inline-block font-bold text-[#1a1a1a] px-[2px] mx-[2px] z-10">
                              <motion.span
                                variants={{
                                  idle: { scaleX: 0 },
                                  hovering: { scaleX: 1 }
                                }}
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                                style={{ backgroundColor: item.color, opacity: 0.25, transformOrigin: "left center" }}
                                className="absolute left-0 top-[10%] bottom-[10%] w-full -z-10 rounded-[3px]"
                              />
                              {part.text}
                            </span>
                          )
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ================= SECTION 3: TELEMETRY & EVENT INGESTION ================= */}
      <section ref={section3Ref} className="py-24 relative z-10 px-6 lg:px-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
          <motion.div variants={fadeUp} className="lg:w-1/3">
            <motion.div 
              initial="idle"
              whileInView="zap"
              viewport={{ margin: "-35% 0px -35% 0px" }}
              className="w-12 h-12 border-2 border-[#1a1a1a] flex items-center justify-center rounded-full mb-6 relative z-10 bg-[#fdfcfa]"
            >
              {/* Electricity particle elements */}
              <motion.div
                variants={{
                  idle: { opacity: 0, scale: 0.5, rotate: 0 },
                  zap: { 
                    opacity: [0, 1, 1, 0], 
                    scale: [0.5, 1.5, 2, 2.5], 
                    rotate: [0, 45, 90, 135],
                    transition: { duration: 0.5, times: [0, 0.2, 0.8, 1], ease: "easeOut" } 
                  }
                }}
                className="absolute inset-0 border-[2px] border-dashed border-[#1a1a1a] rounded-full pointer-events-none"
              />
              <motion.div
                variants={{
                  idle: { opacity: 0, scale: 0.5, rotate: 0 },
                  zap: { 
                    opacity: [0, 1, 1, 0], 
                    scale: [0.5, 1.2, 1.8, 2.2], 
                    rotate: [0, -45, -90, -135],
                    transition: { duration: 0.5, delay: 0.1, times: [0, 0.2, 0.8, 1], ease: "easeOut" } 
                  }
                }}
                className="absolute inset-0 border-[1px] border-dashed border-[#1a1a1a] rounded-full pointer-events-none"
              />

              <motion.div 
                variants={{
                  idle: { opacity: 0.5, scale: 1, backgroundColor: "transparent", borderColor: "#1a1a1a" },
                  zap: { 
                    opacity: [0.5, 1, 0.2, 1, 0.5], 
                    scale: [1, 1.1, 0.9, 1.1, 1],
                    backgroundColor: ["transparent", "#1a1a1a", "transparent", "#1a1a1a", "transparent"],
                    transition: { duration: 0.4 }
                  }
                }}
                className="absolute inset-2 border border-[#1a1a1a] rounded-full"
              />
              
              <motion.div
                variants={{
                  idle: { filter: "drop-shadow(0px 0px 0px rgba(26,26,26,0))", color: "#1a1a1a" },
                  zap: { 
                    filter: [
                      "drop-shadow(0px 0px 0px rgba(26,26,26,0))",
                      "drop-shadow(0px 0px 10px rgba(26,26,26,1))",
                      "drop-shadow(0px 0px 2px rgba(26,26,26,0.8))",
                      "drop-shadow(0px 0px 15px rgba(26,26,26,1))",
                      "drop-shadow(0px 0px 0px rgba(26,26,26,0))",
                    ],
                    color: ["#1a1a1a", "#ffffff", "#1a1a1a", "#ffffff", "#1a1a1a" ],
                    rotate: [0, -15, 15, -10, 10, 0],
                    scale: [1, 1.3, 0.8, 1.2, 1],
                    transition: { duration: 0.5 }
                  }
                }}
                className="relative z-10 flex items-center justify-center"
              >
                <Zap className="w-5 h-5 relative z-10 mix-blend-difference" />
              </motion.div>

              {/* Sparks emitting outwards using raw SVG for crisp "electricity" */}
              <motion.svg className="absolute -inset-10 w-[calc(100%+80px)] h-[calc(100%+80px)] pointer-events-none z-20" viewBox="0 0 100 100">
                {[
                  "M50,30 l-5,-10 l10,-5 l-5,-5",
                  "M70,50 l10,-5 l5,10 l5,-5",
                  "M50,70 l5,10 l-10,5 l5,5",
                  "M30,50 l-10,5 l-5,-10 l-5,5",
                  "M65,35 l10,-10 l-5,-5 l10,-5",
                  "M35,65 l-10,10 l5,5 l-10,5"
                ].map((d, i) => (
                  <motion.path
                    key={i}
                    d={d}
                    fill="none"
                    stroke="#1a1a1a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    variants={{
                      idle: { pathLength: 0, opacity: 0 },
                      zap: { 
                        pathLength: [0, 1, 1], 
                        opacity: [0, 1, 0, 1, 0],
                        transition: { duration: 0.4, delay: i * 0.05, ease: "linear" }
                      }
                    }}
                  />
                ))}
              </motion.svg>
            </motion.div>
            <h2 className="text-3xl font-display font-bold uppercase text-[#1a1a1a] leading-tight flex items-center flex-wrap gap-x-2 mb-4">
              <span>Real-time Threat</span>
              <ScrollHighlightHeader text="Velocity" />
            </h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed font-sans mb-8">
              SupplyGuard continuously ingests thousands of global logistics events per hour. Our neural models filter noise, identifying critical anomalies—such as labor strikes, extreme weather, or port congestion—before they cascade into failures.
            </p>
            <div className="flex flex-col gap-2">
              <div className="text-[10px] text-[#1a4c8a] tracking-widest font-mono uppercase border-l-2 border-[#1a4c8a] p-2 bg-white/50">
                <span className="font-bold">Model:</span> SG-Event-Parse-v4
              </div>
              <div className="text-[10px] text-[#da312e] tracking-widest font-mono uppercase border-l-2 border-[#da312e] p-2 bg-white/50">
                <span className="font-bold">Latency:</span> 1.2ms / event
              </div>
            </div>
          </motion.div>
          
          <motion.div variants={fadeUp} className="lg:w-2/3 w-full h-[400px] bg-[#fdfcfa] p-4 relative rounded-sm border-2 border-[#1a1a1a] paper-edge overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#1a4c8a]"></div>
            <div className="absolute bottom-4 left-4 text-[10px] text-[#da312e] font-mono tracking-widest z-10 opacity-50 rotate-[-90deg] translate-y-16 -translate-x-12">UNCLASSIFIED</div>
            
            <div className="w-full h-full">
               <TelemetryChartInteractive progress={s3Progress} />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ================= SECTION 4: COST MITIGATION ================= */}
      <section ref={section4Ref} className="py-24 relative z-10 px-6 lg:px-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse gap-16 items-center">
          <motion.div variants={fadeUp} className="lg:w-1/3">
            <div className="w-12 h-12 border-2 border-[#1a1a1a] flex items-center justify-center rounded-sm mb-6 bg-white rotate-3">
              <TrendingDown className="w-5 h-5 text-[#1a4c8a]" />
            </div>
            <h2 className="text-3xl font-display font-bold uppercase text-[#1a1a1a] mb-4">Agent Terminal Mitigation</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed font-sans mb-8">
              By proactively rerouting shipments around predicted bottlenecks, the Agent Terminal prevents exponential late-fees, expedited air-freight penalties, and total loss cascades. The AI optimizes for the lowest cost delta that still respects required SLAs.
            </p>
          </motion.div>
          
          <motion.div variants={fadeUp} className="lg:w-2/3 w-full h-[400px] bg-[#fdfcfa] p-4 relative border-2 border-[#1a1a1a] paper-edge overflow-hidden">
             <div className="absolute top-0 right-0 w-1 h-full bg-[#1a4c8a]"></div>
             <div className="absolute top-4 left-4 text-[10px] text-[#1a1a1a] bg-[#f4f1ea] border border-[#1a1a1a] uppercase tracking-widest z-10 px-2 py-1 font-display font-bold shadow-[2px_2px_0_#1a1a1a]">Fig. 2: Penalty Extrapolation</div>
             <motion.div style={{ clipPath: s4Clip }} className="w-full h-full mt-4">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={costMitigationData} margin={{ top: 40, right: 0, left: 20, bottom: 0 }}>
                    <defs>
                      <pattern id="diagonalHatch" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="0" y2="4" stroke="#da312e" strokeWidth="1" opacity="0.3" />
                      </pattern>
                      <pattern id="crossHatch" width="4" height="4" patternUnits="userSpaceOnUse">
                        <path d="M 4 0 L 0 4 M 0 0 L 4 4" fill="none" stroke="#1a4c8a" strokeWidth="0.5" opacity="0.3"/>
                      </pattern>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d5d1c8" vertical={true} />
                    <XAxis dataKey="stage" stroke="#1a1a1a" tick={{fill: '#4a4a4a', fontSize: 10, fontFamily: 'monospace'}} tickLine={true} axisLine={true} />
                    <YAxis stroke="#1a1a1a" tick={{fill: '#4a4a4a', fontSize: 10, fontFamily: 'monospace'}} tickLine={true} axisLine={true} tickFormatter={(value) => `$${value/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fdfcfa', border: '2px solid #1a1a1a', borderRadius: '0px', boxShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}
                      itemStyle={{ fontSize: 12, textTransform: 'uppercase', fontFamily: 'monospace', color: '#1a1a1a' }} 
                    />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: '#1a1a1a' }} />
                    <Area type="monotone" dataKey="unmitigated" stroke="#da312e" strokeWidth={2} fillOpacity={1} fill="url(#diagonalHatch)" name="Unmitigated Financial Risk" />
                    <Area type="monotone" dataKey="supplyGuard" stroke="#1a4c8a" strokeWidth={2} fillOpacity={1} fill="url(#crossHatch)" name="SupplyGuard AI Response" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ================= SECTION 5: SLA COMPLIANCE ================= */}
      <section ref={section5Ref} className="py-24 relative z-10 px-6 lg:px-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
          <motion.div variants={fadeUp} className="lg:w-1/3">
            <div className="w-12 h-12 border-2 border-[#1a1a1a] flex items-center justify-center rounded-sm mb-6 bg-white -rotate-3">
              <CheckCircle2 className="w-5 h-5 text-[#da312e]" />
            </div>
            <h2 className="text-3xl font-display font-bold uppercase text-[#1a1a1a] mb-4">Active Fleet Resilience</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed font-sans mb-8">
              Different shipments command different priority tiers. The Active Fleet mathematical gating ensures that Gold-tier service level agreements (SLAs) are absolutely protected, adjusting routes based on contract penalty weightings.
            </p>
          </motion.div>
          
          <motion.div variants={fadeUp} className="lg:w-2/3 w-full h-[400px] bg-[#fdfcfa] p-4 relative border-2 border-[#1a1a1a] paper-edge overflow-hidden">
             <div className="absolute top-4 right-4 text-[10px] text-[#1a1a1a] bg-[#f4f1ea] border border-[#1a1a1a] uppercase tracking-widest z-10 px-2 py-1 font-display font-bold shadow-[2px_2px_0_#1a1a1a]">Fig. 3: Fleet Status by Region</div>
             <motion.div style={{ scaleY: s5ScaleY, transformOrigin: "bottom" }} className="w-full h-full mt-4">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={fleetData} margin={{ top: 40, right: 20, left: 0, bottom: 0 }}>
                   <defs>
                     <pattern id="dotPattern" width="4" height="4" patternUnits="userSpaceOnUse">
                       <circle cx="2" cy="2" r="1" fill="#1a1a1a" opacity="0.3" />
                     </pattern>
                     <pattern id="stripePattern" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="0" y2="4" stroke="#da312e" strokeWidth="1" opacity="0.5" />
                     </pattern>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" stroke="#d5d1c8" vertical={false} />
                   <XAxis dataKey="region" stroke="#1a1a1a" tick={{fill: '#1a1a1a', fontSize: 10, fontFamily: 'monospace'}} tickLine={true} axisLine={true} />
                   <YAxis stroke="#1a1a1a" tick={{fill: '#4a4a4a', fontSize: 10, fontFamily: 'monospace'}} tickLine={true} axisLine={true} />
                   <Tooltip 
                      cursor={{fill: 'rgba(0,0,0,0.05)'}}
                      contentStyle={{ backgroundColor: '#fdfcfa', border: '2px solid #1a1a1a', borderRadius: '0px', boxShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}
                      itemStyle={{ fontSize: 12, textTransform: 'uppercase', fontFamily: 'monospace', color: '#1a1a1a' }} 
                   />
                   <Legend iconType="square" wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: '#1a1a1a' }} />
                   <Bar dataKey="onTime" stackId="a" fill="#1a1a1a" name="On Time" maxBarSize={40} />
                   <Bar dataKey="mitigated" stackId="a" fill="url(#dotPattern)" stroke="#1a1a1a" name="Auto-Mitigated" maxBarSize={40} />
                   <Bar dataKey="delayed" stackId="a" fill="url(#stripePattern)" stroke="#da312e" name="Delayed (Critical)" maxBarSize={40} />
                 </BarChart>
               </ResponsiveContainer>
             </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ================= SECTION 6: DECISION ENGINE ================= */}
      <section ref={section6Ref} className="py-24 relative z-10 px-6 lg:px-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse gap-16 items-center">
          <motion.div variants={fadeUp} className="lg:w-1/3">
            <div className="w-12 h-12 border-2 border-[#1a1a1a] flex items-center justify-center rounded-sm mb-6 bg-white rotate-6">
              <Layers className="w-5 h-5 text-[#2c2c2c]" />
            </div>
            <h2 className="text-3xl font-display font-bold uppercase text-[#1a1a1a] mb-4">Sys Config Execution</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed font-sans mb-8">
              The agent is designed to execute. When a disruption triggers a reroute plan, if the cost and delay thresholds fall within predefined Sys Config safety limits, the system injects the redirect command back instantly, requiring zero human intervention.
            </p>
          </motion.div>
          
          <motion.div variants={fadeUp} className="lg:w-2/3 w-full h-[400px] relative border-2 border-[#1a1a1a] p-4 bg-[#fdfcfa] paper-edge overflow-hidden">
             <div className="absolute top-4 right-4 text-[10px] text-[#1a1a1a] bg-[#f4f1ea] border border-[#1a1a1a] uppercase tracking-widest z-10 px-2 py-1 font-display font-bold shadow-[2px_2px_0_#1a1a1a]">Fig. 4: Config Constraints</div>
             <motion.div style={{ scale: s6Scale, opacity: s6Opacity }} className="w-full h-full">
               <SysConfigSim />
             </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ================= SECTION 7: CAPACITY VS DEMAND ================= */}
      <section ref={section7Ref} className="py-24 relative z-10 px-6 lg:px-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
          <motion.div variants={fadeUp} className="lg:w-1/3">
            <div className="w-12 h-12 border-2 border-[#1a1a1a] flex items-center justify-center rounded-sm mb-6 bg-white -rotate-6">
              <MapPin className="w-5 h-5 text-[#da312e]" />
            </div>
            <h2 className="text-3xl font-display font-bold uppercase text-[#1a1a1a] mb-4">Geo Network & WMS Nodes</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed font-sans mb-8">
              Rerouting is useless if the alternate port is full. The Geo Network cross-references live WMS Nodes capacity data to ensure that proposed diversions won't simply land in another congested queue.
            </p>
          </motion.div>
          
          <motion.div variants={fadeUp} className="lg:w-2/3 w-full h-[400px] bg-[#fdfcfa] p-4 relative border-2 border-[#1a1a1a] paper-edge overflow-hidden">
             <div className="absolute top-4 right-4 text-[10px] text-[#1a1a1a] bg-[#f4f1ea] border border-[#1a1a1a] uppercase tracking-widest z-10 px-2 py-1 font-display font-bold shadow-[2px_2px_0_#1a1a1a]">Fig. 5: Node Saturation Index</div>
             <motion.div style={{ clipPath: s7Clip }} className="w-full h-full mt-4">
               <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={capacityData} margin={{ top: 40, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <pattern id="hatchS7" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                          <line x1="0" y1="0" x2="0" y2="4" stroke="#d5d1c8" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d5d1c8" vertical={false} />
                    <XAxis dataKey="node" stroke="#1a1a1a" tick={{fill: '#4a4a4a', fontSize: 10, fontFamily: 'monospace'}} tickLine={true} axisLine={true} />
                    <YAxis stroke="#1a1a1a" tick={{fill: '#4a4a4a', fontSize: 10, fontFamily: 'monospace'}} tickLine={true} axisLine={true} />
                    <Tooltip 
                      cursor={{fill: 'rgba(0,0,0,0.05)'}}
                      contentStyle={{ backgroundColor: '#fdfcfa', border: '2px solid #1a1a1a', borderRadius: '0px', boxShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}
                      itemStyle={{ fontSize: 12, textTransform: 'uppercase', fontFamily: 'monospace', color: '#1a1a1a' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: '#1a1a1a' }} iconType="square" />
                    <Bar dataKey="demand" barSize={40} fill="url(#hatchS7)" stroke="#1a1a1a" name="Current Demand %" radius={[0, 0, 0, 0]} />
                    <Line type="step" dataKey="capacity" stroke="#da312e" strokeWidth={2} dot={false} name="Live Carrier Capacity %" />
                  </ComposedChart>
               </ResponsiveContainer>
             </motion.div>
          </motion.div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="max-w-4xl mx-auto text-center mt-32 pb-24 border-t-2 border-[#1a1a1a] pt-16 border-dashed">
          <h2 className="text-4xl font-display font-bold uppercase text-[#1a1a1a] mb-8">Deploy the Routing Engine</h2>
          <button 
            onClick={onLaunch}
            className="group relative inline-flex items-center justify-center px-12 py-4 text-sm font-bold text-[#f4f1ea] bg-[#1a1a1a] transition-all duration-300 ease-out cursor-pointer hover:bg-[#da312e]"
          >
            <span className="font-mono tracking-widest uppercase">Launch Operations Interface</span>
          </button>
        </motion.div>
      </section>

    </div>
  );
}
