import { Bill, Customer } from '../types';

export interface BillPrintData {
  bill: Bill;
  shopInfo: ShopInfo;
  printDate: string;
}

export interface ShopInfo {
  name: string;
  address: string;
  phone: string;
  email?: string;
  gst?: string;
  logo?: string;
}

export interface PrintOptions {
  format: 'pdf' | 'html';
  includeShopLogo: boolean;
  includePaymentHistory: boolean;
  includeReceivedItems: boolean;
  paperSize: 'A4' | 'A5' | 'thermal';
}

export class BillPrintService {
  private static defaultShopInfo: ShopInfo = {
    name: 'Mahaa Tailors',
    address: '123 Fashion Street, Textile District, City - 123456',
    phone: '+91 98765 43210',
    email: 'info@mahaatailors.com',
    gst: 'GST123456789',
  };

  static generateBillHTML(
    billData: BillPrintData,
    options: PrintOptions = {
      format: 'html',
      includeShopLogo: true,
      includePaymentHistory: true,
      includeReceivedItems: true,
      paperSize: 'A4',
    }
  ): string {
    const { bill, shopInfo, printDate } = billData;
    const customer = bill.customer;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bill - ${bill.billNumber}</title>
    <style>
        ${this.getCSS(options.paperSize)}
    </style>
</head>
<body>
    <div class="bill-container">
        ${this.generateHeader(shopInfo, options.includeShopLogo)}
        ${this.generateBillInfo(bill)}
        ${this.generateCustomerInfo(customer)}
        ${this.generateItemsTable(bill)}
        ${options.includeReceivedItems ? this.generateReceivedItemsTable(bill) : ''}
        ${this.generateAmountSummary(bill)}
        ${options.includePaymentHistory ? this.generatePaymentHistory(bill) : ''}
        ${this.generateFooter(shopInfo, printDate)}
    </div>
</body>
</html>`;
  }

  private static getCSS(paperSize: string): string {
    const baseStyles = `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
        }
        
        .bill-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        
        .shop-name {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .shop-details {
            font-size: 11px;
            color: #666;
            line-height: 1.3;
        }
        
        .bill-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        
        .bill-info-left, .bill-info-right {
            flex: 1;
        }
        
        .bill-number {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .customer-info {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background: #fafafa;
        }
        
        .customer-name {
            font-size: 16px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .customer-details {
            font-size: 11px;
            color: #666;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .table th,
        .table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        .table th {
            background: #f8f9fa;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .table .text-right {
            text-align: right;
        }
        
        .table .text-center {
            text-align: center;
        }
        
        .amount-summary {
            margin-bottom: 20px;
            padding: 15px;
            border: 2px solid #2c3e50;
            border-radius: 5px;
            background: #f8f9fa;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 13px;
        }
        
        .summary-row.total {
            font-size: 16px;
            font-weight: bold;
            color: #2c3e50;
            border-top: 1px solid #ddd;
            padding-top: 8px;
            margin-top: 8px;
        }
        
        .summary-row.outstanding {
            font-size: 15px;
            font-weight: bold;
            color: #e74c3c;
        }
        
        .payment-history {
            margin-bottom: 20px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-unpaid {
            background: #ffebee;
            color: #c62828;
        }
        
        .status-partially-paid {
            background: #fff3e0;
            color: #ef6c00;
        }
        
        .status-fully-paid {
            background: #e8f5e8;
            color: #2e7d32;
        }
        
        .footer {
            text-align: center;
            border-top: 1px solid #ddd;
            padding-top: 15px;
            margin-top: 30px;
            font-size: 10px;
            color: #666;
        }
        
        .print-date {
            margin-top: 10px;
            font-style: italic;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            
            .bill-container {
                max-width: none;
                margin: 0;
                padding: 15px;
            }
            
            .no-print {
                display: none !important;
            }
        }
    `;

    const paperSpecificStyles = {
      A4: `
        @page {
            size: A4;
            margin: 1cm;
        }
      `,
      A5: `
        @page {
            size: A5;
            margin: 0.5cm;
        }
        .bill-container {
            font-size: 11px;
        }
      `,
      thermal: `
        @page {
            size: 80mm auto;
            margin: 2mm;
        }
        .bill-container {
            max-width: 76mm;
            font-size: 10px;
            padding: 5px;
        }
        .shop-name {
            font-size: 16px;
        }
        .bill-number {
            font-size: 14px;
        }
      `,
    };

    return baseStyles + (paperSpecificStyles[paperSize as keyof typeof paperSpecificStyles] || '');
  }

  private static generateHeader(shopInfo: ShopInfo, includeLogo: boolean): string {
    return `
        <div class="header">
            ${includeLogo && shopInfo.logo ? `<img src="${shopInfo.logo}" alt="Shop Logo" style="max-height: 60px; margin-bottom: 10px;">` : ''}
            <div class="shop-name">${shopInfo.name}</div>
            <div class="shop-details">
                ${shopInfo.address}<br>
                Phone: ${shopInfo.phone}
                ${shopInfo.email ? ` | Email: ${shopInfo.email}` : ''}
                ${shopInfo.gst ? `<br>GST: ${shopInfo.gst}` : ''}
            </div>
        </div>
    `;
  }

  private static generateBillInfo(bill: Bill): string {
    const statusClass = `status-${bill.status.replace('_', '-')}`;
    
    return `
        <div class="bill-info">
            <div class="bill-info-left">
                <div class="bill-number">Bill #${bill.billNumber}</div>
                <div>Status: <span class="status-badge ${statusClass}">${this.getStatusLabel(bill.status)}</span></div>
            </div>
            <div class="bill-info-right" style="text-align: right;">
                <div><strong>Billing Date:</strong> ${this.formatDate(bill.billingDate)}</div>
                <div><strong>Delivery Date:</strong> ${this.formatDate(bill.deliveryDate)}</div>
            </div>
        </div>
    `;
  }

  private static generateCustomerInfo(customer: Customer | undefined): string {
    if (!customer || !customer.personalDetails) {
      return `
        <div class="customer-info">
            <div class="customer-name">Customer information not available</div>
            <div class="customer-details">
                Please contact support if you need customer details for this bill.
            </div>
        </div>
      `;
    }

    return `
        <div class="customer-info">
            <div class="customer-name">${customer.personalDetails.name}</div>
            <div class="customer-details">
                Phone: ${customer.personalDetails.phone}
                ${customer.personalDetails.email ? ` | Email: ${customer.personalDetails.email}` : ''}
                ${customer.personalDetails.address ? `<br>Address: ${customer.personalDetails.address}` : ''}
            </div>
        </div>
    `;
  }

  private static generateItemsTable(bill: Bill): string {
    if (bill.items.length === 0) {
      return '<div class="section-title">No billing items</div>';
    }

    const itemsRows = bill.items.map((item, index) => `
        <tr>
            <td class="text-center">${index + 1}</td>
            <td>
                <strong>${item.name}</strong>
                ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}
            </td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-right">₹${item.unitPrice.toFixed(2)}</td>
            <td class="text-right"><strong>₹${(item.quantity * item.unitPrice).toFixed(2)}</strong></td>
        </tr>
    `).join('');

    return `
        <div class="section-title">Billing Items</div>
        <table class="table">
            <thead>
                <tr>
                    <th class="text-center" style="width: 40px;">#</th>
                    <th>Item Description</th>
                    <th class="text-center" style="width: 60px;">Qty</th>
                    <th class="text-right" style="width: 80px;">Rate</th>
                    <th class="text-right" style="width: 100px;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${itemsRows}
            </tbody>
        </table>
    `;
  }

  private static generateReceivedItemsTable(bill: Bill): string {
    if (bill.receivedItems.length === 0) {
      return '';
    }

    const itemsRows = bill.receivedItems.map((item, index) => `
        <tr>
            <td class="text-center">${index + 1}</td>
            <td>
                <strong>${item.name}</strong>
                ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}
            </td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-center">${this.formatDate(item.receivedDate)}</td>
            <td class="text-center">
                <span class="status-badge ${item.status === 'returned' ? 'status-unpaid' : 'status-fully-paid'}">
                    ${item.status === 'returned' ? 'Returned' : 'With Us'}
                </span>
                ${item.returnedDate ? `<br><small>Returned: ${this.formatDate(item.returnedDate)}</small>` : ''}
            </td>
        </tr>
    `).join('');

    return `
        <div class="section-title">Items Received from Customer</div>
        <table class="table">
            <thead>
                <tr>
                    <th class="text-center" style="width: 40px;">#</th>
                    <th>Item Description</th>
                    <th class="text-center" style="width: 60px;">Qty</th>
                    <th class="text-center" style="width: 100px;">Received Date</th>
                    <th class="text-center" style="width: 100px;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${itemsRows}
            </tbody>
        </table>
    `;
  }

  private static generateAmountSummary(bill: Bill): string {
    return `
        <div class="amount-summary">
            <div class="summary-row">
                <span>Subtotal:</span>
                <span>₹${bill.totalAmount.toFixed(2)}</span>
            </div>
            <div class="summary-row total">
                <span>Total Amount:</span>
                <span>₹${bill.totalAmount.toFixed(2)}</span>
            </div>
            <div class="summary-row">
                <span>Paid Amount:</span>
                <span style="color: #27ae60;">₹${bill.paidAmount.toFixed(2)}</span>
            </div>
            <div class="summary-row outstanding">
                <span>Outstanding Balance:</span>
                <span>₹${bill.outstandingAmount.toFixed(2)}</span>
            </div>
        </div>
    `;
  }

  private static generatePaymentHistory(bill: Bill): string {
    if (bill.payments.length === 0) {
      return `
        <div class="payment-history">
            <div class="section-title">Payment History</div>
            <p style="color: #666; font-style: italic;">No payments recorded yet.</p>
        </div>
      `;
    }

    const paymentRows = bill.payments
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      .map((payment, index) => `
        <tr>
            <td class="text-center">${index + 1}</td>
            <td class="text-center">${this.formatDate(payment.paymentDate)}</td>
            <td class="text-right"><strong>₹${payment.amount.toFixed(2)}</strong></td>
            <td class="text-center">${this.getPaymentMethodLabel(payment.paymentMethod)}</td>
            <td>${payment.notes || '-'}</td>
        </tr>
      `).join('');

    return `
        <div class="payment-history">
            <div class="section-title">Payment History</div>
            <table class="table">
                <thead>
                    <tr>
                        <th class="text-center" style="width: 40px;">#</th>
                        <th class="text-center" style="width: 100px;">Date</th>
                        <th class="text-right" style="width: 100px;">Amount</th>
                        <th class="text-center" style="width: 80px;">Method</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${paymentRows}
                </tbody>
            </table>
        </div>
    `;
  }

  private static generateFooter(shopInfo: ShopInfo, printDate: string): string {
    return `
        <div class="footer">
            <div>Thank you for choosing ${shopInfo.name}!</div>
            <div>For any queries, please contact us at ${shopInfo.phone}</div>
            <div class="print-date">Printed on: ${printDate}</div>
        </div>
    `;
  }

  private static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private static getStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      'draft': 'Draft',
      'unpaid': 'Unpaid',
      'partially_paid': 'Partially Paid',
      'fully_paid': 'Fully Paid',
      'cancelled': 'Cancelled',
    };
    return statusLabels[status] || status;
  }

  private static getPaymentMethodLabel(method: string): string {
    const methodLabels: Record<string, string> = {
      'cash': 'Cash',
      'card': 'Card',
      'upi': 'UPI',
      'bank_transfer': 'Bank Transfer',
      'other': 'Other',
    };
    return methodLabels[method] || method;
  }

  static async generatePDF(billData: BillPrintData, options?: PrintOptions): Promise<string> {
    // This would integrate with a PDF generation library like react-native-html-to-pdf
    // For now, we'll return the HTML content that can be converted to PDF
    const htmlContent = this.generateBillHTML(billData, options);
    
    // In a real implementation, you would use a library like:
    // import RNHTMLtoPDF from 'react-native-html-to-pdf';
    // const pdf = await RNHTMLtoPDF.convert({
    //   html: htmlContent,
    //   fileName: `bill-${billData.bill.billNumber}`,
    //   directory: 'Documents',
    // });
    // return pdf.filePath;
    
    return htmlContent;
  }

  static getDefaultShopInfo(): ShopInfo {
    return { ...this.defaultShopInfo };
  }

  static updateShopInfo(newShopInfo: Partial<ShopInfo>): void {
    this.defaultShopInfo = { ...this.defaultShopInfo, ...newShopInfo };
  }
}