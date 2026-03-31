/**
 * Formats a number into Indian currency shorthand (Crores/Lakhs)
 * @param {number} value 
 * @returns {string}
 */
export const formatCurrency = (value) => {
  if (value === undefined || value === null) return '₹0';
  
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} Lakhs`;
  }
  
  return `₹${value.toLocaleString()}`;
};

/**
 * Validates and formats rating stay within 1-100 range
 * @param {number} rating 
 * @returns {number}
 */
export const formatRating = (rating) => {
  return Math.min(Math.max(rating, 1), 100);
};
