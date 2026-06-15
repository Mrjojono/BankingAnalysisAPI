import { Injectable, Logger } from '@nestjs/common';
import { TransactionSourceProvider } from '../interfaces/transaction-source-provider.interface';
import { Entry } from '../../types';

/**
 * Source TMoney (Mobile Money).
 *
 * C'est un exemple de source EXTERNE branchée comme un "boulon".
 * Pour l'instant c'est un SQUELETTE — il implémente juste isAvailable()
 * et fetchEntries() retourne un tableau vide.
 *
 * Pour la rendre fonctionnelle :
 * 1. Configurer TMONEY_API_URL et TMONEY_API_KEY dans .env
 * 2. Implémenter fetchEntries() en appelant l'API TMoney
 * 3. Optionnellement implémenter fetchTransactions()
 *
 * Variables d'environnement requises :
 * - TMONEY_API_URL  → URL de l'API TMoney
 * - TMONEY_API_KEY  → Clé d'authentification
 *
 * Comportement si non configuré :
 * - isAvailable() retourne false
 * - Le Registry ignore silencieusement cette source
 * - Aucun impact sur le reste de l'application
 */
@Injectable()
export class TMoneySource implements TransactionSourceProvider {
  readonly name = 'tmoney';
  private readonly logger = new Logger(TMoneySource.name);

  /** Lit l'URL depuis les variables d'environnement */
  private get apiUrl(): string | undefined {
    return process.env.TMONEY_API_URL;
  }

  /** Lit la clé API depuis les variables d'environnement */
  private get apiKey(): string | undefined {
    return process.env.TMONEY_API_KEY;
  }

  /**
   * Vérifie si TMoney est accessible.
   * - Si les vars d'env ne sont pas définies → pas configuré → false
   * - Sinon → health check HTTP sur l'API
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiUrl || !this.apiKey) {
      this.logger.log(
        'TMoney source not configured (missing TMONEY_API_URL or TMONEY_API_KEY)',
      );
      return false;
    }

    try {
      const response = await fetch(`${this.apiUrl}/health`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      this.logger.warn('TMoney API is not reachable');
      return false;
    }
  }

  /**
   * TODO: Implémenter l'appel API TMoney pour récupérer les transactions.
   * Pour l'instant, retourne un tableau vide (stub).
   *
   * Format attendu en retour : Entry[] (écritures comptables normalisées)
   * Il faudra mapper les données TMoney vers le format Entry.
   */
  async fetchEntries(
    customerId: string,
    from?: Date,
    to?: Date,
  ): Promise<Entry[]> {
    void customerId;
    void from;
    void to;

    this.logger.log('TMoney fetchEntries called — not yet implemented');
    return [];
  }
}
