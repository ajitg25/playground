"""Acme Notes — API with Descope OTP sign-up/sign-in + SDK-managed session validation.

Surface:
  POST /auth/send    send OTP to email (sign-up or sign-in)
  POST /auth/verify  verify code → return real sessionJwt + refreshJwt
  GET  /notes        list notes for the authenticated user
  POST /notes        add a note
"""
from __future__ import annotations

import os

from descope import AuthException, DeliveryMethod, DescopeClient
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Acme Notes")

_descope = DescopeClient(project_id=os.environ["DESCOPE_PROJECT_ID"])

# In-memory store keyed by Descope user ID (sub).
_NOTES: dict[str, list[str]] = {}


class SendOtpReq(BaseModel):
    email: str


class VerifyOtpReq(BaseModel):
    email: str
    code: str


class Note(BaseModel):
    text: str


@app.post("/auth/send")
def auth_send(body: SendOtpReq) -> dict:
    try:
        _descope.otp.sign_up_or_in(DeliveryMethod.EMAIL, body.email)
    except AuthException as exc:
        raise HTTPException(400, detail=str(exc)) from exc
    return {"ok": True}


@app.post("/auth/verify")
def auth_verify(body: VerifyOtpReq) -> dict:
    try:
        token = _descope.otp.verify_code(DeliveryMethod.EMAIL, body.email, body.code)
    except AuthException as exc:
        raise HTTPException(401, detail=str(exc)) from exc
    return {
        "ok": True,
        "session_jwt": token["sessionToken"]["jwt"],
        "refresh_jwt": token["refreshSessionToken"]["jwt"],
    }


def _current_user(authorization: str) -> str:
    bearer = authorization.removeprefix("Bearer ").strip()
    if not bearer:
        raise HTTPException(401, "no session")
    try:
        claims = _descope.validate_session(bearer)
    except AuthException as exc:
        raise HTTPException(401, detail=str(exc)) from exc
    return claims["sub"]


@app.get("/notes")
def list_notes(authorization: str = Header(default="")) -> dict:
    user = _current_user(authorization)
    return {"notes": _NOTES.get(user, [])}


@app.post("/notes")
def add_note(note: Note, authorization: str = Header(default="")) -> dict:
    user = _current_user(authorization)
    _NOTES.setdefault(user, []).append(note.text)
    return {"ok": True, "count": len(_NOTES[user])}
