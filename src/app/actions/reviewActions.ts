'use server'

// Public comments and unmoderated discussion threads on listings are disabled
// To safeguard client privacy and prevent unverified public claims
export async function addReview() {
  throw new Error('Public comments and discussion threads on listings are disabled. Please contact an authorized UniNest agent for verified property inquiries.')
}
