// src/routes/apiRoutes.ts
import { Router } from 'express';
import {
  getDashboardStats,
  getClients,
  createClient,
  getInvoices,
  createInvoice,
  deleteInvoice,
  deleteClient,
} from '../controllers/apiController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Protect all these routes with the requireAuth middleware
router.use(requireAuth);

router.get('/dashboard', getDashboardStats);
router.get('/clients', getClients);
router.post('/clients', createClient);
router.delete('/clients/:id', deleteClient);

router.get('/invoices', getInvoices);
router.post('/invoices', createInvoice);
router.delete('/invoices/:id', deleteInvoice);

export default router;