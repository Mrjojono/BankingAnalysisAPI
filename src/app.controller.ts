import { Controller, Get, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

@Controller()
export class AppController {
  @Get('ping')
  ping() {
    return 'pong';
  }

  @Get('dashboard')
  getDashboard(@Res({ passthrough: true }) res: Response) {
    const paths = [
      join(__dirname, '..', 'public', 'dashboard.html'),
      join(__dirname, '..', 'src', 'public', 'dashboard.html'),
      join(__dirname, 'public', 'dashboard.html'),
    ];

    for (const filePath of paths) {
      if (existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }

    throw new NotFoundException(
      'Dashboard file not found. Please run "npm run build" to ensure assets are copied.',
    );
  }

  @Get('admin/*path')
  getAdmin(@Res({ passthrough: true }) res: Response) {
    const paths = [
      join(__dirname, '..', 'public', 'admin', 'index.html'),
      join(__dirname, '..', 'src', 'public', 'admin', 'index.html'),
      join(__dirname, 'public', 'admin', 'index.html'),
    ];

    for (const filePath of paths) {
      if (existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }

    throw new NotFoundException(
      'Admin build not found. Run "cd admin && npm run build".',
    );
  }
}
