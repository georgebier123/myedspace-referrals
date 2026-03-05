import { NextRequest, NextResponse } from 'next/server';
import { getReferralsByFriendEmail, updateReferralStatus } from '@/lib/data';

// Webhook endpoint for HubSpot to call when a friend makes a purchase.
// Set up a HubSpot workflow to POST here when a deal/order is created.
//
// Security: requires WEBHOOK_SECRET as a query param or X-Webhook-Secret header.
// Set WEBHOOK_SECRET in your Vercel environment variables.
//
// Expected payload (flexible - supports multiple formats):
//   { "email": "friend@example.com" }
//   or HubSpot workflow webhook format with properties.email

function extractEmail(body: Record<string, unknown>): string | null {
  // Direct email field
  if (typeof body.email === 'string') return body.email;

  // HubSpot workflow webhook format: { properties: { email: { value: "..." } } }
  const props = body.properties as Record<string, unknown> | undefined;
  if (props) {
    const emailProp = props.email as Record<string, unknown> | string | undefined;
    if (typeof emailProp === 'string') return emailProp;
    if (emailProp && typeof emailProp === 'object' && typeof (emailProp as Record<string, unknown>).value === 'string') {
      return (emailProp as Record<string, unknown>).value as string;
    }
  }

  // HubSpot v3 webhook: { object: { properties: { email: "..." } } }
  const obj = body.object as Record<string, unknown> | undefined;
  if (obj) {
    const objProps = obj.properties as Record<string, unknown> | undefined;
    if (objProps && typeof objProps.email === 'string') return objProps.email;
  }

  return null;
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const querySecret = request.nextUrl.searchParams.get('secret');
    const headerSecret = request.headers.get('x-webhook-secret');
    if (querySecret !== secret && headerSecret !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const body = await request.json();
    const email = extractEmail(body);

    if (!email) {
      return NextResponse.json(
        { error: 'Could not extract email from payload' },
        { status: 400 }
      );
    }

    // Find all pending referrals for this friend
    const referrals = await getReferralsByFriendEmail(email);
    const pendingReferrals = referrals.filter(r => r.status === 'pending');

    if (pendingReferrals.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending referrals found for this email',
        email,
        updated: 0,
      });
    }

    // Mark all pending referrals as purchased
    const now = new Date();
    const eligibleDate = new Date();
    eligibleDate.setDate(eligibleDate.getDate() + 30);

    const results = await Promise.all(
      pendingReferrals.map(referral =>
        updateReferralStatus(referral.id, {
          status: 'purchased',
          purchase_date: now.toISOString(),
          reward_eligible_date: eligibleDate.toISOString(),
        })
      )
    );

    const updated = results.filter(r => r !== null).length;

    console.log(`Webhook: marked ${updated} referral(s) as purchased for ${email}`);

    return NextResponse.json({
      success: true,
      email,
      updated,
      referralIds: pendingReferrals.map(r => r.id),
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
