import { createParamDecorator, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const id = request.user?.id ?? request.user?.sub;
    
    if (!id) {
      throw new HttpException('User ID manquant', HttpStatus.UNAUTHORIZED);
    }
    
    return id;
  },
);
