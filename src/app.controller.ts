import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

@Controller()
export class AppController {
  @Get('dashboard')
  getDashboard(@Res() res: Response) {
    const paths = [
      // En production (dist/public/dashboard.html)
      join(__dirname, '..', 'public', 'dashboard.html'),
      // En développement (src/public/dashboard.html)
      join(__dirname, '..', 'src', 'public', 'dashboard.html'),
      // Cas spécifique Nest build (dist/src/public/dashboard.html)
      join(__dirname, 'public', 'dashboard.html'),
    ];

    for (const filePath of paths) {
      if (existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }

    return res
      .status(404)
      .send(
        'Dashboard file not found. Please run "npm run build" to ensure assets are copied.',
      );
  }
}
