import { NextRequest, NextResponse } from 'next/server';
import { getReferrerByCode, createReferral } from '@/lib/data';
import { submitReferredFriendToHubSpot } from '@/lib/hubspot';
import { notifyNewReferral } from '@/lib/slack';
import { getCampaignById } from '@/lib/campaigns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      referralCode,
      friendName,
      friendEmail,
      friendPhone,
      childGrade,
      campaignId,
      customFields,
      // Legacy support
      name,
      email,
      phone,
    } = body;

    // Support both old and new field names
    const actualName = friendName || name;
    const actualEmail = friendEmail || email;
    const actualPhone = friendPhone || phone || '';

    // Validate input
    if (!referralCode || !actualName || !actualEmail) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(actualEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Look up referrer by code
    const referrer = await getReferrerByCode(referralCode);
    if (!referrer) {
      return NextResponse.json(
        { error: 'Invalid referral code. Please check your link and try again.' },
        { status: 400 }
      );
    }

    // Use campaign from referrer or provided
    const effectiveCampaignId = campaignId || referrer.campaign_id;

    // Create referral record
    const referral = await createReferral(
      referrer,
      actualEmail,
      actualName,
      actualPhone,
      childGrade || '',
      effectiveCampaignId,
      customFields || {}
    );

    // Get campaign for HubSpot config and booking URL
    const campaign = await getCampaignById(effectiveCampaignId);

    // Submit to HubSpot (must be awaited in serverless environments)
    const hubspotResult = await submitReferredFriendToHubSpot(
      actualEmail,
      actualName,
      actualPhone,
      referrer.email,
      campaign?.hubspot_portal_id || undefined,
      campaign?.hubspot_friend_form_guid || campaign?.hubspot_form_guid || undefined,
      campaign ? { name: campaign.name, slug: campaign.slug } : undefined
    );

    if (!hubspotResult.success) {
      console.error('HubSpot submission failed:', hubspotResult.error);
    }

    // Send Slack notification (if enabled for campaign)
    if (campaign?.slack_notifications !== false) {
      notifyNewReferral(referrer.name, actualName, actualEmail).catch(console.error);
    }

    // Build redirect URL with pre-filled form data
    // Use campaign-specific URL if set, otherwise fall back to env var or default
    const bookingUrl = campaign?.booking_url || process.env.BOOKING_URL || 'https://myedspace-booking.vercel.app/book';
    const redirectUrl = new URL(bookingUrl);
    redirectUrl.searchParams.set('name', actualName);
    redirectUrl.searchParams.set('email', actualEmail);
    if (actualPhone) {
      redirectUrl.searchParams.set('phone', actualPhone);
    }
    redirectUrl.searchParams.set('utm_source', 'referral');
    redirectUrl.searchParams.set('utm_medium', 'friend_signup');
    redirectUrl.searchParams.set('utm_campaign', campaign?.slug || 'referral_program');
    redirectUrl.searchParams.set('ref', referralCode);

    return NextResponse.json({
      success: true,
      referral,
      bookingUrl: redirectUrl.toString(),
      // Legacy support
      redirectUrl: redirectUrl.toString(),
      message: 'Thank you for signing up!',
      hubspot: {
        submitted: hubspotResult.success,
        error: hubspotResult.error || null,
      },
    });
  } catch (error) {
    console.error('Referral submission error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
