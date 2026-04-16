import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface ProductForm {
  name: string;
  description: string;
  unit: string;
  price: string;
}

const emptyForm: ProductForm = { name: '', description: '', unit: 'Stück', price: '0' };

const ProductsPage = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, description: form.description || null, unit: form.unit, price: parseFloat(form.price) || 0 };
      if (editId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
      toast.success(t('general.success'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('general.success'));
    },
  });

  const openNew = () => { setForm(emptyForm); setEditId(null); setOpen(true); };
  const openEdit = (p: typeof products[0]) => {
    setForm({ name: p.name, description: p.description || '', unit: p.unit || '', price: String(p.price) });
    setEditId(p.id);
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{t('products.title')}</h2>
        <Button onClick={openNew}><Plus size={16} className="mr-1" /> {t('products.add')}</Button>
      </div>

      {isLoading ? <p>{t('general.loading')}</p> : products.length === 0 ? (
        <p className="text-muted-foreground">{t('products.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('products.name')}</TableHead>
              <TableHead>{t('products.description')}</TableHead>
              <TableHead>{t('products.unit')}</TableHead>
              <TableHead className="text-right">{t('products.price')}</TableHead>
              <TableHead className="w-24">{t('general.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.description}</TableCell>
                <TableCell>{p.unit}</TableCell>
                <TableCell className="text-right">{Number(p.price).toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(t('products.confirmDelete'))) remove.mutate(p.id); }}><Trash2 size={14} /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? t('products.edit') : t('products.add')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t('products.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder={t('products.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="flex gap-2">
              <Input placeholder={t('products.unit')} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              <Input type="number" step="0.01" placeholder={t('products.price')} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('products.cancel')}</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name}>{t('products.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsPage;
