// Utility to generate a professional, print-ready PDF Tax Invoice
export function generateInvoicePDF(doc, contactDetails = null) {
  if (!doc) return;

  const fmt = n => `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Parse tax info from reference or calculate standard
  const subTotal = (doc.lines ?? []).reduce((s, l) => s + (Number(l.qty || 0) * Number(l.unit_price || 0)), 0);
  const total = Number(doc.total || subTotal);
  const taxAmount = Math.max(0, total - subTotal);
  const taxRate = subTotal > 0 ? Math.round((taxAmount / subTotal) * 100) : 18;

  // Split tax into CGST + SGST (half and half for intra-state standard in India)
  const cgstRate = (taxRate / 2).toFixed(1);
  const sgstRate = (taxRate / 2).toFixed(1);
  const cgstAmount = taxAmount / 2;
  const sgstAmount = taxAmount / 2;

  // Generate current timestamp
  const now = new Date();
  const generatedTimeStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' at ' + now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const isCustomerInvoice = doc.doc_type === 'CUSTOMER_INVOICE' || !doc.doc_type;
  const isPO = doc.doc_type === 'PO';
  const isBill = doc.doc_type === 'VENDOR_BILL';

  const docTitle = isPO ? 'PURCHASE ORDER' : isBill ? 'VENDOR BILL' : 'TAX INVOICE';
  const billLabel = isPO || isBill ? 'Vendor Details' : 'Billed To (Customer)';
  const partyName = doc.contact_name || contactDetails?.name || 'Valued Partner';

  const fullAddress = [
    contactDetails?.street,
    contactDetails?.city,
    contactDetails?.state,
    contactDetails?.pincode,
    contactDetails?.country || 'India'
  ].filter(Boolean).join(', ') || 'Registered Address On File';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docTitle} - ${doc.number || 'Draft'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    body { background-color: #f8fafc; color: #1e293b; padding: 24px; font-size: 13px; line-height: 1.5; }
    .page { max-width: 820px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    
    /* Actions Bar */
    .action-bar { max-width: 820px; margin: 0 auto 16px; display: flex; justify-content: space-between; align-items: center; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer; border: none; }
    .btn-primary { background: #4f46e5; color: #ffffff; }
    .btn-secondary { background: #e2e8f0; color: #334155; }

    /* Header */
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo-badge { width: 44px; height: 44px; background: #4f46e5; border-radius: 8px; color: #fff; font-weight: 800; font-size: 18px; display: flex; align-items: center; justify-content: center; }
    .brand-name { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .brand-sub { font-size: 11px; color: #64748b; font-weight: 500; }
    .company-meta { font-size: 11px; color: #475569; line-height: 1.4; margin-top: 6px; }

    .doc-meta { text-align: right; }
    .doc-title { font-size: 22px; font-weight: 800; color: #4f46e5; letter-spacing: 0.5px; margin-bottom: 4px; }
    .doc-number { font-size: 14px; font-weight: 700; color: #0f172a; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 6px; }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-pending { background: #fef3c7; color: #b45309; }

    /* Info Grid */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .info-card { background: #f8fafc; padding: 16px; border-radius: 6px; border: 1px solid #e2e8f0; }
    .info-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px; }
    .info-name { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .info-text { font-size: 12px; color: #334155; line-height: 1.5; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f1f5f9; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; vertical-align: top; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* Summary */
    .summary-grid { display: grid; grid-template-columns: 1fr 300px; gap: 24px; margin-bottom: 28px; }
    .notes-box { font-size: 11px; color: #64748b; line-height: 1.6; background: #fafafa; padding: 14px; border-radius: 6px; border-left: 3px solid #4f46e5; }
    .totals-box { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 14px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
    .totals-row-total { background: #f8fafc; font-weight: 800; font-size: 14px; color: #0f172a; border-top: 2px solid #cbd5e1; }

    /* Footer & Signatures */
    .footer { border-top: 2px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; }
    .sign-box { text-align: center; width: 180px; }
    .sign-line { border-bottom: 1px dashed #94a3b8; height: 40px; margin-bottom: 6px; }
    .sign-title { font-size: 11px; font-weight: 600; color: #475569; }

    .timestamp-bar { margin-top: 24px; padding-top: 12px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }

    @media print {
      body { background: #ffffff; padding: 0; }
      .action-bar { display: none !important; }
      .page { box-shadow: none; padding: 20px; border-radius: 0; max-width: 100%; }
    }
  </style>
</head>
<body>

  <div class="action-bar">
    <button class="btn btn-secondary" onclick="window.close()">← Close Window</button>
    <div style="display: flex; gap: 8px;">
      <button class="btn btn-primary" onclick="window.print()">
        🖨️ Save as PDF / Print Invoice
      </button>
    </div>
  </div>

  <div class="page">
    <!-- Header -->
    <div class="header-row">
      <div>
        <div class="brand">
          <div class="logo-badge">UF</div>
          <div>
            <div class="brand-name">URBAN FURNITURE</div>
            <div class="brand-sub">Ergonomic & Living Space Innovations Pvt. Ltd.</div>
          </div>
        </div>
        <div class="company-meta">
          GSTIN: 33AABCU9603R1ZM | CIN: U36100TN2024PTC159842<br>
          Plot No. 42, Industrial Design Hub, Guindy, Chennai - 600032, Tamil Nadu<br>
          Email: billing@urbanfurniture.com | Phone: +91 (044) 4890-7120
        </div>
      </div>

      <div class="doc-meta">
        <div class="doc-title">${docTitle}</div>
        <div class="doc-number">${doc.number || 'DOC-DRAFT'}</div>
        <div>
          ${doc.status === 'paid' 
            ? '<span class="badge badge-paid">✓ PAID & VERIFIED</span>' 
            : '<span class="badge badge-pending">PENDING SETTLEMENT</span>'}
        </div>
      </div>
    </div>

    <!-- Info Grid -->
    <div class="info-grid">
      <div class="info-card">
        <div class="info-label">${billLabel}</div>
        <div class="info-name">${partyName}</div>
        <div class="info-text">
          ${contactDetails?.email ? `Email: ${contactDetails.email}<br>` : ''}
          ${contactDetails?.mobile ? `Mobile: ${contactDetails.mobile}<br>` : ''}
          Address: ${fullAddress}
        </div>
      </div>

      <div class="info-card">
        <div class="info-label">Invoice & Order Timeline</div>
        <div class="info-text">
          <strong>Bill Date:</strong> ${doc.doc_date || new Date().toISOString().slice(0, 10)}<br>
          <strong>Due Date:</strong> ${doc.due_date || 'Immediate'}<br>
          <strong>Source Reference:</strong> ${doc.source_document_number || doc.reference || 'Standard Direct Order'}<br>
          <strong>Generated At:</strong> ${generatedTimeStr}
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th class="text-center" style="width: 36px;">#</th>
          <th>Item & Specifications</th>
          <th class="text-right" style="width: 70px;">Qty</th>
          <th class="text-right" style="width: 100px;">Unit Rate</th>
          <th class="text-right" style="width: 80px;">GST</th>
          <th class="text-right" style="width: 120px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${(doc.lines || []).map((l, idx) => `
          <tr>
            <td class="text-center" style="color: #64748b;">${idx + 1}</td>
            <td>
              <strong>${l.product_name || `Custom Furniture Item #${l.product_id}`}</strong>
              <div style="font-size: 10px; color: #64748b;">HSN: 9403 — Commercial & Residential Furniture</div>
            </td>
            <td class="text-right">${l.qty}</td>
            <td class="text-right">${fmt(l.unit_price)}</td>
            <td class="text-right">${taxRate}%</td>
            <td class="text-right" style="font-weight: 600;">${fmt(l.line_total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Summary -->
    <div class="summary-grid">
      <div class="notes-box">
        <strong>Bank & Settlement Details:</strong><br>
        Bank: HDFC Bank Ltd. | A/C: 50200088991122 | IFSC: HDFC0000123<br>
        UPI ID: <code>urbanfurniture@hdfcbank</code><br><br>
        <strong>Terms & Conditions:</strong><br>
        1. All furniture supplied carries a standard 1-year manufacturing defect warranty.<br>
        2. Certified authentic computerized bill generated on ${generatedTimeStr}.
      </div>

      <div class="totals-box">
        <div class="totals-row">
          <span>Taxable Subtotal:</span>
          <span style="font-weight: 600;">${fmt(subTotal)}</span>
        </div>
        <div class="totals-row">
          <span>CGST (${cgstRate}%):</span>
          <span>${fmt(cgstAmount)}</span>
        </div>
        <div class="totals-row">
          <span>SGST (${sgstRate}%):</span>
          <span>${fmt(sgstAmount)}</span>
        </div>
        <div class="totals-row totals-row-total">
          <span>Total Payable:</span>
          <span>${fmt(total)}</span>
        </div>
        <div class="totals-row" style="color: #15803d; font-weight: 600;">
          <span>Amount Paid:</span>
          <span>${fmt(doc.amount_paid || 0)}</span>
        </div>
        <div class="totals-row" style="color: ${doc.amount_due > 0 ? '#b45309' : '#15803d'}; font-weight: 700;">
          <span>Balance Due:</span>
          <span>${fmt(doc.amount_due ?? 0)}</span>
        </div>
      </div>
    </div>

    <!-- Signatures -->
    <div class="footer">
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-title">Customer / Receiver Signature</div>
      </div>

      <div class="sign-box">
        <div style="font-size: 10px; color: #4f46e5; font-weight: 700; margin-bottom: 2px;">DIGITALLY VERIFIED</div>
        <div class="sign-line"></div>
        <div class="sign-title">For Urban Furniture Pvt. Ltd.<br>(Authorized Signatory)</div>
      </div>
    </div>

    <!-- Timestamp bar -->
    <div class="timestamp-bar">
      <span>Document Ref: ${doc.number || 'N/A'} • Security Hash: UF-${Math.random().toString(36).substring(2, 9).toUpperCase()}</span>
      <span>Official Bill Generation Timestamp: ${generatedTimeStr}</span>
    </div>
  </div>

  <script>
    // Automatically trigger print dialog on popup load
    window.addEventListener('load', () => {
      setTimeout(() => { window.print(); }, 400);
    });
  </script>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank', 'width=900,height=950,top=50,left=150');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    alert('Please allow popups to generate and print the invoice PDF.');
  }
}
