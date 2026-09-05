import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Reset your password · CampusFix" };

/*
   Every way the emailed link can fail sends the reader here, because every one
   of them has the same remedy: ask for another.
*/
const FAILED: Record<string, string> = {
  expired:
    "That link has expired, or it had already been used. Ask for a fresh one below.",
  browser:
    "That link has to be opened in the same browser you asked from. Ask for a new one here, then open it on this device.",
  unreadable: "That link could not be read. Ask for a fresh one below.",
};

export default async function ForgotPage({
  searchParams,
}: PageProps<"/auth/forgot">) {
  const sp = await searchParams;
  const key = Array.isArray(sp.failed) ? sp.failed[0] : sp.failed;
  const failed = key ? FAILED[key] : undefined;

  /*
     The form owns the whole card, heading included, because the heading has to
     change with it: this page said "We will email you a link" above a panel
     saying the link was already on its way.
  */
  return <ForgotForm failed={failed} />;
}
