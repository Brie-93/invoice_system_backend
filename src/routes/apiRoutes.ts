// src/routes/apiRoutes.ts
import { Router } from 'express';
import {
  getDashboardStats,
  getRecordsHistory,
  getClients,
  createClient,
  getInvoices,
  getInvoiceById,
  createInvoice,
  patchInvoice,
  deleteInvoice,
  deleteClient,
} from '../controllers/apiController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Protect all these routes with the requireAuth middleware
router.use(requireAuth);

router.get('/dashboard', getDashboardStats);
router.get('/records', getRecordsHistory);
router.get('/clients', getClients);
router.post('/clients', createClient);
router.delete('/clients/:id', deleteClient);

router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices', createInvoice);
router.patch('/invoices/:id', patchInvoice);
router.delete('/invoices/:id', deleteInvoice);

export default router;