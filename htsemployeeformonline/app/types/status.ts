export type StatusState = {
  type: "idle" | "success" | "error" | "info";
  message: string;
};
