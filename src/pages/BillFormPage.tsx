import { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useLanguage } from "@/i18n/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { useConfig } from "@/hooks/useConfig"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ProductSelectModal } from "@/components/ProductSelectModal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  unit: string | null
}
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Plus, Trash2, Printer, FileDown } from "lucide-react"

interface LineItem {
  id: string
  product_id: string | null
  name: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  sort_order: number
  saveToProducts: boolean
  printName: string // override display name
}

const newItem = (order: number): LineItem => ({
  id: crypto.randomUUID(),
  product_id: null,
  name: "",
  description: "",
  quantity: 1,
  unit: "Stück",
  unit_price: 0,
  sort_order: order,
  saveToProducts: false,
  printName: "",
})

const BILL_NUMBER_COUNTER_KEY = "last_bill_number"

const BillFormPage = () => {
  const { t } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { config } = useConfig()
  const queryClient = useQueryClient()
  const isNew = !id

  const [customerId, setCustomerId] = useState<string>("")
  const [customerName, setCustomerName] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [customerCity, setCustomerCity] = useState("")
  const [customerZip, setCustomerZip] = useState("")
  const [customerCountry, setCustomerCountry] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [status, setStatus] = useState("draft")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<LineItem[]>([newItem(0)])
  const [billNumber, setBillNumber] = useState<number>(0)
  const [createdAt, setCreatedAt] = useState("")
  const [productModalOpen, setProductModalOpen] = useState(false)

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name")
      if (error) throw error
      return data
    },
  })

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name")
      if (error) throw error
      return data
    },
  })

  // Load existing bill
  useEffect(() => {
    if (!isNew && id) {
      supabase
        .from("bills")
        .select("*, bill_items(*)")
        .eq("id", id)
        .single()
        .then(({ data, error }) => {
          if (error || !data) return
          setCustomerId(data.customer_id || "")
          setCustomerName(data.customer_name)
          setCustomerAddress(data.customer_address || "")
          setCustomerCity(data.customer_city || "")
          setCustomerZip(data.customer_zip || "")
          setCustomerCountry(data.customer_country || "")
          setCustomerEmail(data.customer_email || "")
          setStatus(data.status)
          setNotes(data.notes || "")
          setBillNumber(data.bill_number)
          setCreatedAt(data.created_at)
          setItems(
            data.bill_items
              .sort(
                (a: { sort_order: number }, b: { sort_order: number }) =>
                  a.sort_order - b.sort_order
              )
              .map(
                (i: {
                  id: string
                  product_id: string | null
                  name: string
                  description: string | null
                  quantity: number
                  unit: string | null
                  unit_price: number
                  sort_order: number
                }) => ({
                  id: i.id,
                  product_id: i.product_id,
                  name: i.name,
                  description: i.description || "",
                  quantity: i.quantity,
                  unit: i.unit || "",
                  unit_price: i.unit_price,
                  sort_order: i.sort_order,
                  saveToProducts: false,
                  printName: "",
                })
              )
          )
        })
    }
  }, [id, isNew])

  const selectCustomer = (cId: string) => {
    const c = customers.find((c) => c.id === cId)
    if (c) {
      setCustomerId(c.id)
      setCustomerName(c.name)
      setCustomerAddress(c.address || "")
      setCustomerCity(c.city || "")
      setCustomerZip(c.zip || "")
      setCustomerCountry(c.country || "")
      setCustomerEmail(c.email || "")
    }
  }

  const addProductItem = (p: Product) => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        product_id: p.id,
        name: p.name,
        description: p.description || "",
        quantity: 1,
        unit: p.unit || "Stück",
        unit_price: p.price,
        sort_order: prev.length,
        saveToProducts: false,
        printName: "",
      },
    ])
  }

  const addCustomItem = () =>
    setItems((prev) => [...prev, newItem(prev.length)])

  const updateItem = (idx: number, partial: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...partial } : item))
    )
  }

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx))

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxRate = parseFloat(config.tax_rate || "19") / 100
  const tax = subtotal * taxRate
  const total = subtotal + tax

  const handleSave = async () => {
    if (!customerName) {
      toast.error("Customer name required")
      return
    }

    const resolvedItems = [...items]

    // Save custom items to products if checked
    for (const item of resolvedItems) {
      if (item.saveToProducts && !item.product_id) {
        const { data, error } = await supabase
          .from("products")
          .insert({
            name: item.name,
            description: item.description || null,
            unit: item.unit,
            price: item.unit_price,
          })
          .select()
          .single()
        if (!error && data) {
          item.product_id = data.id
        }
      }
    }

    if (isNew) {
      const { data: lastIssuedRow, error: lastIssuedError } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", BILL_NUMBER_COUNTER_KEY)
        .maybeSingle()
      if (lastIssuedError) {
        toast.error(lastIssuedError.message)
        return
      }

      const { data: maxBill } = await supabase
        .from("bills")
        .select("bill_number")
        .order("bill_number", { ascending: false })
        .limit(1)
        .maybeSingle()

      const lastIssuedBillNumber = Number.parseInt(lastIssuedRow?.value || "", 10)
      const latestExistingBillNumber = maxBill?.bill_number || 0
      const newBillNumber =
        Math.max(
          Number.isNaN(lastIssuedBillNumber) ? 0 : lastIssuedBillNumber,
          latestExistingBillNumber
        ) + 1

      const { error: counterError } = await supabase
        .from("app_config")
        .upsert(
          {
            key: BILL_NUMBER_COUNTER_KEY,
            value: String(newBillNumber),
          },
          { onConflict: "key" }
        )
      if (counterError) {
        toast.error(counterError.message)
        return
      }

      const { data: bill, error } = await supabase
        .from("bills")
        .insert({
          bill_number: newBillNumber,
          customer_id: customerId || null,
          customer_name: customerName,
          customer_address: customerAddress || null,
          customer_city: customerCity || null,
          customer_zip: customerZip || null,
          customer_country: customerCountry || null,
          customer_email: customerEmail || null,
          status,
          notes: notes || null,
          created_by: user?.id,
        })
        .select()
        .single()
      if (error || !bill) {
        toast.error(error?.message || "Error")
        return
      }
      setBillNumber(bill.bill_number)

      const billItems = resolvedItems.map((i, idx) => ({
        bill_id: bill.id,
        product_id: i.product_id || null,
        name: i.printName || i.name,
        description: i.description || null,
        quantity: i.quantity,
        unit: i.unit,
        unit_price: i.unit_price,
        sort_order: idx,
      }))

      const { error: itemsError } = await supabase
        .from("bill_items")
        .insert(billItems)
      if (itemsError) {
        toast.error(itemsError.message)
        return
      }

      queryClient.invalidateQueries({ queryKey: ["bills"] })
      toast.success(t("general.success"))
      navigate(`/bills/${bill.id}`)
    } else {
      const { error } = await supabase
        .from("bills")
        .update({
          customer_id: customerId || null,
          customer_name: customerName,
          customer_address: customerAddress || null,
          customer_city: customerCity || null,
          customer_zip: customerZip || null,
          customer_country: customerCountry || null,
          customer_email: customerEmail || null,
          status,
          notes: notes || null,
        })
        .eq("id", id!)
      if (error) {
        toast.error(error.message)
        return
      }

      // Delete old items and re-insert
      await supabase.from("bill_items").delete().eq("bill_id", id!)
      const billItems = resolvedItems.map((i, idx) => ({
        bill_id: id!,
        product_id: i.product_id || null,
        name: i.printName || i.name,
        description: i.description || null,
        quantity: i.quantity,
        unit: i.unit,
        unit_price: i.unit_price,
        sort_order: idx,
      }))
      await supabase.from("bill_items").insert(billItems)

      queryClient.invalidateQueries({ queryKey: ["bills"] })
      toast.success(t("general.success"))
      navigate(`/bills/${id}`)
    }
  }

  const generateFilename = () => {
    const format =
      config.bill_name_format || "{bill_number}_{customer_name}_{date}"
    const date = createdAt ? new Date(createdAt).toISOString().split("T")[0] : ""
    const clean = (s: string) => s.replace(/[^a-zA-Z0-9äöüÄÖÜß-]/g, "_")
    return format
      .replace("{bill_number}", String(billNumber))
      .replace("{customer_name}", clean(customerName))
      .replace("{date}", date)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportPdf = () => {
    // Use print dialog for PDF (browser built-in "Save as PDF")
    window.print()
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {isNew
            ? t("bills.create")
            : `${t("general.edit")}: ${t("bills.bill")} #${billNumber}`}
        </h2>
        <div className="flex gap-2">
          {!isNew && (
            <>
              <Button variant="outline" onClick={handlePrint}>
                <Printer size={16} className="mr-1" /> {t("bills.print")}
              </Button>
              <Button variant="outline" onClick={handleExportPdf}>
                <FileDown size={16} className="mr-1" /> {t("bills.exportPdf")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Customer Selection */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{t("bills.customer")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={customerId} onValueChange={selectCustomer}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("bills.selectCustomer")} />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` (${c.company})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder={t("customers.name")}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <Input
            placeholder={t("customers.address")}
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              placeholder={t("customers.zip")}
              value={customerZip}
              onChange={(e) => setCustomerZip(e.target.value)}
            />
            <Input
              placeholder={t("customers.city")}
              value={customerCity}
              onChange={(e) => setCustomerCity(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={t("customers.country")}
              value={customerCountry}
              onChange={(e) => setCustomerCountry(e.target.value)}
            />
            <Input
              placeholder={t("customers.email")}
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">{t("bills.status")}:</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t("bills.draft")}</SelectItem>
                <SelectItem value="sent">{t("bills.sent")}</SelectItem>
                <SelectItem value="paid">{t("bills.paid")}</SelectItem>
                <SelectItem value="cancelled">
                  {t("bills.cancelled")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("bills.items")}</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setProductModalOpen(true)}
              >
                <Plus size={16} className="mr-1" /> {t("bills.addPosition")}
              </Button>
              <Button variant="outline" onClick={addCustomItem}>
                <Plus size={16} className="mr-1" /> {t("bills.addCustomItem")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  {t("products.name")}
                </TableHead>
                <TableHead>{t("bills.printName")}</TableHead>
                <TableHead className="w-20">{t("bills.quantity")}</TableHead>
                <TableHead className="w-20">{t("bills.unit")}</TableHead>
                <TableHead className="w-28">{t("bills.unitPrice")}</TableHead>
                <TableHead className="w-28 text-right">
                  {t("bills.lineTotal")}
                </TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Input
                      value={item.name}
                      onChange={(e) =>
                        updateItem(idx, { name: e.target.value })
                      }
                      placeholder={t("products.name")}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.printName}
                      onChange={(e) =>
                        updateItem(idx, { printName: e.target.value })
                      }
                      placeholder={t("bills.printName")}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(idx, {
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.unit}
                      onChange={(e) =>
                        updateItem(idx, { unit: e.target.value })
                      }
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItem(idx, {
                          unit_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {(item.quantity * item.unit_price).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {!item.product_id && (
                        <label
                          className="flex cursor-pointer items-center gap-1 text-xs"
                          title={t("bills.saveToProducts")}
                        >
                          <Checkbox
                            checked={item.saveToProducts}
                            onCheckedChange={(checked) =>
                              updateItem(idx, { saveToProducts: !!checked })
                            }
                          />
                          💾
                        </label>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{t("bills.subtotal")}:</span>
                <span>
                  {subtotal.toFixed(2)} {config.currency || "EUR"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>
                  {t("bills.tax")} ({config.tax_rate || "19"}%):
                </span>
                <span>
                  {tax.toFixed(2)} {config.currency || "EUR"}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>{t("bills.grandTotal")}:</span>
                <span>
                  {total.toFixed(2)} {config.currency || "EUR"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <Textarea
            placeholder={t("bills.notes")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Filename preview */}
      {!isNew && (
        <p className="mb-4 text-sm text-muted-foreground">
          PDF:{" "}
          <code className="rounded bg-muted px-1">
            {generateFilename()}.pdf
          </code>
        </p>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave}>{t("bills.save")}</Button>
        <Button
          variant="outline"
          onClick={() => navigate(isNew ? "/bills" : `/bills/${id}`)}
        >
          {isNew ? t("bills.cancel") : t("general.back")}
        </Button>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          aside, nav, button, .no-print { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>

      <ProductSelectModal
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        products={products}
        onSelect={addProductItem}
      />
    </div>
  )
}

export default BillFormPage
