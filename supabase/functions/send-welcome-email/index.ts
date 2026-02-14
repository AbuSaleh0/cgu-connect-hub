// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const handler = async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") {
        return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    try {
        const payload = await request.json();
        console.log("Webhook payload received:", payload);

        // Parse the record from the database webhook
        const { record } = payload;

        // Check if we have the necessary info
        if (!record || !record.email) {
            console.error("Missing email in record");
            return new Response("Missing email", { status: 400 });
        }

        const email = record.email;
        const name = record.display_name || record.username || "Student";

        console.log(`Sending welcome email to ${email}`);

        const resend = new Resend(RESEND_API_KEY);

        const { data, error } = await resend.emails.send({
            from: "CGU Connect Hub <noreply@cgu-connect.live>", // UPDATE THIS WITH YOUR VERIFIED DOMAIN
            to: [email],
            subject: "Welcome to CGU Connect Hub! 🚀",
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Welcome to CGU Connect Hub, ${name}! 👋</h1>
          <p>We are thrilled to have you join our community.</p>
          <p>Here you can:</p>
          <ul>
            <li>📢 Share anonymous confessions</li>
            <li>📸 Post photos and updates</li>
            <li>💬 Connect with other students</li>
          </ul>
          <p>Make sure to complete your profile setup if you haven't already!</p>
          <br/>
          <p>Best regards,</p>
          <p>The CGU Connect Hub Team</p>
        </div>
      `,
        });

        if (error) {
            console.error("Resend error:", error);
            return new Response(JSON.stringify({ error }), { status: 500 });
        }

        console.log("Email sent successfully:", data);
        return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (error) {
        console.error("Function error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};

serve(handler);
