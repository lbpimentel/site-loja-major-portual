import { useState } from 'react';
import { motion } from 'motion/react';
import { Send } from 'lucide-react';

export default function PreRegistration() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <section id="preregistration" className="py-24 px-4 bg-matte-black border-t border-gunmetal">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl text-white mb-6">Pré-Inscrição</h2>
          <p className="text-gray-400 italic">
            Inicie seu processo de sindicância preenchendo os dados abaixo com absoluta precisão.
          </p>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-10 border border-aged-gold bg-aged-gold/10 text-center rounded-sm"
          >
            <h3 className="text-2xl text-aged-gold mb-4">Solicitação Recebida</h3>
            <p className="text-gray-300">
              Seus dados foram encaminhados à comissão de sindicância. 
              Em breve entraremos em contato via WhatsApp para as próximas etapas.
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-gray-500 uppercase tracking-widest px-2">Nome Completo</label>
                <input 
                  required
                  type="text" 
                  className="bg-gunmetal/20 border border-gunmetal p-4 text-white focus:border-aged-gold focus:outline-none transition-colors rounded-sm" 
                  placeholder="Nome do Ir."
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-gray-500 uppercase tracking-widest px-2">WhatsApp</label>
                <input 
                  required
                  type="tel" 
                  className="bg-gunmetal/20 border border-gunmetal p-4 text-white focus:border-aged-gold focus:outline-none transition-colors rounded-sm" 
                  placeholder="(21) 99999-9999"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-gray-500 uppercase tracking-widest px-2">Loja Maçônica</label>
                <input 
                  required
                  type="text" 
                  className="bg-gunmetal/20 border border-gunmetal p-4 text-white focus:border-aged-gold focus:outline-none transition-colors rounded-sm" 
                  placeholder="Nome e Número"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-gray-500 uppercase tracking-widest px-2">Potência</label>
                <select 
                  required
                  className="bg-gunmetal/20 border border-gunmetal p-4 text-white focus:border-aged-gold focus:outline-none transition-colors rounded-sm appearance-none"
                >
                  <option value="" className="bg-matte-black">Selecione...</option>
                  <option value="GLERJ" className="bg-matte-black">GLERJ</option>
                  <option value="GOB" className="bg-matte-black">GOB</option>
                  <option value="COMAB" className="bg-matte-black">COMAB</option>
                  <option value="OUTRA" className="bg-matte-black">Outra</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-mono text-gray-500 uppercase tracking-widest px-2">CIM (Cadastro Industrial Maçônico)</label>
                <input 
                  required
                  type="text" 
                  className="bg-gunmetal/20 border border-gunmetal p-4 text-white focus:border-aged-gold focus:outline-none transition-colors rounded-sm" 
                  placeholder="Número do seu CIM"
                />
              </div>
            </div>

            <p className="text-[10px] text-gray-600 uppercase tracking-wider text-center mt-8">
              Atenciosamente, Comando Bodes da Mira.
            </p>

            <button 
              disabled={loading}
              type="submit"
              className="w-full py-5 bg-aged-gold text-matte-black font-display font-bold uppercase tracking-widest hover:bg-gold-hover transition-all flex items-center justify-center gap-3 disabled:opacity-50 rounded-sm"
              id="submit-register"
            >
              {loading ? "Processando..." : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Solicitação
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
