import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const receiptUrl = request.nextUrl.searchParams.get("url");
  const fileName =
    request.nextUrl.searchParams.get("fileName") ||
    "customer-confirmation-receipt.pdf";

  if (!receiptUrl) {
    return NextResponse.json(
      { error: "Receipt URL is required." },
      { status: 400 }
    );
  }

  try {
    const parsedUrl = new URL(receiptUrl);

    const allowedHosts = [
      "firebasestorage.googleapis.com",
      "storage.googleapis.com",
    ];

    if (!allowedHosts.includes(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: "Invalid receipt URL." },
        { status: 400 }
      );
    }

    const response = await fetch(receiptUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to retrieve the receipt." },
        { status: response.status }
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName.replace(
          /[^a-zA-Z0-9._-]/g,
          "-"
        )}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Receipt download error:", error);

    return NextResponse.json(
      { error: "Unable to download the receipt." },
      { status: 500 }
    );
  }
}