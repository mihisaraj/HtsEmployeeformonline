import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

type NomineePayload = {
  name?: string;
  passportId?: string;
  relationship?: string;
  portion?: string;
};

type OnboardingForm = {
  passportName?: string;
  callingName?: string;
  gender?: string;
  dobDay?: string;
  dobMonth?: string;
  dobYear?: string;
  nationality?: string;
  religion?: string;
  passportNo?: string;
  maritalStatus?: string;
  contactNumber?: string;
  homeCountry?: string;
  personalEmail?: string;
  residentialAddress?: string;
  emergencyName?: string;
  emergencyRelationship?: string;
  emergencyContact?: string;
  emergencyAddress?: string;
  birthPlace?: string;
  spouseName?: string;
  motherName?: string;
  fatherName?: string;
  nominees?: NomineePayload[];
};

type OnboardingBody = {
  profile?: {
    name?: string;
    email?: string;
  };
  accessToken?: string;
  form?: OnboardingForm;
};

const ALLOWED_DOMAIN = "@hts.asia";
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

    const senderEmail = body.profile.email.toLowerCase();
    if (!senderEmail.endsWith(ALLOWED_DOMAIN)) {
      return NextResponse.json(
        { error: "Only @hts.asia accounts can submit onboarding packets." },
        { status: 403 }
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
  const nominees = form.nominees ?? [];
  const nomineeRows = nominees.map((nominee) => [
    nominee.name ?? "",
    nominee.passportId ?? "",
    nominee.relationship ?? "",
    nominee.portion ?? "",
  ]);
  const rows = [
    ["HTS Employee Onboarding"],
    ["Submitted at", new Date().toISOString()],
    [],
    ["Profile"],
    ["Name", profile.name ?? ""],
    ["Email", profile.email ?? ""],
    [],
    ["Personal Information"],
    ["Name (As per Passport)", form.passportName ?? ""],
    ["Calling Name", form.callingName ?? ""],
    ["Gender", form.gender ?? ""],
    ["Date of Birth", formatDateOfBirth(form)],
    ["Nationality", form.nationality ?? ""],
    ["Religion", form.religion ?? ""],
    ["Passport No", form.passportNo ?? ""],
    ["Marital Status", form.maritalStatus ?? ""],
    ["Contact Details", form.contactNumber ?? ""],
    ["Home Country", form.homeCountry ?? ""],
    ["Personal Email", form.personalEmail ?? ""],
    ["Residential Address", form.residentialAddress ?? ""],
    [],
    ["Emergency Contact"],
    ["Name", form.emergencyName ?? ""],
    ["Relationship", form.emergencyRelationship ?? ""],
    ["Contact No", form.emergencyContact ?? ""],
    ["Address", form.emergencyAddress ?? ""],
    [],
    ["EPF/ETF Financial Fund"],
    ["Birth Place", form.birthPlace ?? ""],
    ["Name of the Spouse (If Married)", form.spouseName ?? ""],
    ["Name of the Mother", form.motherName ?? ""],
    ["Name of the Father", form.fatherName ?? ""],
    [],
    ["Nominees"],
    ["Name", "Passport/ID No", "Relationship", "Portion (%)"],
    ...(nomineeRows.length ? nomineeRows : [["-", "-", "-", "-"]]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Onboarding");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function buildSubject(payload: OnboardingBody) {
  const fullName =
    payload.form?.passportName?.trim() ||
    payload.form?.callingName?.trim() ||
    "New hire";
  return `HTS Onboarding | ${fullName}`;
}

function buildHtml(payload: OnboardingBody) {
  const form = payload.form ?? {};
  const profile = payload.profile ?? {};
  const dob = formatDateOfBirth(form);
  const nomineePreview = (form.nominees ?? [])
    .map((nominee) => {
      const name = nominee.name ?? "Nominee";
      const relationship = nominee.relationship ?? "";
      const portion = nominee.portion ? ` - ${nominee.portion}%` : "";
      return `${name}${relationship ? ` (${relationship})` : ""}${portion}`;
    })
    .slice(0, 3)
    .join("; ");
  const emergencyLine = form.emergencyName
    ? `${form.emergencyName} (${form.emergencyRelationship ?? ""}) - ${form.emergencyContact ?? ""}`
    : "Not provided";
  return `
    <p>Hi PeopleOps,</p>
    <p>${profile.name ?? "HTS employee"} (${profile.email ?? "no email provided"}) submitted the employee information form.</p>
    <p>The Excel attachment includes all fields. Quick preview:</p>
    <ul>
      <li><strong>Name:</strong> ${form.passportName ?? form.callingName ?? ""}</li>
      <li><strong>Gender / DOB:</strong> ${form.gender ?? ""}${dob ? ` - ${dob}` : ""}</li>
      <li><strong>Contact:</strong> ${form.contactNumber ?? ""} - ${form.personalEmail ?? ""}</li>
      <li><strong>Home country:</strong> ${form.homeCountry ?? ""}</li>
      <li><strong>Emergency contact:</strong> ${emergencyLine}</li>
      <li><strong>Nominees:</strong> ${nomineePreview || "Not provided"}</li>
    </ul>
    <p>Residential address:<br />${(form.residentialAddress ?? "").replace(/\n/g, "<br />")}</p>
    <p>Emergency address:<br />${(form.emergencyAddress ?? "").replace(/\n/g, "<br />")}</p>
    <p>Spouse / parents:<br />${form.spouseName ?? ""} | ${form.motherName ?? ""} | ${form.fatherName ?? ""}</p>
    <p>- HTS onboarding portal</p>
  `;
}

function formatDateOfBirth(form: OnboardingForm) {
  const parts = [
    form.dobDay?.trim(),
    form.dobMonth?.trim(),
    form.dobYear?.trim(),
  ].filter(Boolean);
  return parts.join("-");
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
