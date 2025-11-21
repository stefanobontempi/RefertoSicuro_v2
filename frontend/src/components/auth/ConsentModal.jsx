import React, { useState, useEffect } from 'react';
import './ConsentModal.css';

const ConsentModal = ({
  isOpen,
  onClose,
  onConsentSubmit,
  consentData = null,
  loading = false
}) => {

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

  const [consents, setConsents] = useState({});
  const [expandedConsent, setExpandedConsent] = useState(null);
  const [allRequiredConsentsGiven, setAllRequiredConsentsGiven] = useState(false);

  // Default consent templates (fallback if API fails)
  const defaultConsentData = {
    templates: {
      terms_conditions: {
        title: "Termini e Condizioni del Servizio",
        description: "Accettazione dei termini e condizioni per l'utilizzo del servizio RefertoSicuro",
        summary_text: "Accetta i termini e condizioni per utilizzare RefertoSicuro",
        is_required: true,
        can_withdraw: false,
        full_text: `TERMINI E CONDIZIONI DEL SERVIZIO REFERTOSICURO

1. OGGETTO DEL SERVIZIO
RefertoSicuro fornisce un servizio di validazione e miglioramento di referti medici attraverso intelligenza artificiale.

2. ACCETTAZIONE DEI TERMINI
L'utilizzo del servizio implica l'accettazione integrale dei presenti termini e condizioni.

3. UTILIZZO DEL SERVIZIO
Il servizio è destinato esclusivamente a professionisti sanitari qualificati per scopi di supporto decisionale.

4. RESPONSABILITÀ
L'utente si impegna a utilizzare il servizio in conformità alle normative vigenti e alle best practice mediche.

5. LIMITAZIONI DI RESPONSABILITÀ
Il servizio fornisce supporto decisionale e non sostituisce il giudizio clinico del professionista sanitario.

6. MODIFICHE AI TERMINI
IusMedical S.r.l.s. si riserva il diritto di modificare i presenti termini con preavviso di 30 giorni.

7. LEGGE APPLICABILE
I presenti termini sono regolati dalla legge italiana.`
      },
      privacy_policy: {
        title: "Informativa sulla Privacy",
        description: "Informativa sul trattamento dei dati personali secondo GDPR",
        summary_text: "Acconsenti al trattamento dei tuoi dati personali secondo la normativa GDPR",
        is_required: true,
        can_withdraw: true,
        full_text: `INFORMATIVA SULLA PRIVACY - REFERTOSICURO

Ai sensi del Regolamento UE 2016/679 (GDPR), informiamo che:

1. TITOLARE DEL TRATTAMENTO
IusMedical S.r.l.s., con sede in Italia.

2. FINALITÀ DEL TRATTAMENTO
- Fornitura del servizio di validazione referti medici
- Gestione dell'account utente
- Fatturazione e pagamenti
- Supporto clienti
- Miglioramento del servizio

3. BASE GIURIDICA
- Art. 6(1)(b) GDPR per l'esecuzione del contratto
- Art. 6(1)(f) GDPR per interessi legittimi
- Art. 9(2)(h) GDPR per dati sanitari

4. CATEGORIE DI DATI
- Dati identificativi (nome, email, telefono)
- Dati di fatturazione
- Dati di utilizzo del servizio
- Dati sanitari (solo per il tempo necessario alla validazione)

5. CONSERVAZIONE
I dati sono conservati per il tempo necessario alle finalità indicate.

6. DIRITTI DELL'INTERESSATO
Diritto di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione.

7. CONTATTI
privacy@refertosicuro.it per esercitare i propri diritti.`
      },
      health_data_processing: {
        title: "Consenso Trattamento Dati Sanitari",
        description: "Consenso esplicito per il trattamento di dati sanitari tramite IA",
        summary_text: "Acconsenti al trattamento di dati sanitari per la validazione tramite intelligenza artificiale",
        is_required: true,
        can_withdraw: true,
        full_text: `CONSENSO AL TRATTAMENTO DI DATI SANITARI

Ai sensi dell'Art. 9 del GDPR, richiediamo il Suo consenso esplicito per:

1. FINALITÀ SPECIFICHE
- Validazione e miglioramento di referti medici tramite intelligenza artificiale
- Supporto decisionale per professionisti sanitari
- Controllo qualità delle analisi

2. MODALITÀ DI TRATTAMENTO
- Elaborazione automatizzata tramite modelli AI di OpenAI
- Cancellazione immediata dopo la risposta (salvo consenso per debug)
- Crittografia end-to-end durante il processamento

3. GARANZIE SPECIFICHE
- Supervisione umana costante
- Algoritmi certificati per uso medico
- Tracciabilità completa delle operazioni

4. BASE GIURIDICA
Art. 9(2)(h) GDPR - Finalità di medicina preventiva, diagnosi, assistenza sanitaria.

5. DIRITTO DI REVOCA
Il consenso può essere revocato in qualsiasi momento senza pregiudicare la liceità del trattamento basata sul consenso prestato prima della revoca.

6. CONSEGUENZE DEL RIFIUTO
Senza questo consenso non sarà possibile utilizzare le funzionalità di validazione AI.`
      },
      ai_processing: {
        title: "Consenso Elaborazione IA",
        description: "Consenso per l'utilizzo di sistemi di intelligenza artificiale",
        summary_text: "Acconsenti all'utilizzo di sistemi di intelligenza artificiale per l'analisi dei referti",
        is_required: true,
        can_withdraw: true,
        full_text: `CONSENSO PER ELABORAZIONE TRAMITE INTELLIGENZA ARTIFICIALE

Informiamo che il servizio utilizza sistemi di intelligenza artificiale per:

1. TECNOLOGIE UTILIZZATE
- OpenAI GPT-4 e modelli specializzati per ambito medico
- Assistenti AI addestrati su letteratura medica
- Sistemi di natural language processing

2. LOGICA ALGORITMICA
- Analisi del contenuto testuale del referto
- Confronto con guidelines cliniche
- Generazione suggerimenti di miglioramento
- Identificazione potenziali inconsistenze

3. TRASPARENZA E SPIEGABILITÀ
- Tracciabilità delle decisioni algoritmiche
- Possibilità di richiedere spiegazioni
- Supervisione umana sempre presente

4. MISURE DI SICUREZZA
- Dati processati in ambienti sicuri
- Nessuna memorizzazione permanente
- Audit trail completo delle operazioni

5. DIRITTI SPECIFICI
- Diritto a non essere soggetto a decisioni automatizzate
- Diritto di intervento umano
- Diritto di contestare le decisioni AI

6. AGGIORNAMENTI TECNOLOGICI
L'informativa sarà aggiornata in caso di modifiche sostanziali ai sistemi AI utilizzati.`
      },
      marketing: {
        title: "Comunicazioni Marketing",
        description: "Consenso per ricevere comunicazioni commerciali e newsletter",
        summary_text: "Acconsenti a ricevere comunicazioni commerciali e newsletter (opzionale)",
        is_required: false,
        can_withdraw: true,
        full_text: `CONSENSO PER COMUNICAZIONI MARKETING

Richiediamo il Suo consenso per inviarLe:

1. TIPOLOGIE DI COMUNICAZIONI
- Newsletter periodiche sui servizi
- Aggiornamenti su nuove funzionalità
- Offerte e promozioni dedicate
- Inviti a eventi e webinar

2. MODALITÀ DI INVIO
- Email al Suo indirizzo di registrazione
- Notifiche nell'area riservata
- SMS/WhatsApp (solo se autorizzato)

3. FREQUENZA
- Newsletter: massimo 1 al mese
- Aggiornamenti: in base alle novità
- Promozioni: massimo 1 alla settimana

4. DIRITTI
- Disiscrivere in qualsiasi momento
- Modificare le preferenze di comunicazione
- Richiedere cancellazione completa

5. CONSEGUENZE DEL RIFIUTO
Il rifiuto non pregiudica l'utilizzo del servizio, ma non riceverà comunicazioni commerciali.`
      }
    },
    required_consents: ['terms_conditions', 'privacy_policy', 'health_data_processing', 'ai_processing'],
    optional_consents: ['marketing']
  };

  const currentConsentData = consentData || defaultConsentData;

  useEffect(() => {
    if (isOpen) {
      // Initialize consents state
      const initialConsents = {};
      Object.keys(currentConsentData.templates).forEach(key => {
        initialConsents[key] = false;
      });
      setConsents(initialConsents);
      setExpandedConsent(null);
    }
  }, [isOpen, currentConsentData]);

  useEffect(() => {
    // Check if all required consents are given
    const requiredGiven = currentConsentData.required_consents.every(
      consentType => consents[consentType] === true
    );
    setAllRequiredConsentsGiven(requiredGiven);
  }, [consents, currentConsentData.required_consents]);

  const handleConsentChange = (consentType, granted) => {
    setConsents(prev => ({
      ...prev,
      [consentType]: granted
    }));
  };

  const toggleExpanded = (consentType) => {
    setExpandedConsent(expandedConsent === consentType ? null : consentType);
  };

  const handleSubmit = () => {
    if (!allRequiredConsentsGiven) {
      alert('È necessario accettare tutti i consensi obbligatori per procedere.');
      return;
    }

    onConsentSubmit(consents);
  };

  if (!isOpen) return null;

  return (
    <div className="consent-modal-overlay">
      <div className="consent-modal">
        <div className="consent-modal-header">
          <h2>📋 Consensi e Privacy</h2>
          <p>Per utilizzare RefertoSicuro è necessario fornire i seguenti consensi secondo il GDPR:</p>
        </div>

        <div className="consent-modal-body">
          {/* Required Consents */}
          <div className="consent-section">
            <h3>🔒 Consensi Obbligatori</h3>
            <p className="consent-section-description">
              Questi consensi sono necessari per registrarsi e utilizzare il servizio
            </p>

            {currentConsentData.required_consents.map(consentType => {
              const template = currentConsentData.templates[consentType];
              if (!template) return null;

              return (
                <div key={consentType} className="consent-item required">
                  <div className="consent-header">
                    <div className="consent-checkbox">
                      <input
                        type="checkbox"
                        id={consentType}
                        checked={consents[consentType] || false}
                        onChange={(e) => handleConsentChange(consentType, e.target.checked)}
                      />
                      <label htmlFor={consentType}>
                        <strong>{template.title}</strong>
                        <span className="required-badge">Obbligatorio</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      className="expand-button"
                      onClick={() => toggleExpanded(consentType)}
                    >
                      {expandedConsent === consentType ? '▼' : '▶'} Leggi il testo completo
                    </button>
                  </div>

                  <p className="consent-summary">{template.summary_text}</p>

                  {expandedConsent === consentType && (
                    <div className="consent-full-text">
                      <pre>{template.full_text}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Optional Consents */}
          {currentConsentData.optional_consents.length > 0 && (
            <div className="consent-section">
              <h3>📧 Consensi Opzionali</h3>
              <p className="consent-section-description">
                Questi consensi sono facoltativi e puoi modificarli in qualsiasi momento
              </p>

              {currentConsentData.optional_consents.map(consentType => {
                const template = currentConsentData.templates[consentType];
                if (!template) return null;

                return (
                  <div key={consentType} className="consent-item optional">
                    <div className="consent-header">
                      <div className="consent-checkbox">
                        <input
                          type="checkbox"
                          id={consentType}
                          checked={consents[consentType] || false}
                          onChange={(e) => handleConsentChange(consentType, e.target.checked)}
                        />
                        <label htmlFor={consentType}>
                          <strong>{template.title}</strong>
                          <span className="optional-badge">Opzionale</span>
                        </label>
                      </div>
                      <button
                        type="button"
                        className="expand-button"
                        onClick={() => toggleExpanded(consentType)}
                      >
                        {expandedConsent === consentType ? '▼' : '▶'} Leggi il testo completo
                      </button>
                    </div>

                    <p className="consent-summary">{template.summary_text}</p>

                    {expandedConsent === consentType && (
                      <div className="consent-full-text">
                        <pre>{template.full_text}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* GDPR Information */}
          <div className="gdpr-info">
            <h4>ℹ️ I tuoi diritti secondo il GDPR</h4>
            <ul>
              <li><strong>Diritto di accesso:</strong> puoi richiedere una copia dei tuoi dati</li>
              <li><strong>Diritto di rettifica:</strong> puoi correggere dati inesatti</li>
              <li><strong>Diritto di cancellazione:</strong> puoi richiedere la cancellazione dei tuoi dati</li>
              <li><strong>Diritto di revoca:</strong> puoi revocare i consensi in qualsiasi momento</li>
              <li><strong>Diritto di portabilità:</strong> puoi ricevere i tuoi dati in formato trasferibile</li>
            </ul>
            <p>
              Per esercitare i tuoi diritti, contatta:
              <a href="mailto:privacy@refertosicuro.it">privacy@refertosicuro.it</a>
            </p>
          </div>
        </div>

        <div className="consent-modal-footer">
          <div className="consent-summary-status">
            {allRequiredConsentsGiven ? (
              <span className="status-ok">✅ Tutti i consensi obbligatori forniti</span>
            ) : (
              <span className="status-warning">
                ⚠️ È necessario accettare tutti i consensi obbligatori
              </span>
            )}
          </div>

          <div className="consent-modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Annulla
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!allRequiredConsentsGiven || loading}
            >
              {loading ? 'Elaborazione...' : 'Procedi con la registrazione'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;