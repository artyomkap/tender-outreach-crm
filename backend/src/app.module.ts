import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SshServersModule } from './ssh-servers/ssh-servers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { ProzorroModule } from './prozorro/prozorro.module';
import { TouchApiModule } from './touch-api/touch-api.module';
import { EmailsModule } from './emails/emails.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
      port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DATABASE_URL ? undefined : (process.env.DB_USERNAME || 'postgres'),
      password: process.env.DATABASE_URL ? undefined : (process.env.DB_PASSWORD || 'postgres'),
      database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'admin_panel'),
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      migrationsRun: true,
      migrations: [__dirname + '/migrations/*.{ts,js}'],
      ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false,
    }),
    AuthModule,
    UsersModule,
    SshServersModule,
    PurchasesModule,
    ProzorroModule,
    TouchApiModule,
    EmailsModule,
  ],
})
export class AppModule {}
