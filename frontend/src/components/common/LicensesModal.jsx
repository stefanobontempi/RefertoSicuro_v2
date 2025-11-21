import React, { useEffect } from 'react';

const LicensesModal = ({ isOpen, onClose }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const licenses = {
    backend: [
      { name: 'fastapi', version: '0.119.0', license: 'MIT', url: 'https://github.com/fastapi/fastapi' },
      { name: 'uvicorn', version: '0.24.0+', license: 'BSD-3-Clause', url: 'https://www.uvicorn.org' },
      { name: 'pydantic', version: '2.5.0+', license: 'MIT', url: 'https://github.com/pydantic/pydantic' },
      { name: 'python-jose', version: '3.5.0', license: 'MIT', url: 'https://github.com/mpdavis/python-jose' },
      { name: 'passlib', version: '1.7.4', license: 'BSD', url: 'https://passlib.readthedocs.io' },
      { name: 'bcrypt', version: '4.3.0', license: 'Apache-2.0', url: 'https://github.com/pyca/bcrypt' },
      { name: 'sqlalchemy', version: '2.0.44', license: 'MIT', url: 'https://www.sqlalchemy.org' },
      { name: 'alembic', version: '1.17.0', license: 'MIT', url: 'https://alembic.sqlalchemy.org' },
      { name: 'openai', version: '1.109.1', license: 'Apache-2.0', url: 'https://github.com/openai/openai-python' },
      { name: 'stripe', version: '13.0.1+', license: 'MIT', url: 'https://github.com/stripe/stripe-python' },
      { name: 'celery', version: '5.5.3', license: 'BSD-3-Clause', url: 'https://docs.celeryq.dev' },
      { name: 'redis', version: '4.6.0+', license: 'MIT', url: 'https://github.com/redis/redis-py' },
      { name: 'selenium', version: '4.15.2', license: 'Apache-2.0', url: 'https://www.selenium.dev' }
    ],
    frontend: [
      { name: 'react', version: '18.3.1', license: 'MIT', url: 'https://github.com/facebook/react' },
      { name: 'react-dom', version: '18.3.1', license: 'MIT', url: 'https://github.com/facebook/react' },
      { name: 'react-router-dom', version: '6.30.1', license: 'MIT', url: 'https://github.com/remix-run/react-router' },
      { name: 'vite', version: '7.1.11', license: 'MIT', url: 'https://github.com/vitejs/vite' },
      { name: 'axios', version: '1.12.2', license: 'MIT', url: 'https://github.com/axios/axios' },
      { name: 'tailwindcss', version: '3.4.17', license: 'MIT', url: 'https://github.com/tailwindlabs/tailwindcss' },
      { name: 'lucide-react', version: '0.544.0', license: 'ISC', url: 'https://github.com/lucide-icons/lucide' },
      { name: 'sweetalert2', version: '11.23.0', license: 'MIT', url: 'https://github.com/sweetalert2/sweetalert2' },
      { name: '@iconify/react', version: '6.0.2', license: 'MIT', url: 'https://github.com/iconify/iconify' }
    ]
  };

  const getLicenseColor = (license) => {
    const colors = {
      'MIT': 'bg-green-100 text-green-800',
      'Apache-2.0': 'bg-blue-100 text-blue-800',
      'BSD': 'bg-purple-100 text-purple-800',
      'BSD-3-Clause': 'bg-purple-100 text-purple-800',
      'ISC': 'bg-teal-100 text-teal-800'
    };
    return colors[license] || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[10000] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div
          className="card max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#5399d9' }}>
                Licenze Open Source
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Librerie di terze parti utilizzate in RefertoSicuro
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto specialty-scroll py-6">
            {/* Summary Banner */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">Tutte le licenze sono commercialmente compatibili</h3>
                  <p className="text-sm text-green-800">
                    Tutte le librerie utilizzate hanno licenze permissive (MIT, Apache 2.0, BSD, ISC)
                    che consentono l'uso commerciale senza restrizioni.
                  </p>
                </div>
              </div>
            </div>

            {/* Backend Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center" style={{ color: '#5399d9' }}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                Backend (Python)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Libreria</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Licenza</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repository</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {licenses.backend.map((lib, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {lib.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLicenseColor(lib.license)}`}>
                            {lib.license}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <a
                            href={lib.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Link
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Frontend Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center" style={{ color: '#5399d9' }}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Frontend (React)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Libreria</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Licenza</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repository</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {licenses.frontend.map((lib, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {lib.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLicenseColor(lib.license)}`}>
                            {lib.license}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <a
                            href={lib.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Link
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* License Types Info */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h4 className="font-semibold mb-3" style={{ color: '#5399d9' }}>Informazioni sulle Licenze</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">MIT & ISC:</span> Licenze molto permissive che consentono uso commerciale,
                  modifiche e redistribuzione con solo obbligo di copyright notice.
                </p>
                <p>
                  <span className="font-medium">Apache 2.0:</span> Licenza permissiva con grant esplicito di brevetti,
                  ideale per uso commerciale.
                </p>
                <p>
                  <span className="font-medium">BSD/BSD-3-Clause:</span> Licenza permissiva simile a MIT, consente uso
                  commerciale senza restrizioni.
                </p>
              </div>
            </div>

            {/* Copyright Notice */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                © 2025-2026 IusMedical S.r.l.s. - RefertoSicuro è un prodotto proprietario.
                <br />
                Le librerie di terze parti elencate sono soggette alle rispettive licenze.
                <br />
                Ultimo aggiornamento: 30 Ottobre 2025
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-2xl font-medium text-white transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: '#5399d9' }}
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LicensesModal;
