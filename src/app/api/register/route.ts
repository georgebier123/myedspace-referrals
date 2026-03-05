import { NextRequest, NextResponse } from 'next/server';
import { createReferrer, getReferrerByEmail } from '@/lib/data';
import { submitReferrerToHubSpot } from '@/lib/hubspot';
import { DEFAULT_CAMPAIGN_ID, getCampaignById } from '@/lib/campaigns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, campaignId, campaignSlug } = body;

    // Validate input
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Use provided campaign ID or default
    const effectiveCampaignId = campaignId || DEFAULT_CAMPAIGN_ID;

    // Check if referrer already exists for this campaign
    const existingReferrer = await getReferrerByEmail(email, effectiveCampaignId);
    if (existingReferrer) {
      return NextResponse.json({
        success: true,
        referrer: existingReferrer,
        isExisting: true,
        message: 'Welcome back! Here is your existing referral link.',
      });
    }

    // Create new referrer for this campaign
    let referrer;
    try {
      referrer = await createReferrer(email, name, effectiveCampaignId, campaignSlug);
    } catch (createError) {
      // If creation fails, it might be a database constraint error
      // Try to fetch existing referrer (without campaign filter to find any existing)
      console.error('Create referrer error:', createError);

      // First try with campaign ID
      const existingForCampaign = await getReferrerByEmail(email, effectiveCampaignId);
      if (existingForCampaign) {
        return NextResponse.json({
          success: true,
          referrer: existingForCampaign,
          isExisting: true,
          message: 'Welcome back! Here is your existing referral link.',
        });
      }

      // Try without campaign ID to find any existing referrer
      const existingAny = await getReferrerByEmail(email);
      if (existingAny) {
        return NextResponse.json({
          success: true,
          referrer: existingAny,
          isExisting: true,
          message: 'Welcome back! Here is your existing referral link.',
        });
      }

      // If we still can't find anything, re-throw the error
      throw createError;
    }

    // Get campaign for HubSpot config
    const campaign = await getCampaignById(effectiveCampaignId);

    // Submit to HubSpot (non-blocking - we don't fail if HubSpot fails)
    // Use campaign-specific HubSpot config if available, otherwise use env vars
    const hubspotResult = await submitReferrerToHubSpot(
      email,
      name,
      referrer.referral_link,
      campaign?.hubspot_portal_id || undefined,
      campaign?.hubspot_form_guid || undefined,
      campaign ? { name: campaign.name, slug: campaign.slug } : undefined
    );

    if (!hubspotResult.success) {
      console.error('HubSpot submission failed:', hubspotResult.error);
      // We still return success since local storage worked
    }

    return NextResponse.json({
      success: true,
      referrer,
      isExisting: false,
      message: 'Your referral link has been created!',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
