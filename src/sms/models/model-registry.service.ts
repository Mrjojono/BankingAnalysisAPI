import { Injectable, Logger } from '@nestjs/common';
import type { InferenceSession } from 'onnxruntime-node';
import type { ModelConfig, ModelStatus } from './model.types';

interface ModelEntry {
  config: ModelConfig;
  session: InferenceSession | null;
  status: ModelStatus;
  idleTimer?: ReturnType<typeof setTimeout>;
  lastUsed: number;
  errorMessage?: string;
}

@Injectable()
export class ModelRegistryService {
  private readonly logger = new Logger(ModelRegistryService.name);
  private readonly models = new Map<string, ModelEntry>();
  private idleTimeoutMs = 300_000;

  setIdleTimeout(ms: number): void {
    this.idleTimeoutMs = ms;
  }

  async register(config: ModelConfig): Promise<void> {
    if (this.models.has(config.name)) {
      this.logger.warn(`Modèle "${config.name}" déjà enregistré`);
      return;
    }
    this.models.set(config.name, {
      config,
      session: null,
      status: 'unloaded',
      lastUsed: 0,
    });
    this.logger.log(`Modèle "${config.name}" enregistré (path: ${config.path})`);
  }

  async load(name: string): Promise<boolean> {
    const entry = this.models.get(name);
    if (!entry) {
      this.logger.warn(`Modèle "${name}" inconnu`);
      return false;
    }
    if (entry.status === 'loaded' && entry.session) {
      this.touch(name);
      return true;
    }

    const fs = await import('fs');
    if (!fs.existsSync(entry.config.path)) {
      this.logger.warn(
        `Fichier modèle "${entry.config.path}" introuvable pour "${name}"`,
      );
      entry.status = 'error';
      return false;
    }

    entry.status = 'loading';
    try {
      const ort = await import('onnxruntime-node');
      entry.session = await ort.InferenceSession.create(entry.config.path);
      entry.status = 'loaded';
      this.touch(name);
      this.logger.log(`Modèle "${name}" chargé avec succès`);
      return true;
    } catch (err) {
      entry.status = 'error';
      entry.errorMessage = (err as Error).message;
      this.logger.error(
        `Échec chargement modèle "${name}": ${(err as Error).message}`,
      );
      return false;
    }
  }

  getSession(name: string): InferenceSession | null {
    const entry = this.models.get(name);
    if (!entry?.session) return null;
    this.touch(name);
    return entry.session;
  }

  getStatus(name: string): ModelStatus {
    return this.models.get(name)?.status ?? 'unloaded';
  }

  isLoaded(name: string): boolean {
    return this.models.get(name)?.status === 'loaded';
  }

  getErrorMessage(name: string): string | undefined {
    return this.models.get(name)?.errorMessage;
  }

  async unload(name: string): Promise<void> {
    const entry = this.models.get(name);
    if (!entry) return;
    clearTimeout(entry.idleTimer);
    if (entry.session) {
      entry.session.release?.();
      entry.session = null;
      entry.status = 'unloaded';
      this.logger.log(`Modèle "${name}" déchargé (libéré ~${(entry.config.path.includes('onnx') ? 80 : 60)}MB)`);
    }
  }

  /** Décharge un modèle après X ms d'inactivité */
  private scheduleIdleUnload(name: string): void {
    const entry = this.models.get(name);
    if (!entry || this.idleTimeoutMs <= 0) return;
    clearTimeout(entry.idleTimer);
    entry.idleTimer = setTimeout(() => {
      this.unload(name);
    }, this.idleTimeoutMs);
  }

  private touch(name: string): void {
    const entry = this.models.get(name);
    if (!entry) return;
    entry.lastUsed = Date.now();
    this.scheduleIdleUnload(name);
  }

  list(): string[] {
    return Array.from(this.models.keys());
  }

  async loadAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const name of this.models.keys()) {
      results[name] = await this.load(name);
    }
    return results;
  }

  /** Stats mémoire combinées */
  getStats(): Record<string, { status: ModelStatus; memoryMB: number; lastUsed: string }> {
    const stats: Record<string, any> = {};
    for (const [name, entry] of this.models) {
      const isOnnx = entry.config.path.includes('onnx');
      stats[name] = {
        status: entry.status,
        memoryMB: entry.status === 'loaded' ? (isOnnx ? 80 : 60) : 0,
        lastUsed: entry.lastUsed
          ? new Date(entry.lastUsed).toISOString()
          : 'jamais',
      };
    }
    return stats;
  }
}
