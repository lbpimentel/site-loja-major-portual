import { motion } from 'motion/react';

const benefits = [
  {
    title: "Treinos Mensais",
    description: "Encontros estratégicos em estandes de elite no Rio de Janeiro, com foco em progressão técnica.",
    image: "https://images.unsplash.com/photo-1615822987822-bc58a033da78?q=80&w=1887&auto=format&fit=crop"
  },
  {
    title: "Cursos Exclusivos",
    description: "Instrução avançada com profissionais de forças especiais adaptada para membros do clube.",
    image: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?q=80&w=2070&auto=format&fit=crop"
  },
  {
    title: "Eventos Sociais",
    description: "Ágapes táticos e networking exclusivo entre irmãos de diferentes potências.",
    image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2070&auto=format&fit=crop"
  },
  {
    title: "Identidade",
    description: "Acesso ao Patch oficial bordado, kit de boas-vindas e credencial de membro.",
    image: "https://images.unsplash.com/photo-1563206767-5b18f218e8de?q=80&w=2069&auto=format&fit=crop"
  }
];

export default function Activities() {
  return (
    <section id="benefits" className="py-24 px-4 steel-bg">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl text-white mb-6">Atividades & Benefícios</h2>
          <div className="h-1 bg-aged-gold w-24 mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div 
              key={benefit.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative overflow-hidden bg-matte-black border border-gunmetal h-96 flex flex-col justify-end"
            >
              <div className="absolute inset-0 z-0">
                <img 
                  src={benefit.image} 
                  alt={benefit.title} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700 opacity-40 group-hover:opacity-60"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-matte-black via-matte-black/40 to-transparent" />
              </div>
              
              <div className="relative z-10 p-6 transform group-hover:-translate-y-2 transition-transform duration-500">
                <h3 className="text-xl text-aged-gold mb-3 group-hover:text-white transition-colors">
                  {benefit.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 h-0 group-hover:h-auto">
                  {benefit.description}
                </p>
              </div>

              <div className="absolute bottom-0 left-0 h-1 bg-aged-gold w-0 group-hover:w-full transition-all duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
