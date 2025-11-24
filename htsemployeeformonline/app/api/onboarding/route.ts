import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

type OnboardingBody = {
  profile?: {
    name?: string;
    email?: string;
  };
  accessToken?: string;
  form?: {
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
    department?: string;
    startDate?: string;
    manager?: string;
    location?: string;
    equipment?: string;
    notes?: string;
  };
};

const requiredEnv = ["GRAPH_RECIPIENT_EMAIL"];

export async function POST(req: Request) {
  try {
    const missing = requiredEnv.filter((key) => !process.env[key]);
    if (missing.length) {
      return NextResponse.json(
        {
          error: `Missing environment variables: ${missing.join(", ")}`,
        },
        { status: 500 }
      );
    }

    const body = (await req.json()) as OnboardingBody;
    if (!body?.profile?.email) {
      return NextResponse.json(
        { error: "Profile email is required to send onboarding details." },
        { status: 400 }
      );
    }

    if (!body?.accessToken) {
      return NextResponse.json(
        { error: "Missing access token to send mail as the signed-in user." },
        { status: 401 }
      );
    }

    const workbook = buildWorkbook(body);
    const attachmentBytes = workbook.toString("base64");
    const subject = buildSubject(body);
    const html = buildHtml(body);

    await sendMailWithAttachment(
      body.accessToken,
      attachmentBytes,
      subject,
      html
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding API error", error);
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildWorkbook(payload: OnboardingBody) {
  const form = payload.form ?? {};
  const profile = payload.profile ?? {};
  const rows = [
    ["HTS Employee Onboarding"],
    ["Submitted at", new Date().toISOString()],
    [],
    ["Profile", ""],
    ["Name", profile.name ?? ""],
    ["Email", profile.email ?? ""],
    [],
    ["First name", form.firstName ?? ""],
    ["Last name", form.lastName ?? ""],
    ["Job title", form.jobTitle ?? ""],
    ["Department", form.department ?? ""],
    ["Start date", form.startDate ?? ""],
    ["Manager", form.manager ?? ""],
    ["Location", form.location ?? ""],
    ["Equipment", form.equipment ?? ""],
    ["Notes", form.notes ?? ""],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Onboarding");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function buildSubject(payload: OnboardingBody) {
  const first = payload.form?.firstName ?? "";
  const last = payload.form?.lastName ?? "";
  const fullName = `${first} ${last}`.trim() || "New hire";
  return `HTS Onboarding | ${fullName}`;
}

function buildHtml(payload: OnboardingBody) {
  const form = payload.form ?? {};
  const profile = payload.profile ?? {};
  return `
    <p>Hi PeopleOps,</p>
    <p>A new onboarding packet was submitted from <strong>${profile.name ?? "HTS employee"}</strong> (${profile.email ?? "no email provided"}).</p>
    <p>The Excel attachment includes all fields. Quick preview:</p>
    <ul>
      <li><strong>Name:</strong> ${form.firstName ?? ""} ${form.lastName ?? ""}</li>
      <li><strong>Role:</strong> ${form.jobTitle ?? ""} · ${form.department ?? ""}</li>
      <li><strong>Manager:</strong> ${form.manager ?? ""}</li>
      <li><strong>Start date:</strong> ${form.startDate ?? ""}</li>
      <li><strong>Location:</strong> ${form.location ?? ""}</li>
      <li><strong>Equipment:</strong> ${form.equipment ?? ""}</li>
    </ul>
    <p>Notes:<br />${(form.notes ?? "").replace(/\n/g, "<br />")}</p>
    <p>— HTS onboarding portal</p>
  `;
}

async function sendMailWithAttachment(
  accessToken: string,
  attachmentBase64: string,
  subject: string,
  html: string
) {
  const recipient = process.env.GRAPH_RECIPIENT_EMAIL!;

  const payload = {
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: html,
      },
      toRecipients: [
        {
          emailAddress: {
            address: recipient,
          },
        },
      ],
      attachments: [
        {
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: `hts-onboarding-${Date.now()}.xlsx`,
          contentBytes: attachmentBase64,
        },
      ],
    },
    saveToSentItems: true,
  };

  const res = await fetch(`https://graph.microsoft.com/v1.0/me/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph sendMail failed (${res.status}): ${text}`);
  }
}
