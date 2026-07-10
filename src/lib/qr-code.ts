export function generateQRCodeUrl(text: string, size: number = 200): string {
  const encodedText = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}&bgcolor=ffffff&color=000000`;
}

export function generateDoctorQRCodeUrl(doctorId: string, clinicSlug: string): string {
  const profileUrl = `${typeof window !== "undefined" ? window.location.origin : "https://docfind.com"}/clinic/${clinicSlug}`;
  return generateQRCodeUrl(profileUrl);
}

export async function downloadQRCode(url: string, filename: string = "qrcode.png"): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error("Failed to download QR code:", error);
  }
}
