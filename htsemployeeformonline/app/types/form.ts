export type Nominee = {
  id: string;
  name: string;
  passportId: string;
  relationship: string;
  portion: string;
};

export type NomineeField = "name" | "passportId" | "relationship" | "portion";
