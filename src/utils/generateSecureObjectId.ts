function generateSecureObjectId() {
  const timestamp = ((Date.now() / 1000) | 0).toString(16);
  const randomBytes = new Uint8Array(12);
  crypto.getRandomValues(randomBytes);
  const randomHex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return timestamp + randomHex.slice(0, 16); // 24 chars total
}

export default generateSecureObjectId;
