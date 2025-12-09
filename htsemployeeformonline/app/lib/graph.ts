import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import "isomorphic-fetch";

// Config
const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const SENDER_EMAIL = process.env.MS_SENDER_EMAIL;

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    console.warn("Microsoft Graph credentials (AZURE_*) are missing from environment.");
}

function getGraphClient() {
    const credential = new ClientSecretCredential(
        TENANT_ID!,
        CLIENT_ID!,
        CLIENT_SECRET!
    );

    const authProvider = async (callback: (error: any, accessToken: string | null) => void) => {
        try {
            const token = await credential.getToken("https://graph.microsoft.com/.default");
            callback(null, token.token);
        } catch (error) {
            callback(error, null);
        }
    };

    return Client.init({
        authProvider,
    });
}

type Attachment = {
    filename: string;
    content: Buffer; // base64 or buffer? Graph expects base64 bytes for fileAttachment
};

export async function sendMailWithGraph(
    subject: string,
    html: string,
    attachments: Attachment[],
    senderDisplayName: string,
    replyToEmail: string
) {
    if (!SENDER_EMAIL) {
        throw new Error("MS_SENDER_EMAIL is not defined");
    }

    const client = getGraphClient();

    // Convert buffer attachments to Graph FileAttachment format
    const messageAttachments = attachments.map((att) => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: att.filename,
        contentBytes: att.content.toString("base64"),
    }));

    const message = {
        subject: subject,
        body: {
            contentType: "HTML",
            content: html,
        },
        toRecipients: [
            {
                emailAddress: {
                    address: process.env.SMTP_TO, // Still using the same env var for destination
                },
            },
        ],
        from: {
            emailAddress: {
                address: SENDER_EMAIL,
                name: senderDisplayName,
            },
        },
        replyTo: [
            {
                emailAddress: {
                    address: replyToEmail,
                },
            },
        ],
        attachments: messageAttachments,
    };

    await client.api(`/users/${SENDER_EMAIL}/sendMail`)
        .post({ message });
}
