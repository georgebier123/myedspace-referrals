import { createClient } from '@supabase/supabase-js';
import { Campaign, CampaignCopy, StandardFormFields, CustomFormField, PhoneFormat } from './types';

// Default campaign ID for backwards compatibility
export const DEFAULT_CAMPAIGN_ID = '00000000-0000-0000-0000-000000000001';

// Get Supabase client
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
  }

  return createClient(url, key);
}

// Phone format configurations
export const PHONE_FORMATS: Record<PhoneFormat, { placeholder: string; label: string }> = {
  US: { placeholder: '+1 (555) 123-4567', label: 'United States (+1)' },
  UK: { placeholder: '+44 7911 123456', label: 'United Kingdom (+44)' },
  AU: { placeholder: '+61 412 345 678', label: 'Australia (+61)' },
  EU: { placeholder: '+49 151 12345678', label: 'Europe (Generic)' },
  none: { placeholder: 'Enter phone number', label: 'No format' },
};

// Default copy for new campaigns
export const defaultCampaignCopy: CampaignCopy = {
  referrer_page_title: 'Refer a Friend',
  referrer_page_subtitle: 'Share with friends and earn rewards!',
  referrer_form_heading: 'Get Your Referral Link',
  referrer_success_title: "You're In!",
  referrer_success_message: 'Share your unique link with friends to start earning rewards.',
  friend_page_title: 'Welcome!',
  friend_page_subtitle: "Your friend thinks you'll love us",
  friend_form_heading: 'Sign Up for Your Free Trial',
  friend_success_title: 'Thanks for signing up!',
  friend_success_message: "We'll be in touch soon to get you started.",
  friend_submit_button: 'Sign Up & Book Session',
  reward_description: 'Get rewarded for each friend who signs up!',
  terms_content: 'Standard terms and conditions apply.',
};

// Default standard fields
export const defaultStandardFields: StandardFormFields = {
  phone: true,
  child_grade: true,
};

// ================== CAMPAIGNS ==================

export async function getCampaigns(): Promise<Campaign[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching campaigns:', error);
    return [];
  }

  return (data || []).map(mapCampaignFromDb);
}

export async function getActiveCampaigns(): Promise<Campaign[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching active campaigns:', error);
    return [];
  }

  return (data || []).map(mapCampaignFromDb);
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching campaign by id:', error);
    return null;
  }

  return mapCampaignFromDb(data);
}

export async function getCampaignBySlug(slug: string): Promise<Campaign | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return mapCampaignFromDb(data);
}

export async function createCampaign(campaign: {
  slug: string;
  name: string;
  reward_amount: string;
  reward_type: string;
  hubspot_portal_id?: string;
  hubspot_form_guid?: string;
  copy?: Partial<CampaignCopy>;
  standard_fields?: Partial<StandardFormFields>;
  custom_fields?: CustomFormField[];
}): Promise<Campaign | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      slug: campaign.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      name: campaign.name,
      active: true,
      reward_amount: campaign.reward_amount,
      reward_type: campaign.reward_type,
      hubspot_portal_id: campaign.hubspot_portal_id || null,
      hubspot_form_guid: campaign.hubspot_form_guid || null,
      hubspot_friend_form_guid: null,
      slack_notifications: true,
      copy: { ...defaultCampaignCopy, ...campaign.copy },
      standard_fields: { ...defaultStandardFields, ...campaign.standard_fields },
      custom_fields: campaign.custom_fields || [],
      phone_format: 'US',
      booking_url: null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating campaign:', error);
    return null;
  }

  return mapCampaignFromDb(data);
}

export async function updateCampaign(
  id: string,
  updates: Partial<{
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
  }>
): Promise<Campaign | null> {
  const supabase = getSupabase();

  const updateData: Record<string, unknown> = {};

  if (updates.slug !== undefined) {
    updateData.slug = updates.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.active !== undefined) updateData.active = updates.active;
  if (updates.reward_amount !== undefined) updateData.reward_amount = updates.reward_amount;
  if (updates.reward_type !== undefined) updateData.reward_type = updates.reward_type;
  if (updates.hubspot_portal_id !== undefined) updateData.hubspot_portal_id = updates.hubspot_portal_id;
  if (updates.hubspot_form_guid !== undefined) updateData.hubspot_form_guid = updates.hubspot_form_guid;
  if (updates.hubspot_friend_form_guid !== undefined) updateData.hubspot_friend_form_guid = updates.hubspot_friend_form_guid;
  if (updates.slack_notifications !== undefined) updateData.slack_notifications = updates.slack_notifications;
  if (updates.copy !== undefined) updateData.copy = updates.copy;
  if (updates.standard_fields !== undefined) updateData.standard_fields = updates.standard_fields;
  if (updates.custom_fields !== undefined) updateData.custom_fields = updates.custom_fields;
  if (updates.phone_format !== undefined) updateData.phone_format = updates.phone_format;
  if (updates.booking_url !== undefined) updateData.booking_url = updates.booking_url;

  const { data, error } = await supabase
    .from('campaigns')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating campaign:', error);
    return null;
  }

  return mapCampaignFromDb(data);
}

export async function deleteCampaign(id: string): Promise<boolean> {
  // Don't allow deleting the default campaign
  if (id === DEFAULT_CAMPAIGN_ID) {
    console.error('Cannot delete default campaign');
    return false;
  }

  const supabase = getSupabase();

  // Check if there are any referrers or referrals using this campaign
  const { count: referrersCount } = await supabase
    .from('referrers')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', id);

  const { count: referralsCount } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', id);

  if ((referrersCount || 0) > 0 || (referralsCount || 0) > 0) {
    console.error('Cannot delete campaign with existing referrers or referrals');
    return false;
  }

  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting campaign:', error);
    return false;
  }

  return true;
}

// Get campaign statistics
export async function getCampaignStats(campaignId: string) {
  const supabase = getSupabase();

  const { count: referrersCount } = await supabase
    .from('referrers')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  const { count: referralsCount } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  const { count: qualifiedCount } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'qualified');

  const { count: rewardedCount } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'rewarded');

  return {
    referrers: referrersCount || 0,
    referrals: referralsCount || 0,
    qualified: qualifiedCount || 0,
    rewarded: rewardedCount || 0,
  };
}

// Helper function to map database row to Campaign type
function mapCampaignFromDb(row: Record<string, unknown>): Campaign {
  // Ensure copy has all required fields with defaults
  const copy = {
    ...defaultCampaignCopy,
    ...(row.copy as Partial<CampaignCopy>),
  };

  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    active: row.active as boolean,
    reward_amount: row.reward_amount as string,
    reward_type: row.reward_type as string,
    hubspot_portal_id: row.hubspot_portal_id as string | null,
    hubspot_form_guid: row.hubspot_form_guid as string | null,
    hubspot_friend_form_guid: row.hubspot_friend_form_guid as string | null,
    slack_notifications: (row.slack_notifications as boolean) ?? true,
    copy,
    standard_fields: row.standard_fields as StandardFormFields,
    custom_fields: row.custom_fields as CustomFormField[],
    phone_format: (row.phone_format as PhoneFormat) || 'US',
    booking_url: row.booking_url as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// Generate referral link for a campaign
export function generateCampaignReferralLink(campaignSlug: string, referralCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/${campaignSlug}/refer?ref=${referralCode}`;
}
