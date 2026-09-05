/**
 * Razorpay Integration Utility
 * Client-side utility for Razorpay payment integration
 */

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  subscription_id?: string;
  prefill: {
    name: string;
    email: string;
    contact?: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal: {
    ondismiss: () => void;
  };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  razorpay_subscription_id?: string;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: () => void) => void;
}

/**
 * Load Razorpay script dynamically
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if script already loaded
    if (typeof window.Razorpay !== 'undefined') {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Initialize Razorpay payment
 */
export const initiateRazorpayPayment = async (
  config: {
    amount: number;
    planName: string;
    institutionName: string;
    institutionEmail: string;
    subscriptionId: string;
    razorpayKeyId: string;
  },
  onSuccess: (response: RazorpayResponse) => void,
  onFailure: () => void
): Promise<void> => {
  const scriptLoaded = await loadRazorpayScript();
  
  if (!scriptLoaded) {
    console.error('Failed to load Razorpay script');
    onFailure();
    return;
  }

  const options: RazorpayOptions = {
    key: config.razorpayKeyId,
    amount: config.amount * 100, // Amount in paise (Razorpay accepts amount in smallest currency unit)
    currency: 'INR',
    name: 'VidyaMitra',
    description: `${config.planName} Subscription`,
    prefill: {
      name: config.institutionName,
      email: config.institutionEmail,
    },
    theme: {
      color: '#7c3aed', // Primary purple color
    },
    handler: (response: RazorpayResponse) => {
      console.log('Payment successful:', response);
      onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        console.log('Payment modal closed');
        onFailure();
      },
    },
  };

  try {
    const razorpay = new window.Razorpay(options);
    razorpay.open();
  } catch (error) {
    console.error('Error opening Razorpay:', error);
    onFailure();
  }
};

/**
 * Create Razorpay order (to be called from backend)
 */
export interface CreateOrderParams {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

/**
 * Verify payment signature (to be called from backend)
 */
export const verifyRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean => {
  // This should be done on the server side for security
  // This is just a reference implementation
  const crypto = require('crypto');
  const text = orderId + '|' + paymentId;
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(text)
    .digest('hex');
  
  return generatedSignature === signature;
};

/**
 * Format amount for display
 */
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Get plan color based on plan name
 */
export const getPlanColor = (planName: string): string => {
  const colors: Record<string, string> = {
    starter: 'from-blue-500 to-cyan-500',
    professional: 'from-purple-500 to-pink-500',
    enterprise: 'from-orange-500 to-red-500',
    mega: 'from-violet-600 to-purple-600',
  };
  return colors[planName.toLowerCase()] || 'from-gray-500 to-gray-600';
};

/**
 * Get plan badge color
 */
export const getPlanBadgeColor = (planName: string): string => {
  const colors: Record<string, string> = {
    starter: 'bg-blue-100 text-blue-700 border-blue-200',
    professional: 'bg-purple-100 text-purple-700 border-purple-200',
    enterprise: 'bg-orange-100 text-orange-700 border-orange-200',
    mega: 'bg-violet-100 text-violet-700 border-violet-200',
  };
  return colors[planName.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200';
};
