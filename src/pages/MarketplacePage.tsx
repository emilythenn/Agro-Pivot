import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag, Plus, Search, Star, Package, Wheat, Sprout,
  MapPin, Loader2, MessageSquare, ShieldCheck, ShieldX, Trash2,
  Upload, Image, Clock, CheckCircle2, XCircle, TruckIcon, PackageCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Product {
  id: string;
  seller_id: string;
  product_type: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  quantity_available: number;
  image_url: string | null;
  category: string | null;
  location_state: string | null;
  location_district: string | null;
  status: string;
  created_at: string;
  seller_name?: string;
  seller_avatar?: string | null;
  seller_role?: string | null;
  seller_verified?: boolean;
  avg_rating?: number;
}

interface Order {
  id: string;
  product_name: string;
  quantity: number;
  total_price: number;
  status: string;
  buyer_notes: string | null;
  seller_notes: string | null;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
}

const ORDER_STATUSES = {
  pending: { label: "Pending", icon: Clock, color: "bg-amber-500/10 text-amber-600", description: "Waiting for seller response" },
  accepted: { label: "Accepted", icon: CheckCircle2, color: "bg-blue-500/10 text-blue-600", description: "Seller accepted, preparing order" },
  preparing: { label: "Preparing", icon: PackageCheck, color: "bg-purple-500/10 text-purple-600", description: "Order is being prepared" },
  delivering: { label: "Delivering", icon: TruckIcon, color: "bg-indigo-500/10 text-indigo-600", description: "Out for delivery" },
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-green-500/10 text-green-600", description: "Order completed" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-destructive/10 text-destructive", description: "Order was cancelled" },
};

export default function MarketplacePage() {
  const { user } = useAuth();
  const { role, canSell } = useUserRole();
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "crop" | "seed">("all");
  
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showSellerProfile, setShowSellerProfile] = useState<string | null>(null);
  const [sellerProfileData, setSellerProfileData] = useState<{ full_name: string; avatar_url: string | null; role: string | null } | null>(null);
  const [sellerRatings, setSellerRatings] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  
  const [newProduct, setNewProduct] = useState({
    name: "", description: "", price: "", unit: "kg", quantity_available: "",
    product_type: role === "seed_seller" ? "seed" : "crop", category: "",
    location_state: "", location_district: "",
  });
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [orderForm, setOrderForm] = useState({ quantity: "1", notes: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");
  const [sellerNoteInput, setSellerNoteInput] = useState<Record<string, string>>({});

  // Fetch products
  useEffect(() => {
    fetchProducts();
    if (user) {
      fetchMyProducts();
      fetchOrders();
    }
  }, [user]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_products")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (data) {
      const sellerIds = [...new Set(data.map(p => p.seller_id))];
      
      const { data: profiles } = await supabase.rpc("get_seller_profiles", { seller_ids: sellerIds });
      
      const { data: verifs } = await supabase
        .from("verification_requests")
        .select("user_id, status")
        .in("user_id", sellerIds);

      // Fetch avg ratings for each seller
      const ratingPromises = sellerIds.map(id => 
        supabase.rpc("get_user_avg_rating", { _user_id: id })
      );
      const ratingResults = await Promise.all(ratingPromises);
      const ratingMap: Record<string, number> = {};
      sellerIds.forEach((id, i) => {
        ratingMap[id] = ratingResults[i]?.data || 0;
      });
      
      const enriched = data.map(p => ({
        ...p,
        seller_name: profiles?.find((pr: any) => pr.id === p.seller_id)?.full_name || "Unknown Seller",
        seller_avatar: profiles?.find((pr: any) => pr.id === p.seller_id)?.avatar_url || null,
        seller_role: profiles?.find((pr: any) => pr.id === p.seller_id)?.role || null,
        seller_verified: verifs?.some(v => v.user_id === p.seller_id && v.status === "verified") || false,
        avg_rating: ratingMap[p.seller_id] || 0,
      }));
      setProducts(enriched);
    }
    setLoading(false);
  };

  const fetchMyProducts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("marketplace_products")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setMyProducts(data);
  };

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("marketplace_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setOrders(data);
  };

  // Image upload for product
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 5MB", variant: "destructive" });
      return;
    }
    setProductImageFile(file);
    setProductImagePreview(URL.createObjectURL(file));
  };

  const uploadProductImage = async (): Promise<string | null> => {
    if (!productImageFile || !user) return null;
    setUploadingImage(true);
    const ext = productImageFile.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(filePath, productImageFile);
    setUploadingImage(false);
    if (error) {
      toast({ title: "Image upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleAddProduct = async () => {
    if (!user || !newProduct.name || !newProduct.price) {
      toast({ title: "Missing fields", description: "Name and price are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    
    // Upload image if selected
    let imageUrl: string | null = null;
    if (productImageFile) {
      imageUrl = await uploadProductImage();
    }

    const { error } = await supabase.from("marketplace_products").insert({
      seller_id: user.id,
      name: newProduct.name,
      description: newProduct.description || null,
      price: Number(newProduct.price),
      unit: newProduct.unit,
      quantity_available: Number(newProduct.quantity_available) || 0,
      product_type: newProduct.product_type,
      category: newProduct.category || null,
      location_state: newProduct.location_state || null,
      location_district: newProduct.location_district || null,
      image_url: imageUrl,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product listed!", description: "Your product is now visible in the marketplace" });
      setShowAddProduct(false);
      setNewProduct({ name: "", description: "", price: "", unit: "kg", quantity_available: "", product_type: role === "seed_seller" ? "seed" : "crop", category: "", location_state: "", location_district: "" });
      setProductImageFile(null);
      setProductImagePreview(null);
      fetchProducts();
      fetchMyProducts();
    }
  };

  const handlePlaceOrder = async () => {
    if (!user || !selectedProduct) return;
    if (selectedProduct.seller_id === user.id) {
      toast({ title: "Cannot order", description: "You cannot buy your own product", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const qty = Number(orderForm.quantity) || 1;
    const { error } = await supabase.from("marketplace_orders").insert({
      product_id: selectedProduct.id,
      buyer_id: user.id,
      seller_id: selectedProduct.seller_id,
      product_name: selectedProduct.name,
      quantity: qty,
      total_price: qty * selectedProduct.price,
      buyer_notes: orderForm.notes || null,
      buyer_phone: orderForm.phone || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Order placed!", description: "The seller will be notified." });
      setShowOrderDialog(false);
      setOrderForm({ quantity: "1", notes: "", phone: "" });
      fetchOrders();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    await supabase.from("marketplace_products").delete().eq("id", id);
    fetchMyProducts();
    fetchProducts();
    toast({ title: "Product removed" });
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string, sellerNote?: string) => {
    const updateData: any = { status };
    if (sellerNote) updateData.seller_notes = sellerNote;
    await supabase.from("marketplace_orders").update(updateData).eq("id", orderId);
    setSellerNoteInput(prev => ({ ...prev, [orderId]: "" }));
    fetchOrders();
    toast({ title: `Order ${status}`, description: getStatusMessage(status) });
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "accepted": return "Buyer will be notified that you accepted.";
      case "preparing": return "Order is being prepared.";
      case "delivering": return "Order is out for delivery.";
      case "completed": return "Order has been completed.";
      case "cancelled": return "Order has been cancelled.";
      default: return "";
    }
  };

  const viewSellerProfile = async (sellerId: string) => {
    setShowSellerProfile(sellerId);
    const { data: profiles } = await supabase.rpc("get_seller_profiles", { seller_ids: [sellerId] });
    if (profiles && profiles.length > 0) {
      setSellerProfileData(profiles[0] as any);
    }
    const sellerProds = products.filter(p => p.seller_id === sellerId);
    setSellerProducts(sellerProds);
    const { data } = await supabase
      .from("marketplace_ratings")
      .select("*")
      .eq("rated_user_id", sellerId)
      .order("created_at", { ascending: false });
    setSellerRatings(data || []);
  };

  const [ratingForm, setRatingForm] = useState({ rating: 5, review: "" });
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);
  const [existingRatings, setExistingRatings] = useState<Set<string>>(new Set());

  // Fetch existing ratings by this user to prevent duplicates
  useEffect(() => {
    if (!user) return;
    const fetchMyRatings = async () => {
      const { data } = await supabase
        .from("marketplace_ratings")
        .select("order_id")
        .eq("rater_id", user.id);
      if (data) {
        setExistingRatings(new Set(data.map(r => r.order_id).filter(Boolean) as string[]));
      }
    };
    fetchMyRatings();
  }, [user]);

  const handleSubmitRating = async (orderId: string, ratedUserId: string) => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("marketplace_ratings").insert({
      order_id: orderId,
      rater_id: user.id,
      rated_user_id: ratedUserId,
      rating: ratingForm.rating,
      review: ratingForm.review || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message.includes("unique_order_rater") || error.message.includes("duplicate") ? "You already rated this order" : error.message, variant: "destructive" });
    } else {
      toast({ title: "Rating submitted!" });
      setRatingOrderId(null);
      setRatingForm({ rating: 5, review: "" });
      setExistingRatings(prev => new Set([...prev, orderId]));
      fetchProducts(); // Refresh to update avg ratings
    }
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.seller_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.location_state || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.location_district || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === "all" || p.product_type === filterType;
    return matchSearch && matchType;
  });

  const inputClass = "w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" /> Marketplace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Buy and sell crops & seeds</p>
        </div>
        {canSell && (
          <Button onClick={() => setShowAddProduct(true)} className="gap-2">
            <Plus className="h-4 w-4" /> List Product
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          {canSell && <TabsTrigger value="my-listings">My Listings</TabsTrigger>}
          <TabsTrigger value="orders">My Orders</TabsTrigger>
        </TabsList>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-4">
          {/* Search & Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products, sellers, locations..." className={`${inputClass} pl-9`} />
            </div>
            <div className="flex gap-1 bg-secondary/30 rounded-lg p-1">
              {(["all", "crop", "seed"] as const).map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {t === "all" ? "All" : t === "crop" ? "🌾 Crops" : "🌱 Seeds"}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-xl">
              <Package className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => { setSelectedProduct(product); setShowProductDetail(true); }}>
                  {/* Product Image */}
                  <div className="h-40 bg-secondary/30 flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      product.product_type === "seed" ? <Sprout className="h-12 w-12 text-muted-foreground/20" /> : <Wheat className="h-12 w-12 text-muted-foreground/20" />
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${product.product_type === "seed" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}`}>
                          {product.product_type === "seed" ? "🌱 Seed" : "🌾 Crop"}
                        </span>
                        <h3 className="text-sm font-semibold text-foreground mt-1">{product.name}</h3>
                      </div>
                      <p className="text-sm font-bold text-primary">RM{product.price}/{product.unit}</p>
                    </div>
                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {product.location_state && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{product.location_district || product.location_state}</span>}
                      <span>Qty: {product.quantity_available} {product.unit}</span>
                    </div>
                    {/* Seller info */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <button onClick={(e) => { e.stopPropagation(); viewSellerProfile(product.seller_id); }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium overflow-hidden">
                          {product.seller_avatar ? (
                            <img src={product.seller_avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (product.seller_name || "?")[0].toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium flex items-center gap-1">
                            {product.seller_name}
                            {product.seller_verified ? (<><ShieldCheck className="h-3 w-3 text-primary" /><span className="text-[8px] text-primary">Verified</span></>) : (<><ShieldX className="h-3 w-3 text-muted-foreground/40" /><span className="text-[8px] text-muted-foreground/50">Not Verified</span></>)}
                          </span>
                          <span className="text-[9px] text-muted-foreground/60 flex items-center gap-1">
                            {product.avg_rating && product.avg_rating > 0 ? (
                              <>
                                <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                                {Number(product.avg_rating).toFixed(1)}
                              </>
                            ) : (
                              <span className="capitalize">{product.seller_role?.replace("_", " ") || "Seller"}</span>
                            )}
                          </span>
                        </div>
                      </button>
                      {product.seller_id !== user?.id && (
                        <Button size="sm" className="text-xs h-8" onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setShowOrderDialog(true); }}>
                          <ShoppingBag className="h-3 w-3 mr-1" /> Buy
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Listings Tab */}
        {canSell && (
          <TabsContent value="my-listings" className="space-y-4">
            {myProducts.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border rounded-xl">
                <Package className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">You haven't listed any products yet</p>
                <Button onClick={() => setShowAddProduct(true)} className="gap-2"><Plus className="h-4 w-4" /> List Product</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myProducts.map(p => (
                  <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-secondary/30 flex items-center justify-center overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : p.product_type === "seed" ? (
                          <Sprout className="h-5 w-5 text-muted-foreground/40" />
                        ) : (
                          <Wheat className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-foreground">{p.name}</h3>
                        <p className="text-xs text-muted-foreground">RM{p.price}/{p.unit} · Qty: {p.quantity_available}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status === "active" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                        {p.status}
                      </span>
                      <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => handleDeleteProduct(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-xl">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const isBuyer = order.buyer_id === user?.id;
                const isSeller = order.seller_id === user?.id;
                const statusInfo = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES] || ORDER_STATUSES.pending;
                const StatusIcon = statusInfo.icon;
                const alreadyRated = existingRatings.has(order.id);

                return (
                  <div key={order.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">{order.product_name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {isBuyer ? "You bought" : "You sold"} · {new Date(order.created_at).toLocaleDateString("en-MY")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">RM{order.total_price}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Status progress bar */}
                    {order.status !== "cancelled" && (
                      <div className="flex items-center gap-1">
                        {["pending", "accepted", "preparing", "delivering", "completed"].map((step, i) => {
                          const steps = ["pending", "accepted", "preparing", "delivering", "completed"];
                          const currentIdx = steps.indexOf(order.status);
                          const isActive = i <= currentIdx;
                          return (
                            <div key={step} className={`h-1.5 flex-1 rounded-full transition-colors ${isActive ? "bg-primary" : "bg-border/50"}`} />
                          );
                        })}
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground">{statusInfo.description}</p>

                    {order.buyer_notes && <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-2">📝 Buyer: {order.buyer_notes}</p>}
                    {order.seller_notes && <p className="text-xs text-muted-foreground bg-primary/5 rounded-lg p-2">💬 Seller: {order.seller_notes}</p>}
                    
                    {/* Seller actions */}
                    {isSeller && (
                      <div className="space-y-2">
                        {/* Seller note input */}
                        {["pending", "accepted", "preparing"].includes(order.status) && (
                          <input
                            value={sellerNoteInput[order.id] || ""}
                            onChange={e => setSellerNoteInput(prev => ({ ...prev, [order.id]: e.target.value }))}
                            placeholder="Add a note for the buyer (optional)"
                            className={`${inputClass} text-xs`}
                          />
                        )}
                        <div className="flex gap-2">
                          {order.status === "pending" && (
                            <>
                              <Button size="sm" className="text-xs h-7" onClick={() => handleUpdateOrderStatus(order.id, "accepted", sellerNoteInput[order.id])}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Accept
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleUpdateOrderStatus(order.id, "cancelled", sellerNoteInput[order.id])}>
                                <XCircle className="h-3 w-3 mr-1" /> Decline
                              </Button>
                            </>
                          )}
                          {order.status === "accepted" && (
                            <Button size="sm" className="text-xs h-7" onClick={() => handleUpdateOrderStatus(order.id, "preparing", sellerNoteInput[order.id])}>
                              <PackageCheck className="h-3 w-3 mr-1" /> Start Preparing
                            </Button>
                          )}
                          {order.status === "preparing" && (
                            <Button size="sm" className="text-xs h-7" onClick={() => handleUpdateOrderStatus(order.id, "delivering", sellerNoteInput[order.id])}>
                              <TruckIcon className="h-3 w-3 mr-1" /> Out for Delivery
                            </Button>
                          )}
                          {order.status === "delivering" && (
                            <Button size="sm" className="text-xs h-7" onClick={() => handleUpdateOrderStatus(order.id, "completed")}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Completed
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Buyer actions */}
                    {isBuyer && order.status === "completed" && !alreadyRated && (
                      <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setRatingOrderId(order.id)}>
                        <Star className="h-3 w-3" /> Rate Seller
                      </Button>
                    )}
                    {isBuyer && alreadyRated && order.status === "completed" && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" /> You've rated this order
                      </p>
                    )}

                    {/* Rating form */}
                    {ratingOrderId === order.id && (
                      <div className="bg-secondary/20 rounded-lg p-3 space-y-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <button key={s} onClick={() => setRatingForm(f => ({ ...f, rating: s }))}
                              className="transition-colors">
                              <Star className={`h-5 w-5 ${s <= ratingForm.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                            </button>
                          ))}
                        </div>
                        <input value={ratingForm.review} onChange={e => setRatingForm(f => ({ ...f, review: e.target.value }))}
                          placeholder="Optional review..." className={inputClass} />
                        <div className="flex gap-2">
                          <Button size="sm" className="text-xs h-7" disabled={submitting}
                            onClick={() => handleSubmitRating(order.id, order.seller_id)}>Submit</Button>
                          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setRatingOrderId(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={(open) => { setShowAddProduct(open); if (!open) { setProductImageFile(null); setProductImagePreview(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> List New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {(["crop", "seed"] as const).map(t => (
                <button key={t} onClick={() => setNewProduct(p => ({ ...p, product_type: t }))}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${newProduct.product_type === t ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/30 border-border text-muted-foreground"}`}>
                  {t === "crop" ? "🌾 Crop" : "🌱 Seed"}
                </button>
              ))}
            </div>

            {/* Image Upload */}
            <div
              onClick={() => imageInputRef.current?.click()}
              className="border-2 border-dashed border-border/50 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-secondary/20 transition-colors"
            >
              {productImagePreview ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden">
                  <img src={productImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-medium">Click to change</p>
                  </div>
                </div>
              ) : (
                <>
                  <Image className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Click to add product photo (max 5MB)</p>
                </>
              )}
              <input ref={imageInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
            </div>

            <input value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
              placeholder="Product name *" className={inputClass} />
            <textarea value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
              placeholder="Description" className={`${inputClass} min-h-[80px]`} />
            <div className="grid grid-cols-3 gap-2">
              <input type="number" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                placeholder="Price (RM) *" className={inputClass} />
              <select value={newProduct.unit} onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))} className={inputClass}>
                <option value="kg">per kg</option>
                <option value="pack">per pack</option>
                <option value="bag">per bag</option>
                <option value="unit">per unit</option>
              </select>
              <input type="number" value={newProduct.quantity_available} onChange={e => setNewProduct(p => ({ ...p, quantity_available: e.target.value }))}
                placeholder="Qty" className={inputClass} />
            </div>
            <input value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}
              placeholder="Category (e.g. Rice, Chili)" className={inputClass} />
            <div className="grid grid-cols-2 gap-2">
              <input value={newProduct.location_state} onChange={e => setNewProduct(p => ({ ...p, location_state: e.target.value }))}
                placeholder="State" className={inputClass} />
              <input value={newProduct.location_district} onChange={e => setNewProduct(p => ({ ...p, location_district: e.target.value }))}
                placeholder="District" className={inputClass} />
            </div>
            <Button onClick={handleAddProduct} disabled={submitting || uploadingImage} className="w-full gap-2">
              {(submitting || uploadingImage) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {uploadingImage ? "Uploading image..." : "List Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" /> Place Order</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-3">
              <div className="bg-secondary/20 rounded-lg p-3 flex items-center gap-3">
                {selectedProduct.image_url && (
                  <img src={selectedProduct.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground">RM{selectedProduct.price}/{selectedProduct.unit} · by {selectedProduct.seller_name}</p>
                </div>
              </div>
              <input type="number" min="1" value={orderForm.quantity} onChange={e => setOrderForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="Quantity" className={inputClass} />
              <p className="text-sm font-medium text-primary text-right">
                Total: RM{((Number(orderForm.quantity) || 1) * selectedProduct.price).toFixed(2)}
              </p>
              <input value={orderForm.phone} onChange={e => setOrderForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Your phone number (for seller contact)" className={inputClass} />
              <textarea value={orderForm.notes} onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes for seller (optional)" className={`${inputClass} min-h-[60px]`} />
              <p className="text-[10px] text-muted-foreground">The seller will be notified and contact you to arrange payment and delivery.</p>
              <Button onClick={handlePlaceOrder} disabled={submitting} className="w-full gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Place Order
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Detail Dialog */}
      <Dialog open={showProductDetail} onOpenChange={setShowProductDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProduct?.product_type === "seed" ? <Sprout className="h-5 w-5 text-primary" /> : <Wheat className="h-5 w-5 text-primary" />}
              Product Details
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="h-52 bg-secondary/20 rounded-xl flex items-center justify-center overflow-hidden">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  selectedProduct.product_type === "seed"
                    ? <Sprout className="h-16 w-16 text-muted-foreground/20" />
                    : <Wheat className="h-16 w-16 text-muted-foreground/20" />
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${selectedProduct.product_type === "seed" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}`}>
                      {selectedProduct.product_type === "seed" ? "🌱 Seed" : "🌾 Crop"}
                    </span>
                    {selectedProduct.category && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground ml-1">
                        {selectedProduct.category}
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-foreground mt-1.5">{selectedProduct.name}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">RM{selectedProduct.price}</p>
                    <p className="text-xs text-muted-foreground">per {selectedProduct.unit}</p>
                  </div>
                </div>

                {selectedProduct.description && (
                  <div className="bg-secondary/20 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-sm text-foreground leading-relaxed">{selectedProduct.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/20 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Available Quantity</p>
                    <p className="text-sm font-semibold">{selectedProduct.quantity_available} {selectedProduct.unit}</p>
                  </div>
                  {(selectedProduct.location_state || selectedProduct.location_district) && (
                    <div className="bg-secondary/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</p>
                      <p className="text-sm font-semibold">
                        {[selectedProduct.location_district, selectedProduct.location_state].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground">
                  Listed on {new Date(selectedProduct.created_at).toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" })}
                </div>
              </div>

              {/* Seller Info */}
              <div className="flex items-center justify-between pt-3 border-t border-border/30">
                <button
                  onClick={() => { setShowProductDetail(false); viewSellerProfile(selectedProduct.seller_id); }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium overflow-hidden">
                    {selectedProduct.seller_avatar ? (
                      <img src={selectedProduct.seller_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (selectedProduct.seller_name || "?")[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-foreground flex items-center gap-1">
                      {selectedProduct.seller_name}
                      {selectedProduct.seller_verified ? (<><ShieldCheck className="h-3.5 w-3.5 text-primary" /><span className="text-[9px] text-primary">Verified</span></>) : (<><ShieldX className="h-3.5 w-3.5 text-muted-foreground/40" /><span className="text-[9px] text-muted-foreground/50">Not Verified</span></>)}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span className="capitalize">{selectedProduct.seller_role?.replace("_", " ") || "Seller"}</span>
                      {selectedProduct.avg_rating && selectedProduct.avg_rating > 0 && (
                        <span className="flex items-center gap-0.5 ml-1">
                          <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                          {Number(selectedProduct.avg_rating).toFixed(1)}
                        </span>
                      )}
                    </span>
                  </div>
                </button>
                {selectedProduct.seller_id !== user?.id && (
                  <Button onClick={() => { setShowProductDetail(false); setShowOrderDialog(true); }} className="gap-2">
                    <ShoppingBag className="h-4 w-4" /> Buy Now
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Seller Profile Dialog */}
      <Dialog open={!!showSellerProfile} onOpenChange={() => { setShowSellerProfile(null); setSellerProfileData(null); setSellerProducts([]); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Seller Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {sellerProfileData && (
              <div className="flex items-center gap-3 bg-secondary/20 rounded-lg p-4">
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-lg font-semibold overflow-hidden border-2 border-primary/20">
                  {sellerProfileData.avatar_url ? (
                    <img src={sellerProfileData.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (sellerProfileData.full_name || "?")[0].toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{sellerProfileData.full_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{sellerProfileData.role?.replace("_", " ") || "User"}</p>
                  {sellerRatings.length > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-medium">
                        {(sellerRatings.reduce((a, r) => a + r.rating, 0) / sellerRatings.length).toFixed(1)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">({sellerRatings.length} reviews)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {sellerProducts.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Products ({sellerProducts.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {sellerProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-card border border-border/50 rounded-lg p-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-secondary/30 flex items-center justify-center overflow-hidden">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                          ) : p.product_type === "seed" ? (
                            <Sprout className="h-3.5 w-3.5 text-muted-foreground/40" />
                          ) : (
                            <Wheat className="h-3.5 w-3.5 text-muted-foreground/40" />
                          )}
                        </div>
                        <span className="text-xs font-medium">{p.name}</span>
                      </div>
                      <span className="text-xs font-bold text-primary">RM{p.price}/{p.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sellerRatings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No reviews yet</p>
            ) : (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Reviews</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sellerRatings.map(r => (
                    <div key={r.id} className="bg-card border border-border/50 rounded-lg p-3">
                      <div className="flex gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                      {r.review && <p className="text-xs text-muted-foreground">{r.review}</p>}
                      <p className="text-[10px] text-muted-foreground/50 mt-1">{new Date(r.created_at).toLocaleDateString("en-MY")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
