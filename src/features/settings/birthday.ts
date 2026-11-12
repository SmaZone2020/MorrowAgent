/**
 * Birthday arithmetic, kept out of the form that collects it.
 *
 * The app never counts down to a birthday. The only thing it wants from the date
 * is a rough picture of who is reading — a fifteen-year-old and a forty-year-old
 * want different examples — so a whole number of years is enough, and a
 * half-typed date has to read as "unknown" rather than as a wrong age.
 */
export function ageFrom(birthday: string, now: Date = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  let age = now.getFullYear() - year;
  // Whether this year's birthday has happened yet: one comparison, no date math.
  const beforeBirthday =
    now.getMonth() + 1 < month ||
    (now.getMonth() + 1 === month && now.getDate() < day);
  if (beforeBirthday) age -= 1;

  return age >= 0 && age <= 130 ? age : null;
}
