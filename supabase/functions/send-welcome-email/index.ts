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
            from: "CGU Connect Hub <noreply@cgu-connect.live>",
            to: [email],
            subject: "Welcome to CGU Connect Hub! 🚀",
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
        <h1>Welcome to CGU Connect Hub, ${name}! 👋</h1>
        
        <p>We’re excited to have you join the CGU Connect Hub community — a space made by students, for students.</p>
        
        <p>Here’s what you can do:</p>
        <ul>
            <li>📢 Share anonymous confessions</li>
            <li>📸 Post photos and campus updates</li>
            <li>💬 Connect and interact with fellow students</li>
            <li>🎉 Stay updated with trending campus discussions</li>
        </ul>

        <h3>📌 Community Guidelines</h3>
        <p>To keep CGU Connect Hub safe and enjoyable for everyone, please follow these simple rules:</p>
        <ul>
            <li>🚫 Do not use abusive, hateful, or inappropriate language</li>
            <li>🚫 Do not post offensive, harmful, or explicit content</li>
            <li>🚫 No bullying, harassment, or targeting individuals/groups</li>
            <li>🔒 Respect everyone’s privacy — do not share personal information without consent</li>
            <li>✅ Keep discussions respectful and constructive</li>
        </ul>

        <p>Violation of community guidelines may result in content removal or account suspension.</p>

        <h3>⚙️ Complete Your Profile</h3>
        <p>Make sure to complete your profile setup to get the best experience.</p>

        <h3>🆘 Need Help?</h3>
        <p>
            If you face any issues or have suggestions:
        </p>
        <ul>
            <li>Visit our Support Page: <a href="https://cgu-connect.live/support">cgu-connect.live/support</a></li>
            <li>Or go to your Profile → Tap the 3-line menu (☰) → Select <b>Feedback</b> to submit your issue</li>
        </ul>

        <br/>
        <p>We’re building this community together — let’s keep it positive and supportive! 💙</p>
        
        <p>Best regards,<br/>
        <b>The CGU Connect Hub Team</b></p>
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
