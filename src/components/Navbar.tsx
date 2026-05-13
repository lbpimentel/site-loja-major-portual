import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Manifesto', href: '#manifesto' },
    { name: 'Admissão', href: '#admission' },
    { name: 'Benefícios', href: '#benefits' },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        isScrolled ? 'bg-matte-black/95 border-b border-gunmetal/50 py-4 backdrop-blur-md' : 'bg-transparent py-8'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <motion.a 
          href="#home"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 group"
        >
          <img 
            src="/logo.png" 
            alt="Bodes da Mira Logo" 
            className="w-12 h-12 object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <span className="text-white font-display font-bold tracking-widest text-sm uppercase">Bodes da Mira</span>
            <span className="text-aged-gold font-mono text-[8px] uppercase tracking-[0.3em]">Masonic Shooting Club</span>
          </div>
        </motion.a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <a 
              key={link.name}
              href={link.href}
              className="text-xs font-mono text-gray-400 uppercase tracking-widest hover:text-aged-gold transition-colors"
            >
              {link.name}
            </a>
          ))}
          <a 
            href="#preregistration"
            className="px-6 py-2 border border-aged-gold text-aged-gold text-xs font-display font-bold uppercase tracking-widest hover:bg-aged-gold hover:text-matte-black transition-all"
          >
            Admissão
          </a>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-0 bg-matte-black z-[60] flex flex-col items-center justify-center gap-12"
          >
            <button 
              className="absolute top-8 right-8 text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={32} />
            </button>
            {navLinks.map((link) => (
              <a 
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-display font-bold text-white uppercase tracking-widest"
              >
                {link.name}
              </a>
            ))}
            <a 
              href="#preregistration"
              onClick={() => setMobileMenuOpen(false)}
              className="px-10 py-4 bg-aged-gold text-matte-black font-display font-bold uppercase tracking-widest"
            >
              Admissão
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
