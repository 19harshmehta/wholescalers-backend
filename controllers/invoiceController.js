const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const PDFDocument = require('pdfkit'); // ADDED: PDFKit for PDF generation

exports.createForOrder = async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  // Authorization check
  if (order.wholesaler.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
  }
  const invoiceNumber = 'INV-' + Date.now();
  const invoice = await Invoice.create({
    order: order._id,
    invoiceNumber,
    amount: order.total,
    issuedTo: order.retailer,
    issuedBy: order.wholesaler
  });
  res.status(201).json(invoice);
};

exports.get = async (req, res) => {
  const inv = await Invoice.findById(req.params.id).populate('order');
  if (!inv) return res.status(404).json({ error: 'Not found' });
  // Authorization check
  if (inv.issuedTo.toString() !== req.user._id.toString() && inv.issuedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(inv);
};

exports.listForRetailer = async (req, res) => {
  const inv = await Invoice.find({ issuedTo: req.user._id }).populate('order');
  res.json({ count: inv.length, invoices: inv });
};

exports.listForWholesaler = async (req, res) => {
    const inv = await Invoice.find({ issuedBy: req.user._id }).populate('order');
    res.json({ count: inv.length, invoices: inv });
};

// ADDED: New function to generate and download PDF invoice
exports.downloadPdf = async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id)
      .populate('order')
      .populate('issuedTo', 'name company email')
      .populate('issuedBy', 'name company email');

    if (!inv) return res.status(404).json({ error: 'Not found' });

    // Authorization check
    if (inv.issuedTo._id.toString() !== req.user._id.toString() && inv.issuedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Populate order items' product details
    await inv.order.populate('items.product', 'name');

    const doc = new PDFDocument({ margin: 50 });

    const fileName = `Invoice-${inv.invoiceNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // --- PDF Content ---

    // Header
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();

    // Wholesaler (IssuedBy) Info
    doc.fontSize(12).text(`From:`, { continued: true }).font('Helvetica-Bold').text(` ${inv.issuedBy.company || inv.issuedBy.name}`);
    doc.font('Helvetica').text(inv.issuedBy.email);
    
    // Retailer (IssuedTo) Info
    doc.text(`To:`, { continued: true, x: 300 }).font('Helvetica-Bold').text(` ${inv.issuedTo.company || inv.issuedTo.name}`);
    doc.font('Helvetica').text(inv.issuedTo.email, { x: 300 });

    doc.moveDown(2);

    // Invoice Details
    doc.font('Helvetica-Bold').text(`Invoice Number:`, { continued: true }).font('Helvetica').text(` ${inv.invoiceNumber}`);
    doc.font('Helvetica-Bold').text(`Order ID:`, { continued: true }).font('Helvetica').text(` ${inv.order._id}`);
    doc.font('Helvetica-Bold').text(`Date Issued:`, { continued: true }).font('Helvetica').text(` ${inv.createdAt.toDateString()}`);
    doc.font('Helvetica-Bold').text(`Status:`, { continued: true }).font('Helvetica').text(` ${inv.status.toUpperCase()}`);
    
    doc.moveDown(2);
    
    // Table Header
    doc.font('Helvetica-Bold');
    doc.text('Item', 50, doc.y);
    doc.text('Quantity', 280, doc.y, { width: 100, align: 'right' });
    doc.text('Price', 380, doc.y, { width: 100, align: 'right' });
    doc.text('Total', 480, doc.y, { width: 100, align: 'right' });
    doc.moveDown();
    doc.font('Helvetica');
    
    // Table Rows (Order Items)
    let y = doc.y;
    for (const item of inv.order.items) {
      doc.text(item.product.name, 50, y);
      doc.text(item.quantity, 280, y, { width: 100, align: 'right' });
      doc.text(`Rs ${item.price.toFixed(2)}`, 380, y, { width: 100, align: 'right' });
      doc.text(`Rs ${(item.price * item.quantity).toFixed(2)}`, 480, y, { width: 100, align: 'right' });
      y += 20; // Move to next line
    }
    doc.y = y; // Update doc's y position

    doc.moveDown(2);

    // Total
    doc.font('Helvetica-Bold').fontSize(14);
    doc.text(`Total Amount: Rs  ${inv.amount.toFixed(2)}`, { align: 'right' });

    // --- End PDF Content ---
    doc.end();

  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ error: 'Failed to generate PDF invoice' });
  }
};