import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';
// import EnvironmentBadge from './components/common/EnvironmentBadge';
import { AuthProvider } from './contexts/AuthContext';
import GlobalAuthModal from './components/auth/GlobalAuthModal';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import TemplatePage from './pages/TemplatePage';
import PartnerKeys from './pages/PartnerKeys';
import PricingPage from './pages/PricingPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import './styles/index.css';
import './styles/auth.css';

// Component to scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  // Display ASCII logo in console on app load (only once, even in StrictMode)
  useEffect(() => {
    // Prevent duplicate execution in React.StrictMode
    if (window.__REFERTOSICURO_CONSOLE_RENDERED__) return;
    window.__REFERTOSICURO_CONSOLE_RENDERED__ = true;

    console.log('%c\n           #######################################          \n      ################################################      \n    ####################################################    \n   #######################################################  \n  ########################################################  \n ########################################################## \n ######################             ####################### \n #################                         ################ \n ############        ################          ############ \n ############      ####################        ############ \n ############      #####################       ############ \n ############      ##########  ###########     ############ \n ############      ##########  ###########     ############ \n ############      #######        ########     ############ \n ############      ##########  ###########     ############ \n ############      ##########  ###########     ############ \n #############     #######################     ############ \n #############     #######################    ############# \n ##############    #####             #####    ############# \n ##############    #######################    ############# \n ###############   #####        ##########   ############## \n ################   ######################  ############### \n #################  #####################  ################ \n ###################                     ################## \n ####################                  #################### \n ######################             ####################### \n ##########################      ########################## \n  ########################################################  \n   ######################################################   \n    ####################################################    \n      ################################################      \n           #######################################           \n\n%cRefertoSicuro%c | IusMedical S.r.l.s.\n%cSistema AI per validazione referti medici\n\n%c⚠️  Non incollare codice in questa console - rischio sicurezza account!',
      'color: #5399d9; font-family: monospace; font-size: 10px; line-height: 8px;',
      'color: #5399d9; font-size: 16px; font-weight: bold; font-family: sans-serif;',
      'color: #333; font-size: 14px; font-family: sans-serif;',
      'color: #666; font-size: 12px; font-style: italic; font-family: sans-serif;',
      'color: #d32f2f; font-size: 12px; font-weight: bold; font-family: sans-serif;'
    );
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <div className="App">
            {/* Environment badge for development/staging visibility */}
            {/* <EnvironmentBadge /> */}

            {/* Global authentication modal */}
            <GlobalAuthModal />

            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/subscription" element={<ProfilePage />} />
              <Route path="/template" element={<TemplatePage />} />
              <Route path="/template-out" element={<TemplatePage />} />
              <Route path="/partner-keys" element={<PartnerKeys />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/success" element={<PaymentSuccessPage />} />
              <Route path="/subscription/success" element={<PaymentSuccessPage />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;