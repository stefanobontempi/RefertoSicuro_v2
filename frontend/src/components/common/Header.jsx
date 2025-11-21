import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, openAuthModal } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const headerRef = useRef(null);

  // Fix Safari rendering bug
  useEffect(() => {
    if (headerRef.current) {
      // Force Safari to repaint the header
      const header = headerRef.current;
      header.style.display = 'none';
      header.offsetHeight; // Trigger reflow
      header.style.display = 'block';
    }
  }, []);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Conferma Logout',
      text: 'Sei sicuro di voler uscire dal tuo account?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#5399d9',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sì, esci',
      cancelButtonText: 'Annulla',
      background: '#ffffff',
      customClass: {
        popup: 'rounded-2xl',
        title: 'text-xl font-bold',
        content: 'text-sm text-gray-600',
        confirmButton: 'rounded-xl px-6 py-3 font-medium',
        cancelButton: 'rounded-xl px-6 py-3 font-medium'
      }
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await logout();
      setShowUserMenu(false);
      navigate('/');
      
      Swal.fire({
        title: 'Logout Effettuato',
        text: 'Sei stato disconnesso con successo',
        icon: 'success',
        confirmButtonColor: '#5399d9',
        confirmButtonText: 'OK',
        background: '#ffffff',
        timer: 2000,
        timerProgressBar: true,
        customClass: {
          popup: 'rounded-2xl',
          title: 'text-xl font-bold',
          content: 'text-sm text-gray-600',
          confirmButton: 'rounded-xl px-6 py-3 font-medium'
        }
      });
    } catch (error) {
      Swal.fire({
        title: 'Errore',
        text: 'Si è verificato un errore durante il logout',
        icon: 'error',
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'OK',
        background: '#ffffff',
        customClass: {
          popup: 'rounded-2xl',
          title: 'text-xl font-bold',
          content: 'text-sm text-gray-600',
          confirmButton: 'rounded-xl px-6 py-3 font-medium'
        }
      });
    }
  };

  return (
    <>
      <header
        ref={headerRef}
        className="safari-header-fix bg-white shadow-large border-b border-neutral-200 fixed top-0 left-0 right-0"
      >
        <div className="container-medical">
          <div className="flex justify-between items-center h-16">
            {/* Logo and title */}
            <div className="flex items-center">
              <Link
                to="/"
                className="flex items-center space-x-3"
                onClick={(e) => {
                  if (window.location.pathname === '/') {
                    e.preventDefault();
                    window.location.reload();
                  }
                }}
              >
                <img
                  src="/logo_header.png"
                  alt="Referto Sicuro Logo"
                  className="h-12 w-12 object-contain"
                />
                <div>
                  <h1 className="text-xl font-bold text-medical-900">Referto Sicuro</h1>
                  <p className="text-xs text-soft">Sistema AI per referti medici - by IusMedical S.r.l.s.</p>
                </div>
              </Link>
            </div>


            {/* Actions */}
            <div className="flex items-center space-x-4">

              {/* Authentication Section */}
              {isAuthenticated ? (
                /* User Menu */
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 p-2 rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-medical-500 to-medical-600 rounded-xl flex items-center justify-center text-white text-sm font-medium">
                      {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-neutral-900">{user?.full_name || 'Utente'}</p>
                      <p className="text-xs text-neutral-500 capitalize">{user?.subscription_plan} plan</p>
                    </div>
                    <svg className={`w-4 h-4 text-neutral-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* User Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-neutral-200 py-2 z-[9998]" style={{ boxShadow: '0 0 8px rgba(83, 153, 217, 0.3)' }}>
                      <div className="px-4 py-3 border-b border-neutral-100">
                        <p className="text-sm font-medium" style={{ color: '#5399d9' }}>{user?.full_name || 'Utente'}</p>
                        <p className="text-xs text-neutral-500">{user?.email}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {user?.subscription_plan}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {user?.api_calls_used || 0}/{user?.api_calls_limit || 0} analisi
                          </span>
                        </div>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Il mio profilo
                      </Link>

                      {/* Template menu */}
                      <Link
                        to="/template"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        I miei template
                      </Link>

                      {/* Partner API Keys - Professional/Enterprise only */}
                      {(user?.subscription_plan === 'professional' || user?.subscription_plan === 'enterprise') && (
                        <Link
                          to="/partner-keys"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          Partner API Keys
                        </Link>
                      )}

                      <div className="border-t border-neutral-100 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Auth Buttons */
                <div className="flex items-center">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="text-sm flex items-center space-x-2 hover:opacity-80 transition-opacity"
                  >
                    <img 
                      src="/icona_accesso.png" 
                      alt="Icona accesso" 
                      className="w-5 h-5 object-contain"
                    />
                    <span className="font-bold" style={{ color: '#5399d9' }}>Accedi</span>
                  </button>
                </div>
              )}

              {/* Mobile menu button - temporaneamente nascosto */}
              <button className="hidden md:hidden p-2 rounded-xl text-neutral-700 hover:text-medical-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Click outside to close user menu */}
        {showUserMenu && (
          <div
            className="fixed inset-0 z-[9997]"
            onClick={() => setShowUserMenu(false)}
          ></div>
        )}
      </header>
    </>
  );
};

export default Header;