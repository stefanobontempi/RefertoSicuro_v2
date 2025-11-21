#!/usr/bin/env python3
"""
Script per migrare automaticamente tutti gli endpoint dal formato v0 al formato v2
nei file del frontend di RefertoSicuro.

Uso: python scripts/migrate_endpoints.py [--dry-run] [--verbose]
"""

import os
import re
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

# Colori per output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

# Mappatura degli endpoint v0 → v2
ENDPOINT_MAPPING = {
    # AUTH SERVICE
    '/auth/login': '/api/v1/auth/login',
    '/auth/logout': '/api/v1/auth/logout',
    '/auth/register': '/api/v1/auth/register',
    '/auth/csrf-token': '/api/v1/auth/csrf-token',
    '/auth/verify-token': '/api/v1/auth/verify',
    '/auth/me': '/api/v1/users/me',
    '/auth/b2c/verify-email': '/api/v1/auth/register/verify-email',
    '/auth/b2c/confirm-email': '/api/v1/auth/register/confirm-email',
    '/auth/b2c/register': '/api/v1/auth/register/complete',
    '/auth/forgot-password': '/api/v1/auth/forgot-password',
    '/auth/reset-password': '/api/v1/auth/reset-password',

    # USER MANAGEMENT
    '/users/profile': '/api/v1/users/profile',
    '/users/subscription': '/api/v1/billing/subscription',
    '/users/change-password': '/api/v1/users/change-password',

    # REPORTS SERVICE
    '/reports/validate': '/api/v1/reports/validate',
    '/reports/improve': '/api/v1/reports/improve',
    '/reports/improve-streaming': '/api/v1/reports/improve-streaming',
    '/reports/improve-streaming-sse': '/api/v1/reports/improve-sse',
    '/reports/suggestions': '/api/v1/reports/suggestions',
    '/reports/transcribe': '/api/v1/reports/transcribe',
    '/reports/health': '/api/v1/reports/health',

    # SPECIALTIES
    '/specialties/': '/api/v1/specialties',
    '/specialties/user/me': '/api/v1/specialties/user',
    '/specialties/user/me/assistants': '/api/v1/specialties/assistants',

    # TEMPLATES
    '/input-templates/': '/api/v1/templates',
    '/input-templates/by-specialty': '/api/v1/templates/by-specialty',
    '/input-templates/stats': '/api/v1/templates/stats',

    # BILLING SERVICE
    '/billing/cancel-subscription': '/api/v1/billing/subscription/cancel',
    '/billing/invoices': '/api/v1/billing/invoices',
    '/billing/plans': '/api/v1/billing/plans',
    '/billing/checkout/stripe': '/api/v1/billing/checkout/stripe',
    '/billing/checkout/paypal': '/api/v1/billing/checkout/paypal',

    # CONSENT
    '/consent/templates': '/api/v1/consent/templates',

    # PLATFORM FEATURES
    '/platform-features/public': '/api/v1/features/public',
    '/platform-features/user/me': '/api/v1/features/user',

    # GENERAL
    '/health': '/health',  # Resta uguale
    '/info': '/api/v1/info',
}

# Pattern per trovare endpoint dinamici (con parametri)
DYNAMIC_PATTERNS = [
    (r'/specialties/(\${?\w+}?)', r'/api/v1/specialties/\1'),
    (r'/input-templates/(\${?\w+}?)', r'/api/v1/templates/\1'),
    (r'/consent/templates/(\${?\w+}?)', r'/api/v1/consent/templates/\1'),
    (r'/billing/invoices/(\${?\w+}?)', r'/api/v1/billing/invoices/\1'),
]

class EndpointMigrator:
    def __init__(self, base_path: str, dry_run: bool = False, verbose: bool = False):
        self.base_path = Path(base_path)
        self.dry_run = dry_run
        self.verbose = verbose
        self.tracker = {
            'start_time': datetime.now().isoformat(),
            'files_processed': 0,
            'files_modified': 0,
            'endpoints_replaced': 0,
            'endpoint_details': {},
            'errors': [],
            'status': 'in_progress'
        }

    def log(self, message: str, color: str = ''):
        """Log con colori opzionali"""
        if color:
            print(f"{color}{message}{Colors.END}")
        else:
            print(message)

    def find_javascript_files(self) -> List[Path]:
        """Trova tutti i file JS/JSX nel frontend"""
        patterns = ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx']
        files = []

        for pattern in patterns:
            files.extend(self.base_path.glob(pattern))

        # Escludi node_modules e build directories
        files = [f for f in files if 'node_modules' not in str(f) and 'dist' not in str(f)]

        return sorted(files)

    def replace_endpoints_in_content(self, content: str, file_path: str) -> Tuple[str, List[Dict]]:
        """Sostituisce tutti gli endpoint nel contenuto di un file"""
        modified_content = content
        replacements = []

        # Prima sostituisci gli endpoint statici
        for old_endpoint, new_endpoint in ENDPOINT_MAPPING.items():
            # Pattern per trovare l'endpoint in vari contesti
            patterns = [
                # Stringhe singole e doppie
                (f"'{old_endpoint}'", f"'{new_endpoint}'"),
                (f'"{old_endpoint}"', f'"{new_endpoint}"'),
                # Template literals
                (f"`{old_endpoint}`", f"`{new_endpoint}`"),
                # In mezzo a concatenazioni
                (f"'{old_endpoint}", f"'{new_endpoint}"),
                (f'"{old_endpoint}', f'"{new_endpoint}'),
                # Con slash finale opzionale
                (f"'{old_endpoint}/'", f"'{new_endpoint}'"),
                (f'"{old_endpoint}/"', f'"{new_endpoint}"'),
                # Template literals con variabili (comune in authService.js)
                (f"${{API_BASE_URL}}{old_endpoint}", f"${{API_BASE_URL}}{new_endpoint}"),
                (f"${{API_CONFIG.baseURL}}{old_endpoint}", f"${{API_CONFIG.baseURL}}{new_endpoint}"),
                (f"${{API_CONFIG.backendURL}}{old_endpoint}", f"${{API_CONFIG.backendURL}}{new_endpoint}"),
            ]

            for old_pattern, new_pattern in patterns:
                if old_pattern in modified_content:
                    count = modified_content.count(old_pattern)
                    modified_content = modified_content.replace(old_pattern, new_pattern)

                    if count > 0:
                        replacements.append({
                            'old': old_endpoint,
                            'new': new_endpoint,
                            'count': count,
                            'context': old_pattern
                        })

                        if self.verbose:
                            self.log(f"  → Sostituito {old_pattern} con {new_pattern} ({count} volte)", Colors.GREEN)

        # Poi sostituisci i pattern dinamici con regex
        for old_pattern, new_pattern in DYNAMIC_PATTERNS:
            # Cerca in vari contesti di stringa
            for quote in ["'", '"', '`']:
                regex_pattern = quote + old_pattern
                regex_replacement = quote + new_pattern

                matches = re.findall(regex_pattern, modified_content)
                if matches:
                    modified_content = re.sub(regex_pattern, regex_replacement, modified_content)

                    replacements.append({
                        'old': old_pattern,
                        'new': new_pattern,
                        'count': len(matches),
                        'context': 'dynamic_pattern'
                    })

                    if self.verbose:
                        self.log(f"  → Pattern dinamico: {old_pattern} → {new_pattern} ({len(matches)} sostituzioni)", Colors.YELLOW)

        return modified_content, replacements

    def process_file(self, file_path: Path) -> bool:
        """Processa un singolo file"""
        try:
            relative_path = file_path.relative_to(self.base_path)

            # Leggi il contenuto
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()

            # Sostituisci gli endpoint
            modified_content, replacements = self.replace_endpoints_in_content(
                original_content,
                str(relative_path)
            )

            # Se ci sono state modifiche
            if original_content != modified_content:
                if not self.dry_run:
                    # Scrivi il file modificato
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(modified_content)

                # Aggiorna il tracker
                self.tracker['files_modified'] += 1
                self.tracker['endpoints_replaced'] += sum(r['count'] for r in replacements)
                self.tracker['endpoint_details'][str(relative_path)] = {
                    'modified': True,
                    'replacements': replacements,
                    'total_replacements': sum(r['count'] for r in replacements)
                }

                self.log(f"✅ {relative_path}: {sum(r['count'] for r in replacements)} sostituzioni", Colors.GREEN)
                return True
            else:
                if self.verbose:
                    self.log(f"⏭️  {relative_path}: nessuna modifica necessaria", Colors.BLUE)

                self.tracker['endpoint_details'][str(relative_path)] = {
                    'modified': False,
                    'replacements': [],
                    'total_replacements': 0
                }

            return False

        except Exception as e:
            error_msg = f"Errore processando {file_path}: {str(e)}"
            self.log(f"❌ {error_msg}", Colors.RED)
            self.tracker['errors'].append(error_msg)
            return False

    def save_tracker(self):
        """Salva il file di tracking"""
        tracker_path = self.base_path / 'ENDPOINT_MIGRATION_TRACKER.json'

        self.tracker['end_time'] = datetime.now().isoformat()
        self.tracker['status'] = 'completed' if not self.tracker['errors'] else 'completed_with_errors'

        with open(tracker_path, 'w', encoding='utf-8') as f:
            json.dump(self.tracker, f, indent=2, ensure_ascii=False)

        self.log(f"\n📊 Tracker salvato in: {tracker_path}", Colors.BOLD)

    def run(self):
        """Esegue la migrazione completa"""
        self.log(f"\n{'='*60}", Colors.BOLD)
        self.log("🚀 MIGRAZIONE ENDPOINT v0 → v2", Colors.BOLD)
        self.log(f"{'='*60}\n", Colors.BOLD)

        if self.dry_run:
            self.log("⚠️  MODALITÀ DRY-RUN: nessun file sarà modificato\n", Colors.YELLOW)

        # Trova tutti i file JavaScript
        files = self.find_javascript_files()
        self.log(f"📁 Trovati {len(files)} file da processare\n", Colors.BLUE)

        # Processa ogni file
        for file_path in files:
            self.tracker['files_processed'] += 1
            self.process_file(file_path)

        # Salva il tracker
        self.save_tracker()

        # Report finale
        self.print_summary()

    def print_summary(self):
        """Stampa il riepilogo della migrazione"""
        self.log(f"\n{'='*60}", Colors.BOLD)
        self.log("📈 RIEPILOGO MIGRAZIONE", Colors.BOLD)
        self.log(f"{'='*60}\n", Colors.BOLD)

        self.log(f"📊 File processati: {self.tracker['files_processed']}")
        self.log(f"✏️  File modificati: {self.tracker['files_modified']}", Colors.GREEN)
        self.log(f"🔄 Endpoint sostituiti: {self.tracker['endpoints_replaced']}", Colors.GREEN)

        if self.tracker['errors']:
            self.log(f"\n⚠️  Errori riscontrati: {len(self.tracker['errors'])}", Colors.RED)
            for error in self.tracker['errors']:
                self.log(f"  - {error}", Colors.RED)

        # File più modificati
        if self.tracker['endpoint_details']:
            modified_files = [
                (path, details['total_replacements'])
                for path, details in self.tracker['endpoint_details'].items()
                if details['modified']
            ]

            if modified_files:
                modified_files.sort(key=lambda x: x[1], reverse=True)

                self.log(f"\n📝 Top 5 file più modificati:", Colors.BOLD)
                for path, count in modified_files[:5]:
                    self.log(f"  - {path}: {count} sostituzioni", Colors.YELLOW)

        self.log(f"\n✅ Migrazione completata!", Colors.GREEN + Colors.BOLD)

        if self.dry_run:
            self.log("\n⚠️  Ricorda: era in modalità DRY-RUN, esegui senza --dry-run per applicare le modifiche", Colors.YELLOW)

def main():
    parser = argparse.ArgumentParser(description='Migra gli endpoint del frontend da v0 a v2')
    parser.add_argument('--dry-run', action='store_true', help='Simula la migrazione senza modificare i file')
    parser.add_argument('--verbose', action='store_true', help='Output dettagliato')
    parser.add_argument('--path', default='frontend/src', help='Path relativo da processare (default: frontend/src)')

    args = parser.parse_args()

    # Determina il base path
    script_dir = Path(__file__).parent.parent  # RefertoSicuro_v2/
    base_path = script_dir / args.path

    if not base_path.exists():
        print(f"❌ Path non trovato: {base_path}")
        return 1

    # Esegui la migrazione
    migrator = EndpointMigrator(base_path, dry_run=args.dry_run, verbose=args.verbose)
    migrator.run()

    return 0

if __name__ == '__main__':
    exit(main())