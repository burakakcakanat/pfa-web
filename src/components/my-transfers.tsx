import {useEffect,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {Link} from '@tanstack/react-router';
import {Copy,FileText} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {listMyTransfers,reportTransfer,receiptUrl,refreshTransferQuote} from '@/lib/transfer.functions';
import type {CustomerTransfer} from '@/lib/purchase-inquiries';
import {fmtMoney} from '@/lib/pricing';
import {supabase} from '@/integrations/supabase/client';
import {validReceipt} from '@/lib/transfer-pricing';

export function MyTransfers({historyOnly=false}:{historyOnly?:boolean}){
  const list=useServerFn(listMyTransfers), report=useServerFn(reportTransfer), getReceipt=useServerFn(receiptUrl);
  const refresh=useServerFn(refreshTransferQuote);
  const [rows,setRows]=useState<CustomerTransfer[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState<string|null>(null),[loaded,setLoaded]=useState(false);
  async function reload(){try{setRows(await list());setLoaded(true);}catch(e){setError(e instanceof Error?e.message:'Talepler yüklenemedi.');}}
  useEffect(()=>{reload();},[list]);
  async function upload(row:CustomerTransfer,file:File){
    if(!validReceipt(file.size,file.type)){setError('PDF, PNG veya JPEG dosyası seçin; en fazla 5 MB.');return;}
    if(!row.user_id)return;setBusy(row.id);setError('');
    try{const ext=file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':'jpg';const path=`${row.user_id}/${row.id}/${crypto.randomUUID()}.${ext}`;const {error:uploadError}=await supabase.storage.from('transfer-receipts').upload(path,file,{contentType:file.type});if(uploadError)throw new Error('Dekont yüklenemedi.');await report({data:{id:row.id,path}});await reload();}catch(e){setError(e instanceof Error?e.message:'Ödeme bildirimi kaydedilemedi.');}finally{setBusy(null);}
  }
  async function copy(value:string){try{await navigator.clipboard.writeText(value);}catch{setError('Kopyalanamadı; bilgiyi seçerek kopyalayabilirsiniz.');}}
  const shown=historyOnly?rows.filter(r=>['paid','fulfilled'].includes(r.status)):rows;
  return <section className="space-y-5"><h2 className="font-serif text-2xl">Havale {historyOnly?'satın alımları':'taleplerim'}</h2>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}{!loaded&&!error&&<p className="text-sm text-muted-foreground">Yükleniyor…</p>}{loaded&&!shown.length&&<p className="text-sm text-muted-foreground">Henüz havale {historyOnly?'satın alımınız':'talebiniz'} yok.</p>}
  {shown.map(row=>{
    const paid=['paid','fulfilled'].includes(row.status), ready=!!row.transfer_amount;
    const status=row.status==='closed'?'Talep kapatıldı':row.status==='fulfilled'&&!row.delivery_error?'Teslim edildi':paid?'Teslimat hazırlanıyor':row.payment_reported_at?'Ödeme kontrol ediliyor':ready?'Havale bekleniyor':'Hazırlık / tarih bekleniyor';
    return <article key={row.id} className="space-y-4 rounded-md border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-serif text-xl">{row.product_label??row.product_slug}</h3><span className="text-sm text-accent">{status}</span></div>
      {row.metadata?.is_gift&&<p className="text-sm">Hediye → {row.metadata.recipient_name}</p>}
      {row.quote&&<dl className="space-y-1 text-sm"><div className="flex justify-between"><dt>Ürün / paket</dt><dd>{fmtMoney(row.quote.subtotalCents,'try')}</dd></div>{row.quote.discountCents>0&&<div className="flex justify-between text-accent"><dt>Bekleme listesi indirimi · %10</dt><dd>−{fmtMoney(row.quote.discountCents,'try')}</dd></div>}<div className="flex justify-between font-medium"><dt>{paid?'Ödenen':'Ödenecek'} tutar</dt><dd>{fmtMoney(Math.round(Number(row.transfer_amount??row.quote.totalCents/100)*100),'try')}</dd></div></dl>}
      {!ready&&row.quote?.reason&&<p className="text-sm text-muted-foreground">{row.quote.reason}</p>}
      {!paid&&!row.payment_reported_at&&row.status!=='closed'&&row.quote&&<Button variant="outline" size="sm" disabled={busy===row.id} onClick={async()=>{setBusy(row.id);try{const quote=await refresh({data:{id:row.id}});await reload();if(!quote.ready)setError(quote.reason??'Henüz hazır değil.');}catch(e){setError(e instanceof Error?e.message:'Güncellenemedi.');}finally{setBusy(null);}}}>Ödeme öncesi güncel tutarı onayla</Button>}
      {row.bank&&!row.payment_reported_at&&!paid&&<div className="space-y-3 border-t border-border pt-4 text-sm"><p>{row.bank.account_holder} · {row.bank.bank_name}</p><div className="flex items-start justify-between gap-3"><span className="break-all">{row.bank.iban}</span><Button size="icon" variant="outline" title="IBAN kopyala" aria-label="IBAN kopyala" onClick={()=>copy(row.bank?.iban??'')}><Copy className="h-4 w-4"/></Button></div><div className="flex items-center justify-between gap-3"><span className="break-all">{row.payment_reference}</span><Button size="icon" variant="outline" title="Havale açıklamasını kopyala" aria-label="Havale açıklamasını kopyala" onClick={()=>copy(row.payment_reference??'')}><Copy className="h-4 w-4"/></Button></div><p className="text-muted-foreground">Açıklama kodunu havalenize ekleyin. Ödeme onayı banka kontrolünden sonra verilir.</p><label className="block space-y-2"><span>Havaleyi yaptım — dekont yükle</span><input aria-label={`Dekont — ${row.product_label}`} type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy===row.id} onChange={e=>{const file=e.target.files?.[0];if(file)upload(row,file);}} className="block max-w-full text-sm"/></label>{busy===row.id&&<p>Dekont kaydediliyor…</p>}</div>}
      {row.payment_reported_at&&<p className="text-sm text-muted-foreground">Ödeme bildiriminiz alındı. Dekont yüklemek ödemenin onaylandığı anlamına gelmez.</p>}
      {row.receipt_path&&<Button variant="outline" size="sm" onClick={async()=>{try{const url=await getReceipt({data:{id:row.id}});window.open(url,'_blank','noopener');}catch(e){setError(e instanceof Error?e.message:'Dekont açılamadı.');}}}><FileText className="mr-2 h-4 w-4"/>Dekontum</Button>}
      {row.delivery_error&&<p className="text-sm text-destructive">Teslimatın bir adımı tamamlanamadı; yönetim bilgilendirildi.</p>}
      {paid&&<div className="flex flex-wrap gap-3 text-sm"><Link to="/hesabim" search={{tab:'ebooks'}} className="text-accent">E-Kitaplarım</Link><Link to="/degerlendirme" className="text-accent">PFA Ölçeği</Link><Link to="/hesabim" search={{tab:'sessions'}} className="text-accent">Seanslarım</Link><Link to="/hesabim" search={{tab:'webinars'}} className="text-accent">Webinarlarım</Link></div>}
      {row.gifts.map((g,i)=><p key={i} className="text-sm text-accent">{g.recipient_name} · {g.status==='claimed'?'Hediyesini aldı':'Hediye bağlantısı hazır'}</p>)}
    </article>;
  })}</section>;
}