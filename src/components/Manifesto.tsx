import { motion } from 'motion/react';
import { Target, Shield, Users } from 'lucide-react';

const pillars = [
  {
    icon: <Target className="w-10 h-10" />,
    title: "Precisão",
    description: "A busca incessante pela excelência técnica e controle absoluto em cada disparo."
  },
  {
    icon: <Shield className="w-10 h-10" />,
    title: "Sigilo",
    description: "Preservação da discrição e proteção mútua, mantendo a integridade de nossa ordem."
  },
  {
    icon: <Users className="w-10 h-10" />,
    title: "Fraternidade",
    description: "Fortalecimento dos laços que nos unem sob o esquadro e o compasso, agora na mira."
  }
];

export default function Manifesto() {
  return (
    <section id="manifesto" className="py-24 px-4 textured-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl text-white mb-6"
          >
            Nosso Manifesto
          </motion.h2>
          <motion.div 
            initial={{ width: 0 }}
            whileInView={{ width: "100px" }}
            viewport={{ once: true }}
            className="h-1 bg-aged-gold mx-auto mb-8"
          />
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed italic"
          >
            "Não somos apenas um clube de tiro. Somos um refúgio para o aperfeiçoamento da técnica e o fortalecimento dos laços fraternos. No Bodes da Mira, a retidão da conduta precede o disparo."
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {pillars.map((pillar, index) => (
            <motion.div 
              key={pillar.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="group p-8 border border-gunmetal bg-matte-black/50 hover:border-aged-gold transition-all duration-500 rounded-sm"
              id={`pillar-${pillar.title.toLowerCase()}`}
            >
              <div className="text-aged-gold mb-6 group-hover:scale-110 transition-transform duration-500">
                {pillar.icon}
              </div>
              <h3 className="text-xl text-white mb-4 tracking-widest">{pillar.title}</h3>
              <p className="text-gray-500 group-hover:text-gray-300 transition-colors">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
