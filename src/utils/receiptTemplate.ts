// @ts-nocheck
import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import numeral from "numeral";
import dayjs from "dayjs";

// Puedes ajustar estos tipos según tus interfaces reales
type SaleDetail = {
  quantity: number;
  price: number;
  productName: string;
  productDescription?: string | null;
  unitsPerPackage?: number | null;
};

type SaleNote = {
  id: number;
  clientName?: string | null;
  comment?: string | null;
  total: number;
  totalPaid?: number | null;
  change?: number | null;
  createdAt: string | Date;
  details: SaleDetail[];
  paymentDetails?: string | null; // JSON con detalles de pagos múltiples
};

type Payment = {
  name: string;
  amount: number;
};

type User = {
  name: string;
};

interface ReceiptOptions {
  sale: SaleNote;
  user: User;
  payments?: Payment[];
  businessName?: string;
  ruc?: string;
  address?: string;
}

const encoder = new ReceiptPrinterEncoder({ language: "esc-pos", columns: 32 });

/**
 * Función para dividir texto largo en líneas más cortas
 */
function splitText(text: string, maxLength: number = 32): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Si una palabra sola es muy larga, la cortamos
        lines.push(word.slice(0, maxLength));
        currentLine = word.slice(maxLength);
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Genera el recibo de venta para impresión térmica
 */
export function generateReceipt({
  sale,
  user,
  payments = [],
  businessName = "ALTOKE SPA",
  ruc = "RUC 12345678901",
  address = "Jr. Miguel Grau 305-Cochas Chico",
}: ReceiptOptions) {
  let receipt = encoder
    .initialize()
    .codepage("windows1252")
    .align("center")
    .width(2)
    .height(2)
    .line(businessName)
    .width(1)
    .height(1)
    .line(ruc);

  // Dividir la dirección en múltiples líneas si es necesaria
  const addressLines = splitText(address, 20);
  addressLines.forEach(line => {
    receipt = receipt.line(line);
  });

  receipt = receipt
    .newline()
    .align("left")
    .line(`Fecha: ${dayjs(sale.createdAt).format("DD/MM/YYYY HH:mm")}`)
    .line(`Atiende: ${user.name}`)
    .line(`Cliente: ${sale.clientName || "Público General"}`)
    .newline()
    .align("center")
    .line("----------- DETALLE -----------")
    .align("left");

  // Detalle de productos
  sale.details.forEach((item) => {
    const nombre = item.productName;
    const cantidad = item.quantity;
    const precio = item.price;
    const subtotal = cantidad * precio;
    
    // Dividir nombre del producto si es muy largo
    const nombreLines = splitText(nombre, 20);
    nombreLines.forEach((line, index) => {
      if (index === 0) {
        receipt = receipt.line(
          `${line.padEnd(20)} ${cantidad} x S/${numeral(precio).format("0.00")}`
        );
      } else {
        receipt = receipt.line(line);
      }
    });
    
    receipt = receipt.line(
      `Subtotal: S/${numeral(subtotal).format("0.00")}`
    );
    
    if (item.unitsPerPackage && item.unitsPerPackage > 1) {
      receipt = receipt.line(`Pack: ${item.unitsPerPackage} unds`);
    }
    
    if (item.productDescription) {
      const descLines = splitText(item.productDescription, 30);
      descLines.forEach(line => {
        receipt = receipt.line(line);
      });
    }
    receipt = receipt.newline();
  });

  // Totales
  receipt = receipt
    .align("center")
    .line("------------------------------")
    .align("right")
    .line(`TOTAL: S/${numeral(sale.total).format("0.00")}`);

  // Pagos
  if (payments.length > 0) {
    receipt = receipt
      .newline()
      .align("left")
      .line("Formas de pago:");
    payments.forEach((p) => {
      receipt = receipt.line(
        `${p.name}: S/${numeral(p.amount).format("0.00")}`
      );
    });
  }

  // Vuelto
  if (sale.change && sale.change > 0) {
    receipt = receipt.line(`Vuelto: S/${numeral(sale.change).format("0.00")}`);
  }

  // Comentario
  if (sale.comment) {
    receipt = receipt
      .newline()
      .align("left")
      .line("Comentario:");
    const commentLines = splitText(sale.comment, 30);
    commentLines.forEach(line => {
      receipt = receipt.line(line);
    });
  }

  // Pie de página
  receipt = receipt
    .newline()
    .align("center")
    .line("¡Gracias por su compra!")
    .newline()
    .cut()
    .encode();

  return receipt;
}