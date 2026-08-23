import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/auth-response.dto';
import * as jwt from 'jsonwebtoken';
import type { Request } from 'express';

jest.mock('./auth.service');

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  me: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let mockRequest: any;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-controller';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    mockRequest = {
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      headers: { 'user-agent': 'test-agent' },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call AuthService.register with the correct dto', async () => {
      const dto: RegisterDto = {
        contact: 'joan@test.com',
        contactType: 'email',
        accountNumber: '4443185208',
        otp: '847291',
        password: 'password123',
      };

      const expectedResponse = {
        step: 'complete',
        message: 'Compte activé avec succès.',
        token: 'fake-token',
      };

      mockAuthService.register.mockResolvedValue(expectedResponse);

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toBe(expectedResponse);
    });

    it('should handle registration errors', async () => {
      const dto: RegisterDto = {
        contact: 'joan@test.com',
        contactType: 'email',
        accountNumber: '4443185208',
        otp: '847291',
        password: 'password123',
      };

      mockAuthService.register.mockRejectedValue(
        new Error('Account already exists'),
      );

      await expect(controller.register(dto)).rejects.toThrow(
        'Account already exists',
      );
    });
  });

  describe('login', () => {
    it('should call AuthService.login with the correct dto and return tokens', async () => {
      const dto: LoginDto = {
        contact: 'joan@test.com',
        password: 'password123',
      };

      const fakeResponse = {
        accessToken: 'eyJhbGciOiJIUzI1NiIs...access',
        refreshToken: 'eyJhbGciOiJIUzI1NiIs...refresh',
        user: { id: '123', email: 'joan@test.com', role: 'ADMIN' },
      };
      mockAuthService.login.mockResolvedValue(fakeResponse);

      const result = await controller.login(dto, mockRequest as Request);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto, mockRequest);
      expect(result).toEqual(fakeResponse);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw if authService.login throws', async () => {
      const dto: LoginDto = {
        contact: 'joan@test.com',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        controller.login(dto, mockRequest as Request),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('me', () => {
    it('should return user from valid Bearer token', async () => {
      const fakeUser = { id: '123', email: 'joan@test.com', role: 'ADMIN' };
      mockAuthService.me.mockResolvedValue(fakeUser);

      const validToken = jwt.sign(
        { id: '123', email: 'joan@test.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '5m' },
      );

      const result = await controller.me(`Bearer ${validToken}`);

      expect(result).toEqual(fakeUser);
      expect(mockAuthService.me).toHaveBeenCalledWith(fakeUser.id);
    });

    it('should throw if no auth header', async () => {
      await expect(controller.me(undefined)).rejects.toThrow(
        'Authorization header missing',
      );
    });

    it('should throw if malformed auth header', async () => {
      await expect(controller.me('Invalid')).rejects.toThrow(
        'Invalid authorization header',
      );
    });
  });

  describe('refresh', () => {
    it('should return new tokens from valid refresh token', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'valid-refresh-token' };
      const fakeResponse = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      };
      mockAuthService.refreshToken.mockResolvedValue(fakeResponse);

      const result = await controller.refresh(dto, mockRequest as Request);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        dto,
        mockRequest,
      );
      expect(result).toEqual(fakeResponse);
    });
  });

  describe('logout', () => {
    it('should revoke session and return success message', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'valid-refresh-token' };

      const result = await controller.logout(dto);

      expect(mockAuthService.logout).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'Déconnecté avec succès' });
    });
  });
});
