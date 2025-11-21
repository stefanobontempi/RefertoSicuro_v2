import React, { useState } from 'react';
import LegalModal from './LegalModal';
import LicensesModal from './LicensesModal';

const Footer = () => {
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (type) => {
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <>
      <footer className="mt-auto" style={{ backgroundColor: '#5399d9' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* About - Centered on mobile */}
            <div className="text-center md:text-left">
              <h4 className="text-sm font-semibold text-white mb-4">Referto Sicuro</h4>
              <div className="space-y-2 flex flex-col items-center md:items-start">
                <button
                  onClick={() => openModal('privacy_policy')}
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  Privacy Policy
                </button>
                <button
                  onClick={() => openModal('cookie_policy')}
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  Cookie Policy
                </button>
                <button
                  onClick={() => openModal('terms_conditions')}
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  Termini e Condizioni
                </button>
                <button
                  onClick={() => openModal('licenses')}
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  Licenze Open Source
                </button>
              </div>
            </div>

          {/* Company */}
          <div className="flex flex-col items-center justify-center gap-3">
            <a
              href="https://www.iusmedical.it/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img
                src="/logo_iusmedical_bianco.svg"
                alt="IusMedical Logo"
                className="w-auto object-contain"
                style={{ height: '3.5rem' }}
              />
            </a>
            <a
              href="https://www.iusmedical.it/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-white hover:opacity-80 transition-opacity"
            >
              IusMedical S.R.L.S
            </a>
          </div>

          {/* Social Media */}
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-6">
              <a
                href="https://www.linkedin.com/company/iusmedical/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity flex items-center justify-center"
              >
                <img
                  src="/icon_linkedin.png"
                  alt="LinkedIn"
                  className="w-8 h-8 object-contain"
                />
              </a>
              <a
                href="https://www.instagram.com/iusmedical/?igsh=MXFsYzZrZTM1aWp3eQ%3D%3D#"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity flex items-center justify-center"
              >
                <img
                  src="/icon_ig.png"
                  alt="Instagram"
                  className="w-8 h-8 object-contain"
                />
              </a>
              <a
                href="https://www.facebook.com/people/IusMedical/61582004390151/?mibextid=wwXIfr&rdid=NLKNm05nexx2IHaB&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F17FP2Mv8kM%2F%3Fmibextid%3DwwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity flex items-center justify-center"
              >
                <img
                  src="/icon_fb.png"
                  alt="Facebook"
                  className="w-7 h-7 object-contain"
                />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/20 px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs sm:text-sm text-white/60 font-bold text-center md:text-left">
              © 2025 Referto Sicuro • Tutti i diritti riservati • Brevetto depositato – Domanda n. IT2025 102025000026458 • Prodotto da{' '}
              <a
                href="https://www.iusmedical.it/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors"
              >
                IusMedical S.r.l.s.
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>

    {/* Legal Modals */}
    <LegalModal
      isOpen={activeModal === 'privacy_policy'}
      onClose={closeModal}
      consentType="privacy_policy"
      title="Privacy Policy"
    />
    <LegalModal
      isOpen={activeModal === 'cookie_policy'}
      onClose={closeModal}
      consentType="cookie_policy"
      title="Cookie Policy"
    />
    <LegalModal
      isOpen={activeModal === 'terms_conditions'}
      onClose={closeModal}
      consentType="terms_conditions"
      title="Termini e Condizioni"
    />

    {/* Licenses Modal */}
    <LicensesModal
      isOpen={activeModal === 'licenses'}
      onClose={closeModal}
    />
  </>
  );
};

export default Footer;