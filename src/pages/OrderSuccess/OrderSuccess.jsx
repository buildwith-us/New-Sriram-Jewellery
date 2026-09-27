import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import useOrders from "../../hooks/useOrders";
import CustomHelmet from "../../components/CustomHelmet/CustomHelmet";
import toast from "react-hot-toast";
import useUserInfo from "../../hooks/useUserInfo";
import useAxiosSecure from "../../hooks/useAxiosSecure";
import { optimizeCloudinaryUrl } from "../../utils/cloudinaryImage";
import InvoiceDocument from "../../components/InvoiceDocument/InvoiceDocument";
import OrderSummary from "../../components/OrderSummary/OrderSummary";

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orders } = useOrders();
  const [orderObj, setOrderObj] = useState({});
  const [orderDate, setOrderDate] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [allOrders, setAllOrders] = useState([]);
  const [userFromDB] = useUserInfo();
  const [axiosSecure] = useAxiosSecure();

  // get all orders for admin users
  useEffect(() => {
    if (userFromDB?.admin || userFromDB?.role === "ADMIN") {
      axiosSecure
        .get("/orders/admin/all")
        .then((res) => setAllOrders(res.data))
        .catch((e) => console.error(e));
    }
  }, [userFromDB]);

  // get specific order by _id for orderSuccess page
  useEffect(() => {
    const source = userFromDB?.admin || userFromDB?.role === "ADMIN" ? allOrders : orders;
    const findOrderById = source?.find(
      (order) => order._id === location?.state?.orderId
    );
    setOrderObj(findOrderById);
  }, [location?.state, orders, allOrders, userFromDB]);

  useEffect(() => {
    const today = new Date(orderObj?.createdAt);
    const date = today.getDate();
    const month = today.toLocaleString("en-US", { month: "long" });
    const year = today.getFullYear();
    setOrderDate({ date, month, year });
  }, [orderObj]);

  // Print the invoice using the browser's own PDF export. The previous
  // implementation posted the customer's name, address and order contents to
  // api.easyinvoice.cloud, a third-party service, and hardcoded tax-rate 0 so
  // the GST the order actually carries never appeared. It also navigated away
  // immediately, which cancelled the download even when the service answered.
  const handleDownloadInvoice = () => {
    if (!orderObj?.orderId) {
      toast.error("This order is still loading. Please try again in a moment.");
      return;
    }
    setInvoiceLoading(true);
    // Let React paint the invoice before the print dialog snapshots the page.
    requestAnimationFrame(() => {
      window.print();
      setInvoiceLoading(false);
    });
  };

  return (
    <main className="max-w-container-max mx-auto px-5 md:px-16 pt-32 pb-24 min-h-screen bg-background font-body-base">
      <CustomHelmet title={"Order Success"} />

      {location?.state?.orderId ? (
        <>
          {/* Breadcrumbs */}
          {/* Header Section */}
          <div className="text-center mb-12 fade-in-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-low border border-outline-variant/30 mb-6 relative">
              <span className="material-symbols-outlined text-[32px] text-primary relative z-10">done</span>
              <div className="absolute inset-0 border border-primary/20 rounded-full scale-110 animate-pulse"></div>
            </div>
            <h1 className="font-display-lg text-headline-lg text-on-background mb-3">Order Confirmed</h1>
            <p className="font-body-base text-on-surface-variant max-w-md mx-auto">
              {location?.state?.from?.pathname === "checkout"
                ? "Thank you! Your order has been received and is being prepared with the utmost care."
                : `Thank you! Your order has been ${orderObj?.orderStatus || "confirmed"}.`}
            </p>
            <div className="mt-4 font-label-caps text-sm text-primary tracking-widest">
              ORDER #{orderObj?._id?.slice(-8).toUpperCase() || "N/A"}
            </div>
          </div>

          {/* Details Section */}
          <section className="w-full max-w-4xl mx-auto mb-16 fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="border border-outline-variant/30 flex flex-col md:flex-row bg-surface">
              {/* Items Column */}
              <div className="p-8 border-b md:border-b-0 md:border-r border-outline-variant/30 flex-grow">
                <h2 className="font-label-caps text-on-surface-variant mb-6 tracking-widest">PURCHASED ITEMS</h2>
                <div className="flex flex-col gap-6">
                  {orderObj?.items?.map((product, idx) => (
                    <div key={product._id || idx} className="flex gap-4 items-start">
                      <div className="w-20 h-20 bg-surface-container rounded overflow-hidden flex-shrink-0 border border-outline-variant/30">
                        <img 
                          className="w-full h-full object-cover" 
                          alt={product.name} 
                          src={optimizeCloudinaryUrl(product.img || product.image, { width: 200 })}
                        />
                      </div>
                      <div className="flex flex-col flex-grow">
                        <h3 className="font-display-lg text-on-background text-[18px] mb-1 line-clamp-1">{product.name}</h3>
                        <span className="font-body-base text-on-surface-variant text-sm mb-2">{product.category || 'Jewellery'}</span>
                        <div className="flex justify-between items-center w-full">
                          <span className="font-body-base text-on-surface-variant text-sm">Qty: {product.quantity}</span>
                          <span className="font-button-text text-primary">₹{product.unitPrice?.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Details Column */}
              <div className="p-8 bg-surface-container-low/30 md:w-80 flex-shrink-0">
                <div className="mb-8">
                  <h2 className="font-label-caps text-on-surface-variant mb-4 flex items-center gap-2 tracking-widest">
                    <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                    SHIPPING ADDRESS
                  </h2>
                  <address className="not-italic font-body-base text-on-background leading-relaxed text-sm">
                    <span className="block font-medium mb-1">{orderObj?.name}</span>
                    {orderObj?.shippingAddress?.streetAddress}<br />
                    {orderObj?.shippingAddress?.city}, {orderObj?.shippingAddress?.state}<br />
                    {orderObj?.shippingAddress?.postalCode}<br />
                    {orderObj?.shippingAddress?.country}
                  </address>
                </div>
                <div>
                  <h2 className="font-label-caps text-on-surface-variant mb-4 flex items-center gap-2 tracking-widest">
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                    PAYMENT SUMMARY
                  </h2>
                  {/* The same totals block checkout uses, so the figures a
                      customer approved are the figures they see afterwards.
                      GST comes straight off the order — it was stored at
                      creation but never shown. */}
                  <OrderSummary
                    className="!p-0 !bg-transparent !border-0"
                    title=""
                    total={orderObj?.totalAmount || 0}
                    gstAmount={
                      typeof orderObj?.gstAmount === "number" ? orderObj.gstAmount : null
                    }
                    shipping="Complimentary"
                    rows={[
                      {
                        label: "Method",
                        value: orderObj?.paymentMethod === "cod" ? "Cash on Delivery" : "Card",
                      },
                    ]}
                    totalLabel="Total paid"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto mb-12 fade-in-up" style={{ animationDelay: '0.4s' }}>
            <button 
              className="w-full sm:w-auto px-8 py-4 bg-primary text-on-primary font-button-text tracking-widest text-center hover:scale-[1.02] hover:bg-primary-container transition-ui duration-300 disabled:opacity-50"
              onClick={handleDownloadInvoice}
              disabled={invoiceLoading}
            >
              {invoiceLoading ? <span className="loading loading-spinner loading-sm"></span> : 'DOWNLOAD INVOICE'}
            </button>
            <Link 
              to="/shop"
              className="w-full sm:w-auto px-8 py-4 bg-transparent text-primary font-button-text tracking-widest text-center border border-primary/50 hover:bg-surface-container-low transition-colors duration-300"
            >
              CONTINUE SHOPPING
            </Link>
          </div>

          <p className="font-body-base text-sm text-on-surface-variant text-center max-w-md mx-auto">
            Need help? Contact our concierge at <a className="text-primary hover:underline underline-offset-4" href="mailto:support@sriramjewellery.com">support@sriramjewellery.com</a>
          </p>

          {/* Hidden on screen; the print stylesheet reveals only this. */}
          <InvoiceDocument order={orderObj} />
        </>
      ) : (
        <div className="flex flex-col justify-center items-center min-h-[60vh] text-center space-y-6">
          <span className="material-symbols-outlined text-7xl text-on-surface-variant/30">inventory_2</span>
          <h2 className="text-primary text-3xl font-display-lg">No Order Found</h2>
          <p className="text-on-surface-variant max-w-md">
            It seems like no order was placed. Browse our collection and discover something special.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-button-text text-button-text uppercase tracking-widest px-8 py-4 hover:opacity-90 transition-opacity"
          >
            Explore Collections
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      )}
    </main>
  );
};

export default OrderSuccess;
