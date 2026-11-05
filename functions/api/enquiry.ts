interface EventContext {
  request: Request;
  env: {
    ENQUIRY_WEBHOOK_URL?: string;
  };
}

export const onRequestPost = async (context: EventContext): Promise<Response> => {
  const b = (await context.request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    message?: string;
  } | null;

  if (
    !b ||
    typeof b.name !== "string" ||
    !/^\S+@\S+\.\S+$/.test(String(b.email)) ||
    String(b.message ?? "").length < 20
  ) {
    return new Response(JSON.stringify({ message: "Please complete all required fields." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const hook = context.env.ENQUIRY_WEBHOOK_URL;
  if (!hook) {
    return new Response(
      JSON.stringify({
        message:
          "Online delivery is not set up yet, so your message was not sent. Please email info@nobyst.com or message us on WhatsApp.",
      }),
      {
        status: 501,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const r = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });

    if (!r.ok) {
      return new Response(JSON.stringify({ message: "Delivery failed. Please email info@nobyst.com." }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Thank you. We have received your enquiry." }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ message: "Server error occurred. Please contact us on WhatsApp." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
