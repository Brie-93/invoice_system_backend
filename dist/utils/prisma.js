"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/utils/prisma.ts
const client_1 = require("@prisma/client");
const adapter_mariadb_1 = require("@prisma/adapter-mariadb");
// 1. Configure the adapter with your XAMPP defaults
const adapter = new adapter_mariadb_1.PrismaMariaDb({
    host: 'localhost',
    port: 3306,
    user: 'root', // Default XAMPP user
    password: '', // Default XAMPP password (empty)
    database: 'design_db'
});
// 2. Pass the adapter to the Prisma Client
const prisma = new client_1.PrismaClient({ adapter });
exports.default = prisma;
