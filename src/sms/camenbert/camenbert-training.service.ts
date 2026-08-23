import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface TrainingProgress {
  type: 'log' | 'epoch' | 'complete' | 'error' | 'status';
  message?: string;
  epoch?: number;
  totalEpochs?: number;
  loss?: number;
  accuracy?: number;
  f1?: number;
  samples?: number;
  state?: TrainingState;
  deployAvailable?: boolean;
}

export type TrainingState = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

@Injectable()
export class CamenBertTrainingService {
  private readonly logger = new Logger(CamenBertTrainingService.name);
  private state: TrainingState = 'idle';
  private process: ChildProcess | null = null;
  private logs: string[] = [];
  private currentEpoch = 0;
  private totalEpochs = 0;
  private lastAccuracy = 0;
  private lastF1 = 0;
  private progress$ = new Subject<TrainingProgress>();
  private deployReady = false;

  getStatus() {
    return {
      state: this.state,
      currentEpoch: this.currentEpoch,
      totalEpochs: this.totalEpochs,
      accuracy: this.lastAccuracy,
      f1: this.lastF1,
      logsCount: this.logs.length,
      deployAvailable: this.deployReady,
    };
  }

  getLogs(offset = 0): { logs: string[]; nextOffset: number } {
    return {
      logs: this.logs.slice(offset),
      nextOffset: this.logs.length,
    };
  }

  onProgress(): Observable<TrainingProgress> {
    return this.progress$.asObservable();
  }

  async start(params: { epochs?: number; batchSize?: number; lr?: number }): Promise<{ ok: boolean; error?: string }> {
    if (this.state === 'running') {
      return { ok: false, error: 'Un entraînement est déjà en cours' };
    }

    const cwd = process.cwd();
    const trainScript = path.join(cwd, 'src/sms/camenbert/training/train.py');
    const dataPath = path.join(cwd, 'src/sms/camenbert/training/data.jsonl');

    if (!fs.existsSync(trainScript)) {
      return { ok: false, error: "Script d'entraînement introuvable" };
    }
    if (!fs.existsSync(dataPath)) {
      return { ok: false, error: "Fichier de données introuvable: créez training/data.jsonl" };
    }

    this.state = 'running';
    this.logs = [];
    this.currentEpoch = 0;
    this.totalEpochs = params.epochs ?? 5;
    this.lastAccuracy = 0;
    this.lastF1 = 0;
    this.deployReady = false;

    this.emit({ type: 'status', state: 'running', message: 'Démarrage...' });

    const args = [
      trainScript,
      '--data', dataPath,
      '--epochs', String(params.epochs ?? 5),
      '--batch-size', String(params.batchSize ?? 16),
      '--lr', String(params.lr ?? 2e-5),
    ];

    this.process = spawn('python3', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PIP_PROGRESS_BAR: 'on', PYTHONUNBUFFERED: '1' },
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        this.handleLine(line);
      }
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        // Stderr can contain warnings + errors
        if (line.toLowerCase().includes('error') || line.toLowerCase().includes('traceback')) {
          this.logs.push(`[stderr] ${line}`);
          this.emit({ type: 'error', message: line });
        } else {
          this.logs.push(`[stderr] ${line}`);
        }
      }
    });

    this.process.on('close', (code) => {
      this.process = null;
      if (this.state === 'cancelled') return;

      if (code === 0) {
        this.state = 'completed';
        this.deployReady = true;
        this.emit({ type: 'complete', state: 'completed', accuracy: this.lastAccuracy, f1: this.lastF1, epoch: this.currentEpoch, totalEpochs: this.totalEpochs, deployAvailable: true });
        this.logger.log(`Entraînement terminé — acc: ${(this.lastAccuracy * 100).toFixed(1)}%`);
      } else {
        this.state = 'failed';
        this.emit({ type: 'error', message: `Processus terminé avec code ${code}`, state: 'failed' });
      }
    });

    this.process.on('error', (err) => {
      this.process = null;
      this.state = 'failed';
      this.emit({ type: 'error', message: err.message, state: 'failed' });
    });

    return { ok: true };
  }

  cancel() {
    if (this.process) {
      this.state = 'cancelled';
      this.process.kill('SIGTERM');
      this.process = null;
      this.emit({ type: 'status', state: 'cancelled', message: 'Entraînement annulé' });
    }
  }

  deploy() {
    if (!this.deployReady) return { ok: false, error: 'Aucun entraînement terminé à déployer' };
    // Le modèle est déjà à sa place (train.py écrit directement dans model/)
    this.deployReady = false;
    this.emit({ type: 'log', message: '✓ Modèle déployé (camenbert-int8.onnx)' });
    return { ok: true, message: 'Modèle déployé avec succès' };
  }

  private handleLine(line: string) {
    this.logs.push(line);
    line = line.trim();

    // Try to parse JSON progress lines from train.py
    if (line.startsWith('{')) {
      try {
        const data = JSON.parse(line);
        switch (data.t) {
          case 'log':
            this.emit({ type: 'log', message: data.m });
            break;
          case 'epoch':
            this.currentEpoch = data.epoch;
            this.totalEpochs = data.totalEpochs ?? this.totalEpochs;
            this.lastAccuracy = data.accuracy ?? this.lastAccuracy;
            this.lastF1 = data.f1 ?? this.lastF1;
            this.emit({
              type: 'epoch',
              epoch: data.epoch,
              totalEpochs: this.totalEpochs,
              loss: data.loss,
              accuracy: data.accuracy,
              f1: data.f1,
            });
            break;
          case 'complete':
            this.lastAccuracy = data.accuracy ?? this.lastAccuracy;
            this.lastF1 = data.f1 ?? this.lastF1;
            this.currentEpoch = data.epochs ?? this.currentEpoch;
            break;
          case 'error':
            this.emit({ type: 'error', message: data.m });
            break;
        }
        return;
      } catch {}
    }

    // Fallback: treat as log line
    if (line.includes('✓') || line.includes('━━━') || line.includes('⚠') || line.includes('✅')) {
      this.emit({ type: 'log', message: line.replace(/\u001b\[.*?m/g, '') });
    }
  }

  private emit(progress: TrainingProgress) {
    this.progress$.next(progress);
  }
}
