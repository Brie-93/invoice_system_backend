"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/apiRoutes.ts
const express_1 = require("express");
const apiController_1 = require("../controllers/apiController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Protect all these routes with the requireAuth middleware
router.use(auth_1.requireAuth);
router.get('/dashboard', apiController_1.getDashboardStats);
router.get('/records', apiController_1.getRecordsHistory);
router.get('/clients', apiController_1.getClients);
router.post('/clients', apiController_1.createClient);
router.delete('/clients/:id', apiController_1.deleteClient);
router.get('/invoices', apiController_1.getInvoices);
router.get('/invoices/:id', apiController_1.getInvoiceById);
router.post('/invoices', apiController_1.createInvoice);
router.patch('/invoices/:id', apiController_1.patchInvoice);
router.delete('/invoices/:id', apiController_1.deleteInvoice);
exports.default = router;
