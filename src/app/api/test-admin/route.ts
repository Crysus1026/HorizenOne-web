import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const userCount = await adminAuth.listUsers(1);

    return NextResponse.json({
      success: true,
      count: userCount.users.length,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      error,
    });
  }
}