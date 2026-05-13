export default function Footer() {
  return (
    <footer className="py-12 px-4 bg-matte-black border-t border-gunmetal/30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-4 text-center md:text-left">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-16 h-16 opacity-50 hover:opacity-100 transition-opacity"
            referrerPolicy="no-referrer"
          />
          <div>
            <h2 className="text-xl text-aged-gold mb-1">Bodes da Mira</h2>
            <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">
              Rio de Janeiro • Brasil
            </p>
          </div>
        </div>
        
        <div className="max-w-md text-center md:text-right">
          <p className="text-[10px] text-gray-600 leading-relaxed uppercase tracking-[0.15em]">
            Entidade independente sem vínculo institucional com Potências Maçônicas. Exclusivo para membros da Ordem. O uso indevido da marca e símbolos é vedado.
          </p>
          <p className="mt-4 text-[10px] text-gray-800">
            &copy; {new Date().getFullYear()} Bodes da Mira. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
