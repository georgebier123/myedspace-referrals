// Custom form field configuration
export interface CustomFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea';
  required: boolean;
  options?: string[]; // For select fields
  placeholder?: string;
}

// Standard form fields that can be toggled
export interface StandardFormFields {
  phone: boolean;
  child_grade: boolean;
}

// Phone format options
export type PhoneFormat = 'US' | 'UK' | 'AU' | 'EU' | 'none';

// Campaign copy configuration
export interface CampaignCopy {
  // Referrer registration page
  referrer_page_title: string;
  referrer_page_subtitle: string;
  referrer_form_heading: string;
  referrer_success_title: string;
  referrer_success_message: string;
  // Friend signup page
  friend_page_title: string;
  friend_page_subtitle: string;
  friend_form_heading: string;
  friend_success_title: string;
  friend_success_message: string;
  friend_submit_button: string;
  // Reward info
  reward_description: string;
  // Terms
  terms_content: string;
}

// Campaign data structure
export interface Campaign {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  reward_amount: string;
  reward_type: string;
  hubspot_portal_id: string | null;
  hubspot_form_guid: string | null;
  hubspot_friend_form_guid: string | null;
  slack_notifications: boolean;
  copy: CampaignCopy;
  standard_fields: StandardFormFields;
  custom_fields: CustomFormField[];
  phone_format: PhoneFormat;
  booking_url: string | null;
  created_at: string;
  updated_at: string;
}

// Referrer data structure
export interface Referrer {
  referral_code: string;
  referral_link: string;
  email: string;
  name: string;
  total_referrals: number;
  campaign_id: string;
  created_at: string;
}

// Referrers storage (keyed by email for simplicity since no HubSpot lookup)
export interface ReferrersStore {
  [email: string]: Referrer;
}

// Referral status types
export type ReferralStatus =
  | 'pending'      // Friend signed up, waiting for purchase
  | 'purchased'    // Purchase made, waiting for 30-day window
  | 'qualified'    // 30 days passed, eligible for reward
  | 'rewarded'     // Reward has been issued
  | 'disqualified'; // Refunded or cancelled

// Individual referral data
export interface Referral {
  id: string;
  referrer_email: string;
  referrer_name: string;
  referred_email: string;
  referred_name: string;
  referred_phone: string;
  referred_child_grade: string;
  signup_date: string;
  purchase_date: string | null;
  reward_eligible_date: string | null;
  status: ReferralStatus;
  reward_issued_date: string | null;
  notes: string;
  campaign_id: string;
  custom_fields?: Record<string, string>; // Store custom field values
  created_at: string;
}
