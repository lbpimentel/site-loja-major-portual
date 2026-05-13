import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

const requirements = [
  "Ser Mestre Maçom (ou Companheiro) regular em sua potência.",
  "Estar quite com suas obrigações maçônicas e civis.",
  "Aprovação unânime em sindicância interna do clube.",
  "Comprometer-se com o código de ética e sigilo do Bodes da Mira."
];

export default function Admission() {
  return (
    <section id="admission" className="py-24 px-4 bg-matte-black">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex-1"
        >
          <img 
            src="https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=1974&auto=format&fit=crop" 
            alt="Technical equipment" 
            className="w-full h-auto rounded-sm grayscale hover:grayscale-0 transition-all duration-700 shadow-2xl border border-aged-gold/20"
            referrerPolicy="no-referrer"
          />
        </motion.div>
        
        <div className="flex-1">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl text-white mb-8"
          >
            O Filtro de <span className="text-aged-gold">Admissão</span>
          </motion.h2>
          <p className="text-gray-400 mb-10 text-lg">
            A exclusividade é nosso maior patrimônio. Para manter o nível técnico e a harmonia fraterna, todos os candidatos passam por um rigoroso processo de seleção.
          </p>
          
          <ul className="space-y-6">
            {requirements.map((req, index) => (
              <motion.li 
                key={index}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4"
              >
                <CheckCircle2 className="text-aged-gold w-6 h-6 mt-1 flex-shrink-0" />
                <span className="text-gray-300 font-medium md:text-lg">{req}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
