export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.replace("Bearer ", "");
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const requesterSnap = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!requesterSnap.exists || requesterSnap.data()?.isSystemAdmin !== true) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const {
      email,
      password,
      firstName,
      lastName,
      companyId,
      companyName,
      role,
      isSystemAdmin,
      projectIds,
    } = body;

    if (!email || !password || !firstName || !lastName || !companyId || !role) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: fullName,
      disabled: false,
    });

    await adminDb.collection("users").doc(userRecord.uid).set({
      email,
      firstName,
      lastName,
      name: fullName,
      companyId,
      companyName: companyName || "",
      role,
      isActive: true,
      isSystemAdmin: Boolean(isSystemAdmin),
      projectIds: Array.isArray(projectIds) ? projectIds : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
    });
  } catch (error: any) {
    console.error("Create user API error:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        error: error?.message || "Unable to create user.",
        code: error?.code || "unknown",
      },
      { status: 500 }
    );
  }
}
