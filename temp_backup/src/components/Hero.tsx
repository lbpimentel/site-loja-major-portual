import { motion, useScroll, useTransform } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useRef } from 'react';

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section 
      id="home"
      ref={ref}
      className="relative h-screen w-full overflow-hidden flex items-center justify-center pt-20"
    >
      {/* Background Image with Parallax */}
      <motion.div 
        style={{ y }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-matte-black/70 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1615822987822-bc58a033da78?q=80&w=2070&auto=format&fit=crop" 
          alt="Gun range close up" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
        style={{ opacity }}
        className="relative z-20 text-center px-4 max-w-4xl flex flex-col items-center"
      >
        <motion.img 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src="input_file_0.png" 
          alt="Bodes da Mira Emblem" 
          className="w-32 h-32 md:w-48 md:h-48 mb-8 object-contain drop-shadow-[0_0_20px_rgba(197,160,89,0.3)]"
          referrerPolicy="no-referrer"
        />
        <span className="font-mono text-aged-gold text-sm tracking-[0.3em] uppercase mb-4 block">
          Rio de Janeiro • Elite Tática
        </span>
        <h1 className="text-5xl md:text-8xl mb-6 gold-text-gradient">
          Bodes da Mira
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 font-light max-w-2xl mx-auto mb-10 leading-relaxed">
          Onde a retidão da conduta precede o disparo. Um refúgio premium para o aperfeiçoamento e a fraternidade.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="#preregistration"
            className="px-8 py-4 bg-aged-gold text-matte-black font-display font-bold uppercase tracking-widest hover:bg-gold-hover transition-colors rounded-sm"
            id="cta-join"
          >
            Solicitar Admissão
          </a>
          <a 
            href="#manifesto"
            className="px-8 py-4 border border-aged-gold text-aged-gold font-display font-bold uppercase tracking-widest hover:bg-aged-gold/10 transition-colors rounded-sm"
          >
            Conhecer Manifesto
          </a>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 hidden md:block"
      >
        <ChevronDown className="text-aged-gold w-8 h-8 opacity-50" />
      </motion.div>
    </section>
  );
}
