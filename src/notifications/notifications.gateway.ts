import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { validateToken } from '../auth/auth.utils';

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit() {
    this.logger.log('WebSocket Notifications Gateway initialisé');
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
      const userId = payload.id as string;

      client.join(`user:${userId}`);
      client.data.userId = userId;
      this.logger.log(`Client notif connecté : ${client.id} → user:${userId}`);
    } catch {
      client.emit('error', 'Token invalide');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client notif déconnecté : ${client.id}`);
  }

  sendToUser(userId: string, event: string, data: any) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit(event, data);
    }
  }
}
