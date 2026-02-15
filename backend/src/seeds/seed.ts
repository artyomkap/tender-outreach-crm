import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
    port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DATABASE_URL ? undefined : (process.env.DB_USERNAME || 'postgres'),
    password: process.env.DATABASE_URL ? undefined : (process.env.DB_PASSWORD || 'postgres'),
    database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'admin_panel'),
    entities: [User],
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  });

  await dataSource.initialize();
  console.log('Database connected');

  const userRepo = dataSource.getRepository(User);

  const existingAdmin = await userRepo.findOne({
    where: { email: 'admin@admin.com' },
  });

  if (!existingAdmin) {
    const password = await bcrypt.hash('admin123', 12);
    await userRepo.save(
      userRepo.create({
        email: 'admin@admin.com',
        password,
        firstName: 'Админ',
        lastName: 'Системный',
        role: Role.ADMIN,
        isActive: true,
      }),
    );
    console.log('Admin user created: admin@admin.com / admin123');
  } else {
    console.log('Admin user already exists');
  }

  await dataSource.destroy();
  console.log('Seed completed');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
