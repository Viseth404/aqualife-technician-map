// Delivery fee from the distance bands in src/config.js.
import { config } from '../config';

// Returns { free, fee, fromKm, toKm } – the band the distance falls in.
// Example: 23.4 km -> band 21–25 km -> $5
export function deliveryFee(km) {
  const rows = config.deliveryFees;
  let fromKm = 0;
  for (const row of rows) {
    if (km <= row.upToKm) return { free: row.fee === 0, fee: row.fee, fromKm, toKm: row.upToKm };
    fromKm = row.upToKm + 1;
  }

  // Farther than the last row: keep adding the extra fee every few km.
  const last = rows[rows.length - 1];
  const { everyKm, fee: extraFee } = config.beyondLastRow;
  const steps = Math.ceil((km - last.upToKm) / everyKm);
  const toKm = last.upToKm + steps * everyKm;
  return { free: false, fee: last.fee + steps * extraFee, fromKm: toKm - everyKm + 1, toKm };
}
