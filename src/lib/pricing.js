// Delivery fee from a vehicle's price table (Settings > Delivery, or src/config.js).
// pricing = { rows: [{ upToKm, fee }], beyond: { everyKm, fee } }

// Rows with their start km: [{ fromKm, toKm, fee }]
export function feeRows(pricing) {
  let fromKm = 0;
  return pricing.rows.map((row) => {
    const r = { fromKm, toKm: row.upToKm, fee: row.fee };
    fromKm = row.upToKm + 1;
    return r;
  });
}

// Returns { free, fee, fromKm, toKm } – the band the distance falls in.
// Example: 23.4 km -> band 21–25 km -> $5
export function deliveryFee(km, pricing) {
  const rows = feeRows(pricing);
  for (const r of rows) {
    if (km <= r.toKm) return { free: r.fee === 0, fee: r.fee, fromKm: r.fromKm, toKm: r.toKm };
  }
  // Farther than the last row: keep adding the extra fee every few km.
  const last = rows[rows.length - 1];
  const { everyKm, fee: extraFee } = pricing.beyond;
  const steps = Math.ceil((km - last.toKm) / everyKm);
  const toKm = last.toKm + steps * everyKm;
  return { free: false, fee: last.fee + steps * extraFee, fromKm: toKm - everyKm + 1, toKm };
}
