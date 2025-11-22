# RefertoSicuro v2 - Requirements Questionnaire

## 🎯 Scopo

Questo questionario raccoglie tutte le decisioni di design e business necessarie per creare specifiche di sviluppo accurate. Le risposte guideranno la creazione dei documenti DEVELOPMENT.md finali.

---

## 📋 SEZIONE 1: DECISIONI GENERALI

### 1.1 Scope MVP (Minimum Viable Product)

**Q1.1**: Quali sono le funzionalità ASSOLUTAMENTE necessarie per il lancio iniziale?

Opzioni (seleziona quelle critiche):

- [ ] Registrazione + Login utenti
- [ ] Email verification obbligatoria
- [ ] Password reset
- [ ] Trial 7 giorni automatico
- [ ] Elaborazione referti AI (almeno 1 specialità)
- [ ] Elaborazione referti AI (tutte le 19+ specialità)
- [ ] Pagamenti Stripe
- [ ] Pagamenti PayPal
- [ ] Dashboard admin
- [ ] Voice-to-text
- [ ] Template custom per utenti
- [ ] 2FA
- [ ] API per partner B2B
- [ ] GDPR export/delete
- [ ] Mobile app

**Q1.2**: Timeline desiderata per il lancio MVP?

- [ ] 2-3 settimane (solo features critiche)
- [ ] 1-2 mesi (features core + alcune avanzate)
- [ ] 3+ mesi (feature complete)

**Q1.3**: Quanti utenti concorrenti prevedi nei primi 3 mesi?

- [ ] < 100 utenti
- [ ] 100-1000 utenti
- [ ] 1000-10000 utenti
- [ ] > 10000 utenti

_(Influenza decisioni di caching, database pooling, rate limiting)_

---

## 🔐 SEZIONE 2: AUTH SERVICE

### 2.1 Autenticazione

**Q2.1**: Quale strategia JWT preferisci?

a) **Access token only** (semplice, meno sicuro)

- Access token con expire lungo (es. 24h)
- Logout = blacklist in Redis

b) **Access + Refresh tokens** (più sicuro, consigliato)

- Access token corto (15-30 min)
- Refresh token lungo (7-30 giorni)
- Rotation del refresh token ad ogni uso

c) **Session-based** (stateful, no JWT)

- Session ID in cookie
- Dati sessione in Redis

Scelta: [ ]

**Q2.2**: Durata Access Token?

- [ ] 15 minuti (alta sicurezza)
- [ ] 30 minuti
- [ ] 1 ora
- [ ] 4 ore
- [ ] 24 ore
- [ ] Altro: \***\*\_\_\_\*\***

**Q2.3**: Durata Refresh Token (se opzione b)?

- [ ] 7 giorni
- [ ] 14 giorni
- [ ] 30 giorni
- [ ] 90 giorni
- [ ] Altro: \***\*\_\_\_\*\***

**Q2.4**: Password hashing algorithm?

- [ ] bcrypt (standard, lento = sicuro)
- [ ] argon2 (più moderno, recommended)
- [ ] scrypt
- [ ] Altro: \***\*\_\_\_\*\***

### 2.2 Email Verification

**Q2.5**: Email verification è obbligatoria per usare il servizio?

- [ ] Sì, obbligatoria (l'utente NON può processare referti senza verificare)
- [ ] No, opzionale (l'utente può usare tutto senza verificare)
- [ ] Soft requirement (warning ma non blocco)

**Q2.6**: Scadenza link verifica email?

- [ ] 24 ore
- [ ] 48 ore
- [ ] 7 giorni
- [ ] 30 giorni
- [ ] Mai (link sempre valido)

### 2.3 Password Policy

**Q2.7**: Requisiti password (seleziona tutti quelli che vuoi):

- [ ] Minimo 8 caratteri
- [ ] Minimo 12 caratteri
- [ ] Almeno 1 maiuscola
- [ ] Almeno 1 minuscola
- [ ] Almeno 1 numero
- [ ] Almeno 1 carattere speciale (@, #, !, etc.)
- [ ] NO password comuni (check contro dizionario)
- [ ] NO riuso ultime N password

**Q2.8**: Password reset token scadenza?

- [ ] 1 ora
- [ ] 6 ore
- [ ] 24 ore
- [ ] Altro: \***\*\_\_\_\*\***

### 2.4 Two-Factor Authentication (2FA)

**Q2.9**: 2FA supportato?

- [ ] Sì, opzionale per tutti gli utenti
- [ ] Sì, obbligatorio per admin
- [ ] Sì, obbligatorio per tutti
- [ ] No, non nella v1

**Q2.10**: Metodo 2FA?

- [ ] TOTP (Google Authenticator, Authy)
- [ ] SMS
- [ ] Email
- [ ] Backup codes

### 2.5 Rate Limiting

**Q2.11**: Limiti di rate per autenticazione (richieste al minuto)?

| Endpoint       | Limite                               |
| -------------- | ------------------------------------ |
| Login attempts | [ ] 5, [ ] 10, [ ] 20, Altro: \_\_\_ |
| Registration   | [ ] 3, [ ] 5, [ ] 10, Altro: \_\_\_  |
| Password reset | [ ] 3, [ ] 5, [ ] 10, Altro: \_\_\_  |

**Q2.12**: Dopo quanti login falliti blocchi l'account?

- [ ] 5 tentativi
- [ ] 10 tentativi
- [ ] Mai (solo rate limiting)
- [ ] Altro: \***\*\_\_\_\*\***

**Q2.13**: Durata blocco account dopo login falliti?

- [ ] 15 minuti
- [ ] 30 minuti
- [ ] 1 ora
- [ ] 24 ore
- [ ] Manuale (solo admin può sbloccare)

### 2.6 User Deletion

**Q2.14**: Quando un utente cancella l'account, vuoi:

- [ ] **Soft delete** (flag deleted_at, dati restano)
- [ ] **Hard delete immediato** (rimuove tutto subito)
- [ ] **Scheduled delete** (anonimizza dopo N giorni)

**Q2.15**: Se soft delete, dopo quanto tempo hard delete definitivo?

- [ ] Mai (soft delete permanente per audit)
- [ ] 30 giorni
- [ ] 90 giorni
- [ ] 1 anno
- [ ] Altro: \***\*\_\_\_\*\***

---

## 💳 SEZIONE 3: BILLING SERVICE

### 3.1 Piani di Abbonamento

**Q3.1**: Quali piani vuoi offrire nella v1?

| Piano        | Prezzo/Mese (€) | Referti/Mese | Specialità | Features Extra             |
| ------------ | --------------- | ------------ | ---------- | -------------------------- |
| Trial        | Gratis          | [ ] \_\_\_   | [ ] \_\_\_ | [ ] **\*\***\_\_\_**\*\*** |
| Basic        | [ ] \_\_\_      | [ ] \_\_\_   | [ ] \_\_\_ | [ ] **\*\***\_\_\_**\*\*** |
| Medium       | [ ] \_\_\_      | [ ] \_\_\_   | [ ] \_\_\_ | [ ] **\*\***\_\_\_**\*\*** |
| Professional | [ ] \_\_\_      | [ ] \_\_\_   | [ ] \_\_\_ | [ ] **\*\***\_\_\_**\*\*** |
| Enterprise   | Custom          | [ ] \_\_\_   | [ ] \_\_\_ | [ ] **\*\***\_\_\_**\*\*** |

**Q3.2**: Trial period durata?

- [ ] 7 giorni
- [ ] 14 giorni
- [ ] 30 giorni
- [ ] Nessun trial
- [ ] Altro: \***\*\_\_\_\*\***

**Q3.3**: Trial richiede carta di credito?

- [ ] Sì (autorizzazione €0, poi auto-rinnovo)
- [ ] No (inizia gratis, poi upgrade manuale)

**Q3.4**: Cosa succede quando trial scade senza upgrade?

- [ ] Account sospeso (read-only)
- [ ] Account downgrade a free tier limitato
- [ ] Account cancellato
- [ ] Grace period di N giorni: [ ] \_\_\_

### 3.2 Quota Management

**Q3.5**: Cosa succede quando utente supera quota mensile referti?

a) **Hard block**

- Errore 402 Payment Required
- Nessuna elaborazione fino a upgrade o reset mensile

b) **Soft limit con overage**

- Permette elaborazione
- Addebita costo extra per referto oltre quota

c) **Warning + grace**

- Warning al 80%, 90%, 100%
- Blocco solo dopo +10% oltre quota

Scelta: [ ]

**Q3.6**: Se soft limit, quanto costa ogni referto oltre quota?

- [ ] €0.50
- [ ] €1.00
- [ ] €2.00
- [ ] Altro: \***\*\_\_\_\*\***

**Q3.7**: Reset quota quando?

- [ ] 1° del mese (calendario)
- [ ] Data anniversario subscription (es. 15 di ogni mese se subscribed il 15)
- [ ] Dopo N giorni dall'ultimo reset: [ ] \_\_\_

### 3.3 Pagamenti

**Q3.8**: Metodi di pagamento da supportare nella v1?

- [ ] Stripe (carte credito/debito)
- [ ] PayPal
- [ ] Bonifico bancario (manuale)
- [ ] Satispay
- [ ] Altro: \***\*\_\_\_\*\***

**Q3.9**: Fatturazione elettronica per PA/aziende italiane?

- [ ] Sì, obbligatorio nella v1
- [ ] Sì, ma in versione futura
- [ ] No, non necessario

**Q3.10**: Upgrade/Downgrade piano mid-cycle?

**Upgrade mid-cycle**:

- [ ] **Proration**: Credita giorni non usati, addebita nuovo piano
- [ ] **Immediate full charge**: Paga subito prezzo pieno nuovo piano
- [ ] **Next cycle**: Upgrade effettivo dal prossimo ciclo

**Downgrade mid-cycle**:

- [ ] **Immediate**: Downgrade subito, credito per giorni rimanenti
- [ ] **End of cycle**: Continua piano corrente fino a fine ciclo

### 3.4 Fatturazione

**Q3.11**: Formato fatture?

- [ ] PDF standard con logo e dati azienda
- [ ] PDF + XML per fattura elettronica
- [ ] Solo ricevuta email semplice

**Q3.12**: IVA da applicare?

- [ ] 22% (standard Italia)
- [ ] Reverse charge per B2B UE
- [ ] No tax (clienti fuori UE)
- [ ] Logica mista (dipende da paese/tipo cliente)

---

## 🤖 SEZIONE 4: REPORTS SERVICE

### 4.1 Specializzazioni Mediche

**Q4.1**: Quante specializzazioni vuoi nella v1?

- [ ] 1-3 specialità core (MVP veloce)
- [ ] 5-7 specialità principali
- [ ] Tutte le 19+ specialità subito

**Q4.2**: Se limitate, quali specialità prioritarie? (ordina per priorità 1-5)

- [ ] \_\_\_ Radiologia (RAD)
- [ ] \_\_\_ Cardiologia (CARD)
- [ ] \_\_\_ Neurologia (NEUR)
- [ ] \_\_\_ Ortopedia (ORTH)
- [ ] \_\_\_ Medicina Interna (MEDINT)
- [ ] **\_ Altre (specificare): \*\***\_**\*\***

### 4.2 AI Processing

**Q4.3**: Modello Azure OpenAI da usare?

- [ ] GPT-4o (più potente, più costoso)
- [ ] GPT-4o-mini (più economico)
- [ ] GPT-4-turbo
- [ ] Altro: \***\*\_\_\_\*\***

**Q4.4**: Temperature per generazione (0-1, più basso = più deterministico)?

- [ ] 0.1 (molto deterministico, consigliato per medicina)
- [ ] 0.3
- [ ] 0.5
- [ ] 0.7 (più creativo)

**Q4.5**: Max tokens per risposta?

- [ ] 1000 tokens (~750 parole)
- [ ] 2000 tokens (~1500 parole)
- [ ] 4000 tokens (~3000 parole)
- [ ] Altro: \***\*\_\_\_\*\***

**Q4.6**: Timeout per richiesta AI?

- [ ] 30 secondi
- [ ] 60 secondi
- [ ] 120 secondi
- [ ] Altro: \***\*\_\_\_\*\***

### 4.3 Privacy & Data Retention

**Q4.7**: Storage referti processati?

a) **NO storage** (privacy by design)

- Elabora e ritorna subito
- Nessun salvataggio testo referti
- Solo metrics anonimizzate

b) **Storage temporaneo**

- Salva per N ore/giorni: [ ] \_\_\_
- Poi cancellazione automatica

c) **Storage permanente con consent**

- Default: no storage
- Opt-in per miglioramento modelli
- Anonimizzazione obbligatoria

Scelta: [ ]

**Q4.8**: PII sanitization prima di Azure OpenAI?

- [ ] Sì, SEMPRE (rimuovi CF, nomi, date, etc.)
- [ ] No, invia testo originale
- [ ] Solo se utente non ha dato consent specifico

**Q4.9**: Logging input/output per debug?

- [ ] Mai (massima privacy)
- [ ] Solo su errori
- [ ] Solo se utente abilita esplicitamente
- [ ] Sempre (ma anonimizzato)

### 4.4 Voice-to-Text

**Q4.10**: Voice-to-text nella v1?

- [ ] Sì, feature critica
- [ ] Sì, ma solo per piani Professional+
- [ ] No, posticipare a v2

**Q4.11**: Se sì, limiti audio?

- [ ] Max durata: [ ] 2min, [ ] 5min, [ ] 10min, Altro: \_\_\_
- [ ] Max file size: [ ] 10MB, [ ] 25MB, [ ] 50MB
- [ ] Formati supportati: [ ] MP3, [ ] WAV, [ ] M4A, [ ] OGG

### 4.5 Template Custom

**Q4.12**: Template custom per utenti?

- [ ] No template custom nella v1
- [ ] Sì, solo per Professional+ users
- [ ] Sì, per tutti gli utenti

**Q4.13**: Se sì, quanti template custom per utente?

- [ ] 1 template
- [ ] 3 templates
- [ ] 5 templates
- [ ] Illimitati
- [ ] Dipende dal piano

---

## 📊 SEZIONE 5: AUDIT & COMPLIANCE

### 5.1 GDPR Compliance

**Q5.1**: GDPR export - formato dati?

- [ ] JSON
- [ ] PDF human-readable
- [ ] ZIP con JSON + PDF
- [ ] Altro: \***\*\_\_\_\*\***

**Q5.2**: GDPR export - tempo massimo risposta?

- [ ] Immediato (pochi minuti)
- [ ] 24 ore
- [ ] 72 ore (massimo legale)
- [ ] 30 giorni

**Q5.3**: GDPR deletion - cosa fare con i dati?

a) **Full anonymization**

- Sostituisci PII con placeholder
- Mantieni record anonimo per statistics

b) **Hard delete**

- Cancella completamente tutti i dati
- Solo audit log rimane

c) **Retention-based**

- Alcuni dati rimangono per periodo legale (es. fatture 10 anni)
- Resto cancellato

Scelta: [ ]

### 5.2 Audit Logging

**Q5.4**: Quali eventi loggare nell'audit trail? (seleziona tutti)

- [ ] Tutti i login (successo + falliti)
- [ ] Modifiche dati utente
- [ ] Elaborazioni referti
- [ ] Pagamenti
- [ ] Modifiche subscription
- [ ] Accessi admin
- [ ] Tutti gli eventi API

**Q5.5**: Retention audit logs?

- [ ] 1 anno
- [ ] 2 anni (GDPR minimum)
- [ ] 5 anni
- [ ] 10 anni (medical data)
- [ ] Permanente

**Q5.6**: Partitioning audit logs per performance?

- [ ] No partitioning (tabella singola)
- [ ] Partition mensile (consigliato)
- [ ] Partition trimestrale
- [ ] Partition annuale

---

## 📧 SEZIONE 6: NOTIFICATION SERVICE

### 6.1 Email Templates

**Q6.1**: Quali email vuoi nella v1? (seleziona tutte necessarie)

- [ ] Welcome email (post registrazione)
- [ ] Email verification
- [ ] Password reset
- [ ] Password changed confirmation
- [ ] Trial started
- [ ] Trial ending (X giorni prima scadenza)
- [ ] Trial expired
- [ ] Payment successful
- [ ] Payment failed
- [ ] Subscription cancelled
- [ ] Quota warning (80%, 90%, 100%)
- [ ] Quota exceeded
- [ ] Invoice/receipt
- [ ] GDPR export ready
- [ ] Support ticket updates

**Q6.2**: Lingua email?

- [ ] Solo italiano
- [ ] Italiano + Inglese
- [ ] Multi-lingua (IT, EN, ES, etc.)

**Q6.3**: Email provider?

- [ ] SMTP generico (es. Gmail, Outlook)
- [ ] SendGrid
- [ ] Mailgun
- [ ] Amazon SES
- [ ] Altro: \***\*\_\_\_\*\***

### 6.2 SMS Notifications

**Q6.4**: SMS nella v1?

- [ ] Sì, per 2FA codes
- [ ] Sì, per critical alerts
- [ ] No, solo email

---

## 📈 SEZIONE 7: ANALYTICS & ADMIN

### 7.1 Analytics

**Q7.1**: Metriche da tracciare (priorità alta)?

- [ ] User signups per giorno/settimana/mese
- [ ] Active users
- [ ] Referti processati per specialità
- [ ] Revenue per piano
- [ ] Conversion rate trial → paid
- [ ] Churn rate
- [ ] Average processing time AI
- [ ] Error rates per service
- [ ] Altro: \***\*\_\_\_\*\***

**Q7.2**: Data retention analytics?

- [ ] 30 giorni
- [ ] 90 giorni
- [ ] 1 anno
- [ ] 2 anni
- [ ] Indefinita (aggregati)

### 7.2 Admin Dashboard

**Q7.3**: Admin dashboard priorità nella v1?

- [ ] Alta (necessario da subito)
- [ ] Media (nice to have)
- [ ] Bassa (può aspettare v2)

**Q7.4**: Funzionalità admin critiche?

- [ ] View all users
- [ ] Suspend/activate users
- [ ] View subscriptions
- [ ] Manual refunds
- [ ] System health monitoring
- [ ] View audit logs
- [ ] Impersonate user (con audit)
- [ ] Altro: \***\*\_\_\_\*\***

---

## 🔧 SEZIONE 8: TECHNICAL PREFERENCES

### 8.1 Database

**Q8.1**: PostgreSQL version?

- [ ] PostgreSQL 15
- [ ] PostgreSQL 16
- [ ] PostgreSQL 17 (latest)

**Q8.2**: Connection pooling?

- [ ] PgBouncer
- [ ] Built-in SQLAlchemy pooling
- [ ] Altro: \***\*\_\_\_\*\***

**Q8.3**: Database backups frequency?

- [ ] Real-time (WAL archiving)
- [ ] Ogni ora
- [ ] Ogni 6 ore
- [ ] Daily
- [ ] Altro: \***\*\_\_\_\*\***

### 8.2 Caching

**Q8.4**: Redis usage strategy?

- [ ] Session storage only
- [ ] Session + rate limiting
- [ ] Session + rate limiting + API response caching
- [ ] Altro: \***\*\_\_\_\*\***

**Q8.5**: Cache TTL per API responses?

- [ ] 5 minuti
- [ ] 15 minuti
- [ ] 1 ora
- [ ] Variabile per endpoint

### 8.3 Deployment

**Q8.6**: Target deployment platform?

- [ ] Docker Compose (sviluppo + produzione semplice)
- [ ] Kubernetes (scalabilità produzione)
- [ ] Serverless (AWS Lambda, Cloud Run)
- [ ] VPS tradizionale
- [ ] Altro: \***\*\_\_\_\*\***

**Q8.7**: CI/CD pipeline?

- [ ] GitHub Actions
- [ ] GitLab CI
- [ ] Jenkins
- [ ] Altro: \***\*\_\_\_\*\***
- [ ] Nessuno nella v1

### 8.4 Monitoring

**Q8.8**: Error tracking service?

- [ ] Sentry
- [ ] Rollbar
- [ ] Self-hosted (Grafana)
- [ ] Log files only
- [ ] Altro: \***\*\_\_\_\*\***

---

## ✅ SEZIONE 9: PRIORITIZATION

### 9.1 Feature Priority Matrix

Ordina questi servizi per priorità di sviluppo (1 = massima priorità):

- [ ] \_\_\_ Auth Service
- [ ] \_\_\_ Billing Service
- [ ] \_\_\_ Reports Service
- [ ] \_\_\_ Audit Service
- [ ] \_\_\_ Notification Service
- [ ] \_\_\_ Analytics Service
- [ ] \_\_\_ Admin Service

### 9.2 Quality vs Speed

**Q9.1**: Preferenza generale?

- [ ] Speed first (lancio veloce, iterazioni successive)
- [ ] Quality first (test completi, documentazione, poi lancio)
- [ ] Balanced (80% coverage, docs essenziali)

---

## 📝 SEZIONE 10: BUSINESS QUESTIONS

**Q10.1**: Hai già utenti beta/pilota in attesa?

- [ ] Sì, circa \_\_\_ utenti
- [ ] No, lancio nuovo

**Q10.2**: Budget mensile per infra/servizi esterni (Azure OpenAI, Stripe, etc.)?

- [ ] < €100/mese
- [ ] €100-500/mese
- [ ] €500-2000/mese
- [ ] > €2000/mese
- [ ] Budget flessibile

**Q10.3**: Sei l'unico sviluppatore o hai un team?

- [ ] Solo io
- [ ] 2-3 persone
- [ ] Team > 3 persone

---

## 🎯 NEXT STEPS

Una volta completato questo questionario:

1. Rivedremo i documenti DEVELOPMENT.md esistenti
2. Adatteremo le specifiche alle tue risposte
3. Creeremo un piano di sviluppo realistico
4. Definiremo chiaramente MVP scope

**Come procedere**: Rispondi alle domande marcando le checkbox [ ] con [x] e compilando i campi \_\_\_.

---

**Created**: 2024-11-21
**Status**: Awaiting answers
