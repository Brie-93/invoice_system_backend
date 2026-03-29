// src/controllers/apiController.ts
import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

// --- DASHBOARD SCHEMATICS ---
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // Only fields needed for stats (typed explicitly via select)
    const invoices = await prisma.invoice.findMany({
      select: {
        status: true,
        totalAmount: true,
        amountPaid: true,
      },
    });

    const totalRevenue = invoices
      .filter((inv) => inv.status === 'PAID' || inv.status === 'OVERPAID')
      .reduce((sum, inv) => sum + inv.amountPaid, 0);

    const outstanding = invoices
      .filter((inv) => inv.status !== 'DRAFT')
      .reduce((sum, inv) => {
        const bal = inv.totalAmount - inv.amountPaid;
        return sum + (bal > 0 ? bal : 0);
      }, 0);

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
        amountPaid: 0,
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

export const getInvoiceById = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid invoice id' });
    }
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, items: true },
    });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invoice' });
  }
};

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

/** Apply payment rules and persist status from amountPaid vs totalAmount */
export const patchInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid invoice id' });
    }

    const inv = await prisma.invoice.findUnique({ where: { id } });
    if (!inv) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const { op } = req.body as { op?: string; amount?: number; excessAmount?: number };

    if (op === 'mark_fully_paid') {
      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          amountPaid: inv.totalAmount,
          status: 'PAID',
        },
        include: { client: true, items: true },
      });
      return res.json(updated);
    }

    if (op === 'add_payment') {
      const amount = Number(req.body.amount);
      if (!(amount > 0)) {
        return res.status(400).json({ message: 'Positive amount required' });
      }
      const newPaid = roundMoney(inv.amountPaid + amount);
      let status = inv.status;
      if (newPaid > inv.totalAmount) {
        status = 'OVERPAID';
      } else if (newPaid >= inv.totalAmount) {
        status = 'PAID';
      } else if (newPaid > 0) {
        status = 'PARTIAL';
      }
      const updated = await prisma.invoice.update({
        where: { id },
        data: { amountPaid: newPaid, status },
        include: { client: true, items: true },
      });
      return res.json(updated);
    }

    if (op === 'record_overpayment') {
      let newPaid: number;
      if (req.body.totalReceived != null && req.body.totalReceived !== '') {
        const tr = Number(req.body.totalReceived);
        if (!(tr > inv.totalAmount)) {
          return res.status(400).json({
            message: 'totalReceived must be greater than invoice total to record overpayment.',
          });
        }
        newPaid = roundMoney(tr);
      } else {
        const excess = Number(req.body.excessAmount);
        if (!(excess > 0)) {
          return res.status(400).json({
            message: 'Provide totalReceived or a positive excessAmount (credit beyond invoice total).',
          });
        }
        newPaid = roundMoney(inv.totalAmount + excess);
      }
      const updated = await prisma.invoice.update({
        where: { id },
        data: { amountPaid: newPaid, status: 'OVERPAID' },
        include: { client: true, items: true },
      });
      return res.json(updated);
    }

    return res.status(400).json({ message: 'Unknown op. Use mark_fully_paid, add_payment, or record_overpayment.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating invoice' });
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