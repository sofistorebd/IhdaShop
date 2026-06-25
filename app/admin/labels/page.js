import { getOrdersByIds } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import PrintTrigger from "@/components/admin/PrintTrigger";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const css = `
  @page { size: 50mm 75mm; margin: 0; }
  @media print {
    .no-print { display: none !important; }
    html, body { margin: 0 !important; background: #fff !important; }
    .label-sheet { gap: 0 !important; padding: 0 !important; background: #fff !important; }
  }
  .label-sheet {
    display: flex; flex-wrap: wrap; gap: 4mm; padding: 4mm;
    background: #f3f4f6;
  }
  .label {
    width: 50mm; height: 75mm; box-sizing: border-box;
    padding: 3mm; background: #fff; color: #000;
    border: 0.2mm solid #000; border-radius: 1mm;
    display: flex; flex-direction: column;
    font-size: 9pt; line-height: 1.3; overflow: hidden;
    page-break-after: always; break-after: page;
  }
  .label .brand {
    display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 0.4mm solid #000; padding-bottom: 1mm; margin-bottom: 1.5mm;
  }
  .label .brand b { font-size: 12pt; }
  .label .row { margin: 0.4mm 0; }
  .label .row span { font-weight: 600; }
  .label .spacer { flex: 1; }
  .label .cons {
    margin-top: 1.5mm; border-top: 0.3mm dashed #000; padding-top: 1mm;
    font-size: 8pt;
  }
  .label .cons b { font-size: 11pt; letter-spacing: 0.3pt; }
  .label .cod {
    margin-top: 1mm; text-align: center; border: 0.4mm solid #000;
    border-radius: 1mm; padding: 1mm; font-size: 13pt; font-weight: 800;
  }
`;

export default async function LabelsPage({ searchParams }) {
  const sp = await searchParams;
  const site = await getSettings();
  const ids = String(sp?.ids || "")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter(Boolean);

  const all = await getOrdersByIds(ids);
  const orders = all.filter((o) => o.consignment_id); // শুধু কুরিয়ারে পাঠানো

  const bdt = (n) => "৳" + Number(n).toLocaleString("bn-BD");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <PrintTrigger count={orders.length} />

      {orders.length === 0 ? (
        <p className="no-print p-8 text-center text-gray-500">
          কোনো লেবেল নেই। (শুধু কুরিয়ারে পাঠানো অর্ডারের লেবেল প্রিন্ট হয়)
        </p>
      ) : (
        <div className="label-sheet">
          {orders.map((o) => (
            <div className="label" key={o.id}>
              <div className="brand">
                <b>{site.brandName}</b>
                <span>#{o.id}</span>
              </div>
              <div className="row">
                <span>নাম:</span> {o.name}
              </div>
              <div className="row">
                <span>ফোন:</span> {o.phone}
              </div>
              <div className="row">
                <span>প্রোডাক্ট:</span> {o.product}
              </div>
              <div className="row">
                <span>সাইজ:</span> {o.size}
              </div>
              <div className="spacer" />
              <div className="cons">
                Consignment ID:
                <br />
                <b>{o.consignment_id}</b>
              </div>
              <div className="cod">COD: {bdt(o.total)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
