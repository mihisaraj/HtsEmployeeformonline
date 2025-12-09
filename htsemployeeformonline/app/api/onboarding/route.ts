import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { sendMailWithGraph } from "@/app/lib/graph";
import dbConnect from "@/app/lib/db";
import Employee from "@/app/models/Employee";

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
  sriLankaContact?: string;
  homeContactCode?: string;
  homeContactNumber?: string;
  residentialAddress?: string;
  sriLankaAddress?: string;
  homeCountryAddress?: string;
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
  form?: OnboardingForm;
};

// Required environment variables for SMTP
// Required environment variables for MS Graph
const requiredEnv = [
  "AZURE_TENANT_ID",
  "AZURE_CLIENT_ID",
  "AZURE_CLIENT_SECRET",
  "MS_SENDER_EMAIL",
  "SMTP_TO",
  "MONGODB_URI",
];

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

    const workbook = buildWorkbook(body);
    const attachmentBuffer = workbook; // XLSX.write returns buffer
    const subject = buildSubject(body);
    const html = buildHtml(body);

    // Configurable sender Name
    const senderDisplayName = body.profile?.name || "HTS Applicant";
    const userEmail = body.profile.email;

    await sendMailWithGraph(
      subject,
      html,
      [{ filename: `hts-onboarding-${Date.now()}.xlsx`, content: attachmentBuffer }],
      senderDisplayName,
      userEmail
    );

    // Save to MongoDB
    await dbConnect();
    const dob = formatDateOfBirth(body.form || {});
    const employeeData = {
      profileName: body.profile?.name,
      profileEmail: body.profile?.email,
      ...body.form,
      dob, // Use constructed DOB
    };

    // Upsert based on passportNo
    if (body.form?.passportNo) {
      await Employee.findOneAndUpdate(
        { passportNo: body.form.passportNo },
        employeeData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else {
      console.warn("No passport number provided, skipping database save.");
    }

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
    ["Sri Lanka Contact", form.sriLankaContact ?? ""],
    ["Home Contact Code", form.homeContactCode ?? ""],
    ["Home Contact Number", form.homeContactNumber ?? ""],
    ["Home Country", form.homeCountry ?? ""],
    ["Personal Email", form.personalEmail ?? ""],
    ["Sri Lanka Address", form.sriLankaAddress ?? ""],
    ["Home Country Address", form.homeCountryAddress ?? ""],
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
  const email = payload.profile?.email ? ` | ${payload.profile.email}` : "";
  return `HTS Onboarding | ${fullName}${email}`;
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
      <li><strong>Contact:</strong> ${form.sriLankaContact ?? ""} | ${form.homeContactCode ?? ""} ${form.homeContactNumber ?? ""} · ${form.personalEmail ?? ""}</li>
      <li><strong>Home country:</strong> ${form.homeCountry ?? ""}</li>
      <li><strong>Emergency contact:</strong> ${emergencyLine}</li>
      <li><strong>Nominees:</strong> ${nomineePreview || "Not provided"}</li>
    </ul>
    <p>Sri Lanka address:<br />${(form.sriLankaAddress ?? "").replace(/\n/g, "<br />")}</p>
    <p>Home country address:<br />${(form.homeCountryAddress ?? "").replace(/\n/g, "<br />")}</p>
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
