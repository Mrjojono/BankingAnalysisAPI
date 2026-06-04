// src/gateway/dashboard.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
})
export class DashboardGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DashboardGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit() {
    this.logger.log('WebSocket Gateway initialisé');

    // Heartbeat toutes les 10 secondes pour prouver que le flux est vivant
    setInterval(() => {
      this.emit('heartbeat', {
        time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
        status: 'UP',
      });
    }, 10000);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connecté : ${client.id}`);
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
