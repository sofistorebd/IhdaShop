import { getOrdersByIds } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import PrintTrigger from "@/components/admin/PrintTrigger";
import Barcode from "@/components/Barcode";

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
    padding: 2.4mm; background: #fff; color: #000;
    border: 0.3mm solid #000;
    display: flex; flex-direction: column;
    font-size: 7.5pt; line-height: 1.25; overflow: hidden;
    page-break-after: always; break-after: page;
    font-family: 'Hind Siliguri', Arial, sans-serif;
  }
  /* header: business + merchant */
  .hd { display: flex; gap: 2mm; border-bottom: 0.5mm solid #000; padding-bottom: 1.4mm; }
  .hd .col { flex: 1; border-left: 0.9mm solid #000; padding-left: 1.4mm; min-width: 0; }
  .hd .k { font-size: 6.5pt; font-weight: 800; letter-spacing: .3pt; }
  .hd .v { font-size: 9.5pt; font-weight: 800; line-height: 1.05; word-break: break-word; }
  .hd .v.mid { font-size: 8.5pt; }
  /* recipient */
  .rcpt { padding: 1.4mm 0; }
  .rcpt .cid { font-size: 9pt; font-weight: 800; letter-spacing: .3pt; }
  .rcpt .ln { margin-top: .4mm; }
  .rcpt .ln b { font-weight: 800; }
  /* product table */
  .tbl { width: 100%; border-collapse: collapse; margin-top: .6mm; }
  .tbl th { text-align: left; font-size: 7pt; font-weight: 800; border-top: 0.4mm solid #000; border-bottom: 0.4mm solid #000; padding: 1mm 0; }
  .tbl td { font-size: 7.5pt; padding: .7mm 0; vertical-align: top; }
  .tbl .qty { text-align: right; }
  .tbl .sz { width: 11mm; }
  .spacer { flex: 1; }
  /* footer: cod (center, single line) + barcode (single full line) */
  .ft { margin-top: 1.2mm; }
  .cod { text-align: center; font-size: 10.5pt; font-weight: 800; white-space: nowrap; border-top: 0.4mm solid #000; padding-top: 1.2mm; }
  .bc { margin-top: 1.2mm; text-align: center; }
  .bc svg { width: 100%; height: 9mm; display: block; }
  .bc .num { font-size: 6.5pt; letter-spacing: .8pt; margin-top: .3mm; }
`;

export default async function LabelsPage({ searchParams }) {
  const sp = await searchParams;
  const site = await getSettings();
  const ids = String(sp?.ids || "")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter(Boolean);

  const all = await getOrdersByIds(ids);
  const orders = all.filter((o) => o.consignment_id);

  const businessName = (site.merchantName || site.brandName || "").toUpperCase();
  const bdt = (n) => "TK " + Number(n).toLocaleString("en-US");

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
              {/* header */}
              <div className="hd">
                <div className="col">
                  <div className="k">BUSINESS NAME:</div>
                  <div className="v">{businessName}</div>
                </div>
                <div className="col">
                  <div className="k">MERCHANT ID:</div>
                  <div className="v mid">{site.merchantId || "—"}</div>
                </div>
              </div>

              {/* recipient */}
              <div className="rcpt">
                <div className="cid">CID: {o.consignment_id}</div>
                <div className="ln">
                  <b>Name:</b> {o.name}
                </div>
                <div className="ln">
                  <b>Phone:</b> {o.phone}
                </div>
                <div className="ln">
                  <b>Address:</b> {o.address}
                </div>
              </div>

              {/* product table */}
              <table className="tbl">
                <thead>
                  <tr>
                    <th>PRODUCT</th>
                    <th className="sz">SIZE</th>
                    <th className="qty">QTY</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{o.product}</td>
                    <td className="sz">{o.size}</td>
                    <td className="qty">{o.qty}</td>
                  </tr>
                </tbody>
              </table>

              <div className="spacer" />

              {/* footer */}
              <div className="ft">
                <div className="cod">COD AMOUNT: {bdt(o.total)}</div>
                <div className="bc">
                  <Barcode value={String(o.consignment_id)} />
                  <div className="num">{o.consignment_id}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
