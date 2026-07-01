import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Verify Printify webhook authenticity.
 * Checks the X-Printify-Webhook-Token header against our configured secret.
 */
function verifyPrintifyWebhook(request: NextRequest): boolean {
  const secret = process.env.PRINTIFY_WEBHOOK_SECRET;
  // If no secret is configured, reject all requests for safety
  if (!secret) {
    console.error('PRINTIFY_WEBHOOK_SECRET is not configured — rejecting webhook');
    return false;
  }

  const token = request.headers.get('x-printify-webhook-token')
    || request.headers.get('authorization')?.replace('Bearer ', '');

  return token === secret;
}

/**
 * Status hierarchy for idempotency — prevents status downgrades.
 * Higher number = further along in the fulfillment pipeline.
 */
const STATUS_RANK: Record<string, number> = {
  pending:        0,
  paid:           1,
  in_production:  2,
  shipped:        3,
  delivered:      4,
  cancelled:      5,
};

export async function POST(request: NextRequest) {
  // 1. Authenticate webhook
  if (!verifyPrintifyWebhook(request)) {
    console.warn('Printify webhook rejected: invalid or missing authentication token');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type: string = (body.type as string) ?? '';
  const data = body.data as Record<string, unknown> ?? {};

  // Match by external_id (our Firestore order ID)
  const externalId = data.external_id as string | undefined;
  if (!externalId) return NextResponse.json({ status: 'ok' });

  const orderRef = adminDb.collection('orders').doc(externalId);
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) return NextResponse.json({ status: 'not_found' });

  const currentStatus = (orderDoc.data()?.status as string) ?? '';
  const currentRank = STATUS_RANK[currentStatus] ?? -1;

  switch (type) {
    case 'order:created': {
      // Idempotency: don't downgrade if already past in_production
      if (currentRank >= STATUS_RANK.in_production) {
        console.log(`Order ${externalId} already at '${currentStatus}' — skipping 'order:created' event.`);
        break;
      }

      await orderRef.update({
        printifyOrderId: data.id,
        status:          'in_production',
        updatedAt:       FieldValue.serverTimestamp(),
      });
      break;
    }

    case 'order:shipment:created': {
      // Idempotency: don't downgrade if already delivered
      if (currentRank >= STATUS_RANK.shipped) {
        console.log(`Order ${externalId} already at '${currentStatus}' — skipping 'shipment:created' event.`);
        break;
      }

      const shipments = data.shipments as Array<{ url?: string }> ?? [];
      const trackingUrl = shipments[0]?.url ?? null;
      await orderRef.update({
        status:      'shipped',
        trackingUrl,
        updatedAt:   FieldValue.serverTimestamp(),
      });
      break;
    }

    case 'order:shipment:delivered': {
      // Idempotency: don't re-process if already delivered
      if (currentRank >= STATUS_RANK.delivered) {
        console.log(`Order ${externalId} already '${currentStatus}' — skipping 'delivered' event.`);
        break;
      }

      await orderRef.update({
        status:    'delivered',
        updatedAt: FieldValue.serverTimestamp(),
      });
      break;
    }
  }

  return NextResponse.json({ status: 'ok' });
}
