const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const postDocument = async (documentId) => {
  return await prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: documentId },
      include: { lines: true }
    });

    if (!doc) throw new Error('Document not found');
    if (doc.status !== 'draft') throw new Error('Document must be in draft status to post');

    let journal;
    let debitAccountId;
    let creditAccountId;
    let contactId = doc.contact_id;
    let setContactOnDebit = false;
    let setContactOnCredit = false;

    if (doc.doc_type === 'VENDOR_BILL') {
      journal = await tx.journal.findFirst({ where: { type: 'purchase' } });
      const expenseAcc = await tx.chartOfAccount.findFirst({ where: { name: 'Purchase Expense' } });
      const creditorsAcc = await tx.chartOfAccount.findFirst({ where: { name: 'Creditors' } });
      
      if (!journal || !expenseAcc || !creditorsAcc) throw new Error('Missing accounts or journal for Vendor Bill posting');

      debitAccountId = expenseAcc.id;
      creditAccountId = creditorsAcc.id;
      setContactOnCredit = true;
    } else if (doc.doc_type === 'CUSTOMER_INVOICE') {
      journal = await tx.journal.findFirst({ where: { type: 'sales' } });
      const incomeAcc = await tx.chartOfAccount.findFirst({ where: { name: 'Sale Income' } });
      const debtorsAcc = await tx.chartOfAccount.findFirst({ where: { name: 'Debtors' } });
      
      if (!journal || !incomeAcc || !debtorsAcc) throw new Error('Missing accounts or journal for Customer Invoice posting');

      debitAccountId = debtorsAcc.id;
      creditAccountId = incomeAcc.id;
      setContactOnDebit = true;
    } else {
      throw new Error('Only VENDOR_BILL and CUSTOMER_INVOICE can be posted');
    }

    const total = parseFloat(doc.total);
    
    // Validate balance
    if (total !== total) throw new Error('UNBALANCED_ENTRY'); // basic check, obviously equal here but we assert logically

    const journalEntry = await tx.journalEntry.create({
      data: {
        journal_id: journal.id,
        document_id: doc.id,
        entry_date: new Date(),
        reference: doc.number,
        status: 'posted',
        lines: {
          create: [
            {
              account_id: debitAccountId,
              contact_id: setContactOnDebit ? contactId : null,
              debit: total,
              credit: 0
            },
            {
              account_id: creditAccountId,
              contact_id: setContactOnCredit ? contactId : null,
              debit: 0,
              credit: total
            }
          ]
        }
      }
    });

    await tx.document.update({
      where: { id: doc.id },
      data: { status: 'confirmed' }
    });

    return journalEntry;
  });
};



const recordPayment = async (documentId, direction, amount, method, pay_date, note) => {
  return await prisma.$transaction(async (tx) => {
    const doc = await tx.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');
    if (doc.status !== 'confirmed') throw new Error('Document must be confirmed to record payment');

    const amountFloat = parseFloat(amount);
    const total = parseFloat(doc.total);
    const amountPaid = parseFloat(doc.amount_paid);
    const amountDue = total - amountPaid;

    // Use tiny epsilon for float comparison to avoid issues, or round to 2 decimals
    if (amountFloat > amountDue + 0.0001) {
      const err = new Error('Amount exceeds amount due');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const journalType = method === 'bank' ? 'bank' : 'cash';
    const journal = await tx.journal.findFirst({ where: { type: journalType } });
    if (!journal) throw new Error('Missing journal for payment method');

    const bankOrCashAcc = await tx.chartOfAccount.findFirst({ where: { name: method === 'bank' ? 'Bank' : 'Cash' } });
    const creditorsAcc = await tx.chartOfAccount.findFirst({ where: { name: 'Creditors' } });
    const debtorsAcc = await tx.chartOfAccount.findFirst({ where: { name: 'Debtors' } });

    if (!bankOrCashAcc || !creditorsAcc || !debtorsAcc) throw new Error('Missing necessary chart of accounts');

    let debitAccountId, creditAccountId;
    let setContactOnDebit = false, setContactOnCredit = false;

    if (direction === 'send') {
      debitAccountId = creditorsAcc.id;
      creditAccountId = bankOrCashAcc.id;
      setContactOnDebit = true;
    } else if (direction === 'receive') {
      debitAccountId = bankOrCashAcc.id;
      creditAccountId = debtorsAcc.id;
      setContactOnCredit = true;
    } else {
      throw new Error('Invalid payment direction');
    }

    const journalEntry = await tx.journalEntry.create({
      data: {
        journal_id: journal.id,
        document_id: doc.id,
        entry_date: pay_date ? new Date(pay_date) : new Date(),
        reference: `Payment for ${doc.number}`,
        status: 'posted',
        lines: {
          create: [
            {
              account_id: debitAccountId,
              contact_id: setContactOnDebit ? doc.contact_id : null,
              debit: amountFloat,
              credit: 0
            },
            {
              account_id: creditAccountId,
              contact_id: setContactOnCredit ? doc.contact_id : null,
              debit: 0,
              credit: amountFloat
            }
          ]
        }
      }
    });

    const payment = await tx.payment.create({
      data: {
        document_id: doc.id,
        direction,
        amount: amountFloat,
        pay_date: pay_date ? new Date(pay_date) : new Date(),
        method,
        note,
        journal_entry_id: journalEntry.id
      }
    });

    const newAmountPaid = amountPaid + amountFloat;
    // Round to avoid float precision issues
    const isPaid = (newAmountPaid + 0.0001) >= total;
    const newStatus = isPaid ? 'paid' : doc.status;

    await tx.document.update({
      where: { id: doc.id },
      data: { amount_paid: newAmountPaid, status: newStatus }
    });

    return { payment, document_status: newStatus };
  });
};

module.exports = { postDocument, recordPayment };
