import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { job_id, area_km2 } = await request.json();

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === "placeholder") {
    // Dev mode: skip Stripe, allow free download
    return NextResponse.json({ free_download: true, job_id });
  }

  // Calculate price based on area
  let priceInCents: number;
  if (area_km2 < 1) priceInCents = 200;
  else if (area_km2 < 5) priceInCents = 500;
  else if (area_km2 < 25) priceInCents = 1000;
  else priceInCents = 1500;

  try {
    const stripe = require("stripe")(STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "Map2Minecraft World",
            description: `Generated Minecraft world (${area_km2.toFixed(1)} km\u00B2)`,
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/create/success?job_id=${job_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/create`,
      metadata: { job_id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }
}
