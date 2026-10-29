// Formatting utilities conforming to HMS botanical design specs

/**
 * Format an ISO or Instant timestamp into local 12-hour time: "9:30 am", "11:00 am", "2:15 pm"
 */
export function formatLocalTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Format an ISO timestamp or LocalDate into a friendly date: "Thursday, 29 October"
 */
export function formatFullDate(dateInput) {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' && dateInput.length === 10
    ? new Date(dateInput + 'T00:00:00')
    : new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Extract date components for the appointments date block:
 * { dayNum: "29", weekday: "Thu", month: "Oct" }
 */
export function getDateBlockComponents(dateInput) {
  if (!dateInput) return { dayNum: '--', weekday: '', month: '' };
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return { dayNum: '--', weekday: '', month: '' };

  const dayNum = date.getDate();
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });

  return { dayNum: String(dayNum), weekday, month };
}

/**
 * Format currency in ₹ with Indian grouping: "₹500", "₹1,200"
 */
export function formatCurrencyINR(amount) {
  if (amount === null || amount === undefined) return '₹0';
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return '₹0';

  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(num);

  return `₹${formatted}`;
}

/**
 * Get greeting based on current local time:
 * "Good morning", "Good afternoon", "Good evening"
 */
export function getTimeOfDayGreeting(name) {
  const hour = new Date().getHours();
  let timeStr = 'Good morning';
  if (hour >= 12 && hour < 17) {
    timeStr = 'Good afternoon';
  } else if (hour >= 17) {
    timeStr = 'Good evening';
  }
  return name ? `${timeStr}, ${name}.` : `${timeStr}.`;
}

/**
 * Normalize role strings like "ROLE_PATIENT" -> "PATIENT"
 */
export function normalizeRole(role) {
  if (!role) return '';
  return role.replace(/^ROLE_/, '').toUpperCase();
}

/**
 * Generate formatted YYYY-MM-DD from Date
 */
export function toIsoDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
