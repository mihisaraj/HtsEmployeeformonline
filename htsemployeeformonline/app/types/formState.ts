import { Nominee, NomineeField } from "./form";

export type FormState = {
  passportName: string;
  callingName: string;
  gender: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  nationality: string;
  religion: string;
  passportNo: string;
  maritalStatus: string;
  sriLankaContact: string;
  homeContactCode: string;
  homeContactNumber: string;
  homeCountry: string;
  sriLankaAddress: string;
  homeCountryAddress: string;
  personalEmail: string;
  residentialAddress: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyContact: string;
  emergencyAddress: string;
  birthPlace: string;
  spouseName: string;
  motherName: string;
  fatherName: string;
  nominees: Nominee[];
};

export type FieldKey = keyof Omit<FormState, "nominees">;

export type ValidationErrors = {
  fields: Partial<Record<FieldKey, string>>;
  nominees: Record<string, Partial<Record<NomineeField, string>>>;
  global?: string;
};
