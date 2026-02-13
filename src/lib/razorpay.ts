import { toast } from "sonner";

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    image?: string;
    order_id: string;
    handler: (response: any) => void;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    theme?: {
        color: string;
    };
    modal?: {
        ondismiss?: () => void;
    };
}

export const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export const openRazorpayCheckout = async (options: RazorpayOptions) => {
    const res = await loadRazorpayScript();

    if (!res) {
        toast.error("Razorpay SDK failed to load. Are you online?");
        return;
    }

    // @ts-ignore
    const rzp = new window.Razorpay(options);

    rzp.on('payment.failed', function (response: any) {
        toast.error(`Payment Failed: ${response.error.description}`);
        console.error("Payment failed:", response.error);
    });

    rzp.open();
};
