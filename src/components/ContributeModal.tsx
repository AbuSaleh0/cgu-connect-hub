import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { dbService } from "@/database";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { sessionManager } from "@/lib/session";

interface ContributeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ContributeModal = ({ isOpen, onClose }: ContributeModalProps) => {
    const [amount, setAmount] = useState<string>("100");
    const [loading, setLoading] = useState(false);
    const currentUser = sessionManager.getCurrentUser();

    const handlePayment = async () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setLoading(true);
        try {
            // 1. Create Order on Backend (Secure)
            const orderData = await dbService.createContributionOrder(Number(amount));

            if (!orderData || !orderData.id) {
                throw new Error("Failed to create order");
            }

            // 2. Open Razorpay Checkout
            await openRazorpayCheckout({
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || "", // Will be loaded from env
                amount: orderData.amount, // Amount in paise
                currency: orderData.currency,
                name: "CGU Connect",
                description: "Contribution to CGU Connect",
                image: "/assets/favicon_io/android-chrome-192x192.png", // Use app icon
                order_id: orderData.id,
                handler: async (response: any) => {
                    // Success Handler
                    console.log("Payment Successful:", response);
                    toast.success(`Thank you for your contribution of ₹${amount}!`);
                    onClose();
                },
                prefill: {
                    name: currentUser?.display_name || "",
                    email: currentUser?.email || "",
                    contact: "", // Optional: specific user phone if available
                },
                theme: {
                    color: "#0F172A", // Slate-900 or primary color
                },
            });

        } catch (error: any) {
            console.error("Payment initiation failed:", error);
            toast.error(error.message || "Failed to initiate payment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                        Contribute to CGU Connect
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <p className="text-sm text-muted-foreground">
                        Your support helps us maintain servers, domains, and keep the platform running for everyone.
                    </p>

                    <div className="grid gap-2">
                        <Label htmlFor="amount">Amount (INR)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                            <Input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="pl-8"
                                placeholder="Enter amount"
                                min="1"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 justify-center mt-2">
                        {[50, 100, 500].map((val) => (
                            <Button
                                key={val}
                                variant="outline"
                                size="sm"
                                onClick={() => setAmount(val.toString())}
                                className={amount === val.toString() ? "border-primary bg-primary/5" : ""}
                            >
                                ₹{val}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handlePayment} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            "Pay Now"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ContributeModal;
