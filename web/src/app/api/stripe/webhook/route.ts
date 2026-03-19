import { NextRequest, NextResponse } from "next/server";

const WORKER_URL = process.env.WORKER_URL || "http://localhost:8080";

export async function POST(request: NextRequest) {
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  if (!STRIPE_WEBHOOK_SECRET || STRIPE_WEBHOOK_SECRET === "placeholder") {
    return NextResponse.json({ received: true });
  }

  try {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const jobId = session.metadata?.job_id;

      if (jobId) {
        // Mark job as paid on worker
        console.log(`Payment confirmed for job ${jobId}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}
