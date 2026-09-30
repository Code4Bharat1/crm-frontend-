/**
 * Utility validation helpers for CRM form fields
 */

/**
 * Validates 10-digit mobile numbers (standard 10 digits starting with 6, 7, 8, 9)
 * or general 10-digit number.
 * @param {string} phone 
 * @returns {boolean}
 */
export const isValidPhoneNumber = (phone) => {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.replace(/\D/g, "");
  // Must be strictly 10 digits, starting with 6-9 (Indian standard) or 10 digits
  return /^[6-9]\d{9}$/.test(cleaned);
};

/**
 * Formats a raw input value into a clean 10-digit numerical string.
 * Strips all non-digit characters and limits length to 10.
 * @param {string} val 
 * @returns {string}
 */
export const sanitizePhoneInput = (val) => {
  if (!val || typeof val !== "string") return "";
  return val.replace(/\D/g, "").slice(0, 10);
};
