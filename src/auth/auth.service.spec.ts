import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailerService } from '@nestjs-modules/mailer';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as authUtils from './auth.utils';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    bankCustomer: {
      findUnique: jest.fn(),
    },
    userBankConnection: {
      create: jest.fn(),
    },
    authLog: {
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  const mockMailer = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: MailerService, useValue: mockMailer },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.spyOn(authUtils, 'comparePassword').mockResolvedValue(false);
    jest.spyOn(authUtils, 'hashPassword').mockResolvedValue('hashed-password');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return accessToken + refreshToken + user on successful login', async () => {
      const loginDto: LoginDto = {
        contact: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'CLIENT',
        bankConnections: [
          {
            bankCustomer: {
              accountNumber: '4443185208',
              firstName: 'Joan',
              lastName: 'Doe',
            },
          },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (authUtils.comparePassword as jest.Mock).mockResolvedValue(true);

      const fakeSession = {
        id: 'session-id-123',
        userId: mockUser.id,
        token: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      mockPrisma.session.create.mockResolvedValue(fakeSession);
      mockPrisma.session.update.mockResolvedValue({
        ...fakeSession,
        token: 'refreshed-token-jwt',
      });

      const result = await service.login(loginDto);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: 'CLIENT',
        username: 'Joan Doe',
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { bankConnections: { include: { bankCustomer: true } } },
      });
      expect(mockPrisma.session.create).toHaveBeenCalled();
      expect(mockPrisma.session.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto: LoginDto = {
        contact: 'nonexistent@example.com',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const loginDto: LoginDto = {
        contact: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password: 'hashed-password',
        bankConnections: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if user has no password', async () => {
      const loginDto: LoginDto = {
        contact: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password: null,
        bankConnections: [],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    it('should verify bank customer on first step', async () => {
      const registerDto: RegisterDto = {
        accountNumber: '4443185208',
      };

      const mockBankCustomer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'bank@example.com',
        accountNumber: '4443185208',
        userConnection: null,
      };

      mockPrisma.bankCustomer.findUnique.mockResolvedValue(mockBankCustomer);
      mockRedis.set.mockResolvedValue(true);

      const result = await service.register(registerDto);

      expect(result.step).toBe('verify_contact');
      expect(result.message).toContain('Compte trouvé');
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should throw if bank customer not found', async () => {
      const registerDto: RegisterDto = {
        accountNumber: '9999999999',
      };

      mockPrisma.bankCustomer.findUnique.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if account already has a user', async () => {
      const registerDto: RegisterDto = {
        accountNumber: '4443185208',
      };

      const mockBankCustomer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'bank@example.com',
        accountNumber: '4443185208',
        userConnection: { userId: 'existing-user-id' },
      };

      mockPrisma.bankCustomer.findUnique.mockResolvedValue(mockBankCustomer);

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should send OTP on second step', async () => {
      const registerDto: RegisterDto = {
        accountNumber: '4443185208',
        contact: 'test@example.com',
        contactType: 'email',
      };

      const mockBankCustomer = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        accountNumber: '4443185208',
        userConnection: null,
      };

      const mockState = {
        step: 'verify_contact',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        accountNumber: '4443185208',
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockState));
      mockPrisma.bankCustomer.findUnique.mockResolvedValue(mockBankCustomer);
      mockRedis.set.mockResolvedValue(true);
      mockMailer.sendMail.mockResolvedValue(true);

      const result = await service.register(registerDto);

      expect(result.step).toBe('verify_otp');
      expect(result.message).toContain('Code OTP envoyé');
      expect(mockMailer.sendMail).toHaveBeenCalled();
    });
  });

  describe('validateToken', () => {
    it('should throw for invalid token', () => {
      const invalidToken = 'invalid-token';

      expect(() => service.validateToken(invalidToken)).toThrow();
    });
  });

  describe('resendOtp', () => {
    it('should resend OTP if session is valid', async () => {
      const accountNumber = '4443185208';
      const mockState = {
        step: 'verify_otp',
        contact: 'test@example.com',
        contactType: 'email',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
      };

      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(mockState))
        .mockResolvedValueOnce(null);

      mockRedis.set.mockResolvedValue(true);
      mockMailer.sendMail.mockResolvedValue(true);

      const result = await service.resendOtp(accountNumber);

      expect(result.message).toContain('Nouveau code OTP envoyé');
      expect(mockMailer.sendMail).toHaveBeenCalled();
    });

    it('should throw if session is expired', async () => {
      const accountNumber = '4443185208';

      mockRedis.get.mockResolvedValue(null);

      await expect(service.resendOtp(accountNumber)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if OTP is already active', async () => {
      const accountNumber = '4443185208';
      const mockState = {
        step: 'verify_otp',
        contact: 'test@example.com',
        contactType: 'email',
        customerId: '123e4567-e89b-12d3-a456-426614174000',
      };

      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(mockState))
        .mockResolvedValueOnce('123456');

      await expect(service.resendOtp(accountNumber)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
