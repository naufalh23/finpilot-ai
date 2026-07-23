import { revalidatePath } from "next/cache"

/**
 * Not a "use server" file itself — every export of a Server Actions file must
 * be an async function, and this needs to stay a plain sync helper that
 * multiple action files (transaction, import) call into.
 */
export function revalidateTransactionViews() {
  revalidatePath("/dashboard")
  revalidatePath("/transactions")
  revalidatePath("/wallet")
  revalidatePath("/reports")
}
