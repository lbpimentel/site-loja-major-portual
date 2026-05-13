/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Manifesto from './components/Manifesto';
import Admission from './components/Admission';
import Activities from './components/Activities';
import PreRegistration from './components/PreRegistration';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';

export default function App() {
  return (
    <div className="min-h-screen bg-matte-black text-gray-200 relative overflow-x-hidden">
      {/* Fixed Background Logo */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <img 
          src="input_file_0.png" 
          alt="" 
          className="w-[120%] max-w-none opacity-[0.03] grayscale pointer-events-none select-none"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero />
          <Manifesto />
          <Admission />
          <Activities />
          <PreRegistration />
        </main>
        <Footer />
        <WhatsAppButton />
      </div>
    </div>
  );
}
