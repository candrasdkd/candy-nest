function normalizePhone(value) {
  let phone = String(value || "").replace(/\D/g, "");
  if (phone.startsWith("0")) phone = `62${phone.slice(1)}`;
  return phone;
}

async function findLinkedUser(db, phone) {
  const snapshot = await db.collection("users")
      .where("whatsappNumber", "==", phone)
      .limit(1)
      .get();
  return snapshot.empty ? null : snapshot.docs[0];
}

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function parseAmount(value) {
  const match = String(value || "").trim().toLowerCase()
      .replace(/^rp\.?\s*/, "")
      .match(/^([\d.,]+)\s*(jt|juta|m|mio|rb|ribu|k)?$/);
  if (!match) return 0;

  const numberText = match[1];
  const unit = match[2] || "";
  if (unit) {
    const number = Number(numberText.replace(",", "."));
    const multiplier = ["jt", "juta", "m", "mio"].includes(unit) ? 1000000 : 1000;
    return Number.isFinite(number) ? Math.round(number * multiplier) : 0;
  }
  return Number(numberText.replace(/\D/g, "")) || 0;
}

function formatMonth(value) {
  const [year, month] = String(value || "").split("-").map(Number);
  if (!year || month < 1 || month > 12) return String(value || "Tanggal tidak diketahui");
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("id-ID", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

module.exports = {normalizePhone, findLinkedUser, formatRupiah, parseAmount, formatMonth};
