// src/controllers/apiController.ts
import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

// --- DASHBOARD SCHEMATICS ---
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Get all invoices to calculate stats
    const invoices = await prisma.invoice.findMany(); // Note: In a real multi-tenant app, filter by userId
    
    const totalRevenue = invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
      
    const outstanding = invoices
      .filter(inv => inv.status === 'PENDING')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const clientCount = await prisma.client.count();

    // Mock chart data for the beautiful area chart
    const chartData =[
      { name: 'Jan', revenue: 4000, expected: 2400 },
      { name: 'Feb', revenue: 3000, expected: 1398 },
      { name: 'Mar', revenue: 2000, expected: 9800 },
      { name: 'Apr', revenue: 2780, expected: 3908 },
      { name: 'May', revenue: 1890, expected: 4800 },
      { name: 'Jun', revenue: totalRevenue > 0 ? totalRevenue : 2390, expected: 3800 },
    ];

    res.json({ totalRevenue, outstanding, clientCount, chartData });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

// --- CLIENTS ---
export const getClients = async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      include: { _count: { select: { invoices: true } } }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clients' });
  }
};

export const createClient = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, address } = req.body;
    const client = await prisma.client.create({
      data: { name, email, address }
    });
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ message: 'Error creating client' });
  }
};

// --- INVOICES ---
export const getInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { issueDate: 'desc' },
      include: { client: true, items: true },
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invoices' });
  }
};

type CreateItemBody = { description?: string; quantity?: number; rate?: number };

export const createInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, issueDate, dueDate, status, items } = req.body as {
      clientId?: number;
      issueDate?: string;
      dueDate?: string;
      status?: string;
      items?: CreateItemBody[];
    };

    if (
      clientId == null ||
      !dueDate ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({ message: 'clientId, dueDate, and items are required' });
    }

    const normalized = items.map((it) => ({
      description: String(it.description ?? '').trim() || 'Line item',
      quantity: Math.max(1, Math.floor(Number(it.quantity) || 1)),
      rate: Math.max(0, Number(it.rate) || 0),
    }));

    const subtotal = normalized.reduce((sum, it) => sum + it.quantity * it.rate, 0);
    const totalAmount = Math.round(subtotal * 1.1 * 100) / 100;
    const invoiceNo = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const invStatus = status === 'DRAFT' ? 'DRAFT' : 'PENDING';

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        clientId: Number(clientId),
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: new Date(dueDate),
        status: invStatus,
        totalAmount,
        items: {
          create: normalized,
        },
      },
      include: { client: true, items: true },
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating invoice' });
  }
};

export const deleteInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid invoice id' });
    }
    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.delete({ where: { id } }),
    ]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting invoice' });
  }
};

export const deleteClient = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid client id' });
    }

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const invoiceRows = await prisma.invoice.findMany({
      where: { clientId: id },
      select: { id: true },
    });
    const invoiceIds = invoiceRows.map((r) => r.id);

    await prisma.$transaction(async (tx) => {
      if (invoiceIds.length > 0) {
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: { in: invoiceIds } },
        });
      }
      await tx.invoice.deleteMany({ where: { clientId: id } });
      await tx.client.delete({ where: { id } });
    });

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting client' });
  }
};