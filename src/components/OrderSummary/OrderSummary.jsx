import React from "react";
import { optimizeCloudinaryUrl } from "../../utils/cloudinaryImage";

/**
 * The order totals panel, shared by checkout and order confirmation.
 *
 * Both pages previously printed the same figure twice — once as "Subtotal" and
 * again as "Total" — and never showed GST at all, even though the server
 * computes it on every order and the product page itemises it. A customer saw
 * the tax broken out while browsing and then lost sight of it at the moment of
 * paying. This component is the single place that renders those lines.
 *
 * Money in, money out: every amount is passed in already computed. Nothing here
 * derives a price, because prices are a server concern in this codebase.
 *
 * @param {Object[]} [items]      Line items to list. Omit to render totals only.
 * @param {number}   total        GST-inclusive grand total.
 * @param {number}   [gstAmount]  GST portion of `total`. Omitted/null hides the
 *                                GST and ex-GST rows rather than showing ₹0.
 * @param {Object[]} [rows]       Extra rows: { label, value, tone }.
 *                                tone: "muted" | "success" | "secondary".
 */
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const toneClass = {
  muted: "text-on-surface-variant",
  success: "text-success",
  secondary: "text-secondary",
};

const SummaryRow = ({ label, value, tone = "muted" }) => (
  <div className="flex justify-between items-center gap-4 text-on-surface-variant font-label-caps text-[12px]">
    <span className="uppercase tracking-widest">{label}</span>
    <span className={`${toneClass[tone] || toneClass.muted} tabular-nums`}>{value}</span>
  </div>
);

const OrderSummary = ({
  title = "Order Summary",
  items,
  total,
  gstAmount,
  shipping = "FREE",
  rows = [],
  totalLabel = "Total",
  emptyMessage = "Your cart is empty",
  footer,
  className = "",
}) => {
  // Distinguish "no GST on this order" from "GST not known here". Only a real
  // number earns the extra rows — otherwise the panel stays honest and simply
  // shows the total, as it did before.
  const hasGst = typeof gstAmount === "number" && !Number.isNaN(gstAmount) && gstAmount > 0;
  const exGst = hasGst ? Number(total) - Number(gstAmount) : null;

  return (
    <div
      className={`p-8 bg-surface-container border border-outline-variant/30 ${className}`}
    >
      {/* Omitted where the host page already supplies its own heading. */}
      {title ? (
        <h3 className="font-display-lg text-headline-sm mb-8 text-primary border-b border-outline-variant/30 pb-4">
          {title}
        </h3>
      ) : null}

      {items && (
        <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-2">
          {items.map((item, idx) => (
            // A "Buy Now" item is built client-side and has no _id, so fall
            // back to the product id (then the index) for a stable key.
            <div key={item._id || item.productId || `item-${idx}`} className="flex items-center gap-4 group">
              <div className="w-20 h-20 bg-surface-container-lowest border border-outline-variant/20 overflow-hidden flex-shrink-0">
                <img
                  src={optimizeCloudinaryUrl(item.img || item.image, { width: 200 })}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
              <div className="flex-grow min-w-0">
                <p className="font-display-lg text-body-lg text-on-surface line-clamp-1">{item.name}</p>
                <p className="text-[12px] font-label-caps text-on-surface-variant mt-1">
                  Qty: {item.quantity || 1}
                </p>
              </div>
              <p className="font-label-caps text-primary tabular-nums whitespace-nowrap">
                {money(item.price || item.discountPrice || item.unitPrice)}
              </p>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-10 flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">
                shopping_bag
              </span>
              <p className="font-body-base text-on-surface-variant">{emptyMessage}</p>
            </div>
          )}
        </div>
      )}

      <div className={`space-y-4 ${items ? "pt-8 border-t border-outline-variant/30" : ""}`}>
        {/* With GST known, "Subtotal" means the amount before tax — otherwise
            it would repeat the total verbatim, which is what it used to do. */}
        <SummaryRow
          label="Subtotal"
          value={money(hasGst ? exGst : total)}
        />

        {hasGst && <SummaryRow label="GST" value={money(gstAmount)} />}

        {shipping && <SummaryRow label="Shipping" value={shipping} tone="secondary" />}

        {rows.map((row, i) => (
          <SummaryRow key={row.label || i} {...row} />
        ))}

        <div className="flex justify-between items-center gap-4 pt-6 mt-4 border-t border-primary/20">
          <span className="font-display-lg text-headline-sm text-primary">{totalLabel}</span>
          <span className="font-display-lg text-headline-sm text-primary tabular-nums">
            {money(total)}
          </span>
        </div>

        {hasGst && (
          <p className="text-[11px] font-body-base text-on-surface-variant/80 leading-relaxed">
            Inclusive of {money(gstAmount)} GST.
          </p>
        )}
      </div>

      {footer}
    </div>
  );
};

export default OrderSummary;
