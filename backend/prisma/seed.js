const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create Chart of Accounts
  console.log('Seeding Chart of Accounts...');
  const cashAcc = await prisma.chartOfAccount.create({ data: { name: 'Cash', type: 'asset' } });
  const bankAcc = await prisma.chartOfAccount.create({ data: { name: 'Bank', type: 'asset' } });
  const debtorsAcc = await prisma.chartOfAccount.create({ data: { name: 'Debtors', type: 'asset' } });
  const creditorsAcc = await prisma.chartOfAccount.create({ data: { name: 'Creditors', type: 'liability' } });
  const saleIncomeAcc = await prisma.chartOfAccount.create({ data: { name: 'Sale Income', type: 'income' } });
  const purchaseExpenseAcc = await prisma.chartOfAccount.create({ data: { name: 'Purchase Expense', type: 'expense' } });
  const capitalAcc = await prisma.chartOfAccount.create({ data: { name: 'Capital', type: 'capital' } });

  // Create Journals
  console.log('Seeding Journals...');
  await prisma.journal.create({ data: { name: 'Sales', type: 'sales', default_account_id: saleIncomeAcc.id } });
  await prisma.journal.create({ data: { name: 'Purchase', type: 'purchase', default_account_id: purchaseExpenseAcc.id } });
  await prisma.journal.create({ data: { name: 'Bank', type: 'bank', default_account_id: bankAcc.id } });
  await prisma.journal.create({ data: { name: 'Cash', type: 'cash', default_account_id: cashAcc.id } });

  // Create Contacts
  console.log('Seeding Contacts...');
  await prisma.contact.create({
    data: { name: 'Rahul Sharma', type: 'vendor', email: 'rahul@example.com', mobile: '9999999999', city: 'Delhi', state: 'Delhi', pincode: '110001' }
  });
  await prisma.contact.create({
    data: { name: 'Nimesh Pathak', type: 'customer', email: 'nimesh@example.com', mobile: '8888888888', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' }
  });

  // Create Products
  console.log('Seeding Products...');
  await prisma.product.create({
    data: { name: 'Office Chair', type: 'goods', sales_price: 3000, cost: 2000, category: 'Furniture' }
  });
  await prisma.product.create({
    data: { name: 'Wooden Table', type: 'goods', sales_price: 8000, cost: 5000, category: 'Furniture' }
  });

  // Create User
  console.log('Seeding Admin User...');
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  await prisma.user.create({
    data: {
      name: 'Admin',
      login_id: 'admin',
      email: 'admin@example.com',
      password_hash: passwordHash,
      role: 'admin'
    }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
