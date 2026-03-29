// src/utils/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

// 1. Configure the adapter with your XAMPP defaults
const adapter = new PrismaMariaDb({
  host: 'localhost',
  port: 3306,
  user: 'root',       // Default XAMPP user
  password: '',       // Default XAMPP password (empty)
  database: 'design_db'
});

// 2. Pass the adapter to the Prisma Client
const prisma = new PrismaClient({ adapter });

export default prisma;