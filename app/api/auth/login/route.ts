import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword, createSession, toPublic, SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/auth";
import { getApiT } from "@/lib/api-i18n";
import { reserve, clientIp } from "@/lib/rate-limit";

// Anti brute-force — seuls les ÉCHECS comptent (une connexion réussie libère sa
// réservation), fenêtre de 15 min :
//  - par compte, toutes IP confondues : 20 échecs → plafonne le brute-force
//    distribué (≈ 80 essais/h max) ; blocage temporaire, levé seul après 15 min ;
//  - par IP : 10 échecs ; par (compte, IP) : 5 échecs — seulement si l'IP est
//    fiable (proxy de confiance, cf. TRUST_PROXY).
// Compromis assumé : un tiers peut bloquer un compte 15 min en enchaînant 20
// échecs ; c'est le prix d'une limite qu'on ne contourne pas en changeant d'IP.
const LOGIN_WINDOW_MS = 15 * 60_000;
const MAX_FAILS_PER_ACCOUNT = 20;
const MAX_FAILS_PER_IP = 10;
const MAX_FAILS_PER_ACCOUNT_IP = 5;
// Hash factice (calculé une fois) pour égaliser le temps des comptes inconnus.
const DUMMY = hashPassword("dummy-password-for-timing");

export async function POST(req: Request) {
  const t = await getApiT();
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: t("loginRequired") }, { status: 400 });
  }

  // Lecture seule d'abord : les compteurs sont clés sur l'identité canonique
  // (admin.id), pas sur la saisie brute — aucune variante de casse/Unicode ne
  // peut ouvrir un compteur neuf. Comptes inconnus : un compteur commun.
  const admin = await prisma.admin.findFirst({
    where: { username: { equals: String(username), mode: "insensitive" } },
  });
  // Compte inconnu : compteur PAR NOM (forme canonique) — même comportement
  // qu'un compte réel, pour ne pas révéler quels identifiants existent.
  const acct = admin?.id ?? `name:${String(username).normalize("NFKC").toLowerCase().slice(0, 64)}`;
  const ip = clientIp(req);
  const buckets = [{ key: `login-acct:${acct}`, limit: MAX_FAILS_PER_ACCOUNT }];
  if (ip) {
    buckets.push({ key: `login-ip:${ip}`, limit: MAX_FAILS_PER_IP });
    buckets.push({ key: `login-acct-ip:${acct}:${ip}`, limit: MAX_FAILS_PER_ACCOUNT_IP });
  }
  // Réservation atomique : entre reserve() et la vérification (synchrone, scrypt)
  // il n'y a aucun await, donc les tentatives concurrentes sont toutes comptées.
  const attempt = reserve(buckets, LOGIN_WINDOW_MS, Date.now());
  if (!attempt.allowed) {
    return NextResponse.json(
      { error: t("rateLimited") },
      { status: 429, headers: { "Retry-After": String(attempt.retryAfterSec) } },
    );
  }

  // Compte inconnu : scrypt sur un hash factice → même temps de réponse.
  const ok = admin
    ? verifyPassword(String(password), admin.salt, admin.passwordHash)
    : (verifyPassword(String(password), DUMMY.salt, DUMMY.hash), false);
  if (!ok || !admin) {
    return NextResponse.json({ error: t("loginInvalid") }, { status: 401 }); // l'échec reste compté
  }
  attempt.release(); // succès : ne compte pas

  const token = await createSession(admin.id);
  const res = NextResponse.json({ admin: toPublic(admin) });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return res;
}
