// src/gateway/dashboard.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, Injectable, OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { validateToken } from '../auth/auth.utils';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  },
})
export class DashboardGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private readonly logger = new Logger(DashboardGateway.name);
  private heartbeatInterval: ReturnType<typeof setInterval>;

  @WebSocketServer()
  server: Server;

  afterInit() {
    this.logger.log('WebSocket Gateway initialisé');

    // Heartbeat toutes les 10 secondes pour prouver que le flux est vivant
    this.heartbeatInterval = setInterval(() => {
      this.emit('heartbeat', {
        time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
        status: 'UP',
      });
    }, 10000);
  }

  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;

      if (!token) {
        client.emit('error', 'Token manquant');
        client.disconnect();
        return;
      }

      const payload = validateToken(token as string);
      client.data.userId = payload.id;
      client.data.role = payload.role;
      this.logger.log(`Client dashboard connecté : ${client.id} (${payload.role})`);
    } catch {
      client.emit('error', 'Token invalide');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté : ${client.id}`);
  }

  /**
   * Envoie un événement à tous les clients connectés.
   */
  emit(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, data);
    } else {
      this.logger.warn(
        `Impossible d'émettre l'événement ${event} : Server non initialisé`,
      );
    }
  }

  /**
   * Envoie un événement à une room spécifique.
   */
  emitToRoom(room: string, event: string, data: any) {
    if (this.server) {
      this.server.to(room).emit(event, data);
    }
  }
}
