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
    } = body;

    if (!email || !password || !firstName || !lastName || !companyId || !role) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      disabled: false,
    });

    await adminDb.collection("users").doc(userRecord.uid).set({
      email,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      companyId,
      companyName: companyName || "",
      role,
      isActive: true,
      isSystemAdmin: Boolean(isSystemAdmin),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      { error: error?.message || "Unable to create user." },
      { status: 500 }
    );
  }
}
