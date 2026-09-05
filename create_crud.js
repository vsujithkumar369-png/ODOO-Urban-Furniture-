const fs = require('fs');
const path = require('path');

const resources = [
  { name: 'contacts', model: 'contact' },
  { name: 'products', model: 'product' },
  { name: 'coa', model: 'chartOfAccount' },
  { name: 'journals', model: 'journal' },
  { name: 'analytics', model: 'analyticAccount' },
  { name: 'budgets', model: 'budget' }
];

const backendDir = path.join(__dirname, 'backend', 'src');

resources.forEach(r => {
  const isContacts = r.name === 'contacts';
  const isBudgets = r.name === 'budgets';
  
  // CONTROLLER
  let controllerContent = `const { PrismaClient } = require('@prisma/client');
const { errorResponse } = require('../utils/errors');
const prisma = new PrismaClient();

const getAll = async (req, res, next) => {
  try {
    const filter = {};`;
  
  if (isContacts) {
    controllerContent += `\n    if (req.query.type) { filter.type = req.query.type; }`;
  }
  
  controllerContent += `\n    const data = await prisma.${r.model}.findMany({ where: filter });
    res.status(200).json(data);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    const data = await prisma.${r.model}.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!data) return errorResponse(res, 404, 'NOT_FOUND', '${r.name} not found');
    res.status(200).json(data);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const data = await prisma.${r.model}.create({ data: req.body });
    res.status(201).json(data);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const data = await prisma.${r.model}.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.status(200).json(data);
  } catch (error) { next(error); }
};
`;

  if (isBudgets) {
    controllerContent += `
const confirm = async (req, res, next) => {
  try {
    const data = await prisma.budget.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'confirmed' }
    });
    res.status(200).json(data);
  } catch (error) { next(error); }
};

const revise = async (req, res, next) => {
  try {
    const data = await prisma.budget.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'revised' }
    });
    res.status(200).json(data);
  } catch (error) { next(error); }
};
`;
  }

  const exportsArr = ['getAll', 'getById', 'create', 'update'];
  if (isBudgets) {
    exportsArr.push('confirm', 'revise');
  }

  controllerContent += `\nmodule.exports = { ${exportsArr.join(', ')} };\n`;

  fs.writeFileSync(path.join(backendDir, 'controllers', `${r.name}.controller.js`), controllerContent);

  // ROUTE
  let routeContent = `const express = require('express');
const { getAll, getById, create, update${isBudgets ? ', confirm, revise' : ''} } = require('../controllers/${r.name}.controller');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
`;

  if (isBudgets) {
    routeContent += `\nrouter.post('/:id/confirm', confirm);
router.post('/:id/revise', revise);\n`;
  }

  routeContent += `\nmodule.exports = router;\n`;

  fs.writeFileSync(path.join(backendDir, 'routes', `${r.name}.routes.js`), routeContent);
});

// Update index.js
let indexContent = fs.readFileSync(path.join(backendDir, 'index.js'), 'utf-8');
const indexReplacements = [
  { match: "// app.use('/api/contacts', contactsRoutes);", replace: "const contactsRoutes = require('./routes/contacts.routes');\napp.use('/api/contacts', contactsRoutes);" },
  { match: "// app.use('/api/products', productsRoutes);", replace: "const productsRoutes = require('./routes/products.routes');\napp.use('/api/products', productsRoutes);" },
  { match: "// app.use('/api/coa', coaRoutes);", replace: "const coaRoutes = require('./routes/coa.routes');\napp.use('/api/coa', coaRoutes);" },
  { match: "// app.use('/api/journals', journalsRoutes);", replace: "const journalsRoutes = require('./routes/journals.routes');\napp.use('/api/journals', journalsRoutes);" },
  { match: "// app.use('/api/analytics', analyticsRoutes);", replace: "const analyticsRoutes = require('./routes/analytics.routes');\napp.use('/api/analytics', analyticsRoutes);" },
  { match: "// app.use('/api/budgets', budgetsRoutes);", replace: "const budgetsRoutes = require('./routes/budgets.routes');\napp.use('/api/budgets', budgetsRoutes);" }
];

indexReplacements.forEach(r => {
  indexContent = indexContent.replace(r.match, r.replace);
});

fs.writeFileSync(path.join(backendDir, 'index.js'), indexContent);
console.log('CRUD generated successfully.');
