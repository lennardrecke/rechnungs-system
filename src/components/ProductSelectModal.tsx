import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/i18n/LanguageContext"
import { Search } from "lucide-react"

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  unit: string | null
}

interface ProductSelectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Product[]
  onSelect: (product: Product) => void
}

export function ProductSelectModal({
  open,
  onOpenChange,
  products,
  onSelect,
}: ProductSelectModalProps) {
  const { t } = useLanguage()
  const [search, setSearch] = useState("")

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description &&
        p.description.toLowerCase().includes(search.toLowerCase()))
  )

  const handleSelect = (product: Product) => {
    onSelect(product)
    onOpenChange(false)
    setSearch("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("bills.selectProduct")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input
              placeholder={t("bills.searchProducts")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {products.length === 0
                  ? t("products.empty")
                  : "Keine Ergebnisse"}
              </p>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  <div className="font-medium">{product.name}</div>
                  {product.description && (
                    <div className="truncate text-sm text-muted-foreground">
                      {product.description}
                    </div>
                  )}
                  <div className="mt-1 text-sm font-medium">
                    {Number(product.price).toFixed(2)} {product.unit || "Stück"}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
