import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileDown, Pencil, Printer } from "lucide-react";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useConfig } from "@/hooks/useConfig";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BillItem = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  sort_order: number;
};

type Bill = {
  id: string;
  bill_number: number;
  customer_name: string;
  customer_address: string | null;
  customer_city: string | null;
  customer_zip: string | null;
  customer_country: string | null;
  customer_email: string | null;
  notes: string | null;
  created_at: string;
  bill_items: BillItem[];
};

const BillViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { config } = useConfig();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const invoiceText = {
    bill: "Rechnung",
    invoiceNumber: "Rechnungsnummer",
    invoiceDate: "Rechnungsdatum",
    billingTo: "Rechnung an",
    itemName: "Bezeichnung",
    quantity: "Menge",
    unitPrice: "Einzelpreis",
    lineTotal: "Gesamt",
    subtotal: "Zwischensumme",
    tax: "MwSt.",
    grandTotal: "Gesamtbetrag",
    notes: "Notizen",
  };

  const { data: bill, isLoading } = useQuery({
    queryKey: ["bill", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("*, bill_items(*)")
        .eq("id", id!)
        .single();

      if (error) throw error;

      return {
        ...data,
        bill_items: [...data.bill_items].sort(
          (a, b) => a.sort_order - b.sort_order
        ),
      } as Bill;
    },
  });

  const currency = config.currency || "EUR";
  const taxRate = parseFloat(config.tax_rate || "19") / 100;
  const subtotal = useMemo(
    () =>
      bill?.bill_items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      ) || 0,
    [bill]
  );
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
    }).format(value);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("de-DE");

  const filename = bill
    ? (config.bill_name_format || "{bill_number}_{customer_name}_{date}")
        .replace("{bill_number}", String(bill.bill_number))
        .replace(
          "{customer_name}",
          bill.customer_name.replace(/[^a-zA-Z0-9äöüÄÖÜß-]/g, "_")
        )
        .replace("{date}", new Date(bill.created_at).toISOString().split("T")[0])
    : "invoice";

  const customerLines = [
    bill?.customer_address,
    [bill?.customer_zip, bill?.customer_city].filter(Boolean).join(" "),
    bill?.customer_country,
    bill?.customer_email,
  ].filter(Boolean) as string[];

  const companyLines = [
    config.company_name,
    config.company_address,
    [config.company_zip, config.company_city].filter(Boolean).join(" "),
    config.company_country,
    config.company_email,
    config.company_phone,
  ].filter(Boolean) as string[];

  const handlePrint = () => {
    window.print();
  };

  const ensurePageSpace = (
    pdf: jsPDF,
    y: number,
    neededHeight: number,
    margin: number
  ) => {
    const pageHeight = pdf.internal.pageSize.getHeight();

    if (y + neededHeight <= pageHeight - margin) {
      return y;
    }

    pdf.addPage();
    return margin;
  };

  const handleExportPdf = async () => {
    if (!bill) return;

    setIsExporting(true);

    try {
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;
      const rightColumnX = pageWidth - margin;
      const labelWidth = 42;
      let y = margin;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text(invoiceText.bill, margin, y);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      let companyY = y;
      companyLines.forEach((line) => {
        pdf.text(String(line), rightColumnX, companyY, { align: "right" });
        companyY += 5;
      });

      y += 12;
      pdf.setFont("helvetica", "normal");
      pdf.text(invoiceText.invoiceNumber, margin, y);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(bill.bill_number), margin + labelWidth, y);

      y += 6;
      pdf.setFont("helvetica", "normal");
      pdf.text(invoiceText.invoiceDate, margin, y);
      pdf.setFont("helvetica", "bold");
      pdf.text(formatDate(bill.created_at), margin + labelWidth, y);

      y = Math.max(y + 14, companyY + 8);

      pdf.setFont("helvetica", "normal");
      pdf.text(invoiceText.billingTo, margin, y);
      y += 6;
      pdf.setFont("helvetica", "bold");
      pdf.text(bill.customer_name, margin, y);
      y += 5;

      pdf.setFont("helvetica", "normal");
      customerLines.forEach((line) => {
        pdf.text(String(line), margin, y);
        y += 5;
      });

      y += 8;
      y = ensurePageSpace(pdf, y, 18, margin);

      const columns = {
        name: margin,
        quantity: margin + contentWidth - 72,
        unitPrice: margin + contentWidth - 42,
        total: margin + contentWidth,
      };

      pdf.setDrawColor(210, 210, 210);
      pdf.line(margin, y, margin + contentWidth, y);
      y += 7;

      pdf.setFont("helvetica", "bold");
      pdf.text(invoiceText.itemName, columns.name, y);
      pdf.text(invoiceText.quantity, columns.quantity, y, { align: "right" });
      pdf.text(invoiceText.unitPrice, columns.unitPrice, y, { align: "right" });
      pdf.text(invoiceText.lineTotal, columns.total, y, { align: "right" });
      y += 4;
      pdf.line(margin, y, margin + contentWidth, y);
      y += 7;

      pdf.setFont("helvetica", "normal");
      for (const item of bill.bill_items) {
        const nameLines = pdf.splitTextToSize(item.name, columns.quantity - columns.name - 6);
        const descriptionLines = item.description
          ? pdf.splitTextToSize(item.description, columns.quantity - columns.name - 6)
          : [];
        const rowLines = [...nameLines, ...descriptionLines];
        const rowHeight = Math.max(8, rowLines.length * 5 + 2);

        y = ensurePageSpace(pdf, y, rowHeight + 2, margin);

        let textY = y;
        pdf.setFont("helvetica", "bold");
        nameLines.forEach((line: string) => {
          pdf.text(line, columns.name, textY);
          textY += 5;
        });

        if (descriptionLines.length > 0) {
          pdf.setFont("helvetica", "normal");
          descriptionLines.forEach((line: string) => {
            pdf.text(line, columns.name, textY);
            textY += 5;
          });
        }

        pdf.setFont("helvetica", "normal");
        pdf.text(`${item.quantity} ${item.unit || ""}`.trim(), columns.quantity, y, {
          align: "right",
        });
        pdf.text(formatMoney(item.unit_price), columns.unitPrice, y, {
          align: "right",
        });
        pdf.setFont("helvetica", "bold");
        pdf.text(formatMoney(item.quantity * item.unit_price), columns.total, y, {
          align: "right",
        });

        y += rowHeight;
      }

      y += 6;
      y = ensurePageSpace(pdf, y, 28, margin);
      const totalsX = margin + contentWidth - 70;

      pdf.setFont("helvetica", "normal");
      pdf.text(invoiceText.subtotal, totalsX, y);
      pdf.text(formatMoney(subtotal), margin + contentWidth, y, { align: "right" });
      y += 6;

      pdf.text(`${invoiceText.tax} (${config.tax_rate || "19"}%)`, totalsX, y);
      pdf.text(formatMoney(tax), margin + contentWidth, y, { align: "right" });
      y += 8;

      pdf.setFont("helvetica", "bold");
      pdf.text(invoiceText.grandTotal, totalsX, y);
      pdf.text(formatMoney(total), margin + contentWidth, y, { align: "right" });

      if (bill.notes) {
        y += 14;
        y = ensurePageSpace(pdf, y, 20, margin);
        pdf.setFont("helvetica", "normal");
        pdf.text(invoiceText.notes, margin, y);
        y += 6;
        const notesLines = pdf.splitTextToSize(bill.notes, contentWidth);
        notesLines.forEach((line: string) => {
          y = ensurePageSpace(pdf, y, 6, margin);
          pdf.text(line, margin, y);
          y += 5;
        });
      }

      pdf.save(`${filename}.pdf`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "PDF export failed";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <p>{t("general.loading")}</p>;
  }

  if (!bill) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">{t("bills.notFound")}</p>
        <Button variant="outline" onClick={() => navigate("/bills")}>
          <ArrowLeft size={16} className="mr-2" />
          {t("general.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={() => navigate("/bills")}>
          <ArrowLeft size={16} className="mr-2" />
          {t("general.back")}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(`/bills/${bill.id}/edit`)}
        >
          <Pencil size={16} className="mr-2" />
          {t("general.edit")}
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer size={16} className="mr-2" />
          {t("bills.print")}
        </Button>
        <Button variant="outline" onClick={handleExportPdf} disabled={isExporting}>
          <FileDown size={16} className="mr-2" />
          {isExporting ? `${t("general.loading")}` : t("bills.exportPdf")}
        </Button>
      </div>

      <div
        ref={invoiceRef}
        className="bill-document bg-background text-foreground print:max-w-none"
      >
        <div className="space-y-10 bg-white p-8 print:p-0">
          <header className="flex items-start justify-between gap-8">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold">{invoiceText.bill}</h1>
              <div className="space-y-1 text-sm">
                <div className="flex gap-3">
                  <span className="min-w-40 text-muted-foreground">
                    {invoiceText.invoiceNumber}
                  </span>
                  <span className="font-medium">{bill.bill_number}</span>
                </div>
                <div className="flex gap-3">
                  <span className="min-w-40 text-muted-foreground">
                    {invoiceText.invoiceDate}
                  </span>
                  <span className="font-medium">{formatDate(bill.created_at)}</span>
                </div>
              </div>
            </div>

            {companyLines.length > 0 && (
              <div className="max-w-[280px] space-y-1 text-right text-sm">
                {companyLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            )}
          </header>

          <section className="grid gap-10 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {invoiceText.billingTo}
              </h2>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">{bill.customer_name}</p>
                {customerLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </section>

          <section className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="h-11">{invoiceText.itemName}</TableHead>
                  <TableHead className="h-11 w-24 text-right">
                    {invoiceText.quantity}
                  </TableHead>
                  <TableHead className="h-11 w-32 text-right">
                    {invoiceText.unitPrice}
                  </TableHead>
                  <TableHead className="h-11 w-36 text-right">
                    {invoiceText.lineTotal}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.bill_items.map((item) => (
                  <TableRow key={item.id} className="align-top">
                    <TableCell className="py-4 align-top">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right align-top">
                      {item.quantity} {item.unit || ""}
                    </TableCell>
                    <TableCell className="py-4 text-right align-top">
                      {formatMoney(item.unit_price)}
                    </TableCell>
                    <TableCell className="py-4 text-right align-top font-medium">
                      {formatMoney(item.quantity * item.unit_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section className="flex justify-end">
            <div className="w-full max-w-sm space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{invoiceText.subtotal}</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {invoiceText.tax} ({config.tax_rate || "19"}%)
                </span>
                <span>{formatMoney(tax)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 text-base font-semibold">
                <span>{invoiceText.grandTotal}</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>
          </section>

          {bill.notes && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {invoiceText.notes}
              </h2>
              <p className="whitespace-pre-wrap text-sm">{bill.notes}</p>
            </section>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          aside, nav, button, .print\\:hidden {
            display: none !important;
          }

          main {
            padding: 0 !important;
            overflow: visible !important;
          }

          body {
            background: white !important;
          }

          .bill-document {
            width: 100%;
            max-width: none !important;
          }

          .bill-document table,
          .bill-document thead,
          .bill-document tbody,
          .bill-document tr,
          .bill-document th,
          .bill-document td {
            border-color: #d4d4d8 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BillViewPage;
