import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Request } from 'express';

jest.mock('./auth.service');

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let mockRequest: any;

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

      expect(mockAuthService.register).toHaveBeenCalledWith(dto, undefined);
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
    it('should call AuthService.login with the correct dto and return token', async () => {
      const dto: LoginDto = {
        contact: 'joan@test.com',
        password: 'password123',
      };

      const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4In0.fake';
      mockAuthService.login.mockResolvedValue(fakeToken);

      const result = await controller.login(dto, mockRequest as Request);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto, mockRequest);
      expect(result).toBe(fakeToken);
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

    it('should handle user not found error', async () => {
      const dto: LoginDto = {
        contact: 'nonexistent@test.com',
        password: 'password123',
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        controller.login(dto, mockRequest as Request),
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
