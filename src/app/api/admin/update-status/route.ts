import { NextRequest, NextResponse } from 'next/server';
import { validateAdminPassword } from '@/lib/auth';
import { updateReferralStatus, getReferralById } from '@/lib/data';
import { notifyReferralQualified } from '@/lib/slack';
import { updateReferrerStatus } from '@/lib/hubspot';
import { getCampaignById } from '@/lib/campaigns';
import { ReferralStatus } from '@/lib/types';

export async function POST(request: NextRequest) {
  // Check authentication
  const password = request.cookies.get('admin_auth')?.value;
  if (!password || !validateAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { referralId, action, notes } = body;

    if (!referralId || !action) {
      return NextResponse.json(
        { error: 'Referral ID and action are required' },
        { status: 400 }
      );
    }

    const referral = await getReferralById(referralId);
    if (!referral) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    let updates: Partial<{
      status: ReferralStatus;
      purchase_date: string | null;
      reward_eligible_date: string | null;
      reward_issued_date: string | null;
      notes: string;
    }> = {};

    const now = new Date().toISOString();

    switch (action) {
      case 'mark_purchased':
        const eligibleDate = new Date();
        eligibleDate.setDate(eligibleDate.getDate() + 30);
        updates = {
          status: 'purchased',
          purchase_date: now,
          reward_eligible_date: eligibleDate.toISOString(),
        };
        break;

      case 'mark_qualified':
        updates = { status: 'qualified' };
        // Send Slack notification (if enabled for campaign)
        const campaign = await getCampaignById(referral.campaign_id);
        if (campaign?.slack_notifications !== false) {
          await notifyReferralQualified(
            referral.referrer_name,
            referral.referrer_email,
            referral.referred_name
          );
        }
        // Update HubSpot contact property to trigger email workflow
        const hubspotResult = await updateReferrerStatus(
          referral.referrer_email,
          'qualified'
        );
        if (!hubspotResult.success) {
          console.error('HubSpot update failed:', hubspotResult.error);
        }
        break;

      case 'mark_rewarded':
        updates = {
          status: 'rewarded',
          reward_issued_date: now,
        };
        break;

      case 'disqualify':
        updates = {
          status: 'disqualified',
          notes: notes || referral.notes,
        };
        break;

      case 'add_notes':
        updates = { notes: notes || '' };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedReferral = await updateReferralStatus(referralId, updates);

    return NextResponse.json({
      success: true,
      referral: updatedReferral,
    });
  } catch (error) {
    console.error('Error updating referral:', error);
    return NextResponse.json(
      { error: 'Failed to update referral' },
      { status: 500 }
    );
  }
}
