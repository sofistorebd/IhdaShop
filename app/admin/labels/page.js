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
    display: flex; flex-wrap: wrap; gap: 4mm; padding: 4mm; background: #e5e7eb;
  }
  .label {
    width: 50mm; height: 75mm; box-sizing: border-box;
    padding: 2.5mm; background: #fff; color: #000;
    border: 0.25mm solid #000;
    display: flex; flex-direction: column;
    font-size: 8.5pt; line-height: 1.25; overflow: hidden;
    page-break-after: always; break-after: page;
    font-family: 'Hind Siliguri', sans-serif;
  }
  /* হেডার — ব্যবসার নাম + merchant id */
  .lh { text-align: center; border-bottom: 0.4mm solid #000; padding-bottom: 1.2mm; }
  .lh .bn { font-size: 12.5pt; font-weight: 800; line-height: 1.1; }
  .lh .mid { font-size: 7pt; letter-spacing: .3pt; margin-top: .5mm; }
  /* প্রাপক */
  .sec { padding: 1.4mm 0; border-bottom: 0.2mm dashed #555; }
  .sec .lbl { font-size: 6.5pt; text-transform: uppercase; letter-spacing: .5pt; color: #444; }
  .sec .nm { font-size: 10.5pt; font-weight: 700; }
  .sec .ph { font-size: 9.5pt; font-weight: 600; }
  .sec .ad { font-size: 8pt; margin-top: .3mm; }
  .prod { padding: 1.4mm 0; font-size: 8.5pt; border-bottom: 0.2mm dashed #555; }
  .prod b { font-weight: 700; }
  .spacer { flex: 1; }
  /* consignment + cod */
  .cn { text-align: center; font-size: 7pt; letter-spacing: .3pt; margin-top: 1.2mm; }
  .cn b { display: block; font-size: 12pt; letter-spacing: .5pt; margin-top: .3mm; }
  .cod {
    margin-top: 1.4mm; text-align: center; border: 0.5mm solid #000; border-radius: 1mm;
    padding: 1.2mm; font-size: 13pt; font-weight: 800;
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

  const businessName = site.merchantName || site.brandName;
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
              <div className="lh">
                <div className="bn">{businessName}</div>
                {site.merchantId && <div className="mid">Merchant ID: {site.merchantId}</div>}
              </div>

              <div className="sec">
                <div className="lbl">প্রাপক / Deliver to</div>
                <div className="nm">{o.name}</div>
                <div className="ph">📞 {o.phone}</div>
                <div className="ad">{o.address}</div>
              </div>

              <div className="prod">
                <b>{o.product}</b>
                <br />
                সাইজ: {o.size} · পরিমাণ: {o.qty} · {o.area}
              </div>

              <div className="spacer" />

              <div className="cn">
                CONSIGNMENT ID
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
