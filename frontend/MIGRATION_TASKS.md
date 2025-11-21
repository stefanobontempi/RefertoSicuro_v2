# Frontend Migration Tasks - RefertoSicuro v2

## 🔴 PRIORITÀ CRITICA: Riorganizzazione Endpoint API

### Problema Attuale (v0)
Gli endpoint sono sparsi e confusionari in `/services/api.js`:
- Misti tra diversi domini (reports, auth, billing, etc.)
- Naming inconsistente
- Nessuna separazione per microservizio
- Difficile da mantenere e scalare

### Soluzione Proposta (v2)
Creare un **service client dedicato per ogni microservizio**:

```
src/services/
├── auth/
│   ├── authService.js      # Auth Service client
│   └── types.ts            # TypeScript types
├── reports/
│   ├── reportsService.js   # Reports Service client
│   └── types.ts
├── billing/
│   ├── billingService.js   # Billing Service client
│   └── types.ts
├── admin/
│   ├── adminService.js     # Admin Service client
│   └── types.ts
├── analytics/
│   ├── analyticsService.js # Analytics Service client
│   └── types.ts
├── notification/
│   ├── notificationService.js # Notification Service client
│   └── types.ts
└── common/
    ├── apiClient.js        # Base axios instance
    ├── interceptors.js     # Common interceptors
    └── errors.js           # Error handling
```

### Mapping Endpoint v0 → v2

#### Auth Service (porta 8010)
```javascript
// v0 (confuso)
POST /auth/login
POST /auth/b2c/register
POST /auth/b2c/verify-email
GET /auth/me
POST /users/profile

// v2 (organizzato)
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/verify-email
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET /api/v1/users/me
PUT /api/v1/users/profile
POST /api/v1/users/change-password
```

#### Reports Service (porta 8011)
```javascript
// v0 (misto)
POST /reports/improve
POST /reports/improve-streaming
POST /reports/improve-streaming-sse
POST /reports/validate
GET /specialties/
GET /input-templates/

// v2 (organizzato)
POST /api/v1/reports/improve
POST /api/v1/reports/improve-streaming
POST /api/v1/reports/improve-streaming-sse
POST /api/v1/reports/validate
GET /api/v1/specialties
GET /api/v1/templates
POST /api/v1/templates
PUT /api/v1/templates/{id}
DELETE /api/v1/templates/{id}
```

#### Billing Service (porta 8012)
```javascript
// v0 (sparso)
GET /users/subscription
POST /billing/cancel-subscription
GET /billing/invoices
POST /billing/create-checkout-session

// v2 (organizzato)
GET /api/v1/billing/subscription
POST /api/v1/billing/subscribe
POST /api/v1/billing/cancel
GET /api/v1/billing/invoices
GET /api/v1/billing/plans
POST /api/v1/billing/webhooks/stripe
POST /api/v1/billing/webhooks/paypal
```

---

## 🔴 PRIORITÀ CRITICA: Uniformare Notifiche

### Problema Attuale (v0)
- Mix di inglese e italiano nei messaggi
- Stili diversi (toast, alert, modal)
- Messaggi hardcoded sparsi nel codice
- Nessuna centralizzazione

### Soluzione Proposta (v2)

#### 1. Creare un sistema di messaggi centralizzato
```javascript
// src/constants/messages.js
export const MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Accesso effettuato con successo',
    LOGIN_ERROR: 'Email o password non validi',
    LOGOUT_SUCCESS: 'Disconnessione completata',
    SESSION_EXPIRED: 'Sessione scaduta, effettua nuovamente l\'accesso',
    REGISTER_SUCCESS: 'Registrazione completata! Controlla la tua email',
    EMAIL_VERIFIED: 'Email verificata con successo',
    PASSWORD_RESET: 'Password reimpostata con successo'
  },
  REPORTS: {
    IMPROVEMENT_SUCCESS: 'Referto migliorato con successo',
    IMPROVEMENT_ERROR: 'Errore durante il miglioramento del referto',
    VALIDATION_SUCCESS: 'Referto validato',
    NO_SPECIALTY: 'Seleziona una specialità medica',
    EMPTY_REPORT: 'Inserisci il testo del referto'
  },
  BILLING: {
    SUBSCRIPTION_ACTIVE: 'Abbonamento attivato con successo',
    SUBSCRIPTION_CANCELLED: 'Abbonamento cancellato',
    PAYMENT_SUCCESS: 'Pagamento completato',
    PAYMENT_ERROR: 'Errore durante il pagamento',
    INVOICE_DOWNLOAD: 'Fattura scaricata'
  },
  ERRORS: {
    NETWORK: 'Errore di connessione. Verifica la tua connessione internet',
    SERVER: 'Errore del server. Riprova più tardi',
    UNAUTHORIZED: 'Non autorizzato. Effettua l\'accesso',
    FORBIDDEN: 'Accesso negato',
    NOT_FOUND: 'Risorsa non trovata',
    RATE_LIMIT: 'Troppe richieste. Attendi qualche secondo',
    VALIDATION: 'Verifica i dati inseriti'
  },
  COMMON: {
    SAVED: 'Salvato',
    DELETED: 'Eliminato',
    UPDATED: 'Aggiornato',
    COPIED: 'Copiato negli appunti',
    LOADING: 'Caricamento...',
    CONFIRM_DELETE: 'Sei sicuro di voler eliminare?',
    CONFIRM_CANCEL: 'Sei sicuro di voler annullare?'
  }
};
```

#### 2. Uniformare lo stile delle notifiche

```javascript
// src/hooks/useNotification.js
import { toast } from 'react-toastify';
import { MESSAGES } from '../constants/messages';

export const useNotification = () => {
  const notify = {
    success: (key, params) => {
      const message = getMessageByKey(key, params);
      toast.success(message, {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: 'colored',
        style: {
          backgroundColor: '#10b981',
          color: 'white'
        }
      });
    },

    error: (key, params) => {
      const message = getMessageByKey(key, params);
      toast.error(message, {
        position: 'top-right',
        autoClose: 5000,
        theme: 'colored',
        style: {
          backgroundColor: '#ef4444',
          color: 'white'
        }
      });
    },

    info: (key, params) => {
      const message = getMessageByKey(key, params);
      toast.info(message, {
        position: 'top-right',
        autoClose: 3000,
        theme: 'colored'
      });
    },

    warning: (key, params) => {
      const message = getMessageByKey(key, params);
      toast.warning(message, {
        position: 'top-right',
        autoClose: 4000,
        theme: 'colored'
      });
    }
  };

  return notify;
};
```

#### 3. Esempi di utilizzo uniforme

```javascript
// Prima (v0 - confuso)
toast.success('Login successful!');
alert('Errore: ' + error.message);
showMessage('Referto salvato', 'success');

// Dopo (v2 - uniforme)
const notify = useNotification();
notify.success('AUTH.LOGIN_SUCCESS');
notify.error('REPORTS.IMPROVEMENT_ERROR');
notify.info('BILLING.SUBSCRIPTION_ACTIVE');
```

---

## 📋 Altri Task di Migrazione

### 1. Aggiornare package.json
- [ ] Aggiungere TypeScript se necessario
- [ ] Aggiornare dipendenze alle ultime versioni
- [ ] Rimuovere dipendenze non utilizzate
- [ ] Aggiungere scripts per microservizi

### 2. Configurazione Environment
- [ ] Creare `.env.development` con URL dei microservizi
- [ ] Creare `.env.production` per produzione
- [ ] Aggiungere VITE_AUTH_SERVICE_URL, VITE_REPORTS_SERVICE_URL, etc.

### 3. Autenticazione JWT
- [ ] Verificare httpOnly cookies con nuovo Auth Service
- [ ] Testare refresh token rotation
- [ ] Implementare auto-retry su 401
- [ ] Gestire CSRF token correttamente

### 4. Testing
- [ ] Setup Vitest per unit test
- [ ] Setup Playwright per E2E
- [ ] Creare test per auth flow
- [ ] Creare test per report improvement
- [ ] Test SSE streaming

### 5. Performance
- [ ] Implementare code splitting
- [ ] Lazy loading per routes
- [ ] Ottimizzare bundle size
- [ ] Implementare caching strategico

---

## 🎯 Priorità di Implementazione

1. **URGENTE**: Riorganizzare endpoint API per microservizi
2. **URGENTE**: Uniformare notifiche in italiano
3. **ALTO**: Testare autenticazione con nuovo Auth Service
4. **ALTO**: Verificare SSE streaming con Reports Service
5. **MEDIO**: Implementare TypeScript progressivamente
6. **MEDIO**: Aggiungere test automatici
7. **BASSO**: Ottimizzazioni performance

---

## 📝 Note Tecniche

### SSE Streaming
Il componente `ReportValidatorStreaming.jsx` usa Server-Sent Events nativi.
Verificare che il Reports Service supporti:
- Content-Type: text/event-stream
- Cache-Control: no-cache
- Connection: keep-alive

### CORS Configuration
Con microservizi su porte diverse, configurare CORS correttamente:
- Auth Service (8010): deve accettare credentials
- Reports Service (8011): deve supportare SSE
- API Gateway (Kong): gestire CORS centralizzato

### Cookie Domain
Per sviluppo locale con microservizi:
- Usare `localhost` per tutti i servizi
- NON usare `127.0.0.1` (problemi con cookies)
- In produzione: stesso dominio con subpath

---

## 🐛 Bug noti da fixare

1. **RegisterForm.jsx** (1874 LOC) - troppo grande, dividere in step components
2. **InputTemplatesTab.jsx** (864 LOC) - refactoring necessario
3. Mix di `.jsx` e mancanza di TypeScript
4. Nessun error boundary globale per API calls
5. Mancanza di retry logic per network errors

---

## ✅ Checklist Pre-Deploy

- [ ] Tutti gli endpoint mappati correttamente
- [ ] Tutte le notifiche in italiano
- [ ] CSRF protection funzionante
- [ ] JWT refresh automatico
- [ ] SSE streaming testato
- [ ] Error handling uniforme
- [ ] Loading states consistenti
- [ ] Mobile responsive testato
- [ ] Performance audit (Lighthouse)
- [ ] Security headers verificati